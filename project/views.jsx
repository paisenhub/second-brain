// Views — Home, Reminders, Knowledge, Profile
const { useState, useEffect, useMemo, useRef } = React;

// ---------- HOME ----------
function HomeView({ memories, addMemory }) {
  const [type, setType] = useState('note');
  const [text, setText] = useState('');
  const [filter, setFilter] = useState('all');
  const [suggested, setSuggested] = useState(['+ design', '+ inspiration']);

  // Live "AI" tag suggestion based on text
  useEffect(() => {
    if (!text.trim()) { setSuggested(['+ design', '+ inspiration']); return; }
    const lower = text.toLowerCase();
    const guesses = [];
    if (/book|read|chapter|author/.test(lower))    guesses.push('+ reading', '+ books');
    if (/idea|what if|maybe|could/.test(lower))    guesses.push('+ ideas');
    if (/buy|get|grab|order/.test(lower))          guesses.push('+ errand');
    if (/work|meeting|team|standup/.test(lower))   guesses.push('+ work');
    if (/mom|dad|family|grandma/.test(lower))      guesses.push('+ family');
    if (/recipe|dinner|cook|food/.test(lower))     guesses.push('+ recipes');
    if (/design|ui|figma|color/.test(lower))       guesses.push('+ design');
    if (/travel|trip|flight|hotel/.test(lower))    guesses.push('+ travel');
    if (guesses.length === 0) guesses.push('+ inbox', '+ misc');
    setSuggested([...new Set(guesses)].slice(0, 4));
  }, [text]);

  const types = [
    { key: 'note',     label: 'note' },
    { key: 'todo',     label: 'to-do' },
    { key: 'reminder', label: 'reminder' },
    { key: 'idea',     label: 'idea' },
    { key: 'image',    label: 'image' },
  ];

  const hour = new Date().getHours();
  const greet = hour < 5 ? 'Late night' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const filtered = filter === 'all' ? memories : memories.filter(m => m.type === filter);

  const submit = () => {
    if (!text.trim()) return;
    const firstLine = text.split('\n')[0].slice(0, 60);
    addMemory({
      id: Date.now(),
      type,
      title: firstLine,
      body: text.split('\n').slice(1).join('\n') || (type === 'todo' ? null : firstLine),
      todos: type === 'todo' ? [{ t: firstLine, done: false }] : null,
      tags: suggested.map(s => s.replace('+ ', '')).slice(0, 2),
      aiTags: ['just-added'],
      time: 'just now',
    });
    setText('');
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="greeting-pill"><span className="dot"></span>{greet}, Sam — Thursday, May 14</div>
          <h1 className="page-title">What's on your <em>mind?</em></h1>
          <p className="page-sub">Drop it in. I'll figure out where it belongs.</p>
        </div>
      </div>

      {/* Composer */}
      <div className="composer">
        <div className="composer-type-row">
          {types.map(t => (
            <button key={t.key}
              data-type={t.key}
              className={'type-chip ' + (type === t.key ? 'active' : '')}
              onClick={() => setType(t.key)}>
              <span className="swatch"></span>{t.label}
            </button>
          ))}
        </div>
        <textarea
          className="composer-input"
          value={text}
          onChange={e => setText(e.target.value)}
          rows={3}
          placeholder={
            type === 'note'     ? 'Catch a thought before it floats off…'
            : type === 'todo'     ? 'What needs to get done?'
            : type === 'reminder' ? 'Remind me to… (try: "Friday at 5pm")'
            : type === 'idea'     ? 'A spark — half-formed is fine.'
            : 'Paste a link or drop an image'
          }
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
        />
        <div className="ai-line">
          <span className="ai-dot"></span>
          <span>AI suggests:</span>
          {suggested.map((s, i) => (
            <button key={i} className="suggested-tag">{s}</button>
          ))}
          <span style={{ marginLeft: 'auto', color: 'var(--muted-2)' }}>⌘↵ to save</span>
        </div>
        <div className="composer-actions">
          <button className="icon-mini" title="Add image"><Ic.Image/></button>
          <button className="icon-mini" title="Voice memo"><Ic.Mic/></button>
          <button className="icon-mini" title="Attach link"><Ic.Link/></button>
          <button className="icon-mini" title="Emoji"><Ic.Smile/></button>
          <button className="icon-mini" title="Set reminder"><Ic.Bell/></button>
          <div className="spacer"></div>
          <button className="btn-ghost"><Ic.Sparkle/>Expand with AI</button>
          <button className="btn-primary" onClick={submit}>Save memory<Ic.Arrow/></button>
        </div>
      </div>

      {/* Recent */}
      <div className="section-h">
        <h2>Recent <em>memories</em></h2>
        <div className="filters">
          {['all', 'note', 'todo', 'reminder', 'idea', 'image'].map(f => (
            <button key={f}
              className={'filter-chip ' + (filter === f ? 'active' : '')}
              onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
      </div>

      <div className="memory-grid">
        {filtered.map(m => <MemoryCard key={m.id} m={m} />)}
      </div>
    </div>
  );
}

function MemoryCard({ m }) {
  const [todos, setTodos] = useState(m.todos || []);
  const toggle = (i) => setTodos(todos.map((t, idx) => idx === i ? { ...t, done: !t.done } : t));
  return (
    <div className="card" data-type={m.type}>
      <div className="accent-bar"></div>
      <div className="meta-row">
        <span className="type-label"><span className="d"></span>{m.type}</span>
        <span>· {m.time}</span>
        {m.pinned && <span style={{ marginLeft: 'auto', color: 'var(--amber)' }}><Ic.Pin/></span>}
      </div>
      <h3 className="title">{m.title}</h3>
      {m.type === 'image' && (
        <div className="image-block">[ photo: lisbon-cafe.jpg ]</div>
      )}
      {m.body && <p className="body">{m.body}</p>}
      {todos.length > 0 && (
        <div className="todo-list">
          {todos.map((t, i) => (
            <div key={i} className={'todo-item ' + (t.done ? 'done' : '')}>
              <button className={'todo-check ' + (t.done ? 'done' : '')} onClick={() => toggle(i)}>
                {t.done && <Ic.Check/>}
              </button>
              <span className="label">{t.t}</span>
            </div>
          ))}
        </div>
      )}
      <div className="tag-row">
        {(m.tags || []).map(t => <span key={t} className="tag">#{t}</span>)}
        {(m.aiTags || []).map(t => <span key={t} className="tag new">{t}</span>)}
      </div>
    </div>
  );
}

// ---------- REMINDERS ----------
function RemindersView({ events }) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dates = [12, 13, 14, 15, 16, 17, 18]; // example week
  const todayCol = 2; // Wednesday for demo? actually Thursday — let's say Thu = idx 3
  const startHour = 8;
  const endHour = 20;
  const hours = [];
  for (let h = startHour; h <= endHour; h++) hours.push(h);
  const pxPerHour = 64;

  const nowOffset = ((10 + 24/60) - startHour) * pxPerHour; // ~10:24

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="greeting-pill"><span className="dot"></span>This week · May 12–18</div>
          <h1 className="page-title">Your <em>week,</em> at a glance</h1>
          <p className="page-sub">Reminders, todos, and time blocks — all the things future-you needs to know.</p>
        </div>
        <button className="btn-ghost"><Ic.Plus/>New reminder</button>
      </div>

      <div className="upcoming-rail">
        <div className="up-card">
          <div className="when">NEXT UP · in 1h 36m</div>
          <div className="what">1:1 with Lila</div>
          <span className="count-pill" style={{ color: 'var(--lav)' }}>● 30 min · Zoom</span>
        </div>
        <div className="up-card">
          <div className="when">TODAY</div>
          <div className="what">3 reminders, 2 todos</div>
          <span className="count-pill">● 1 overdue</span>
        </div>
        <div className="up-card">
          <div className="when">WEEK PROGRESS</div>
          <div className="what">8 / 14 done</div>
          <div style={{ height: 6, borderRadius: 999, background: 'var(--surface-2)', marginTop: 8, overflow: 'hidden' }}>
            <div style={{ width: '57%', height: '100%', background: 'linear-gradient(90deg, var(--mint), var(--lav))' }}></div>
          </div>
        </div>
      </div>

      <div className="week-grid" style={{ gridTemplateRows: `auto repeat(${endHour-startHour+1}, ${pxPerHour}px)` }}>
        {/* Header row */}
        <div className="week-head"></div>
        {days.map((d, i) => (
          <div key={d} className={'week-head ' + (i === 3 ? 'today' : '')}>
            <span className="dow">{d}</span>
            <span className="num">{dates[i]}</span>
          </div>
        ))}

        {/* Hour rows */}
        {hours.map((h, hi) => (
          <React.Fragment key={h}>
            <div className="hour-cell">{h % 12 === 0 ? 12 : h % 12}{h < 12 ? 'am' : 'pm'}</div>
            {days.map((_, di) => (
              <div key={di} className={'day-cell ' + (di === 3 ? 'now-col' : '')}>
                {hi === 0 && di === 3 && (
                  <div className="now-line" style={{ top: (nowOffset) + 'px' }}></div>
                )}
                {events
                  .filter(e => e.day === di && Math.floor(e.start) === h)
                  .map((e, ei) => (
                    <div key={ei}
                      className={'event ' + (e.done ? 'is-done' : '')}
                      data-type={e.type}
                      style={{
                        top: ((e.start - h) * pxPerHour) + 'px',
                        height: (e.dur * pxPerHour - 6) + 'px',
                      }}>
                      <div className="e-title">{e.title}</div>
                      <span className="e-time">{fmtTime(e.start)} – {fmtTime(e.start + e.dur)}</span>
                    </div>
                  ))}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
function fmtTime(t) {
  const h = Math.floor(t); const m = Math.round((t - h) * 60);
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${m.toString().padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

// ---------- KNOWLEDGE ----------
function KnowledgeView({ memories, tags }) {
  const [active, setActive] = useState(null);
  const [q, setQ] = useState('');

  const filtered = memories.filter(m => {
    if (active && !(m.tags || []).includes(active)) return false;
    if (q && !(m.title + ' ' + (m.body || '') + ' ' + (m.tags||[]).join(' ')).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="greeting-pill"><span className="dot"></span>{memories.length} memories · {tags.length} tags · growing daily</div>
          <h1 className="page-title">Your <em>knowledge</em> garden</h1>
          <p className="page-sub">Everything you've fed me, tagged and organized. AI suggests new tags as patterns emerge.</p>
        </div>
      </div>

      <div className="know-stats">
        <div className="stat"><div className="label">Total memories</div><div className="val">247</div><div className="delta">+12 this week</div></div>
        <div className="stat"><div className="label">Unique tags</div><div className="val">{tags.length}</div><div className="delta">+2 auto-created</div></div>
        <div className="stat"><div className="label">Connections</div><div className="val">89</div><div className="delta">+6 inferred</div></div>
        <div className="stat"><div className="label">Days captured</div><div className="val">38</div><div className="delta">streak: 6 🔥</div></div>
      </div>

      <div className="know-layout">
        <aside className="tag-cloud">
          <h3>Tags</h3>
          <button className={'tag-pill ' + (active === null ? 'active' : '')} onClick={() => setActive(null)}>
            <span className="sw" style={{ background: 'var(--text-2)' }}></span> all <span className="ct">{memories.length}</span>
          </button>
          {tags.map(t => (
            <button key={t.name}
              className={'tag-pill ' + (active === t.name ? 'active' : '')}
              onClick={() => setActive(t.name)}>
              <span className="sw" style={{ background: t.color }}></span> #{t.name} <span className="ct">{t.count}</span>
            </button>
          ))}
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-soft)' }}>
            <h3 style={{ marginBottom: 8 }}>AI-suggested</h3>
            <button className="tag-pill" style={{ color: 'var(--mint)' }}>
              <span className="sw" style={{ background: 'var(--mint)' }}></span> #morning-routine <span className="ct">new</span>
            </button>
            <button className="tag-pill" style={{ color: 'var(--mint)' }}>
              <span className="sw" style={{ background: 'var(--mint)' }}></span> #weekend-prep <span className="ct">new</span>
            </button>
          </div>
        </aside>

        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <div className="search" style={{ flex: 1, width: 'auto' }}>
              <Ic.Search/>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder={'Search ' + (active ? '#' + active : 'all memories') + '…'}/>
            </div>
            <button className="btn-ghost"><Ic.Filter/>Filter</button>
            <button className="btn-ghost">Sort: Recent</button>
          </div>

          <div className="know-list">
            {filtered.map(m => (
              <div key={m.id} className="know-row" data-type={m.type}>
                <span className="dot"></span>
                <div>
                  <div className="row-title">{m.title}</div>
                  <div className="row-snip">
                    {m.body || (m.todos && m.todos.map(t => t.t).join(' · ')) || ''}
                    {(m.tags || []).map(t => <span key={t} className="tag" style={{ marginLeft: 6 }}>#{t}</span>)}
                  </div>
                </div>
                <div className="row-time">{m.time}</div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
                Nothing here yet. Try a different tag or query.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- PROFILE ----------
function ProfileView() {
  const [notify, setNotify] = useState(true);
  const [autoTag, setAutoTag] = useState(true);
  const [resurface, setResurface] = useState(true);
  const [sound, setSound] = useState(false);

  // Streak grid — 28 days
  const streak = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 28; i++) {
      const r = Math.random();
      let lvl = 'l1';
      if (r < 0.2)      lvl = '';
      else if (r < 0.5) lvl = 'l1';
      else if (r < 0.75) lvl = 'l2';
      else if (r < 0.92) lvl = 'l3';
      else              lvl = 'l4';
      arr.push(lvl);
    }
    arr[27] = 'l3 today';
    return arr;
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="greeting-pill"><span className="dot"></span>Member since Feb 2025 · 6 day streak</div>
          <h1 className="page-title">Your <em>profile</em></h1>
          <p className="page-sub">How your brain is wired, and how you want me to help.</p>
        </div>
      </div>

      <div className="profile-grid">
        {/* Left: profile card */}
        <div>
          <div className="profile-card">
            <div className="avatar-lg">S</div>
            <h2 className="profile-name">Sam Okonkwo</h2>
            <div className="profile-handle">@sam · she/her · ✦ founding user</div>
            <div className="profile-bio">
              Designer, plant collector, occasional baker. Building a quieter relationship with my own attention. ADHD, dx 2021 — this app is part of how I cope.
            </div>
            <div className="profile-stats">
              <div className="p-stat"><div className="v">247</div><div className="l">memories</div></div>
              <div className="p-stat"><div className="v">38</div><div className="l">days</div></div>
              <div className="p-stat"><div className="v">14</div><div className="l">tags</div></div>
            </div>
          </div>
        </div>

        {/* Right: streak + settings */}
        <div>
          <div className="streak-card">
            <h3>Capture streak</h3>
            <p className="sub">6 days in a row · 28 of the last 28 days you saved at least one memory.</p>
            <div className="streak-grid">
              {streak.map((lvl, i) => (
                <div key={i} className={'streak-cell ' + lvl} title={`Day ${i+1}`}></div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--muted)' }}>
              <span>4 weeks ago</span>
              <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                less <span className="streak-cell" style={{ width: 10, height: 10 }}></span>
                <span className="streak-cell l1" style={{ width: 10, height: 10 }}></span>
                <span className="streak-cell l2" style={{ width: 10, height: 10 }}></span>
                <span className="streak-cell l3" style={{ width: 10, height: 10 }}></span>
                <span className="streak-cell l4" style={{ width: 10, height: 10 }}></span> more
              </span>
              <span>today</span>
            </div>
          </div>

          <div className="tile-row">
            <div className="tile">
              <h3>How I think</h3>
              <div className="kv-row"><span>Capture style</span><span className="v">quick + messy</span></div>
              <div className="kv-row"><span>Peak focus hours</span><span className="v">9–11 AM</span></div>
              <div className="kv-row"><span>Top tags</span><span className="v">#reading #work</span></div>
              <div className="kv-row"><span>Avg memory length</span><span className="v">42 words</span></div>
              <div className="kv-row"><span>Most reused tag</span><span className="v">#ideas</span></div>
            </div>
            <div className="tile">
              <h3>Preferences</h3>
              <div className="kv-row"><span>Daily reminder</span>
                <button className={'toggle ' + (notify ? 'on' : '')} onClick={() => setNotify(!notify)}></button>
              </div>
              <div className="kv-row"><span>AI auto-tag</span>
                <button className={'toggle ' + (autoTag ? 'on' : '')} onClick={() => setAutoTag(!autoTag)}></button>
              </div>
              <div className="kv-row"><span>Resurface old memories</span>
                <button className={'toggle ' + (resurface ? 'on' : '')} onClick={() => setResurface(!resurface)}></button>
              </div>
              <div className="kv-row"><span>Sound feedback</span>
                <button className={'toggle ' + (sound ? 'on' : '')} onClick={() => setSound(!sound)}></button>
              </div>
              <div className="kv-row"><span>Accent color</span>
                <div className="theme-swatches">
                  <button className="swatch-btn active" style={{ background: 'var(--coral)' }}></button>
                  <button className="swatch-btn" style={{ background: 'var(--mint)' }}></button>
                  <button className="swatch-btn" style={{ background: 'var(--lav)' }}></button>
                  <button className="swatch-btn" style={{ background: 'var(--amber)' }}></button>
                </div>
              </div>
            </div>
          </div>

          <div className="tile" style={{ marginTop: 16 }}>
            <h3>Resurfacing</h3>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 14px' }}>
              Things from past-you that present-you might want to see again. I pick 3 each morning.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {[
                { type: 'note', date: '6 months ago', text: '"Movement clears the mental cache." — note to self after the bad week.' },
                { type: 'idea', date: '1 year ago', text: 'A note app that thinks back — you actually shipped this 🎉' },
                { type: 'reminder', date: '3 months ago', text: 'Annual check-up — you scheduled this for May 24.' },
              ].map((r, i) => (
                <div key={i} className="card" data-type={r.type} style={{ padding: 14 }}>
                  <div className="accent-bar"></div>
                  <div className="meta-row"><span className="type-label"><span className="d"></span>{r.type}</span><span>· {r.date}</span></div>
                  <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>{r.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { HomeView, RemindersView, KnowledgeView, ProfileView });
