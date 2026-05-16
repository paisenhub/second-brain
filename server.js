require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'project'), { index: 'Second Brain.html' }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'sb-dev-' + Math.random().toString(36),
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
}));

app.use(passport.initialize());
app.use(passport.session());

const DEMO_MODE = !process.env.GOOGLE_CLIENT_ID;

if (!DEMO_MODE) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
  }, (_at, _rt, profile, done) => {
    const name = profile.displayName || 'User';
    done(null, {
      id: profile.id,
      name,
      email: profile.emails?.[0]?.value || '',
      photo: profile.photos?.[0]?.value || '',
      initials: name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
    });
  }));
}

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// ── Auth ─────────────────────────────────────────────────────────────────────

app.get('/auth/google', (req, res, next) => {
  if (DEMO_MODE) return res.redirect('/auth/demo');
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

app.get('/auth/google/callback',
  (req, res, next) => {
    if (DEMO_MODE) return res.redirect('/');
    passport.authenticate('google', { failureRedirect: '/?error=auth_failed' })(req, res, next);
  },
  (req, res) => res.redirect('/')
);

app.get('/auth/demo', (req, res) => {
  req.login({ id: 'demo', name: 'Sam', initials: 'S', email: 'demo@secondbrain.app', demo: true }, () => {
    res.redirect('/');
  });
});

app.get('/api/auth/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  res.json({ ...req.user, demoMode: DEMO_MODE });
});

app.post('/auth/logout', (req, res) => {
  req.logout(() => res.json({ ok: true }));
});

// ── Brain 1.0 / Gemini Flash ──────────────────────────────────────────────────

const GEMINI_KEY = process.env.GEMINI_API_KEY;
let geminiModel = null;

if (GEMINI_KEY) {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_KEY);
    geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    console.log('  Brain 1.0 (Gemini Flash) ready');
  } catch (e) {
    console.warn('  Brain 1.0 init failed:', e.message);
  }
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

function keywordSearch(question, memories) {
  const stopwords = new Set(['the','and','for','with','that','this','from','what','how','when',
    'who','where','why','is','are','can','does','will','do','a','an','in','on','of','to','i','my','your','have','has']);
  const words = question.toLowerCase().replace(/[?!.,]/g, '').split(/\s+/)
    .filter(w => w.length > 2 && !stopwords.has(w));
  return (memories || [])
    .map((m, i) => {
      const hay = [m.title, m.body || '', ...(m.tags || []), ...(m.todos || []).map(t => t.t)].join(' ').toLowerCase();
      const score = words.reduce((acc, w) => acc + (hay.split(w).length - 1), 0);
      return { i, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(x => x.i);
}

// Knowledge search with AI summary
app.post('/api/ai/search', requireAuth, async (req, res) => {
  const { question, memories } = req.body;
  if (!question) return res.status(400).json({ error: 'Missing question' });

  const mem = (memories || []).slice(0, 50);

  if (!geminiModel) {
    const indices = keywordSearch(question, mem);
    return res.json({
      summary: indices.length > 0
        ? `Found ${indices.length} relevant ${indices.length === 1 ? 'memory' : 'memories'} matching your query. Add a GEMINI_API_KEY for richer answers.`
        : `No matching notes found for "${question}". Try saving some related memories first.`,
      relevantIndices: indices,
    });
  }

  try {
    const memoriesText = mem.map((m, i) =>
      `[${i}] ${m.title}: ${m.body || (m.todos ? m.todos.map(t => t.t).join(', ') : '')} (tags: ${(m.tags || []).join(', ')})`
    ).join('\n');

    const prompt = `You are Brain 1.0, a personal AI knowledge assistant. The user asks: "${question}"

Their saved memories:
${memoriesText}

Reply ONLY with valid JSON, no markdown fences:
{
  "summary": "2-3 sentence direct answer based on their memories. If no relevant memories, say so and suggest what to save.",
  "relevantIndices": [0-based indices sorted most-relevant-first, max 5 items]
}`;

    const result = await geminiModel.generateContent(prompt);
    const raw = result.response.text().trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in response');
    const parsed = JSON.parse(match[0]);

    res.json({
      summary: parsed.summary || '',
      relevantIndices: Array.isArray(parsed.relevantIndices) ? parsed.relevantIndices.slice(0, 5) : [],
    });
  } catch (err) {
    console.error('Brain 1.0 search error:', err.message);
    const fallback = keywordSearch(question, mem);
    res.json({
      summary: 'Brain 1.0 encountered an issue. Showing keyword-matched results.',
      relevantIndices: fallback,
    });
  }
});

// AI tag suggestions
app.post('/api/ai/tags', requireAuth, async (req, res) => {
  const { text, existingTags } = req.body;
  if (!text?.trim()) return res.json({ tags: [] });
  if (!geminiModel) return res.json({ tags: [] });

  try {
    const prompt = `You are Brain 1.0. Suggest 2-4 concise tags for: "${text.slice(0, 400)}"
Known tags: ${(existingTags || []).join(', ')}
Reply with ONLY a JSON array: ["tag1", "tag2"] — lowercase, no # prefix, max 15 chars each.`;

    const result = await geminiModel.generateContent(prompt);
    const raw = result.response.text().trim();
    const match = raw.match(/\[[\s\S]*?\]/);
    const tags = match ? JSON.parse(match[0]) : [];
    res.json({ tags: Array.isArray(tags) ? tags.slice(0, 4) : [] });
  } catch (err) {
    console.error('Brain 1.0 tags error:', err.message);
    res.json({ tags: [] });
  }
});

// ── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🧠  Second Brain  →  http://localhost:${PORT}\n`);
  if (DEMO_MODE) console.log('  ⚠  No GOOGLE_CLIENT_ID — demo mode active (no real OAuth)');
  if (!GEMINI_KEY) console.log('  ⚠  No GEMINI_API_KEY — Brain 1.0 using keyword fallback');
  console.log('');
});
