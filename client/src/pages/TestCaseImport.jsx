import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';

// ── Styles ────────────────────────────────────────────────────────────────────

const btn = {
  base: {
    padding: '8px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500,
    cursor: 'pointer', border: 'none', display: 'inline-block',
  },
  primary: { background: '#6366f1', color: '#fff' },
  secondary: { background: '#fff', color: '#374151', border: '1px solid #e5e7eb' },
  danger: { background: '#fff', color: '#dc2626', border: '1px solid #fecaca' },
};

const thStyle = {
  padding: '8px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600,
  color: '#6b7280', borderBottom: '1px solid #e5e7eb',
  textTransform: 'uppercase', letterSpacing: '0.05em',
};
const tdStyle = {
  padding: '9px 12px', borderBottom: '1px solid #f3f4f6',
  fontSize: 13, verticalAlign: 'top',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function SeverityBadge({ value }) {
  const colors = {
    Critical: { bg: '#fee2e2', fg: '#dc2626' },
    Major:    { bg: '#ffedd5', fg: '#c2410c' },
    Minor:    { bg: '#fef9c3', fg: '#a16207' },
    Trivial:  { bg: '#f3f4f6', fg: '#6b7280' },
  };
  const c = colors[value] ?? { bg: '#f3f4f6', fg: '#9ca3af' };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 7px', borderRadius: 4,
      fontSize: 11, fontWeight: 600, background: c.bg, color: c.fg,
    }}>
      {value || '—'}
    </span>
  );
}

