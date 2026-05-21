import { useState, useEffect, useCallback } from 'react';
import SeverityBadge from '../components/SeverityBadge';
import TestCaseModal from '../components/TestCaseModal';

const STATUS_STYLE = {
  draft:   { bg: '#f3f4f6', text: '#374151' },
  ready:   { bg: '#dbeafe', text: '#1d4ed8' },
  passed:  { bg: '#dcfce7', text: '#15803d' },
  failed:  { bg: '#fee2e2', text: '#b91c1c' },
  skipped: { bg: '#fef9c3', text: '#854d0e' },
};

function StatusBadge({ status }) {
  const { bg, text } = STATUS_STYLE[status] ?? { bg: '#f3f4f6', text: '#374151' };
  return (
    <span style={{ background: bg, color: text, padding: '2px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
      {status}
    </span>
  );
}

export default function TestCases() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    const q = new URLSearchParams({ page, limit: 20, sortBy, sortOrder });
    if (statusFilter) q.set('status', statusFilter);
    if (search) q.set('search', search);
    try {
      const res = await fetch(`/api/test-cases?${q}`);
      const json = await res.json();
      if (json.success) {
        setItems(json.data.items);
        setTotal(json.data.total);
        setTotalPages(json.data.totalPages);
      } else {
        setLoadError(json.error ?? 'Failed to load test cases.');
      }
    } catch {
      setLoadError('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, sortOrder, statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  function toggleSort(field) {
    if (sortBy === field) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('desc'); }
    setPage(1);
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  function clearSearch() {
    setSearch('');
    setSearchInput('');
    setPage(1);
  }

  function openCreate() { setEditTarget(null); setModalOpen(true); }
  function openEdit(item) { setEditTarget(item); setModalOpen(true); }

  async function handleDelete(id) {
    if (!confirm('Delete this test case?')) return;
    try {
      const res = await fetch(`/api/test-cases/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) { alert(json.error ?? 'Delete failed.'); return; }
      load();
    } catch {
      alert('Could not reach the server.');
    }
  }

  function SortArrow({ field }) {
    if (sortBy !== field) return <span style={{ color: '#d1d5db', marginLeft: 3 }}>↕</span>;
    return <span style={{ marginLeft: 3 }}>{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem' }}>
          Test Cases{' '}
          <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: 400 }}>({total})</span>
        </h1>
        <button onClick={openCreate} style={primaryBtn}>+ New test case</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 6 }}>
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search by title…"
            style={inputStyle}
          />
          <button type="submit" style={ghostBtn}>Search</button>
          {search && <button type="button" onClick={clearSearch} style={ghostBtn}>Clear</button>}
        </form>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} style={inputStyle}>
          <option value="">All statuses</option>
          {['draft', 'ready', 'passed', 'failed', 'skipped'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading && <p style={{ color: '#9ca3af' }}>Loading…</p>}
      {loadError && <p style={{ color: '#ef4444', fontSize: '0.875rem' }}>{loadError}</p>}

      {!loading && !loadError && items.length === 0 && (
        <p style={{ color: '#9ca3af' }}>No test cases found.</p>
      )}

      {!loading && items.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <Th onClick={() => toggleSort('title')} style={{ width: '40%' }}>Title <SortArrow field="title" /></Th>
              <Th onClick={() => toggleSort('severity')}>Severity <SortArrow field="severity" /></Th>
              <Th>Status</Th>
              <Th onClick={() => toggleSort('updated_at')}>Updated <SortArrow field="updated_at" /></Th>
              <Th style={{ width: 64 }} />
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={td}>{item.title}</td>
                <td style={td}><SeverityBadge severity={item.severity} /></td>
                <td style={td}>
                  <StatusBadge status={item.status} />
                </td>
                <td style={{ ...td, color: '#9ca3af', fontSize: '0.8rem' }}>{fmt(item.updated_at)}</td>
                <td style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button onClick={() => openEdit(item)} title="Edit" style={iconBtn}>✏️</button>
                  <button onClick={() => handleDelete(item.id)} title="Delete" style={iconBtn}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 20 }}>
          <button onClick={() => setPage(p => p - 1)} disabled={page === 1} style={ghostBtn}>← Prev</button>
          <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages} style={ghostBtn}>Next →</button>
        </div>
      )}

      {modalOpen && (
        <TestCaseModal
          initial={editTarget}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); load(); }}
        />
      )}
    </div>
  );
}

function Th({ children, onClick, style }) {
  return (
    <th
      onClick={onClick}
      style={{ padding: '8px 12px', textAlign: 'left', color: '#374151', fontWeight: 600, cursor: onClick ? 'pointer' : 'default', userSelect: 'none', ...style }}
    >
      {children}
    </th>
  );
}

function fmt(str) {
  if (!str) return '—';
  return new Date(str + (str.endsWith('Z') ? '' : 'Z')).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const td          = { padding: '10px 12px', verticalAlign: 'middle' };
const inputStyle  = { border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 10px', fontSize: '0.875rem', fontFamily: 'inherit' };
const primaryBtn  = { background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontSize: '0.875rem' };
const ghostBtn    = { background: 'none', border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: '0.875rem' };
const iconBtn     = { background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontSize: '1rem' };
