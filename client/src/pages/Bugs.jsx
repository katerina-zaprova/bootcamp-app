import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import SeverityBadge from '../components/SeverityBadge';
import BugModal from '../components/BugModal';
import { usePreferences } from '../context/PreferencesContext';

const STATUS_STYLE = {
  'open':        { bg: '#fee2e2', text: '#b91c1c' },
  'in-progress': { bg: '#dbeafe', text: '#1d4ed8' },
  'resolved':    { bg: '#dcfce7', text: '#15803d' },
  'closed':      { bg: '#f3f4f6', text: '#374151' },
  'reopened':    { bg: '#fef9c3', text: '#854d0e' },
};

function StatusBadge({ status }) {
  const { bg, text } = STATUS_STYLE[status] ?? { bg: '#f3f4f6', text: '#374151' };
  return (
    <span style={{ background: bg, color: text, padding: '2px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
      {status}
    </span>
  );
}

export default function Bugs() {
  const navigate = useNavigate();
  const { prefs } = usePreferences();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    const q = new URLSearchParams({ page, limit: 20, sortBy, sortOrder });
    if (statusFilter) q.set('status', statusFilter);
    if (severityFilter) q.set('severity', severityFilter);
    if (search) q.set('search', search);
    try {
      const res = await fetch(`/api/bugs?${q}`);
      const json = await res.json();
      if (json.success) {
        setItems(json.data.items);
        setTotal(json.data.total);
        setTotalPages(json.data.totalPages);
      } else {
        setLoadError(json.error ?? 'Failed to load bugs.');
      }
    } catch {
      setLoadError('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, sortOrder, statusFilter, severityFilter, search]);

  useEffect(() => { load(); }, [load]);

  function toggleSort(field) {
    if (sortBy === field) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('desc'); }
    setPage(1);
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  }

  function clearSearch() {
    setSearch('');
    setSearchInput('');
    setPage(1);
  }

  async function handleDelete(e, id) {
    e.stopPropagation();
    if (!confirm('Delete this bug?')) return;
    try {
      const res = await fetch(`/api/bugs/${id}`, { method: 'DELETE' });
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
    <div style={{ padding: '2rem', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem' }}>
          Bugs{' '}
          <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: 400 }}>({total})</span>
        </h1>
        <button onClick={() => setModalOpen(true)} style={primaryBtn}>+ New bug</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 6 }}>
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search title or description…"
            style={{ ...inputStyle, width: 220 }}
          />
          <button type="submit" style={ghostBtn}>Search</button>
          {search && <button type="button" onClick={clearSearch} style={ghostBtn}>Clear</button>}
        </form>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} style={inputStyle}>
          <option value="">All statuses</option>
          {['open', 'in-progress', 'resolved', 'closed', 'reopened'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={severityFilter} onChange={e => { setSeverityFilter(e.target.value); setPage(1); }} style={inputStyle}>
          <option value="">All severities</option>
          {['Critical', 'Major', 'Minor', 'Trivial'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading && <p style={{ color: '#9ca3af' }}>Loading…</p>}
      {loadError && <p style={{ color: '#ef4444', fontSize: '0.875rem' }}>{loadError}</p>}

      {!loading && !loadError && items.length === 0 && (
        <p style={{ color: '#9ca3af' }}>No bugs found.</p>
      )}

      {!loading && items.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <Th onClick={() => toggleSort('title')} style={{ width: '42%' }}>Title <SortArrow field="title" /></Th>
              <Th onClick={() => toggleSort('severity')}>Severity <SortArrow field="severity" /></Th>
              <Th onClick={() => toggleSort('status')}>Status <SortArrow field="status" /></Th>
              <Th onClick={() => toggleSort('updated_at')}>Updated <SortArrow field="updated_at" /></Th>
              <Th style={{ width: 64 }} />
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr
                key={item.id}
                onClick={() => navigate(`/bugs/${item.id}`)}
                style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                <td style={td}>{item.title}</td>
                <td style={td}><SeverityBadge severity={item.severity} /></td>
                <td style={td}><StatusBadge status={item.status} /></td>
                <td style={{ ...td, color: '#9ca3af', fontSize: '0.8rem' }}>{fmt(item.updated_at)}</td>
                <td style={{ ...td, textAlign: 'right' }}>
                  <button onClick={e => handleDelete(e, item.id)} title="Delete" style={iconBtn}>🗑️</button>
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
        <BugModal
          onClose={() => setModalOpen(false)}
          onSaved={bug => { setModalOpen(false); navigate(`/bugs/${bug.id}`); }}
          defaultSeverity={prefs.default_severity_for_new_bugs}
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

const td         = { padding: '10px 12px', verticalAlign: 'middle' };
const inputStyle = { border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 10px', fontSize: '0.875rem', fontFamily: 'inherit' };
const primaryBtn = { background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontSize: '0.875rem' };
const ghostBtn   = { background: 'none', border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: '0.875rem' };
const iconBtn    = { background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontSize: '1rem' };
