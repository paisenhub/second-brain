// Views — Home, Reminders, Knowledge, Profile
const { useState, useEffect, useMemo, useRef } = React;

// ── Shared helpers ─────────────────────────────────────────────────────────────
function getEvents() {
  try { return JSON.parse(localStorage.getItem('sb_events') || '[]'); } catch { return []; }
}
function saveEvents(evs) {
  try { localStorage.setItem('sb_events', JSON.stringify(evs)); } catch {}
}
function fmtTime(t) {
  const h = Math.floor(t), m = Math.round((t - h) * 60);
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${m.toString().padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}
function dateStr(d) { return d.toISOString().split('T')[0]; }
function getWeekDates(offset) {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}
const TODAY = new Date(); TODAY.setHours(0, 0, 0, 0);

// ── HOME ───────────────────────────────────────────────────────────────────────
function HomeView({ memories, addMemory, user }) {
  const [type, setType] = useState('note');
  const [text, setText] = useState('');
  const [filter, setFilter] = useState('all');
  const [suggested, setSuggested] = useState(['+ ideas', '+ inbox']);
  const [aiResponse, setAiResponse] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  const isQuestion = (t) => {
    const s = t.trim().toLowerCase();
    if (!s) return false;
    if (s.endsWith('?')) return true;
    return /^(what|how|when|who|where|why|is |are |can |does |do |will |should |could |would |tell me|show me|find )/.test(s);
  };
  const questionMode = isQuestion(text);

  const searchKnowledge = (query) => {
    const stop = new Set(['the','and','for','with','that','this','from','what','how','when','who','where','why','is','are','can','does','will','do','a','an','in','on','of','to','i','my','your','have','has']);
    const words = query.toLowerCase().replace(/[?!.,]/g, '').split(/\s+/).filter(w => w.length > 2 && !stop.has(w));
    if (!words.length) return [];
    return memories
      .map(m => {
        const hay = [m.title, m.body || '', ...(m.tags || []), ...(m.aiTags || []), ...(m.todos ? m.todos.map(t => t.t) : [])].join(' ').toLowerCase();
        const score = words.reduce((a, w) => a + (hay.split(w).length - 1), 0);
        return { m, score };
      })
      .filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 3).map(x => x.m);
  };

  useEffect(() => {
    if (!text.trim()) { setSuggested(['+ ideas', '+ inbox']); return; }
    const lower = text.toLowerCase();
    const g = [];
    if (/book|read|chapter|author/.test(lower)) g.push('+ reading', '+ books');
    if (/idea|what if|maybe|could/.test(lower)) g.push('+ ideas');
    if (/buy|get|grab|order/.test(lower)) g.push('+ errand');
    if (/work|meeting|team|standup/.test(lower)) g.push('+ work');
    if (/mom|dad|family|grandma/.test(lower)) g.push('+ family');
    if (/recipe|dinner|cook|food/.test(lower)) g.push('+ recipes');
    if (/design|ui|figma|color/.test(lower)) g.push('+ design');
    if (/travel|trip|flight|hotel/.test(lower)) g.push('+ travel');
    if (!g.length) g.push('+ inbox', '+ misc');
    setSuggested([...new Set(g)].slice(0, 4));
  }, [text]);

  const types = [
    { key: 'note', label: 'note' }, { key: 'todo', label: 'to-do' },
    { key: 'reminder', label: 'reminder' }, { key: 'idea', label: 'idea' },
    { key: 'image', label: 'image' },
  ];
  const hour = new Date().getHours();
  const greet = hour < 5 ? 'Late night' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = user ? (user.name || 'there').split(' ')[0] : 'there';
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const filtered = filter === 'all' ? memories : memories.filter(m => m.type === filter);

  const submit = () => {
    if (!text.trim() || isSearching) return;
    if (questionMode) {
      setIsSearching(true);
      const query = text; setText('');
      window.BRAIN.search(query, memories.slice(0, 50))
        .then(({ summary, relevantIndices }) => {
          const ranked = (relevantIndices || []).map(i => memories[i]).filter(Boolean);
          const results = ranked.length > 0 ? ranked : searchKnowledge(query);
          setAiResponse({ query, summary, results });
          setIsSearching(false);
        })
        .catch(() => {
          setAiResponse({ query, summary: null, results: searchKnowledge(query) });
          setIsSearching(false);
        });
    } else {
      const firstLine = text.split('\n')[0].slice(0, 60);
      addMemory({
        id: Date.now(), type, title: firstLine,
        body: text.split('\n').slice(1).join('\n') || (type === 'todo' ? null : firstLine),
        todos: type === 'todo' ? [{ t: firstLine, done: false }] : null,
        tags: suggested.map(s => s.replace('+ ', '')).slice(0, 2),
        aiTags: ['just-added'], time: 'just now',
      });
      setText(''); setAiResponse(null);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="greeting-pill"><span className="dot"></span>{greet}, {firstName} — {today}</div>
          <h1 className="page-title">What's on your <em>mind?</em></h1>
          <p className="page-sub">Drop it in. Brain 1.0 figures out where it belongs.</p>
        </div>
      </div>

      <div className="composer">
        <div className="composer-type-row">
          {types.map(t => (
            <button key={t.key} data-type={t.key}
              className={'type-chip ' + (type === t.key ? 'active' : '')}
              onClick={() => setType(t.key)}>
              <span className="swatch"></span>{t.label}
            </button>
          ))}
        </div>
        <textarea className="composer-input" value={text}
          onChange={e => { setText(e.target.value); if (aiResponse) setAiResponse(null); }}
          rows={3}
          placeholder={
            type === 'note' ? 'Catch a thought before it floats off…'
            : type === 'todo' ? 'What needs to get done?'
            : type === 'reminder' ? 'Remind me to… (try: "call mom Friday 5pm")'
            : type === 'idea' ? 'A spark — half-formed is fine.'
            : 'Paste a link or drop an image'
          }
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
        />
        <div className="ai-line">
          <span className="ai-dot"></span>
          {questionMode ? (
            <>
              <span>Brain 1.0 detects:</span>
              <span className="mode-indicator question">question — will search your knowledge</span>
            </>
          ) : (
            <>
              <span>Brain 1.0 suggests:</span>
              {suggested.map((s, i) => <button key={i} className="suggested-tag">{s}</button>)}
            </>
          )}
          <span style={{ marginLeft: 'auto', color: 'var(--muted-2)' }}>⌘↵ to {questionMode ? 'ask' : 'save'}</span>
        </div>
        <div className="composer-actions">
          <button className="icon-mini" title="Add image"><Ic.Image/></button>
          <button className="icon-mini" title="Voice memo"><Ic.Mic/></button>
          <button className="icon-mini" title="Attach link"><Ic.Link/></button>
          <button className="icon-mini" title="Emoji"><Ic.Smile/></button>
          <button className="icon-mini" title="Set reminder"><Ic.Bell/></button>
          <div className="spacer"></div>
          {!questionMode && <button className="btn-ghost"><Ic.Sparkle/>Expand with Brain 1.0</button>}
          <button className="btn-primary" onClick={submit} disabled={isSearching}>
            {questionMode
              ? isSearching
                ? <><span className="ai-dot" style={{width:12,height:12,flexShrink:0}}></span>Searching…</>
                : <><Ic.Search width={14} height={14}/>Ask my brain</>
              : <>Save memory<Ic.Arrow/></>}
          </button>
        </div>
      </div>

      {(isSearching || aiResponse) && (
        <div className="ai-response">
          <div className="ai-line" style={{ borderTop: 0, padding: '0 0 12px' }}>
            <span className="ai-dot"></span>
            {isSearching ? <span>Brain 1.0 is thinking…</span> : (
              <>
                <span>{aiResponse.results.length > 0
                  ? `Found ${aiResponse.results.length} relevant ${aiResponse.results.length === 1 ? 'memory' : 'memories'} for:`
                  : 'Nothing matched yet for:'}</span>
                <button onClick={() => setAiResponse(null)}
                  style={{ marginLeft: 'auto', background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '0 2px' }}>×</button>
              </>
            )}
          </div>
          {aiResponse && (
            <>
              <div className="ai-response-query">"{aiResponse.query}"</div>
              {aiResponse.summary && (
                <div className="ai-summary">
                  <div className="ai-summary-label">
                    <span className="ai-dot" style={{width:10,height:10}}></span>Brain 1.0
                  </div>
                  <p>{aiResponse.summary}</p>
                </div>
              )}
              {!aiResponse.summary && !window.BRAIN.getKey() && (
                <div className="ai-summary" style={{ borderColor: 'var(--amber)' }}>
                  <div className="ai-summary-label" style={{ color: 'var(--amber)' }}>
                    <span className="ai-dot" style={{width:10,height:10,background:'var(--amber)'}}></span>Add API key for AI summaries
                  </div>
                  <p style={{ color: 'var(--muted)' }}>Click ⚙ in the top bar to add your free Gemini API key.</p>
                </div>
              )}
              {aiResponse.results.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--muted-2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  <span>{aiResponse.results.length} relevant {aiResponse.results.length === 1 ? 'memory' : 'memories'}</span>
                  <span style={{ flex: 1, height: 1, background: 'var(--border-soft)' }}></span>
                </div>
              )}
              {aiResponse.results.length > 0 ? (
                <div className="know-list">
                  {aiResponse.results.map(m => (
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
                </div>
              ) : (
                <div className="ai-response-empty">Nothing in your knowledge matches yet. Try saving some related notes first.</div>
              )}
            </>
          )}
        </div>
      )}

      <div className="section-h">
        <h2>Recent <em>memories</em></h2>
        <div className="filters">
          {['all', 'note', 'todo', 'reminder', 'idea', 'image'].map(f => (
            <button key={f} className={'filter-chip ' + (filter === f ? 'active' : '')} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
      </div>

      {memories.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">◎</div>
          <h3>Your brain is empty — in the good way.</h3>
          <p>Start by dropping a thought, idea, or task above. Brain 1.0 will tag it and save it for you.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">◎</div>
          <p>No {filter}s yet. Try a different filter or save one above.</p>
        </div>
      ) : (
        <div className="memory-grid">
          {filtered.map(m => <MemoryCard key={m.id} m={m} />)}
        </div>
      )}
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
      {m.type === 'image' && <div className="image-block">[ image ]</div>}
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

// ── REMINDERS ─────────────────────────────────────────────────────────────────
function ReminderDetailModal({ event, onClose, onUpdate, onDelete }) {
  const [editMode, setEditMode] = useState(false);
  const [title, setTitle] = useState(event.title);
  const [body, setBody] = useState(event.body || '');
  const [done, setDone] = useState(event.done);

  const save = () => {
    onUpdate({ ...event, title, body, done });
    setEditMode(false);
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="event-detail-modal">
        <div className="edm-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="edm-type-dot" data-type={event.type}></span>
            {editMode
              ? <input value={title} onChange={e => setTitle(e.target.value)} className="edm-title-input" autoFocus/>
              : <h2 className="edm-title">{title}</h2>
            }
          </div>
          <button onClick={onClose} className="edm-close">×</button>
        </div>

        <div className="edm-meta">
          <span className="edm-badge" data-type={event.type}>{event.type}</span>
          <span className="edm-time-badge">
            {new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            {' · '}{fmtTime(event.startTime)} – {fmtTime(event.startTime + event.duration)}
          </span>
        </div>

        {editMode ? (
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            className="edm-body-input"
            placeholder="Add notes…"
            rows={4}
          />
        ) : (
          body && <p className="edm-body">{body}</p>
        )}

        <div className="edm-actions">
          <button
            className={'edm-done-btn ' + (done ? 'is-done' : '')}
            onClick={() => { const next = !done; setDone(next); onUpdate({ ...event, title, body, done: next }); }}>
            {done ? '✓ Done' : 'Mark as done'}
          </button>
          <div style={{ flex: 1 }}></div>
          {editMode ? (
            <>
              <button className="btn-ghost" onClick={() => { setTitle(event.title); setBody(event.body || ''); setEditMode(false); }}>Cancel</button>
              <button className="btn-primary" onClick={save}>Save</button>
            </>
          ) : (
            <>
              <button className="btn-ghost" onClick={() => setEditMode(true)}>Edit</button>
              <button className="btn-ghost" style={{ color: 'var(--coral)' }} onClick={onDelete}>Delete</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AddReminderModal({ defaultDate, onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(defaultDate || dateStr(new Date()));
  const [startTime, setStartTime] = useState('09:00');
  const [duration, setDuration] = useState(1);
  const [type, setType] = useState('reminder');
  const [body, setBody] = useState('');

  const save = () => {
    if (!title.trim()) return;
    const [h, m] = startTime.split(':').map(Number);
    onSave({
      id: Date.now(),
      title: title.trim(),
      date,
      startTime: h + m / 60,
      duration,
      type,
      body,
      done: false,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="add-modal">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400 }}>New reminder</h3>
          <button onClick={onClose} style={{ background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer', fontSize: 22 }}>×</button>
        </div>

        <div className="add-modal-field">
          <label>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What do you need to remember?" autoFocus
            className="add-modal-input" onKeyDown={e => e.key === 'Enter' && save()}/>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="add-modal-field">
            <label>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="add-modal-input"/>
          </div>
          <div className="add-modal-field">
            <label>Time</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="add-modal-input"/>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="add-modal-field">
            <label>Duration</label>
            <select value={duration} onChange={e => setDuration(Number(e.target.value))} className="add-modal-input">
              <option value={0.25}>15 min</option>
              <option value={0.5}>30 min</option>
              <option value={0.75}>45 min</option>
              <option value={1}>1 hour</option>
              <option value={1.5}>1.5 hours</option>
              <option value={2}>2 hours</option>
              <option value={3}>3 hours</option>
            </select>
          </div>
          <div className="add-modal-field">
            <label>Type</label>
            <select value={type} onChange={e => setType(e.target.value)} className="add-modal-input">
              <option value="reminder">Reminder</option>
              <option value="meet">Meeting</option>
              <option value="focus">Focus block</option>
              <option value="todo">To-do</option>
            </select>
          </div>
        </div>

        <div className="add-modal-field">
          <label>Notes (optional)</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Any extra details…"
            className="add-modal-input" style={{ resize: 'vertical', minHeight: 72 }}/>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button className="btn-ghost" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={!title.trim()} style={{ flex: 2, justifyContent: 'center' }}>
            Save reminder<Ic.Arrow/>
          </button>
        </div>
      </div>
    </div>
  );
}

function RemindersView() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [events, setEventsRaw] = useState(getEvents);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addDefaultDate, setAddDefaultDate] = useState(null);

  const setEvents = (evs) => { setEventsRaw(evs); saveEvents(evs); };

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const todayIdx = weekDates.findIndex(d => dateStr(d) === dateStr(TODAY));

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const startHour = 8, endHour = 20, pxPerHour = 64;
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

  const now = new Date();
  const nowOffset = ((now.getHours() + now.getMinutes() / 60) - startHour) * pxPerHour;

  const monthLabel = weekDates[0].toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const dateRange = `${weekDates[0].getDate()} – ${weekDates[6].getDate()}`;

  const dayEvents = (date) => events.filter(e => e.date === dateStr(date));

  const handleUpdateEvent = (updated) => {
    setEvents(events.map(e => e.id === updated.id ? updated : e));
    setSelectedEvent(updated);
  };
  const handleDeleteEvent = () => {
    setEvents(events.filter(e => e.id !== selectedEvent.id));
    setSelectedEvent(null);
  };
  const handleAddEvent = (ev) => {
    setEvents([...events, ev]);
  };

  // Stats
  const todayEvents = events.filter(e => e.date === dateStr(TODAY));
  const weekEventsAll = events.filter(e => weekDates.some(d => dateStr(d) === e.date));
  const weekDone = weekEventsAll.filter(e => e.done).length;

  return (
    <div className="page">
      {selectedEvent && (
        <ReminderDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onUpdate={handleUpdateEvent}
          onDelete={handleDeleteEvent}
        />
      )}
      {showAdd && (
        <AddReminderModal
          defaultDate={addDefaultDate}
          onClose={() => { setShowAdd(false); setAddDefaultDate(null); }}
          onSave={handleAddEvent}
        />
      )}

      <div className="page-header">
        <div>
          <div className="greeting-pill"><span className="dot"></span>{monthLabel} · {dateRange}</div>
          <h1 className="page-title">Your <em>week,</em> at a glance</h1>
          <p className="page-sub">Click any event to view or edit. Click a day column to add a reminder.</p>
        </div>
        <button className="btn-ghost" onClick={() => setShowAdd(true)}><Ic.Plus/>New reminder</button>
      </div>

      <div className="upcoming-rail">
        <div className="up-card">
          <div className="when">TODAY</div>
          <div className="what">{todayEvents.length === 0 ? 'Nothing scheduled' : `${todayEvents.length} event${todayEvents.length !== 1 ? 's' : ''}`}</div>
          <span className="count-pill" style={{ color: todayEvents.filter(e => !e.done).length > 0 ? 'var(--amber)' : 'var(--mint)' }}>
            ● {todayEvents.filter(e => !e.done).length} upcoming
          </span>
        </div>
        <div className="up-card">
          <div className="when">THIS WEEK</div>
          <div className="what">{weekEventsAll.length === 0 ? 'Clear week' : `${weekEventsAll.length} total events`}</div>
          <span className="count-pill">● {weekDone} done</span>
        </div>
        <div className="up-card">
          <div className="when">WEEK PROGRESS</div>
          <div className="what">{weekDone} / {weekEventsAll.length || '–'} done</div>
          <div style={{ height: 6, borderRadius: 999, background: 'var(--surface-2)', marginTop: 8, overflow: 'hidden' }}>
            <div style={{ width: weekEventsAll.length ? (weekDone / weekEventsAll.length * 100) + '%' : '0%', height: '100%', background: 'linear-gradient(90deg, var(--mint), var(--lav))' }}></div>
          </div>
        </div>
      </div>

      {/* Week navigation */}
      <div className="week-nav-header">
        <button className="week-nav-btn" onClick={() => setWeekOffset(w => w - 1)}>← Prev</button>
        <button className="week-nav-today" onClick={() => setWeekOffset(0)} disabled={weekOffset === 0}>Today</button>
        <button className="week-nav-btn" onClick={() => setWeekOffset(w => w + 1)}>Next →</button>
      </div>

      <div className="week-grid" style={{ gridTemplateRows: `auto repeat(${endHour - startHour + 1}, ${pxPerHour}px)` }}>
        {/* Header */}
        <div className="week-head"></div>
        {weekDates.map((d, i) => (
          <div key={i} className={'week-head ' + (i === todayIdx ? 'today' : '')}
            style={{ cursor: 'pointer' }}
            onClick={() => { setAddDefaultDate(dateStr(d)); setShowAdd(true); }}
            title={`Add event on ${d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`}>
            <span className="dow">{days[i]}</span>
            <span className="num">{d.getDate()}</span>
          </div>
        ))}

        {/* Hour rows */}
        {hours.map((h, hi) => (
          <React.Fragment key={h}>
            <div className="hour-cell">{h % 12 === 0 ? 12 : h % 12}{h < 12 ? 'am' : 'pm'}</div>
            {weekDates.map((d, di) => (
              <div key={di} className={'day-cell ' + (di === todayIdx ? 'now-col' : '')}
                onClick={() => { setAddDefaultDate(dateStr(d)); setShowAdd(true); }}
                style={{ cursor: 'pointer' }}>
                {hi === 0 && di === todayIdx && weekOffset === 0 && nowOffset >= 0 && nowOffset <= (endHour - startHour) * pxPerHour && (
                  <div className="now-line" style={{ top: nowOffset + 'px' }}></div>
                )}
                {dayEvents(d)
                  .filter(e => Math.floor(e.startTime) === h)
                  .map((e) => (
                    <div key={e.id}
                      className={'event ' + (e.done ? 'is-done' : '')}
                      data-type={e.type}
                      style={{
                        top: ((e.startTime - h) * pxPerHour) + 'px',
                        height: Math.max(24, e.duration * pxPerHour - 6) + 'px',
                        cursor: 'pointer', zIndex: 2,
                      }}
                      onClick={ev => { ev.stopPropagation(); setSelectedEvent(e); }}>
                      <div className="e-title">{e.title}</div>
                      <span className="e-time">{fmtTime(e.startTime)} – {fmtTime(e.startTime + e.duration)}</span>
                    </div>
                  ))}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>

      {events.length === 0 && (
        <div className="empty-state" style={{ marginTop: 32 }}>
          <div className="empty-icon">📅</div>
          <h3>No reminders yet</h3>
          <p>Click "New reminder" or click any day/time slot to add one.</p>
        </div>
      )}
    </div>
  );
}

// ── KNOWLEDGE ──────────────────────────────────────────────────────────────────
function KnowledgeView({ memories, tags }) {
  const [active, setActive] = useState(null);
  const [q, setQ] = useState('');

  const allTags = useMemo(() => {
    const map = {};
    memories.forEach(m => {
      (m.tags || []).forEach(t => { map[t] = (map[t] || 0) + 1; });
    });
    return Object.entries(map).map(([name, count]) => ({
      name, count,
      color: `oklch(0.78 0.14 ${(name.charCodeAt(0) * 31 + name.charCodeAt(name.length - 1) * 17) % 360})`,
    })).sort((a, b) => b.count - a.count);
  }, [memories]);

  const filtered = memories.filter(m => {
    if (active && !(m.tags || []).includes(active)) return false;
    if (q && !(m.title + ' ' + (m.body || '') + ' ' + (m.tags||[]).join(' ')).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="greeting-pill"><span className="dot"></span>{memories.length} memories · {allTags.length} tags</div>
          <h1 className="page-title">Your <em>knowledge</em> garden</h1>
          <p className="page-sub">Everything you've saved, tagged and organized. Brain 1.0 suggests new tags as patterns emerge.</p>
        </div>
      </div>

      <div className="know-stats">
        <div className="stat"><div className="label">Total memories</div><div className="val">{memories.length}</div><div className="delta">in your brain</div></div>
        <div className="stat"><div className="label">Unique tags</div><div className="val">{allTags.length}</div><div className="delta">{allTags.length === 0 ? 'save a note to start' : 'and growing'}</div></div>
        <div className="stat"><div className="label">Notes</div><div className="val">{memories.filter(m => m.type === 'note').length}</div><div className="delta">thoughts captured</div></div>
        <div className="stat"><div className="label">Ideas</div><div className="val">{memories.filter(m => m.type === 'idea').length}</div><div className="delta">sparks saved</div></div>
      </div>

      {memories.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 40 }}>
          <div className="empty-icon">🌱</div>
          <h3>Your knowledge garden is empty</h3>
          <p>Start capturing notes, ideas, and todos from the Home tab. They'll appear here, organized by tags.</p>
        </div>
      ) : (
        <div className="know-layout">
          <aside className="tag-cloud">
            <h3>Tags</h3>
            <button className={'tag-pill ' + (active === null ? 'active' : '')} onClick={() => setActive(null)}>
              <span className="sw" style={{ background: 'var(--text-2)' }}></span> all <span className="ct">{memories.length}</span>
            </button>
            {allTags.map(t => (
              <button key={t.name} className={'tag-pill ' + (active === t.name ? 'active' : '')} onClick={() => setActive(t.name)}>
                <span className="sw" style={{ background: t.color }}></span> #{t.name} <span className="ct">{t.count}</span>
              </button>
            ))}
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
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Nothing matches. Try a different tag or search.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── PROFILE ────────────────────────────────────────────────────────────────────
const ACCENT_DEFS = [
  { key: 'coral', label: 'Coral',  css: 'oklch(0.78 0.15 35)' },
  { key: 'mint',  label: 'Mint',   css: 'oklch(0.82 0.14 168)' },
  { key: 'lav',   label: 'Lav',    css: 'oklch(0.78 0.14 295)' },
  { key: 'amber', label: 'Amber',  css: 'oklch(0.86 0.16 90)' },
];

function WhatsAppConnect({ user }) {
  const stored = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('sb_wa_' + user.id) || 'null'); } catch { return null; }
  }, [user.id]);

  const [waState, setWaState] = useState(stored?.verified ? 'connected' : 'disconnected');
  const [phone, setPhone] = useState(stored?.phone || '');
  const [countryCode, setCountryCode] = useState('+1');
  const [code] = useState(() => String(Math.floor(100000 + Math.random() * 900000)));
  const [entered, setEntered] = useState('');
  const [error, setError] = useState('');

  const BIZ_NUMBER = '15550012724';
  const fullPhone = countryCode + phone.replace(/\D/g, '');
  const waLink = `https://wa.me/${BIZ_NUMBER}?text=${encodeURIComponent(`verify ${code}`)}`;

  const handleSubmitPhone = () => {
    if (phone.replace(/\D/g, '').length < 7) { setError('Please enter a valid phone number.'); return; }
    setError('');
    setWaState('code-sent');
  };

  const handleVerify = () => {
    if (entered === code || entered === '000000') {
      const data = { phone: fullPhone, verified: true };
      localStorage.setItem('sb_wa_' + user.id, JSON.stringify(data));
      setWaState('connected');
    } else {
      setError('Incorrect code. For demo, enter: ' + code);
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem('sb_wa_' + user.id);
    setPhone(''); setEntered(''); setError('');
    setWaState('disconnected');
  };

  if (waState === 'connected') {
    return (
      <div className="wa-section wa-connected">
        <div className="wa-status-row">
          <span className="wa-icon">📱</span>
          <div>
            <div className="wa-connected-title">WhatsApp connected</div>
            <div className="wa-connected-phone">{stored?.phone || fullPhone}</div>
          </div>
          <span className="wa-badge-live">● Live</span>
        </div>
        <p className="wa-desc">
          Message <strong>Second Brain</strong> on WhatsApp to capture memories, ask questions, or manage reminders — all from your chat.
        </p>
        <div className="wa-features">
          <div className="wa-feat">📝 Capture notes via chat</div>
          <div className="wa-feat">🔍 Ask Brain 1.0 anything</div>
          <div className="wa-feat">🔔 Get reminders via WhatsApp</div>
        </div>
        <button className="btn-ghost" style={{ fontSize: 12, marginTop: 12 }} onClick={handleDisconnect}>
          Disconnect WhatsApp
        </button>
      </div>
    );
  }

  if (waState === 'code-sent') {
    return (
      <div className="wa-section">
        <div className="wa-header">
          <span className="wa-icon">📱</span>
          <div>
            <h4 className="wa-title">Verify your number</h4>
            <p className="wa-subtitle">Sending to {fullPhone}</p>
          </div>
        </div>
        <div className="wa-verify-box">
          <p className="wa-verify-instructions">
            Send the message below to our WhatsApp number to verify:
          </p>
          <div className="wa-code-display">
            <span className="wa-code-label">Your code</span>
            <span className="wa-code-value">{code}</span>
          </div>
          <a href={waLink} target="_blank" rel="noopener" className="wa-deep-link">
            <span>💬</span> Open WhatsApp to verify →
          </a>
          <div style={{ margin: '16px 0 8px', fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
            — or enter the code we send back —
          </div>
          <input value={entered} onChange={e => setEntered(e.target.value)}
            placeholder="Enter 6-digit code" className="add-modal-input"
            style={{ textAlign: 'center', letterSpacing: '0.2em', fontSize: 20, fontFamily: 'var(--font-mono)' }}
            maxLength={6}/>
          {error && <div className="wa-error">{error}</div>}
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button className="btn-ghost" onClick={() => setWaState('phone-input')} style={{ flex: 1, justifyContent: 'center' }}>Back</button>
            <button className="btn-primary" onClick={handleVerify} style={{ flex: 2, justifyContent: 'center' }}>Verify</button>
          </div>
          <p style={{ fontSize: 11, color: 'var(--muted-2)', textAlign: 'center', marginTop: 10 }}>
            Demo: use code <strong>{code}</strong> or <strong>000000</strong>
          </p>
        </div>
      </div>
    );
  }

  if (waState === 'phone-input') {
    return (
      <div className="wa-section">
        <div className="wa-header">
          <span className="wa-icon">📱</span>
          <div>
            <h4 className="wa-title">Connect WhatsApp</h4>
            <p className="wa-subtitle">Enter your number to get started</p>
          </div>
        </div>
        <div className="wa-phone-row">
          <select value={countryCode} onChange={e => setCountryCode(e.target.value)} className="wa-country-code">
            <option value="+1">🇺🇸 +1</option>
            <option value="+44">🇬🇧 +44</option>
            <option value="+49">🇩🇪 +49</option>
            <option value="+33">🇫🇷 +33</option>
            <option value="+91">🇮🇳 +91</option>
            <option value="+55">🇧🇷 +55</option>
            <option value="+234">🇳🇬 +234</option>
            <option value="+27">🇿🇦 +27</option>
            <option value="+61">🇦🇺 +61</option>
            <option value="+64">🇳🇿 +64</option>
          </select>
          <input value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="Phone number" className="add-modal-input" style={{ flex: 1 }}
            type="tel" onKeyDown={e => e.key === 'Enter' && handleSubmitPhone()}/>
        </div>
        {error && <div className="wa-error">{error}</div>}
        <p className="wa-desc" style={{ marginTop: 10 }}>
          We'll send a verification code to your WhatsApp. Standard messaging rates may apply.
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button className="btn-ghost" onClick={() => setWaState('disconnected')} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmitPhone} style={{ flex: 2, justifyContent: 'center' }}>Send verification →</button>
        </div>
      </div>
    );
  }

  return (
    <div className="wa-section wa-disconnected">
      <div className="wa-header">
        <span className="wa-icon">📱</span>
        <div>
          <h4 className="wa-title">Connect WhatsApp</h4>
          <p className="wa-subtitle">Use Second Brain from your WhatsApp chat</p>
        </div>
      </div>
      <p className="wa-desc">
        Connect your WhatsApp to capture memories, ask Brain 1.0 questions, and receive reminders — all without opening the app.
      </p>
      <button className="btn-primary" onClick={() => setWaState('phone-input')} style={{ width: '100%', justifyContent: 'center' }}>
        <span>💬</span> Connect WhatsApp
      </button>
    </div>
  );
}

function ProfileView({ user = {}, onLogout, onSettings, accent, onAccentChange, memories = [] }) {
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState(user.name || '');
  const [bio, setBio] = useState(() => {
    try { return localStorage.getItem('sb_bio_' + user.id) || ''; } catch { return ''; }
  });
  const [notify, setNotify] = useState(true);
  const [autoTag, setAutoTag] = useState(true);
  const [resurface, setResurface] = useState(true);
  const [sound, setSound] = useState(false);
  const hasKey = !!window.BRAIN.getKey();

  const saveProfile = () => {
    try { localStorage.setItem('sb_bio_' + user.id, bio); } catch {}
    setEditMode(false);
  };

  const streak = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 28; i++) {
      const r = Math.random();
      arr.push(r < 0.2 ? '' : r < 0.5 ? 'l1' : r < 0.75 ? 'l2' : r < 0.92 ? 'l3' : 'l4');
    }
    arr[27] = 'l3 today';
    return arr;
  }, []);

  const displayBio = bio || 'No bio yet. Click Edit profile to add one.';
  const initials = (user.initials || (name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)).toUpperCase();

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="greeting-pill"><span className="dot"></span>{user.email || 'Second Brain user'}</div>
          <h1 className="page-title">Your <em>profile</em></h1>
          <p className="page-sub">Personalize your brain and manage integrations.</p>
        </div>
      </div>

      <div className="profile-grid">
        {/* Left: profile card */}
        <div>
          <div className="profile-card">
            <div className="avatar-lg">{initials}</div>
            {editMode ? (
              <input value={name} onChange={e => setName(e.target.value)}
                className="profile-name-input" placeholder="Your name"/>
            ) : (
              <h2 className="profile-name">{name || user.name || 'Your Name'}</h2>
            )}
            <div className="profile-handle">@{((name || user.name || 'user').split(' ')[0]).toLowerCase()}</div>
            {editMode ? (
              <textarea value={bio} onChange={e => setBio(e.target.value)}
                className="profile-bio-input" placeholder="Tell your brain about yourself…" rows={4}/>
            ) : (
              <div className="profile-bio">{displayBio}</div>
            )}
            <div className="profile-stats">
              <div className="p-stat"><div className="v">{memories.length}</div><div className="l">memories</div></div>
              <div className="p-stat"><div className="v">{(() => { try { return JSON.parse(localStorage.getItem('sb_events') || '[]').length; } catch { return 0; } })()}</div><div className="l">events</div></div>
              <div className="p-stat"><div className="v">{[...new Set(memories.flatMap(m => m.tags || []))].length}</div><div className="l">tags</div></div>
            </div>

            {editMode ? (
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button className="btn-ghost" style={{ flex: 1, justifyContent: 'center', fontSize: 12 }} onClick={() => setEditMode(false)}>Cancel</button>
                <button className="btn-primary" style={{ flex: 2, justifyContent: 'center', fontSize: 12 }} onClick={saveProfile}>Save profile</button>
              </div>
            ) : (
              <button className="btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 14, fontSize: 12 }} onClick={() => setEditMode(true)}>
                Edit profile
              </button>
            )}

            {onSettings && (
              <button onClick={onSettings} className="btn-ghost"
                style={{ width: '100%', justifyContent: 'center', marginTop: 8, fontSize: 12, color: hasKey ? 'var(--mint)' : 'var(--amber)' }}>
                {hasKey ? '✓ Brain 1.0 API key set' : '⚙ Set Brain 1.0 API key'}
              </button>
            )}
            {onLogout && (
              <button onClick={onLogout} className="btn-ghost"
                style={{ width: '100%', justifyContent: 'center', marginTop: 8, fontSize: 12 }}>
                Sign out
              </button>
            )}
          </div>

          {/* WhatsApp */}
          <div style={{ marginTop: 16 }}>
            <WhatsAppConnect user={user} />
          </div>
        </div>

        {/* Right: settings */}
        <div>
          <div className="streak-card">
            <h3>Capture streak</h3>
            <p className="sub">{memories.length > 0 ? 'Keep going — you\'re on a roll.' : 'Start capturing to build your streak.'}</p>
            <div className="streak-grid">
              {streak.map((lvl, i) => (
                <div key={i} className={'streak-cell ' + lvl} title={`Day ${i + 1}`}></div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--muted)' }}>
              <span>4 weeks ago</span>
              <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                less
                {['', 'l1', 'l2', 'l3', 'l4'].map((c, i) => <span key={i} className={'streak-cell ' + c} style={{ width: 10, height: 10 }}></span>)}
                more
              </span>
              <span>today</span>
            </div>
          </div>

          <div className="tile-row">
            <div className="tile">
              <h3>Preferences</h3>
              <div className="kv-row"><span>Daily reminder</span>
                <button className={'toggle ' + (notify ? 'on' : '')} onClick={() => setNotify(!notify)}></button>
              </div>
              <div className="kv-row"><span>Brain 1.0 auto-tag</span>
                <button className={'toggle ' + (autoTag ? 'on' : '')} onClick={() => setAutoTag(!autoTag)}></button>
              </div>
              <div className="kv-row"><span>Resurface old memories</span>
                <button className={'toggle ' + (resurface ? 'on' : '')} onClick={() => setResurface(!resurface)}></button>
              </div>
              <div className="kv-row"><span>Sound feedback</span>
                <button className={'toggle ' + (sound ? 'on' : '')} onClick={() => setSound(!sound)}></button>
              </div>
            </div>

            <div className="tile">
              <h3>Accent color</h3>
              <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 16px' }}>
                Changes the brand color throughout the app.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {ACCENT_DEFS.map(a => (
                  <button key={a.key}
                    className={'accent-swatch-btn ' + (accent === a.key ? 'active' : '')}
                    style={{ '--sw': a.css }}
                    onClick={() => onAccentChange && onAccentChange(a.key)}>
                    <span className="accent-sw-dot"></span>
                    <span>{a.label}</span>
                    {accent === a.key && <span style={{ marginLeft: 'auto', fontSize: 10 }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="tile" style={{ marginTop: 16 }}>
            <h3>Resurfacing</h3>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 14px' }}>
              Brain 1.0 will resurface memories from your past when they're relevant.
            </p>
            {memories.length >= 3 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                {memories.slice(-3).reverse().map((m, i) => (
                  <div key={i} className="card" data-type={m.type} style={{ padding: 14 }}>
                    <div className="accent-bar"></div>
                    <div className="meta-row"><span className="type-label"><span className="d"></span>{m.type}</span><span>· {m.time}</span></div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>{m.title}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '20px 0', marginTop: 0, border: 0 }}>
                <p style={{ margin: 0 }}>Save at least 3 memories to see resurfaced content here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { HomeView, RemindersView, KnowledgeView, ProfileView });
