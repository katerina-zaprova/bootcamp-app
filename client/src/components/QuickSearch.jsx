import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const TYPE_META = {
  'Test Case': { color: '#6366f1', bg: '#eef2ff' },
  'Bug':       { color: '#dc2626', bg: '#fee2e2' },
  'Suite':     { color: '#059669', bg: '#d1fae5' },
};

function TypeChip({ type }) {
  const { color, bg } = TYPE_META[type] ?? { color: '#6b7280', bg: '#f3f4f6' };
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: bg, color, flexShrink: 0 }}>
      {type}
    </span>
  );
}

export default function QuickSearch({ onClose }) {
  const navigate = useNavigate();
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef    = useRef(null);
  const listRef     = useRef(null);
  const debouncedQ  = useDebounce(query.trim(), 280);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const search = useCallback(async (q) => {
    if (!q) { setResults([]); setSelectedIdx(0); return; }
    setLoading(true);
    try {
      const [casesRes, bugsRes, suitesRes] = await Promise.all([
        fetch(`/api/test-cases?search=${encodeURIComponent(q)}&limit=5`).then(r => r.json()),
        fetch(`/api/bugs?search=${encodeURIComponent(q)}&limit=5`).then(r => r.json()),
        fetch(`/api/test-suites`).then(r => r.json()),
      ]);

      const items = [];
      if (casesRes.success) {
        casesRes.data.items.forEach(tc => items.push({
          id: `tc-${tc.id}`, type: 'Test Case', label: tc.title,
          sub: tc.severity, href: `/test-cases`,
        }));
      }
      if (bugsRes.success) {
        bugsRes.data.items.forEach(b => items.push({
          id: `bug-${b.id}`, type: 'Bug', label: b.title,
          sub: b.status, href: `/bugs/${b.id}`,
        }));
      }
      if (suitesRes.success) {
        const ql = q.toLowerCase();
        suitesRes.data
          .filter(s => s.name.toLowerCase().includes(ql))
          .slice(0, 5)
          .forEach(s => items.push({
            id: `suite-${s.id}`, type: 'Suite', label: s.name,
            sub: `${s.case_count} cases`, href: `/test-suites/${s.id}`,
          }));
      }
      setResults(items);
      setSelectedIdx(0);
    } catch { /* silently ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { search(debouncedQ); }, [debouncedQ, search]);

  function go(item) {
    navigate(item.href);
    onClose();
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIdx]) {
      go(results[selectedIdx]);
    }
  }

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIdx];
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12vh' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ width: 560, maxWidth: '95vw', background: '#fff', borderRadius: 12, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid #e5e7eb' }}>
          <span style={{ color: '#9ca3af', fontSize: 18 }}>⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search test cases, bugs, suites…"
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, fontFamily: 'inherit', color: '#111827', background: 'transparent' }}
          />
          {loading && <span style={{ fontSize: 12, color: '#9ca3af' }}>Searching…</span>}
          <kbd style={kbdStyle}>Esc</kbd>
        </div>

        {/* Results */}
        {!query.trim() && (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
            Type to search across test cases, bugs, and suites
          </div>
        )}

        {query.trim() && results.length === 0 && !loading && (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
            No results for "{query}"
          </div>
        )}

        {results.length > 0 && (
          <div ref={listRef} style={{ maxHeight: 360, overflowY: 'auto' }}>
            {results.map((item, i) => (
              <div
                key={item.id}
                onClick={() => go(item)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px', cursor: 'pointer',
                  background: i === selectedIdx ? '#f5f3ff' : 'transparent',
                  borderLeft: i === selectedIdx ? '2px solid #6366f1' : '2px solid transparent',
                }}
                onMouseEnter={() => setSelectedIdx(i)}
              >
                <TypeChip type={item.type} />
                <span style={{ flex: 1, fontSize: 14, color: '#111827', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                <span style={{ fontSize: 12, color: '#9ca3af', flexShrink: 0 }}>{item.sub}</span>
                {i === selectedIdx && <span style={{ fontSize: 11, color: '#6366f1' }}>↵</span>}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', gap: 16, padding: '8px 16px', borderTop: '1px solid #f3f4f6', background: '#fafafa' }}>
          {[['↑↓', 'navigate'], ['↵', 'open'], ['Esc', 'close']].map(([key, label]) => (
            <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#9ca3af' }}>
              <kbd style={kbdStyle}>{key}</kbd> {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

const kbdStyle = {
  display: 'inline-block', padding: '1px 5px', borderRadius: 4,
  border: '1px solid #e5e7eb', background: '#f9fafb',
  fontSize: 11, fontFamily: 'monospace', color: '#374151',
};
