// Main app shell — static/client-side version for GitHub Pages
const { useState: useStateA, useEffect: useEffectA, useRef: useRefA } = React;

const GOOGLE_CLIENT_ID = ''; // Set your Google OAuth client ID here for full OAuth
// Without a client ID, the app uses demo mode automatically

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('sb_user') || 'null'); } catch { return null; }
}
function getStoredMemories(userId) {
  try {
    const s = localStorage.getItem('sb_mem_' + userId);
    if (s) return JSON.parse(s);
  } catch {}
  return null;
}

// ── Settings Modal ─────────────────────────────────────────────────────────────
function SettingsModal({ onClose }) {
  const [key, setKey] = React.useState(window.BRAIN.getKey());
  const [saved, setSaved] = React.useState(false);

  const save = () => {
    window.BRAIN.setKey(key.trim());
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 800);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 18, padding: 28, width: 420, boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div className="ai-dot" style={{ width: 10, height: 10 }}></div>
          <h3 style={{ margin: 0, fontSize: 16 }}>Brain 1.0 API Key</h3>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer', fontSize: 22, lineHeight: 1 }}>×</button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
          Add your Gemini API key to enable AI-powered search and summaries.
          Get one free at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener" style={{ color: 'var(--lav)' }}>aistudio.google.com</a>.
        </p>
        <input
          type="password"
          value={key}
          onChange={e => setKey(e.target.value)}
          placeholder="AIza…"
          style={{
            width: '100%', boxSizing: 'border-box', background: 'var(--surface-2)',
            border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px',
            color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-mono)',
            outline: 'none', marginBottom: 14,
          }}
          onKeyDown={e => e.key === 'Enter' && save()}
        />
        <button onClick={save} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
          {saved ? '✓ Saved!' : 'Save key'}
        </button>
      </div>
    </div>
  );
}

// ── Login View ─────────────────────────────────────────────────────────────────
function LoginView({ onLogin }) {
  const [loading, setLoading] = React.useState(false);

  const handleGoogle = () => {
    if (!GOOGLE_CLIENT_ID) {
      // Demo mode
      onLogin({ id: 'demo', name: 'Sam Okonkwo', email: 'sam@example.com', initials: 'SO', picture: null });
      return;
    }
    setLoading(true);
    // GIS one-tap / popup flow
    window.google?.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (res) => {
        const payload = window.parseJwt(res.credential);
        if (payload) {
          const u = {
            id: payload.sub,
            name: payload.name,
            email: payload.email,
            picture: payload.picture,
            initials: payload.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
          };
          localStorage.setItem('sb_user', JSON.stringify(u));
          onLogin(u);
        }
        setLoading(false);
      },
    });
    window.google?.accounts.id.prompt();
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <div className="brand-mark" style={{ width: 56, height: 56, borderRadius: 18 }}></div>
        </div>
        <div className="login-brand-name">Second<br/><em>Brain</em></div>
        <p className="login-tagline">
          Your personal AI memory,<br/>powered by <span className="login-model-name">Brain 1.0</span>
        </p>
        <button onClick={handleGoogle} className="google-btn" disabled={loading}>
          {loading ? (
            <span className="ai-dot" style={{ width: 16, height: 16 }}></span>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" style={{flexShrink:0}}>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          {GOOGLE_CLIENT_ID ? 'Continue with Google' : 'Try demo mode'}
        </button>
        {GOOGLE_CLIENT_ID && (
          <button onClick={() => onLogin({ id: 'demo', name: 'Sam Okonkwo', email: 'sam@example.com', initials: 'SO', picture: null })}
            className="demo-link">Try demo mode →</button>
        )}
        <div className="login-footer">
          <span className="login-model-badge">Powered by Brain 1.0</span>
        </div>
      </div>
    </div>
  );
}

