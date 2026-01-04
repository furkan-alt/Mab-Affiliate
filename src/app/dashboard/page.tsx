'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { DollarSign, ShoppingCart, Clock, CheckCircle, Loader2, Calendar } from 'lucide-react';
import StatsCard from '@/components/ui/StatsCard';
import DashboardChart from '@/components/DashboardChart';
import RecentTransactions from '@/components/RecentTransactions';
import { TransactionStatus } from '@/types';

interface Transaction {
  id: string;
  customer_name: string;
  total_amount: number;
  commission_amount: number;
  status: TransactionStatus;
  transaction_date: string;
  service?: { name: string };
}

export default function PartnerDashboard() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Filtre state
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  // Data state
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [chartData, setChartData] = useState<{ date: string; earnings: number; count: number }[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);

  const router = useRouter();
  const supabase = createClient();

  // Ay isimleri
  const months = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];

  // Yıl seçenekleri (2024'ten şu anki yıla kadar)
  const years = Array.from(
    { length: currentDate.getFullYear() - 2023 },
    (_, i) => 2024 + i
  );

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [userId, selectedMonth, selectedYear]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setUserId(user.id);
  };

  const fetchData = async () => {
    if (!userId) return;

    setLoading(true);

    const startOfMonth = new Date(selectedYear, selectedMonth, 1);
    const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

    try {
      // Toplam onaylı kazanç
      const { data: approvedData } = await supabase
        .from('transactions')
        .select('commission_amount')
        .eq('partner_id', userId)
        .eq('status', 'approved')
        .gte('transaction_date', startOfMonth.toISOString())
        .lte('transaction_date', endOfMonth.toISOString());

      setTotalEarnings(
        approvedData?.reduce((sum, t) => sum + Number(t.commission_amount), 0) || 0
      );

      // İşlem sayıları
      const { count: tCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('partner_id', userId)
        .gte('transaction_date', startOfMonth.toISOString())
        .lte('transaction_date', endOfMonth.toISOString());
      setTotalTransactions(tCount || 0);

      const { count: pCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('partner_id', userId)
        .eq('status', 'pending');
      setPendingCount(pCount || 0);

      const { count: aCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('partner_id', userId)
        .eq('status', 'approved')
        .gte('transaction_date', startOfMonth.toISOString())
        .lte('transaction_date', endOfMonth.toISOString());
      setApprovedCount(aCount || 0);

      // Günlük kazanç verisi (grafik için - ay içindeki günler)
      const { data: dailyData } = await supabase
        .from('transactions')
        .select('transaction_date, commission_amount')
        .eq('partner_id', userId)
        .eq('status', 'approved')
        .gte('transaction_date', startOfMonth.toISOString())
        .lte('transaction_date', endOfMonth.toISOString())
        .order('transaction_date', { ascending: true });

      // Günlük verileri grupla
      const grouped = dailyData?.reduce((acc, item) => {
        const date = new Date(item.transaction_date).toLocaleDateString('tr-TR', {
          day: 'numeric',
          month: 'short',
        });
        const existing = acc.find((d) => d.date === date);
        if (existing) {
          existing.earnings += Number(item.commission_amount);
          existing.count += 1;
        } else {
          acc.push({
            date,
            earnings: Number(item.commission_amount),
            count: 1,
          });
        }
        return acc;
      }, [] as { date: string; earnings: number; count: number }[]) || [];

      setChartData(grouped);

      // Son işlemler
      const { data: recent } = await supabase
        .from('transactions')
        .select('*, service:services(name)')
        .eq('partner_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);
      setRecentTransactions((recent || []) as Transaction[]);

    } catch (error) {
      console.error('Dashboard data fetch error:', error);
    }

    setLoading(false);
  };

  if (loading && !userId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted">
            {months[selectedMonth]} {selectedYear} - Hakediş özeti
          </p>
        </div>

        {/* Month/Year Filter */}
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-muted" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="input w-auto"
          >
            {months.map((month, index) => (
              <option key={index} value={index}>
                {month}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="input w-auto"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Toplam Hakediş"
          value={`$${totalEarnings.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
          color="success"
        />
        <StatsCard
          title="Toplam İşlem"
          value={totalTransactions}
          icon={ShoppingCart}
          color="primary"
        />
        <StatsCard
          title="Bekleyen"
          value={pendingCount}
          icon={Clock}
          color="warning"
        />
        <StatsCard
          title="Onaylanan"
          value={approvedCount}
          icon={CheckCircle}
          color="success"
        />
      </div>

      {/* Chart */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          {months[selectedMonth]} {selectedYear} - Aylık Kazanç Grafiği
        </h2>
        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <DashboardChart data={chartData} />
        )}
      </div>

      {/* Recent Transactions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Son İşlemler
        </h2>
        <RecentTransactions transactions={recentTransactions} />
      </div>
    </div>
  );
}
