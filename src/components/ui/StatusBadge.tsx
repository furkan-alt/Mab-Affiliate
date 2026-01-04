import { TransactionStatus } from '@/types';

interface StatusBadgeProps {
  status: TransactionStatus;
}

const statusConfig = {
  pending: {
    label: 'Bekliyor',
    className: 'badge-pending',
  },
  approved: {
    label: 'Onaylandı',
    className: 'badge-approved',
  },
  rejected: {
    label: 'Reddedildi',
    className: 'badge-rejected',
  },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return <span className={`badge ${config.className}`}>{config.label}</span>;
}
