import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import TestCases from './pages/TestCases';
import TestSuites from './pages/TestSuites';
import TestSuiteDetail from './pages/TestSuiteDetail';
import Bugs from './pages/Bugs';
import BugDetail from './pages/BugDetail';
import TestRuns from './pages/TestRuns';
import TestRunDetail from './pages/TestRunDetail';

const navLink = ({ isActive }) => ({
  textDecoration: 'none',
  color: isActive ? '#2563eb' : '#6b7280',
  fontWeight: isActive ? 600 : 400,
  fontSize: '0.9rem',
});

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#f9fafb' }}>
        <nav style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 2rem', display: 'flex', alignItems: 'center', gap: '1.5rem', height: 52 }}>
          <span style={{ fontWeight: 700, color: '#111' }}>Bootcamp App</span>
          <NavLink to="/test-cases" style={navLink}>Test Cases</NavLink>
          <NavLink to="/test-suites" style={navLink}>Test Suites</NavLink>
          <NavLink to="/test-runs" style={navLink}>Test Runs</NavLink>
          <NavLink to="/bugs" style={navLink}>Bugs</NavLink>
        </nav>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/test-cases" element={<TestCases />} />
          <Route path="/test-suites" element={<TestSuites />} />
          <Route path="/test-suites/:id" element={<TestSuiteDetail />} />
          <Route path="/bugs" element={<Bugs />} />
          <Route path="/bugs/:id" element={<BugDetail />} />
          <Route path="/test-runs" element={<TestRuns />} />
          <Route path="/test-runs/:id" element={<TestRunDetail />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

function Home() {
  return <div style={{ padding: '2rem' }}><h1>Bootcamp App</h1></div>;
}
