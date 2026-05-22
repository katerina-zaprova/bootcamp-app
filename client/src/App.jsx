import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
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

// ── Theme tokens ──────────────────────────────────────────────────────────────
const T = {
  light: {
    pageBg:       '#f9fafb',
    navBg:        '#ffffff',
    border:       '#e5e7eb',
    text:         '#111827',
    muted:        '#6b7280',
    brand:        '#111827',
    linkColor:    '#6b7280',
    linkHover:    '#374151',
    activeBg:     '#eef2ff',
    activeColor:  '#4f46e5',
    searchBg:     '#f9fafb',
    searchBorder: '#e5e7eb',
    kbdBg:        '#ffffff',
    hamburger:    '#374151',
    mobileBg:     '#ffffff',
    shadow:       '0 1px 3px rgba(0,0,0,0.08)',
  },
  dark: {
    pageBg:       '#0f1117',
    navBg:        '#1a1f2e',
    border:       '#2d3748',
    text:         '#f1f5f9',
    muted:        '#94a3b8',
    brand:        '#f1f5f9',
    linkColor:    '#94a3b8',
    linkHover:    '#cbd5e1',
    activeBg:     '#1e1b4b',
    activeColor:  '#a5b4fc',
    searchBg:     '#0f1117',
    searchBorder: '#2d3748',
    kbdBg:        '#1a1f2e',
    hamburger:    '#94a3b8',
    mobileBg:     '#1a1f2e',
    shadow:       '0 1px 3px rgba(0,0,0,0.4)',
  },
};

// Primary nav links — single source of truth for desktop + mobile
const NAV_LINKS = [
  { to: '/dashboard',         label: 'Dashboard'  },
  { to: '/test-cases',        label: 'Test Cases' },
  { to: '/test-suites',       label: 'Test Suites'},
  { to: '/test-runs',         label: 'Test Runs'  },
  { to: '/bugs',              label: 'Bugs'       },
  { to: '/reports',           label: 'Reports'    },
  { to: '/test-cases/import', label: 'Import CSV' },
];

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useWindowWidth() {
  const [w, setW] = useState(() => window.innerWidth);
  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return w;
}

// ── Hamburger icon (animated) ─────────────────────────────────────────────────
function Hamburger({ open, color }) {
  const bar = {
    width: 18, height: 2, background: color,
    borderRadius: 1, transition: 'transform 0.2s, opacity 0.2s',
  };
  return (
    <div style={{ width: 22, height: 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ ...bar, transform: open ? 'rotate(45deg) translate(0px, 7px)' : 'none' }} />
      <div style={{ ...bar, opacity: open ? 0 : 1 }} />
      <div style={{ ...bar, transform: open ? 'rotate(-45deg) translate(0px, -7px)' : 'none' }} />
    </div>
  );
}

// ── Logo mark ─────────────────────────────────────────────────────────────────
function VerityLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="url(#vg)"/>
      <defs>
        <linearGradient id="vg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1"/>
          <stop offset="100%" stopColor="#4f46e5"/>
        </linearGradient>
      </defs>
      {/* V mark — doubles as a verification check */}
      <path d="M8 10 L16 22 L24 10" stroke="white" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Baseline dot — anchors the mark */}
      <circle cx="16" cy="22" r="1.5" fill="white"/>
    </svg>
  );
}

