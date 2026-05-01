const colors = {
  green:  'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  blue:   'bg-blue-100 text-blue-800',
  red:    'bg-red-100 text-red-800',
  gray:   'bg-gray-100 text-gray-700',
  orange: 'bg-orange-100 text-orange-800',
  purple: 'bg-purple-100 text-purple-800',
};

export default function Badge({ children, color = 'gray', className = '' }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[color]} ${className}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  const map = {
    pending:    { color: 'gray',   label: 'Pending' },
    confirmed:  { color: 'blue',   label: 'Confirmed' },
    preparing:  { color: 'yellow', label: 'Preparing' },
    ready:      { color: 'green',  label: 'Ready' },
    completed:  { color: 'purple', label: 'Completed' },
    cancelled:  { color: 'red',    label: 'Cancelled' },
  };
  const { color, label } = map[status] || { color: 'gray', label: status };
  return <Badge color={color}>{label}</Badge>;
}