function truncate(str, len = 80) {
  if (!str) return '—';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

// ── Idle ──────────────────────────────────────────────────────────────────────

function IdleStep({ suites, suiteId, setSuiteId, file, setFile, onUpload, uploading }) {
  const fileRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }

  const canSubmit = suiteId && file && !uploading;

  return (
    <div style={{ maxWidth: 560 }}>
      {/* Suite selector */}
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
        Target suite
      </label>
      <select
        value={suiteId}
        onChange={e => setSuiteId(e.target.value)}
        style={{
          width: '100%', padding: '8px 10px', borderRadius: 6,
          border: '1px solid #e5e7eb', fontSize: 13, marginBottom: 20,
          background: '#fff', color: '#111827',
        }}
      >
        <option value="">— select a suite —</option>
        {suites.map(s => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>

      {/* Drop zone */}
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
        CSV file
      </label>
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? '#6366f1' : '#d1d5db'}`,
          borderRadius: 8, padding: '2rem', textAlign: 'center',
          background: dragging ? '#eef2ff' : '#fafafa',
          cursor: 'pointer', transition: 'all .15s',
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
        {file ? (
          <>
            <div style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>{file.name}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>
              {(file.size / 1024).toFixed(1)} KB · click to change
            </div>
          </>
        ) : (
          <>
            <div style={{ fontWeight: 500, color: '#374151' }}>Drop a CSV here or click to browse</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
              Required columns: <code style={{ fontFamily: 'monospace' }}>title, severity, steps</code>
              &nbsp;· max 5 MB
            </div>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          style={{ display: 'none' }}
          onChange={e => { if (e.target.files[0]) setFile(e.target.files[0]); }}
        />
      </div>

      <button
        onClick={onUpload}
        disabled={!canSubmit}
        style={{
          ...btn.base, ...btn.primary,
          opacity: canSubmit ? 1 : 0.45,
          cursor: canSubmit ? 'pointer' : 'default',
        }}
      >
        {uploading ? 'Uploading…' : 'Upload & Preview'}
      </button>
    </div>
  );
}

// ── Preview ───────────────────────────────────────────────────────────────────

function PreviewStep({ preview, onImport, onReset, importing }) {
  const { suite, total, valid, invalid, rows } = preview;

  return (
    <div>
      {/* Summary bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '1rem',
        background: '#f9fafb', border: '1px solid #e5e7eb',
        borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 13, color: '#374151' }}>
          <strong>{total}</strong> rows in <strong>{suite.name}</strong>
        </span>
        <span style={{
          fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
          background: '#dcfce7', color: '#16a34a',
        }}>
          {valid} valid
        </span>
        {invalid > 0 && (
          <span style={{
            fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
            background: '#fee2e2', color: '#dc2626',
          }}>
            {invalid} invalid
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          <button
            onClick={onImport}
            disabled={valid === 0 || importing}
            style={{
              ...btn.base, ...btn.primary,
              opacity: valid > 0 && !importing ? 1 : 0.45,
              cursor: valid > 0 && !importing ? 'pointer' : 'default',
            }}
          >
            {importing ? 'Importing…' : `Import ${valid} valid row${valid !== 1 ? 's' : ''}`}
          </button>
          <button onClick={onReset} style={{ ...btn.base, ...btn.secondary }}>
            Choose a different file
          </button>
        </div>
      </div>

      {/* Rows table */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: 55 }}>Row</th>
              <th style={thStyle}>Title</th>
              <th style={{ ...thStyle, width: 100 }}>Severity</th>
              <th style={{ ...thStyle, maxWidth: 220 }}>Steps (preview)</th>
              <th style={thStyle}>Errors</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr
                key={row.rowNum}
                style={{ background: row.valid ? undefined : '#fffbeb' }}
              >
                <td style={{ ...tdStyle, color: '#9ca3af' }}>{row.rowNum}</td>
                <td style={{ ...tdStyle, color: '#111827', fontWeight: row.valid ? 500 : 400 }}>
                  {row.data.title || <span style={{ color: '#f59e0b', fontStyle: 'italic' }}>missing</span>}
                </td>
                <td style={tdStyle}>
                  <SeverityBadge value={row.data.severity} />
                </td>
                <td style={{ ...tdStyle, color: '#6b7280', maxWidth: 220 }}>
                  {truncate(row.data.steps, 80)}
                </td>
                <td style={{ ...tdStyle }}>
                  {row.valid ? (
                    <span style={{ color: '#16a34a', fontSize: 12 }}>✓ OK</span>
                  ) : (
                    <ul style={{ margin: 0, padding: '0 0 0 16px' }}>
                      {row.errors.map((e, i) => (
                        <li key={i} style={{ color: '#dc2626', fontSize: 12 }}>{e}</li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Done ──────────────────────────────────────────────────────────────────────

function DoneStep({ result, suiteName, suiteId, onReset }) {
  const { imported, skipped } = result;
  return (
    <div style={{ maxWidth: 520 }}>
      <div style={{
        background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8,
        padding: '1.25rem 1.5rem', marginBottom: '1.5rem',
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#15803d', marginBottom: 6 }}>
          Import complete
        </div>
        <div style={{ fontSize: 13, color: '#166534' }}>
          <strong>{imported}</strong> test case{imported !== 1 ? 's' : ''} imported into <strong>{suiteName}</strong>.
          {skipped > 0 && (
            <> <strong>{skipped}</strong> row{skipped !== 1 ? 's' : ''} skipped (failed re-validation).</>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <Link
          to={`/test-suites/${suiteId}`}
          style={{
            ...btn.base, ...btn.primary,
            textDecoration: 'none', lineHeight: 1.5,
          }}
        >
          View suite →
        </Link>
        <button onClick={onReset} style={{ ...btn.base, ...btn.secondary }}>
          Import another file
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TestCaseImport() {
  const [suites, setSuites] = useState([]);
  const [suiteId, setSuiteId] = useState('');
  const [file, setFile] = useState(null);

  // state: 'idle' | 'uploading' | 'preview' | 'importing' | 'done'
  const [phase, setPhase] = useState('idle');
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [importError, setImportError] = useState(null);

  useEffect(() => {
    fetch('/api/test-suites')
      .then(r => r.json())
      .then(json => { if (json.success) setSuites(json.data ?? []); })
      .catch(() => {});
  }, []);

  const handleUpload = useCallback(async () => {
    setUploadError(null);
    setPhase('uploading');

    try {
      const csv = await file.text();
      const res = await fetch('/api/test-cases/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suite_id: Number(suiteId), csv }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Preview failed');
      setPreview(json.data);
      setPhase('preview');
    } catch (err) {
      setUploadError(err.message);
      setPhase('idle');
    }
  }, [file, suiteId]);

  const handleImport = useCallback(async () => {
    setImportError(null);
    setPhase('importing');

    const validRows = preview.rows.filter(r => r.valid).map(r => r.data);

    try {
      const res = await fetch('/api/test-cases/import/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suite_id: Number(suiteId), rows: validRows }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Import failed');
      setResult(json.data);
      setPhase('done');
    } catch (err) {
      setImportError(err.message);
      setPhase('preview');
    }
  }, [preview, suiteId]);

  function reset() {
    setPhase('idle');
    setFile(null);
    setPreview(null);
    setResult(null);
    setUploadError(null);
    setImportError(null);
  }

  const suiteName = suites.find(s => String(s.id) === String(suiteId))?.name ?? '';

  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 0.25rem', fontSize: 22, fontWeight: 700, color: '#111827' }}>
        Import Test Cases
      </h1>
      <p style={{ margin: '0 0 2rem', fontSize: 13, color: '#6b7280' }}>
        Upload a CSV file to bulk-create test cases in a suite.
        Required columns: <code style={{ fontFamily: 'monospace', fontSize: 12 }}>title</code>,{' '}
        <code style={{ fontFamily: 'monospace', fontSize: 12 }}>severity</code>,{' '}
        <code style={{ fontFamily: 'monospace', fontSize: 12 }}>steps</code>.
        Optional: <code style={{ fontFamily: 'monospace', fontSize: 12 }}>description</code>,{' '}
        <code style={{ fontFamily: 'monospace', fontSize: 12 }}>expected_result</code>.
      </p>

      {uploadError && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
          padding: '0.75rem 1rem', color: '#dc2626', fontSize: 13, marginBottom: '1rem',
        }}>
          {uploadError}
        </div>
      )}

      {importError && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
          padding: '0.75rem 1rem', color: '#dc2626', fontSize: 13, marginBottom: '1rem',
        }}>
          {importError}
        </div>
      )}

      {(phase === 'idle' || phase === 'uploading') && (
        <IdleStep
          suites={suites}
          suiteId={suiteId}
          setSuiteId={setSuiteId}
          file={file}
          setFile={setFile}
          onUpload={handleUpload}
          uploading={phase === 'uploading'}
        />
      )}

      {(phase === 'preview' || phase === 'importing') && preview && (
        <PreviewStep
          preview={preview}
          onImport={handleImport}
          onReset={reset}
          importing={phase === 'importing'}
        />
      )}

      {phase === 'done' && result && (
        <DoneStep
          result={result}
          suiteName={suiteName}
          suiteId={suiteId}
          onReset={reset}
        />
      )}
    </div>
  );
}
