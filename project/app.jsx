// Main app shell and routing
const { useState: useStateA, useEffect: useEffectA } = React;

function App() {
  const [tab, setTab] = useStateA('home');
  const [memories, setMemories] = useStateA(window.SBDATA.MEMORIES);
  const { TAGS, WEEK_EVENTS } = window.SBDATA;

  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "showFAB": true,
    "showFocusToast": true,
    "navStyle": "labeled"
  }/*EDITMODE-END*/;
  const [tweaks, setTweak] = window.useTweaks ? window.useTweaks(TWEAK_DEFAULTS) : [TWEAK_DEFAULTS, () => {}];

  const addMemory = (m) => setMemories([m, ...memories]);

  const tabs = [
    { key: 'home',   label: 'Home',      icon: Ic.Home,  count: null },
    { key: 'rem',    label: 'Reminders', icon: Ic.Cal,   count: 5 },
    { key: 'know',   label: 'Knowledge', icon: Ic.Brain, count: 247 },
    { key: 'prof',   label: 'Profile',   icon: Ic.User,  count: null },
  ];

  return (
    <div className="app">
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
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        <div className="topbar">
          <div className="search">
            <Ic.Search/>
            <input placeholder="Ask your brain anything…"/>
            <span className="kbd">⌘K</span>
          </div>
          <div className="topbar-right">
            <button className="icon-btn" title="Notifications"><Ic.Bell/></button>
            <button className="icon-btn" title="Settings"><Ic.Set/></button>
            <button className="avatar-btn" onClick={() => setTab('prof')}>
              <span className="avatar-dot">S</span>
              <span>Sam</span>
            </button>
          </div>
        </div>

        {tab === 'home' && <HomeView memories={memories} addMemory={addMemory}/>}
        {tab === 'rem'  && <RemindersView events={WEEK_EVENTS}/>}
        {tab === 'know' && <KnowledgeView memories={memories} tags={TAGS}/>}
        {tab === 'prof' && <ProfileView/>}
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
