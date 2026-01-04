'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface Transaction {
  id: string;
  customer_name: string;
  total_amount: number;
  commission_amount: number;
  transaction_date: string;
  service?: {
    name: string;
  };
  partner?: {
    full_name: string;
  };
}

interface PendingTransactionsPreviewProps {
  transactions: Transaction[];
}

export default function PendingTransactionsPreview({
  transactions,
}: PendingTransactionsPreviewProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-muted">
        Bekleyen işlem bulunmuyor.
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-3">
        {transactions.map((transaction) => (
          <div
            key={transaction.id}
            className="flex items-center justify-between p-3 rounded-lg bg-background"
          >
            <div>
              <p className="font-medium text-foreground">
                {transaction.customer_name}
              </p>
              <p className="text-sm text-muted">
                {transaction.partner?.full_name} • {transaction.service?.name}
              </p>
            </div>
            <div className="text-right">
              <p className="font-medium text-foreground">
                ${Number(transaction.total_amount).toLocaleString('tr-TR', {
                  minimumFractionDigits: 2,
                })}
              </p>
              <p className="text-sm text-success">
                +${Number(transaction.commission_amount).toLocaleString('tr-TR', {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>
        ))}
      </div>

      <Link
        href="/admin/transactions"
        className="flex items-center justify-center gap-2 mt-4 p-3 rounded-lg border border-border text-muted hover:text-foreground hover:bg-background transition-colors"
      >
        <span>Tüm İşlemleri Görüntüle</span>
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
