import { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { PreferencesProvider, usePreferences } from './context/PreferencesContext';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import QuickSearch from './components/QuickSearch';
import HelpModal from './components/HelpModal';
import TestCases from './pages/TestCases';
import TestSuites from './pages/TestSuites';
import TestSuiteDetail from './pages/TestSuiteDetail';
import Bugs from './pages/Bugs';
import BugDetail from './pages/BugDetail';
import TestRuns from './pages/TestRuns';
import TestRunDetail from './pages/TestRunDetail';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import ReportDetail from './pages/ReportDetail';
import TestCaseImport from './pages/TestCaseImport';
import Settings from './pages/Settings';

export default function App() {
  return (
    <PreferencesProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </PreferencesProvider>
  );
}

function AppShell() {
  const { resolvedTheme } = usePreferences();
  const dk = resolvedTheme === 'dark';
  const navigate = useNavigate();

  const [showSearch, setShowSearch] = useState(false);
  const [showHelp,   setShowHelp]   = useState(false);

  useKeyboardShortcuts([
    {
      id: 'quick-search',
      test: (e) => (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k',
      action: () => setShowSearch(s => !s),
    },
    {
      id: 'help',
      test: (e) => e.key === '?',
      action: () => setShowHelp(s => !s),
    },
    {
      id: 'go-dashboard',
      test: (_, chord) => chord === 'g+d',
      action: () => navigate('/dashboard'),
    },
    {
      id: 'go-test-cases',
      test: (_, chord) => chord === 'g+t',
      action: () => navigate('/test-cases'),
    },
    {
      id: 'go-test-runs',
      test: (_, chord) => chord === 'g+r',
      action: () => navigate('/test-runs'),
    },
    {
      id: 'go-bugs',
      test: (_, chord) => chord === 'g+b',
      action: () => navigate('/bugs'),
    },
    {
      id: 'close-modals',
      test: (e) => e.key === 'Escape',
      action: () => { setShowSearch(false); setShowHelp(false); },
    },
  ]);

  const navLink = ({ isActive }) => ({
    textDecoration: 'none',
    color: isActive ? (dk ? '#818cf8' : '#2563eb') : (dk ? '#9ca3af' : '#6b7280'),
    fontWeight: isActive ? 600 : 400,
    fontSize: '0.9rem',
  });

  return (
    <div style={{
      fontFamily: 'system-ui, sans-serif',
      minHeight: '100vh',
      background: dk ? '#111827' : '#f9fafb',
      color: dk ? '#f3f4f6' : '#111827',
    }}>
      <nav style={{
        background: dk ? '#1e2130' : '#fff',
        borderBottom: `1px solid ${dk ? '#374151' : '#e5e7eb'}`,
        padding: '0 2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        height: 52,
        flexWrap: 'wrap',
      }}>
        <span style={{ fontWeight: 700, color: dk ? '#f9fafb' : '#111' }}>Bootcamp App</span>
        <NavLink to="/dashboard"         style={navLink}>Dashboard</NavLink>
        <NavLink to="/test-cases"        style={navLink}>Test Cases</NavLink>
        <NavLink to="/test-suites"       style={navLink}>Test Suites</NavLink>
        <NavLink to="/test-runs"         style={navLink}>Test Runs</NavLink>
        <NavLink to="/bugs"              style={navLink}>Bugs</NavLink>
        <NavLink to="/reports"           style={navLink}>Reports</NavLink>
        <NavLink to="/test-cases/import" style={navLink}>Import CSV</NavLink>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => setShowSearch(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 6,
              border: `1px solid ${dk ? '#374151' : '#e5e7eb'}`,
              background: dk ? '#111827' : '#f9fafb',
              color: '#9ca3af', fontSize: 13, cursor: 'pointer',
            }}
          >
            <span>⌕</span>
            <span>Search</span>
            <kbd style={{ fontSize: 10, padding: '1px 4px', borderRadius: 3, border: `1px solid ${dk ? '#374151' : '#d1d5db'}`, background: dk ? '#1e2130' : '#fff', fontFamily: 'monospace' }}>
              ⌘K
            </kbd>
          </button>
          <NavLink to="/settings" style={navLink}>⚙ Settings</NavLink>
        </div>
      </nav>

      <Routes>
        <Route path="/"                   element={<Home />} />
        <Route path="/dashboard"          element={<Dashboard />} />
        <Route path="/test-cases"         element={<TestCases />} />
        <Route path="/test-cases/import"  element={<TestCaseImport />} />
        <Route path="/test-suites"        element={<TestSuites />} />
        <Route path="/test-suites/:id"    element={<TestSuiteDetail />} />
        <Route path="/bugs"               element={<Bugs />} />
        <Route path="/bugs/:id"           element={<BugDetail />} />
        <Route path="/test-runs"          element={<TestRuns />} />
        <Route path="/test-runs/:id"      element={<TestRunDetail />} />
        <Route path="/reports"            element={<Reports />} />
        <Route path="/reports/:id"        element={<ReportDetail />} />
        <Route path="/settings"           element={<Settings />} />
      </Routes>

      {showSearch && <QuickSearch onClose={() => setShowSearch(false)} />}
      {showHelp   && <HelpModal   onClose={() => setShowHelp(false)}   />}
    </div>
  );
}

function Home() {
  return <div style={{ padding: '2rem' }}><h1>Bootcamp App</h1></div>;
}
