import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SuiteModal from '../components/SuiteModal';

const STATUS_COLOR = { draft: '#9ca3af', ready: '#3b82f6', 'in-progress': '#f59e0b', passed: '#16a34a', failed: '#dc2626' };

export default function TestSuites() {
  const [suites, setSuites] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    setLoadError('');
    const q = new URLSearchParams();
    if (statusFilter) q.set('status', statusFilter);
    try {
      const res = await fetch(`/api/test-suites?${q}`);
      const json = await res.json();
      if (json.success) setSuites(json.data);
      else setLoadError(json.error ?? 'Failed to load suites.');
    } catch {
      setLoadError('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [statusFilter]);

  async function handleDelete(id, e) {
    e.stopPropagation();
    if (!confirm('Delete this suite and all its case links?')) return;
    try {
      const res = await fetch(`/api/test-suites/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) { alert(json.error ?? 'Delete failed.'); return; }
      load();
    } catch {
      alert('Could not reach the server.');
    }
  }

  function fmt(str) {
    if (!str) return '—';
    return new Date(str + (str.endsWith('Z') ? '' : 'Z')).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem' }}>
          Test Suites <span style={{ color: '#9ca3af', fontSize: '1rem', fontWeight: 400 }}>({suites.length})</span>
        </h1>
        <button onClick={() => setModalOpen(true)} style={primaryBtn}>+ New suite</button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={inputStyle}>
          <option value="">All statuses</option>
          {['draft', 'ready', 'in-progress', 'passed', 'failed'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading && <p style={{ color: '#9ca3af' }}>Loading…</p>}
      {loadError && <p style={{ color: '#ef4444', fontSize: '0.875rem' }}>{loadError}</p>}
      {!loading && !loadError && suites.length === 0 && <p style={{ color: '#9ca3af' }}>No test suites found.</p>}

      {!loading && suites.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={th}>Name</th>
              <th style={th}>Feature</th>
              <th style={th}>Status</th>
              <th style={th}>Cases</th>
              <th style={th}>Updated</th>
              <th style={{ ...th, width: 48 }} />
            </tr>
          </thead>
          <tbody>
            {suites.map(suite => (
              <tr
                key={suite.id}
                onClick={() => navigate(`/test-suites/${suite.id}`)}
                style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                <td style={{ ...td, fontWeight: 500 }}>{suite.name}</td>
                <td style={{ ...td, color: '#6b7280' }}>{suite.feature}</td>
                <td style={td}>
                  <span style={{ color: STATUS_COLOR[suite.status] ?? '#6b7280', fontWeight: 500, textTransform: 'capitalize' }}>
                    {suite.status}
                  </span>
                </td>
                <td style={{ ...td, color: '#6b7280' }}>{suite.case_count}</td>
                <td style={{ ...td, color: '#9ca3af', fontSize: '0.8rem' }}>{fmt(suite.updated_at)}</td>
                <td style={{ ...td, textAlign: 'right' }}>
                  <button onClick={e => handleDelete(suite.id, e)} style={iconBtn} title="Delete">🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modalOpen && (
        <SuiteModal
          onClose={() => setModalOpen(false)}
          onSaved={id => { setModalOpen(false); navigate(`/test-suites/${id}`); }}
        />
      )}
    </div>
  );
}

const th        = { padding: '8px 12px', textAlign: 'left', color: '#374151', fontWeight: 600 };
const td        = { padding: '10px 12px', verticalAlign: 'middle' };
const inputStyle = { border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 10px', fontSize: '0.875rem', fontFamily: 'inherit' };
const primaryBtn = { background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontSize: '0.875rem' };
const iconBtn    = { background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontSize: '1rem' };
