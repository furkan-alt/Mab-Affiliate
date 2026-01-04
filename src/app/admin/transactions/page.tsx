'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  Download,
  Calendar,
  Filter,
  CheckCircle,
  XCircle,
  Eye,
} from 'lucide-react';
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
  partner?: {
    full_name: string;
    email: string;
  };
}

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  // Filtreler
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [partnerFilter, setPartnerFilter] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Partnerler
  const [partners, setPartners] = useState<{ id: string; full_name: string }[]>(
    []
  );

  // Detail modal
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchPartners();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [page, statusFilter, partnerFilter, startDate, endDate]);

  const fetchPartners = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'partner')
      .order('full_name');

    setPartners(data || []);
  };

  const fetchTransactions = async () => {
    setLoading(true);

    let query = supabase
      .from('transactions')
      .select(
        `
        *,
        service:services(name),
        partner:profiles!transactions_partner_id_fkey(full_name, email)
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false });

    // Filtreler
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }
    if (partnerFilter) {
      query = query.eq('partner_id', partnerFilter);
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

  const handleAction = async (
    transactionId: string,
    action: 'approved' | 'rejected'
  ) => {
    setActionLoading(transactionId);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('transactions')
      .update({
        status: action,
        approved_at: action === 'approved' ? new Date().toISOString() : null,
        approved_by: action === 'approved' ? user?.id : null,
      })
      .eq('id', transactionId);

    if (error) {
      console.error('Error updating transaction:', error);
    } else {
      fetchTransactions();
    }

    setActionLoading(null);
    setSelectedTransaction(null);
  };

  const handleExport = async () => {
    let query = supabase
      .from('transactions')
      .select(
        `
        *,
        service:services(name),
        partner:profiles!transactions_partner_id_fkey(full_name, email)
      `
      )
      .order('transaction_date', { ascending: false });

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }
    if (partnerFilter) {
      query = query.eq('partner_id', partnerFilter);
    }
    if (startDate) {
      query = query.gte('transaction_date', startDate);
    }
    if (endDate) {
      query = query.lte('transaction_date', `${endDate}T23:59:59`);
    }

    const { data } = await query;

    if (!data || data.length === 0) return;

    const exportData = data.map((t) => ({
      Partner: t.partner?.full_name || '-',
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

    const fileName = `islemler-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">İşlem Yönetimi</h1>
          <p className="text-muted">Satış işlemlerini onaylayın veya reddedin.</p>
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

          <select
            value={partnerFilter}
            onChange={(e) => {
              setPartnerFilter(e.target.value);
              setPage(1);
            }}
            className="input w-auto"
          >
            <option value="">Tüm Partnerler</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>

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
            />
          </div>

          {(statusFilter || partnerFilter || startDate || endDate) && (
            <button
              onClick={() => {
                setStatusFilter('pending');
                setPartnerFilter('');
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
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-muted mt-2">Yükleniyor...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-muted">İşlem bulunamadı.</div>
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Partner</th>
                    <th>Müşteri</th>
                    <th>Hizmet</th>
                    <th>Tarih</th>
                    <th className="text-right">Tutar</th>
                    <th className="text-right">Komisyon</th>
                    <th>Durum</th>
                    <th className="text-center">İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <div>
                          <p className="font-medium">{t.partner?.full_name}</p>
                          <p className="text-sm text-muted">
                            {t.partner?.email}
                          </p>
                        </div>
                      </td>
                      <td className="font-medium">{t.customer_name}</td>
                      <td>{t.service?.name}</td>
                      <td>
                        {new Date(t.transaction_date).toLocaleDateString(
                          'tr-TR'
                        )}
                      </td>
                      <td className="text-right">
                        ${Number(t.total_amount).toLocaleString('tr-TR', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="text-right font-medium text-success">
                        ${Number(t.commission_amount).toLocaleString('tr-TR', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td>
                        <StatusBadge status={t.status} />
                      </td>
                      <td>
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedTransaction(t)}
                            className="p-2 rounded-lg hover:bg-background text-muted hover:text-foreground"
                            title="Detay"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {t.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleAction(t.id, 'approved')}
                                disabled={actionLoading === t.id}
                                className="p-2 rounded-lg hover:bg-success/10 text-success"
                                title="Onayla"
                              >
                                {actionLoading === t.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => handleAction(t.id, 'rejected')}
                                disabled={actionLoading === t.id}
                                className="p-2 rounded-lg hover:bg-danger/10 text-danger"
                                title="Reddet"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <p className="text-sm text-muted">
                  Toplam {total} kayıttan {(page - 1) * pageSize + 1} -{' '}
                  {Math.min(page * pageSize, total)} arası
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="btn btn-outline p-2 disabled:opacity-50"
                  >
                    Önceki
                  </button>
                  <span className="text-sm">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                    className="btn btn-outline p-2 disabled:opacity-50"
                  >
                    Sonraki
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              İşlem Detayı
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted">Partner</p>
                  <p className="font-medium">
                    {selectedTransaction.partner?.full_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted">Müşteri</p>
                  <p className="font-medium">
                    {selectedTransaction.customer_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted">Hizmet</p>
                  <p className="font-medium">
                    {selectedTransaction.service?.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted">Tarih</p>
                  <p className="font-medium">
                    {new Date(
                      selectedTransaction.transaction_date
                    ).toLocaleDateString('tr-TR')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted">Tutar</p>
                  <p className="font-medium">
                    $
                    {Number(selectedTransaction.total_amount).toLocaleString(
                      'tr-TR',
                      { minimumFractionDigits: 2 }
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted">
                    Komisyon (%{selectedTransaction.commission_rate})
                  </p>
                  <p className="font-medium text-success">
                    $
                    {Number(
                      selectedTransaction.commission_amount
                    ).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {selectedTransaction.notes && (
                <div>
                  <p className="text-sm text-muted">Notlar</p>
                  <p className="font-medium">{selectedTransaction.notes}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted">Durum</p>
                <StatusBadge status={selectedTransaction.status} />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              {selectedTransaction.status === 'pending' && (
                <>
                  <button
                    onClick={() =>
                      handleAction(selectedTransaction.id, 'approved')
                    }
                    disabled={actionLoading === selectedTransaction.id}
                    className="btn btn-primary flex-1"
                  >
                    {actionLoading === selectedTransaction.id ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Onayla
                  </button>
                  <button
                    onClick={() =>
                      handleAction(selectedTransaction.id, 'rejected')
                    }
                    disabled={actionLoading === selectedTransaction.id}
                    className="btn bg-danger text-white hover:bg-danger/90 flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reddet
                  </button>
                </>
              )}
              <button
                onClick={() => setSelectedTransaction(null)}
                className="btn btn-outline flex-1"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