// ── App ────────────────────────────────────────────────────────────────────────
function App() {
  const [tab, setTab] = useStateA('home');
  const [user, setUser] = useStateA(() => getStoredUser());
  const [memories, setMemoriesRaw] = useStateA(() => {
    const stored = getStoredUser();
    if (stored) {
      const m = getStoredMemories(stored.id);
      if (m) return m;
    }
    return window.SBDATA.MEMORIES;
  });
  const [showSettings, setShowSettings] = useStateA(false);
  const userRef = useRefA(null);
  const { TAGS, WEEK_EVENTS } = window.SBDATA;

  useEffectA(() => { userRef.current = user; }, [user]);

  const setMemories = (m) => {
    setMemoriesRaw(m);
    const u = userRef.current;
    if (u?.id) {
      try { localStorage.setItem('sb_mem_' + u.id, JSON.stringify(m)); } catch {}
    }
  };

  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "showFAB": true,
    "showFocusToast": false,
    "navStyle": "labeled"
  }/*EDITMODE-END*/;
  const [tweaks, setTweak] = window.useTweaks ? window.useTweaks(TWEAK_DEFAULTS) : [TWEAK_DEFAULTS, () => {}];

  const handleLogin = (u) => {
    localStorage.setItem('sb_user', JSON.stringify(u));
    userRef.current = u;
    setUser(u);
    const stored = getStoredMemories(u.id);
    if (stored) setMemoriesRaw(stored);
  };

  const handleLogout = () => {
    localStorage.removeItem('sb_user');
    userRef.current = null;
    setUser(null);
  };

  const addMemory = (m) => setMemories([m, ...memories]);

  const tabs = [
    { key: 'home',   label: 'Home',      icon: Ic.Home,  count: null },
    { key: 'rem',    label: 'Reminders', icon: Ic.Cal,   count: 5 },
    { key: 'know',   label: 'Knowledge', icon: Ic.Brain, count: memories.length },
    { key: 'prof',   label: 'Profile',   icon: Ic.User,  count: null },
  ];

  if (!user) return <LoginView onLogin={handleLogin} />;

  const initials = user.initials ||
    (user.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const firstName = (user.name || 'User').split(' ')[0];

  return (
    <div className="app">
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"></div>
          <div className="brand-name">Second<br/><em>Brain</em></div>
        </div>

        <div className="nav-section-label">Workspace</div>
        {tabs.map(t => (
          <button key={t.key}
            className={'nav-btn ' + (tab === t.key ? 'active' : '')}
            onClick={() => setTab(t.key)}>
            <span className="icon"><t.icon/></span>
            <span>{t.label}</span>
            {t.count !== null && <span className="count">{t.count}</span>}
          </button>
        ))}

        <div className="nav-section-label">Quick capture</div>
        <button className="nav-btn"><span className="icon"><Ic.Mic/></span><span>Voice memo</span></button>
        <button className="nav-btn"><span className="icon"><Ic.Image/></span><span>Drop image</span></button>
        <button className="nav-btn"><span className="icon"><Ic.Link/></span><span>Paste link</span></button>

        <div className="brain-meter">
          <h4>Today's brain</h4>
          <div className="row" style={{ marginBottom: 6 }}>
            <span style={{ color: 'var(--text)' }}>focused</span>
            <span style={{ marginLeft: 'auto', color: 'var(--mint)' }}>72%</span>
          </div>
          <div className="brain-bar"><span style={{ width: '72%' }}></span></div>
          <div className="row" style={{ marginTop: 10, fontSize: 11 }}>
            <span>3 captured · 2 done</span>
          </div>
          <div className="row" style={{
            marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 10.5,
            color: 'var(--muted-2)', borderTop: '1px solid var(--border-soft)', paddingTop: 8,
          }}>
            <span>Brain 1.0</span>
            <span style={{ marginLeft: 'auto', color: 'var(--mint)' }}>● active</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        <div className="topbar">
          <div className="search">
            <Ic.Search/>
            <input placeholder="Ask Brain 1.0 anything…"/>
            <span className="kbd">⌘K</span>
          </div>
          <div className="topbar-right">
            <button className="icon-btn" title="API Settings" onClick={() => setShowSettings(true)}><Ic.Set/></button>
            <button className="avatar-btn" onClick={() => setTab('prof')}>
              <span className="avatar-dot">{initials}</span>
              <span>{firstName}</span>
            </button>
          </div>
        </div>

        {tab === 'home' && <HomeView memories={memories} addMemory={addMemory} user={user}/>}
        {tab === 'rem'  && <RemindersView events={WEEK_EVENTS}/>}
        {tab === 'know' && <KnowledgeView memories={memories} tags={TAGS}/>}
        {tab === 'prof' && <ProfileView user={user} onLogout={handleLogout} onSettings={() => setShowSettings(true)}/>}
      </main>

      {tab !== 'home' && tweaks.showFAB && (
        <button className="fab" title="Quick capture" onClick={() => setTab('home')}>
          <Ic.Plus width={24} height={24}/>
        </button>
      )}

      {tweaks.showFocusToast && (
        <div className="focus-toast">
          <span className="pulse"></span>
          <span>Focus session · <span className="mono" style={{ color: 'var(--coral)' }}>22:14</span> left</span>
          <button className="btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }}>End</button>
        </div>
      )}

      {window.TweaksPanel && (
        <window.TweaksPanel title="Tweaks">
          <window.TweakSection title="Layout">
            <window.TweakToggle label="Show quick-capture FAB" checked={tweaks.showFAB} onChange={v => setTweak('showFAB', v)}/>
            <window.TweakToggle label="Show focus session toast" checked={tweaks.showFocusToast} onChange={v => setTweak('showFocusToast', v)}/>
          </window.TweakSection>
        </window.TweaksPanel>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
