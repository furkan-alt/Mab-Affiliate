'use client';

import StatusBadge from '@/components/ui/StatusBadge';
import { TransactionStatus } from '@/types';

interface Transaction {
  id: string;
  customer_name: string;
  total_amount: number;
  commission_amount: number;
  status: TransactionStatus;
  transaction_date: string;
  service?: {
    name: string;
  };
}

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export default function RecentTransactions({
  transactions,
}: RecentTransactionsProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-muted">
        Henüz işlem bulunmuyor.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>Müşteri</th>
            <th>Hizmet</th>
            <th>Tarih</th>
            <th className="text-right">Tutar</th>
            <th className="text-right">Komisyon</th>
            <th>Durum</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr key={transaction.id}>
              <td className="font-medium">{transaction.customer_name}</td>
              <td>{transaction.service?.name || '-'}</td>
              <td>
                {new Date(transaction.transaction_date).toLocaleDateString(
                  'tr-TR'
                )}
              </td>
              <td className="text-right">
                ${Number(transaction.total_amount).toLocaleString('tr-TR', {
                  minimumFractionDigits: 2,
                })}
              </td>
              <td className="text-right font-medium text-success">
                ${Number(transaction.commission_amount).toLocaleString('tr-TR', {
                  minimumFractionDigits: 2,
                })}
              </td>
              <td>
                <StatusBadge status={transaction.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
