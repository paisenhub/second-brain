// Sample data for Second Brain prototype

const TAGS = [
  { name: 'work',         color: 'oklch(0.78 0.15 35)',  count: 24 },
  { name: 'design',       color: 'oklch(0.78 0.14 295)', count: 18 },
  { name: 'reading',      color: 'oklch(0.82 0.14 168)', count: 31 },
  { name: 'ideas',        color: 'oklch(0.78 0.14 295)', count: 12 },
  { name: 'health',       color: 'oklch(0.82 0.14 168)', count: 9  },
  { name: 'family',       color: 'oklch(0.86 0.16 90)',  count: 7  },
  { name: 'finances',     color: 'oklch(0.80 0.13 235)', count: 5  },
  { name: 'recipes',      color: 'oklch(0.86 0.16 90)',  count: 14 },
  { name: 'travel',       color: 'oklch(0.80 0.13 235)', count: 11 },
  { name: 'books',        color: 'oklch(0.82 0.14 168)', count: 22 },
  { name: 'philosophy',   color: 'oklch(0.78 0.14 295)', count: 6  },
  { name: 'music',        color: 'oklch(0.78 0.15 35)',  count: 8  },
  { name: 'quotes',       color: 'oklch(0.78 0.14 295)', count: 17 },
  { name: 'side-projects',color: 'oklch(0.78 0.15 35)',  count: 13 },
];

const MEMORIES = [
  {
    id: 1, type: 'idea', pinned: true,
    title: 'A note app that thinks back',
    body: 'What if the app surfaced an old note when you wrote something semantically related? Less "search", more "your past self chimes in."',
    tags: ['ideas', 'side-projects', 'design'],
    aiTags: ['product-thinking'],
    time: 'just now',
  },
  {
    id: 2, type: 'todo',
    title: 'Wrap up this week',
    todos: [
      { t: 'Send Lila the moodboard',         done: true },
      { t: 'Reply to Jordan about Tuesday',   done: true },
      { t: 'Draft the Q3 retro outline',      done: false },
      { t: 'Renew library books (3 overdue)', done: false },
    ],
    tags: ['work', 'admin'],
    time: '12 min ago',
  },
  {
    id: 3, type: 'note',
    title: 'Why we get stuck',
    body: '"The opposite of play is not work — it\'s depression." Sutton-Brown. Save this for the talk in October.',
    tags: ['quotes', 'reading', 'psychology'],
    aiTags: ['psychology'],
    time: '34 min ago',
  },
  {
    id: 4, type: 'reminder',
    title: 'Pick up prescription',
    body: 'CVS on 7th, before 6pm. They close early on Thursdays.',
    tags: ['health', 'errand'],
    time: 'Today, 5:30 PM',
  },
  {
    id: 5, type: 'image',
    title: 'Coffee shop in Lisbon',
    body: 'The blue tile, the brass railing — use this palette for the next portfolio refresh.',
    tags: ['design', 'travel', 'inspiration'],
    aiTags: ['inspiration'],
    time: 'Yesterday',
  },
  {
    id: 6, type: 'note',
    title: 'Conversation with mom',
    body: 'She mentioned grandma\'s peach cobbler recipe is in the green folder, top shelf. Ask next visit.',
    tags: ['family', 'recipes'],
    time: '2 days ago',
  },
  {
    id: 7, type: 'idea',
    title: 'Friday standup ritual',
    body: 'Replace the status round-robin with one "what did past-you do for present-you this week" prompt.',
    tags: ['work', 'team', 'ideas'],
    aiTags: ['team'],
    time: '2 days ago',
  },
  {
    id: 8, type: 'todo',
    title: 'Weekend prep',
    todos: [
      { t: 'Grocery list (see linked note)', done: false },
      { t: 'Confirm dog-sitter for the 24th', done: false },
      { t: 'Pack rain jacket — forecast bad', done: false },
    ],
    tags: ['family', 'travel'],
    time: '3 days ago',
  },
  {
    id: 9, type: 'note',
    title: 'Book: Hidden Potential',
    body: 'Ch. 3: scaffolding > talent. The point isn\'t innate skill — it\'s the structures you build to grow into it.',
    tags: ['books', 'reading', 'growth'],
    aiTags: ['growth'],
    time: '4 days ago',
  },
];

const WEEK_EVENTS = [
  // day index 0=Mon ... 6=Sun
  { day: 0, start: 9,    dur: 1,    type: 'meet',     title: 'Standup',                    done: true },
  { day: 0, start: 14,   dur: 1.5,  type: 'focus',    title: 'Deep work — proposal',       done: true },
  { day: 1, start: 10,   dur: 1,    type: 'reminder', title: 'Therapy',                    done: true },
  { day: 1, start: 13,   dur: 2,    type: 'focus',    title: 'Design jam',                 done: false },
  { day: 2, start: 9.5,  dur: 0.75, type: 'todo',     title: 'Review PRs',                 done: false },
  { day: 2, start: 11,   dur: 1,    type: 'meet',     title: '1:1 w/ Lila',                done: false },
  { day: 2, start: 15,   dur: 2,    type: 'focus',    title: 'Write Q3 retro',             done: false },
  { day: 3, start: 8,    dur: 1,    type: 'reminder', title: 'Pick up prescription',       done: false },
  { day: 3, start: 12,   dur: 1,    type: 'meet',     title: 'Lunch w/ Theo',              done: false },
  { day: 3, start: 16.5, dur: 1.5,  type: 'todo',     title: 'Pay quarterly tax',          done: false },
  { day: 4, start: 9,    dur: 1,    type: 'meet',     title: 'Standup',                    done: false },
  { day: 4, start: 14,   dur: 1,    type: 'reminder', title: 'Call grandma',               done: false },
  { day: 5, start: 10,   dur: 3,    type: 'focus',    title: 'Side project — brain app',   done: false },
  { day: 6, start: 11,   dur: 1.5,  type: 'reminder', title: 'Farmers market',             done: false },
  { day: 6, start: 18,   dur: 2,    type: 'meet',     title: 'Dinner w/ Sam',              done: false },
];

window.SBDATA = { TAGS, MEMORIES, WEEK_EVENTS };
