const COLORS = {
  Critical: { bg: '#fee2e2', text: '#991b1b' },
  Major:    { bg: '#ffedd5', text: '#9a3412' },
  Minor:    { bg: '#fef9c3', text: '#854d0e' },
  Trivial:  { bg: '#f3f4f6', text: '#374151' },
};

export default function SeverityBadge({ severity }) {
  const { bg, text } = COLORS[severity] ?? COLORS.Trivial;
  return (
    <span style={{ background: bg, color: text, padding: '2px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
      {severity}
    </span>
  );
}
