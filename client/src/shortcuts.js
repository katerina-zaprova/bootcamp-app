// Single source of truth — the hook handler AND the help modal both read from this.
export const SHORTCUT_DEFS = [
  {
    category: 'Global',
    shortcuts: [
      { id: 'quick-search', display: '⌘ K / Ctrl K', description: 'Open quick search' },
      { id: 'help',         display: '?',             description: 'Show keyboard shortcuts' },
    ],
  },
  {
    category: 'Navigation',
    shortcuts: [
      { id: 'go-dashboard',   display: 'G then D', description: 'Go to Dashboard'   },
      { id: 'go-test-cases',  display: 'G then T', description: 'Go to Test Cases'  },
      { id: 'go-test-runs',   display: 'G then R', description: 'Go to Test Runs'   },
      { id: 'go-bugs',        display: 'G then B', description: 'Go to Bugs'        },
    ],
  },
];
