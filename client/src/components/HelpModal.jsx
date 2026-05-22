import { SHORTCUT_DEFS } from '../shortcuts';

export default function HelpModal({ onClose }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ width: 480, maxWidth: '95vw', background: '#fff', borderRadius: 12, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>Keyboard shortcuts</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>
        </div>

        <div style={{ padding: '16px 20px', maxHeight: '70vh', overflowY: 'auto' }}>
          {SHORTCUT_DEFS.map(group => (
            <div key={group.category} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                {group.category}
              </div>
              <div style={{ background: '#f9fafb', borderRadius: 8, overflow: 'hidden' }}>
                {group.shortcuts.map((s, i) => (
                  <div key={s.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderBottom: i < group.shortcuts.length - 1 ? '1px solid #f3f4f6' : 'none',
                  }}>
                    <span style={{ fontSize: 13, color: '#374151' }}>{s.description}</span>
                    <kbd style={kbdStyle}>{s.display}</kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid #f3f4f6', background: '#fafafa', textAlign: 'center' }}>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>Press <kbd style={kbdStyle}>?</kbd> or <kbd style={kbdStyle}>Esc</kbd> to close</span>
        </div>
      </div>
    </div>
  );
}

const kbdStyle = {
  display: 'inline-block', padding: '2px 7px', borderRadius: 4,
  border: '1px solid #e5e7eb', background: '#fff',
  fontSize: 12, fontFamily: 'monospace', color: '#374151',
  boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
};
