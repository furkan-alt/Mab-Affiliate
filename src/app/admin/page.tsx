'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { DollarSign, Users, Package, Clock, CheckCircle, XCircle, Loader2, Calendar } from 'lucide-react';
import StatsCard from '@/components/ui/StatsCard';
import AdminChart from '@/components/AdminChart';
import PendingTransactionsPreview from '@/components/PendingTransactionsPreview';

interface Transaction {
  id: string;
  customer_name: string;
  total_amount: number;
  commission_amount: number;
  status: string;
  transaction_date: string;
  partner?: { full_name: string };
  service?: { name: string };
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Stats
  const [totalCommission, setTotalCommission] = useState(0);
  const [partnerCount, setPartnerCount] = useState(0);
  const [serviceCount, setServiceCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);

  // Chart & transactions
  const [chartData, setChartData] = useState<{ name: string; earnings: number }[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([]);

  const router = useRouter();
  const supabase = createClient();

  const currentDate = new Date();
  const years = Array.from(
    { length: currentDate.getFullYear() - 2023 },
    (_, i) => 2024 + i
  );

  const months = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      router.push('/dashboard');
    }
  };

  const fetchData = async () => {
    setLoading(true);

    const currentMonth = new Date();
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    try {
      // Bu ayki toplam onaylı komisyon
      const { data: approvedData } = await supabase
        .from('transactions')
        .select('commission_amount')
        .eq('status', 'approved')
        .gte('transaction_date', startOfMonth.toISOString())
        .lte('transaction_date', endOfMonth.toISOString());

      setTotalCommission(
        approvedData?.reduce((sum, t) => sum + Number(t.commission_amount), 0) || 0
      );

      // Toplam partner sayısı
      const { count: pCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'partner');
      setPartnerCount(pCount || 0);

      // Aktif hizmet sayısı
      const { count: sCount } = await supabase
        .from('services')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      setServiceCount(sCount || 0);

      // İşlem sayıları (bu ay)
      const { count: pendCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      setPendingCount(pendCount || 0);

      const { count: appCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')
        .gte('transaction_date', startOfMonth.toISOString())
        .lte('transaction_date', endOfMonth.toISOString());
      setApprovedCount(appCount || 0);

      const { count: rejCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'rejected')
        .gte('transaction_date', startOfMonth.toISOString())
        .lte('transaction_date', endOfMonth.toISOString());
      setRejectedCount(rejCount || 0);

      // Aylık kazanç verisi (seçili yıl için)
      const startOfYear = new Date(selectedYear, 0, 1);
      const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59);

      const { data: yearlyData } = await supabase
        .from('transactions')
        .select('commission_amount, transaction_date')
        .eq('status', 'approved')
        .gte('transaction_date', startOfYear.toISOString())
        .lte('transaction_date', endOfYear.toISOString());

      // Aylık bazda grupla
      const monthlyData = months.map((month, index) => {
        const monthEarnings = yearlyData?.reduce((sum, t) => {
          const transDate = new Date(t.transaction_date);
          if (transDate.getMonth() === index && transDate.getFullYear() === selectedYear) {
            return sum + Number(t.commission_amount);
          }
          return sum;
        }, 0) || 0;

        return {
          name: month.substring(0, 3), // Kısa isim: Oca, Şub, Mar...
          earnings: monthEarnings,
        };
      });

      setChartData(monthlyData);

      // Bekleyen işlemler
      const { data: pendTrans } = await supabase
        .from('transactions')
        .select('*, partner:profiles!transactions_partner_id_fkey(full_name), service:services(name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);
      setPendingTransactions((pendTrans || []) as Transaction[]);

    } catch (error) {
      console.error('Dashboard data fetch error:', error);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const currentMonthName = currentDate.toLocaleDateString('tr-TR', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted">{currentMonthName} - Genel Bakış</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatsCard
          title="Toplam Komisyon"
          value={`$${totalCommission.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
          color="success"
        />
        <StatsCard
          title="Partnerler"
          value={partnerCount}
          icon={Users}
          color="primary"
        />
        <StatsCard
          title="Aktif Hizmetler"
          value={serviceCount}
          icon={Package}
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
        <StatsCard
          title="Reddedilen"
          value={rejectedCount}
          icon={XCircle}
          color="danger"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Aylık Komisyon Grafiği
            </h2>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="input w-auto text-sm"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <AdminChart data={chartData} />
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Bekleyen İşlemler
          </h2>
          <PendingTransactionsPreview transactions={pendingTransactions} />
        </div>
      </div>
    </div>
  );
}