// ── App root ──────────────────────────────────────────────────────────────────
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
  const theme   = T[resolvedTheme === 'dark' ? 'dark' : 'light'];
  const navigate = useNavigate();
  const location = useLocation();
  const width    = useWindowWidth();
  const isNarrow = width < 768;

  const [showSearch,  setShowSearch]  = useState(false);
  const [showHelp,    setShowHelp]    = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const mobileMenuRef = useRef(null);

  // Close mobile menu on any navigation
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Close mobile menu when clicking outside it
  useEffect(() => {
    if (!mobileOpen) return;
    function onPointerDown(e) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target)) {
        setMobileOpen(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [mobileOpen]);

  // Keyboard shortcuts
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
      action: () => { setShowSearch(false); setShowHelp(false); setMobileOpen(false); },
    },
  ]);

  // NavLink style — pill highlight for active, plain for inactive
  function navLinkStyle({ isActive }) {
    return {
      textDecoration: 'none',
      padding: '5px 10px',
      borderRadius: 6,
      fontSize: '0.875rem',
      fontWeight: isActive ? 600 : 400,
      color:      isActive ? theme.activeColor : theme.linkColor,
      background: isActive ? theme.activeBg    : 'transparent',
      whiteSpace: 'nowrap',
      transition: 'background 0.12s, color 0.12s',
    };
  }

  // Mobile nav link — same logic, slightly larger touch target
  function mobileNavLinkStyle({ isActive }) {
    return {
      ...navLinkStyle({ isActive }),
      display: 'flex',
      alignItems: 'center',
      padding: '10px 12px',
      borderRadius: 8,
      fontSize: '0.9rem',
      gap: 8,
    };
  }

  return (
    <div style={{ fontFamily: 'system-ui,-apple-system,sans-serif', minHeight: '100vh', background: theme.pageBg, color: theme.text }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header
        ref={mobileMenuRef}
        style={{
          position: 'sticky', top: 0, zIndex: 200,
          background: theme.navBg,
          borderBottom: `1px solid ${theme.border}`,
          boxShadow: theme.shadow,
        }}
      >
        {/* Desktop / mobile bar */}
        <div style={{
          maxWidth: 1280, margin: '0 auto',
          padding: '0 1.5rem',
          height: 56,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>

          {/* Brand */}
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginRight: 10 }}>
            <VerityLogo />
            <span style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.02em', color: theme.brand }}>Verity</span>
          </Link>

          {/* Desktop links */}
          {!isNarrow && (
            <nav style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, overflow: 'hidden' }}>
              {NAV_LINKS.map(({ to, label }) => (
                <NavLink key={to} to={to} style={navLinkStyle}>{label}</NavLink>
              ))}
            </nav>
          )}

          {/* Right-side actions */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {/* Search button (desktop only — mobile has it in the menu) */}
            {!isNarrow && (
              <button
                onClick={() => setShowSearch(true)}
                title="Quick search (⌘K)"
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 10px', borderRadius: 6,
                  border: `1px solid ${theme.searchBorder}`,
                  background: theme.searchBg,
                  color: theme.muted, fontSize: 13, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <span style={{ fontSize: 15 }}>⌕</span>
                <span>Search</span>
                <kbd style={{
                  fontSize: 10, padding: '1px 5px', borderRadius: 3,
                  border: `1px solid ${theme.border}`,
                  background: theme.kbdBg, fontFamily: 'monospace', color: theme.muted,
                }}>⌘K</kbd>
              </button>
            )}

            {/* Settings link (desktop) */}
            {!isNarrow && (
              <NavLink to="/settings" style={navLinkStyle} title="Settings">
                ⚙ Settings
              </NavLink>
            )}

            {/* Hamburger (mobile) */}
            {isNarrow && (
              <button
                onClick={() => setMobileOpen(o => !o)}
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileOpen}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', borderRadius: 6 }}
              >
                <Hamburger open={mobileOpen} color={theme.hamburger} />
              </button>
            )}
          </div>
        </div>

        {/* Mobile slide-down menu */}
        <div
          aria-hidden={!mobileOpen}
          style={{
            overflow: 'hidden',
            maxHeight: mobileOpen ? '520px' : '0',
            transition: 'max-height 0.22s ease',
            background: theme.mobileBg,
            borderTop: mobileOpen ? `1px solid ${theme.border}` : 'none',
          }}
        >
          <nav style={{ padding: '0.75rem 1.25rem 1rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink key={to} to={to} style={mobileNavLinkStyle} onClick={() => setMobileOpen(false)}>
                {label}
              </NavLink>
            ))}
            <div style={{ height: 1, background: theme.border, margin: '6px 0' }} />
            <NavLink to="/settings" style={mobileNavLinkStyle} onClick={() => setMobileOpen(false)}>
              ⚙ Settings
            </NavLink>
            <button
              onClick={() => { setShowSearch(true); setMobileOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 12px', borderRadius: 8, width: '100%', textAlign: 'left',
                border: 'none', background: 'transparent', cursor: 'pointer',
                color: theme.linkColor, fontSize: '0.9rem', fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: 15 }}>⌕</span> Search
            </button>
          </nav>
        </div>
      </header>

      {/* ── Page content ───────────────────────────────────────────────────── */}
      <main>
        <Routes>
          <Route path="/"                   element={<Home theme={theme} />} />
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
      </main>

      {/* ── Global modals ──────────────────────────────────────────────────── */}
      {showSearch && <QuickSearch onClose={() => setShowSearch(false)} />}
      {showHelp   && <HelpModal   onClose={() => setShowHelp(false)}   />}
    </div>
  );
}

function Home({ theme }) {
  return (
    <div style={{ padding: '2rem', maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{ color: theme?.text }}>Verity</h1>
    </div>
  );
}
