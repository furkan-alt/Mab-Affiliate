'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2, Download, Calendar, Filter } from 'lucide-react';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { TransactionStatus } from '@/types';
import * as XLSX from 'xlsx';

interface Transaction {
  id: string;
  customer_name: string;
  total_amount: number;
  commission_rate: number;
  commission_amount: number;
  status: TransactionStatus;
  transaction_date: string;
  notes?: string;
  service?: {
    name: string;
  };
}

export default function HistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  // Filtreler
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchTransactions();
  }, [page, statusFilter, startDate, endDate]);

  const fetchTransactions = async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    let query = supabase
      .from('transactions')
      .select(
        `
        *,
        service:services(name)
      `,
        { count: 'exact' }
      )
      .eq('partner_id', user.id)
      .order('transaction_date', { ascending: false });

    // Filtreler
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }
    if (startDate) {
      query = query.gte('transaction_date', startDate);
    }
    if (endDate) {
      query = query.lte('transaction_date', `${endDate}T23:59:59`);
    }

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      console.error('Error fetching transactions:', error);
      setLoading(false);
      return;
    }

    setTransactions(data || []);
    setTotal(count || 0);
    setLoading(false);
  };

  const handleExport = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    // Tüm verileri export için çek
    let query = supabase
      .from('transactions')
      .select(
        `
        *,
        service:services(name)
      `
      )
      .eq('partner_id', user.id)
      .order('transaction_date', { ascending: false });

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }
    if (startDate) {
      query = query.gte('transaction_date', startDate);
    }
    if (endDate) {
      query = query.lte('transaction_date', `${endDate}T23:59:59`);
    }

    const { data } = await query;

    if (!data || data.length === 0) return;

    // Excel formatına dönüştür
    const exportData = data.map((t) => ({
      'Müşteri Adı': t.customer_name,
      Hizmet: t.service?.name || '-',
      Tarih: new Date(t.transaction_date).toLocaleDateString('tr-TR'),
      'Tutar ($)': t.total_amount,
      'Komisyon Oranı (%)': t.commission_rate,
      'Komisyon ($)': t.commission_amount,
      Durum:
        t.status === 'pending'
          ? 'Bekliyor'
          : t.status === 'approved'
          ? 'Onaylandı'
          : 'Reddedildi',
      Notlar: t.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'İşlemler');

    const fileName = `islem-gecmisi-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const columns = [
    {
      key: 'customer_name',
      header: 'Müşteri',
      render: (item: Transaction) => (
        <span className="font-medium">{item.customer_name}</span>
      ),
    },
    {
      key: 'service',
      header: 'Hizmet',
      render: (item: Transaction) => item.service?.name || '-',
    },
    {
      key: 'transaction_date',
      header: 'Tarih',
      render: (item: Transaction) =>
        new Date(item.transaction_date).toLocaleDateString('tr-TR'),
    },
    {
      key: 'total_amount',
      header: 'Tutar',
      className: 'text-right',
      render: (item: Transaction) =>
        `$${Number(item.total_amount).toLocaleString('tr-TR', {
          minimumFractionDigits: 2,
        })}`,
    },
    {
      key: 'commission_amount',
      header: 'Komisyon',
      className: 'text-right',
      render: (item: Transaction) => (
        <span className="font-medium text-success">
          ${Number(item.commission_amount).toLocaleString('tr-TR', {
            minimumFractionDigits: 2,
          })}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Durum',
      render: (item: Transaction) => <StatusBadge status={item.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">İşlem Geçmişi</h1>
          <p className="text-muted">Tüm satış işlemlerinizi görüntüleyin.</p>
        </div>
        <button onClick={handleExport} className="btn btn-outline">
          <Download className="w-4 h-4 mr-2" />
          Excel İndir
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="input w-auto"
            >
              <option value="">Tüm Durumlar</option>
              <option value="pending">Bekliyor</option>
              <option value="approved">Onaylandı</option>
              <option value="rejected">Reddedildi</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="input w-auto"
              placeholder="Başlangıç"
            />
            <span className="text-muted">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="input w-auto"
              placeholder="Bitiş"
            />
          </div>

          {(statusFilter || startDate || endDate) && (
            <button
              onClick={() => {
                setStatusFilter('');
                setStartDate('');
                setEndDate('');
                setPage(1);
              }}
              className="btn btn-outline text-sm"
            >
              Filtreleri Temizle
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={transactions}
        keyExtractor={(item) => item.id}
        loading={loading}
        emptyMessage="İşlem bulunamadı."
        pagination={{
          page,
          pageSize,
          total,
          onPageChange: setPage,
        }}
      />
    </div>
  );
}
