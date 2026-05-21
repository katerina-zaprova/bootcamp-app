import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import SeverityBadge from '../components/SeverityBadge';
import SuiteModal from '../components/SuiteModal';

const STATUS_COLOR = { draft: '#9ca3af', ready: '#3b82f6', 'in-progress': '#f59e0b', passed: '#16a34a', failed: '#dc2626' };

export default function TestSuiteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [suite, setSuite] = useState(null);
  const [cases, setCases] = useState([]);
  const [allCases, setAllCases] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [creatingRun, setCreatingRun] = useState(false);
  const dragIndex = useRef(null);
  const [dragOver, setDragOver] = useState(null);

  async function loadSuite() {
    setLoadError('');
    try {
      const res = await fetch(`/api/test-suites/${id}`);
      const json = await res.json();
      if (!json.success) { setNotFound(true); setLoading(false); return; }
      setSuite(json.data);
      setCases(json.data.cases);
    } catch {
      setLoadError('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }

  async function loadAllCases() {
    try {
      const res = await fetch('/api/test-cases?limit=200');
      const json = await res.json();
      if (json.success) setAllCases(json.data.items);
    } catch {
      // available-cases panel will show empty; not critical enough to block the page
    }
  }

  useEffect(() => { loadSuite(); loadAllCases(); }, [id]);

  async function saveCaseOrder(ordered, previous) {
    setSaveError('');
    try {
      const res = await fetch(`/api/test-suites/${id}/cases`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cases: ordered.map(c => c.id) }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Failed to save.');
    } catch (err) {
      setCases(previous);
      setSaveError(err.message);
    }
  }

  function handleDragStart(i) { dragIndex.current = i; }
  function handleDragEnter(i) { setDragOver(i); }
  function handleDragEnd() { setDragOver(null); dragIndex.current = null; }

  function handleDrop(dropIndex) {
    const from = dragIndex.current;
    if (from === null || from === dropIndex) { setDragOver(null); return; }
    const prev = [...cases];
    const next = [...cases];
    const [moved] = next.splice(from, 1);
    next.splice(dropIndex, 0, moved);
    setCases(next);
    setDragOver(null);
    dragIndex.current = null;
    saveCaseOrder(next, prev);
  }

  async function handleNewRun() {
    setCreatingRun(true);
    try {
      const res  = await fetch('/api/test-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suite_id: parseInt(id, 10) }),
      });
      const json = await res.json();
      if (json.success) {
        navigate(`/test-runs/${json.data.id}`);
      } else {
        setSaveError(json.error ?? 'Failed to create run.');
        setCreatingRun(false);
      }
    } catch {
      setSaveError('Could not reach the server.');
      setCreatingRun(false);
    }
  }

  async function removeCase(caseId) {
    const prev = [...cases];
    const next = cases.filter(c => c.id !== caseId);
    setCases(next);
    await saveCaseOrder(next, prev);
  }

  async function addCase(testCase) {
    const prev = [...cases];
    const next = [...cases, testCase];
    setCases(next);
    await saveCaseOrder(next, prev);
  }

  const inSuiteIds = new Set(cases.map(c => c.id));
  const available = allCases.filter(c => !inSuiteIds.has(c.id));

  if (loading) return <div style={{ padding: '2rem', color: '#9ca3af' }}>Loading…</div>;
  if (loadError) return <div style={{ padding: '2rem', color: '#ef4444' }}>{loadError}</div>;
  if (notFound) return (
    <div style={{ padding: '2rem' }}>
      <p>Suite not found.</p>
      <Link to="/test-suites" style={{ color: '#2563eb' }}>← Back to suites</Link>
    </div>
  );

  return (
    <div style={{ padding: '2rem', maxWidth: 960, margin: '0 auto' }}>
      <div style={{ marginBottom: '0.75rem' }}>
        <Link to="/test-suites" style={{ color: '#6b7280', fontSize: '0.875rem', textDecoration: 'none' }}>← Test Suites</Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: '0 0 6px', fontSize: '1.4rem' }}>{suite.name}</h1>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', fontSize: '0.875rem' }}>
            <span style={{ color: '#6b7280' }}>{suite.feature}</span>
            <span style={{ color: STATUS_COLOR[suite.status] ?? '#6b7280', fontWeight: 500, textTransform: 'capitalize' }}>{suite.status}</span>
            <span style={{ color: '#9ca3af' }}>{cases.length} case{cases.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleNewRun} disabled={creatingRun} style={{ ...ghostBtn, background: '#2563eb', color: '#fff', border: 'none' }}>
            {creatingRun ? 'Creating…' : '▶ New Run'}
          </button>
          <button onClick={() => setEditOpen(true)} style={ghostBtn}>Edit suite</button>
        </div>
      </div>

      {cases.length === 0 ? (
        <p style={{ color: '#9ca3af', marginBottom: 16 }}>No cases in this suite yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', marginBottom: 16 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ ...th, width: 28 }} />
              <th style={{ ...th, width: 28 }}>#</th>
              <th style={th}>Title</th>
              <th style={th}>Severity</th>
              <th style={th}>Status</th>
              <th style={{ ...th, width: 36 }} />
            </tr>
          </thead>
          <tbody>
            {cases.map((c, i) => (
              <tr
                key={c.id}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragEnter={() => handleDragEnter(i)}
                onDragEnd={handleDragEnd}
                onDragOver={e => e.preventDefault()}
                onDrop={() => handleDrop(i)}
                style={{
                  borderBottom: '1px solid #f3f4f6',
                  cursor: 'grab',
                  background: dragOver === i ? '#eff6ff' : '',
                  borderTop: dragOver === i ? '2px solid #3b82f6' : '',
                }}
              >
                <td style={{ ...td, color: '#d1d5db', userSelect: 'none', fontSize: '1rem' }}>⠿</td>
                <td style={{ ...td, color: '#9ca3af', fontSize: '0.8rem' }}>{i + 1}</td>
                <td style={td}>{c.title}</td>
                <td style={td}><SeverityBadge severity={c.severity} /></td>
                <td style={{ ...td, color: '#6b7280', textTransform: 'capitalize' }}>{c.status}</td>
                <td style={td}>
                  <button onClick={() => removeCase(c.id)} title="Remove from suite" style={removeBtn}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {saveError && <p style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: 12 }}>{saveError}</p>}

      <button onClick={() => setShowAdd(a => !a)} style={ghostBtn}>
        {showAdd ? 'Hide available cases' : '+ Add cases'}
      </button>

      {showAdd && (
        <div style={{ marginTop: 12 }}>
          {available.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>All test cases are already in this suite.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                  <th style={{ ...th, fontWeight: 500 }}>Available test cases</th>
                  <th style={th}>Severity</th>
                  <th style={th}>Status</th>
                  <th style={{ ...th, width: 72 }} />
                </tr>
              </thead>
              <tbody>
                {available.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={td}>{c.title}</td>
                    <td style={td}><SeverityBadge severity={c.severity} /></td>
                    <td style={{ ...td, color: '#6b7280', textTransform: 'capitalize' }}>{c.status}</td>
                    <td style={td}>
                      <button onClick={() => addCase(c)} style={addBtn}>Add</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {editOpen && (
        <SuiteModal
          initial={suite}
          onClose={() => setEditOpen(false)}
          onSaved={() => { setEditOpen(false); loadSuite(); }}
        />
      )}
    </div>
  );
}

const th        = { padding: '8px 12px', textAlign: 'left', color: '#374151', fontWeight: 600 };
const td        = { padding: '10px 12px', verticalAlign: 'middle' };
const ghostBtn  = { background: 'none', border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: '0.875rem' };
const removeBtn = { background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', fontSize: '1.1rem', color: '#ef4444', lineHeight: 1 };
const addBtn    = { background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: '0.8rem' };
