import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DollarSign, Users, Package, Clock, CheckCircle, XCircle } from 'lucide-react';
import StatsCard from '@/components/ui/StatsCard';
import AdminChart from '@/components/AdminChart';
import PendingTransactionsPreview from '@/components/PendingTransactionsPreview';
import type { Transaction } from '@/types';

export default async function AdminDashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const currentMonth = new Date();
  const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

  // Varsayılan değerler
  let totalCommission = 0;
  let partnerCount = 0;
  let serviceCount = 0;
  let pendingCount = 0;
  let approvedCount = 0;
  let rejectedCount = 0;
  let chartData: { name: string; earnings: number }[] = [];
  let pendingTransactions: Transaction[] = [];

  try {
    // Toplam onaylı komisyon
    const { data: approvedData } = await supabase
      .from('transactions')
      .select('commission_amount')
      .eq('status', 'approved')
      .gte('transaction_date', startOfMonth.toISOString())
      .lte('transaction_date', endOfMonth.toISOString());

    totalCommission = approvedData?.reduce(
      (sum, t) => sum + Number(t.commission_amount),
      0
    ) || 0;

    // Toplam partner sayısı
    const { count: pCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'partner');
    partnerCount = pCount || 0;

    // Aktif hizmet sayısı
    const { count: sCount } = await supabase
      .from('services')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    serviceCount = sCount || 0;

    // İşlem sayıları
    const { count: pendCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    pendingCount = pendCount || 0;

    const { count: appCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
      .gte('transaction_date', startOfMonth.toISOString())
      .lte('transaction_date', endOfMonth.toISOString());
    approvedCount = appCount || 0;

    const { count: rejCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'rejected')
      .gte('transaction_date', startOfMonth.toISOString())
      .lte('transaction_date', endOfMonth.toISOString());
    rejectedCount = rejCount || 0;

    // Partner bazlı kazanç verisi (grafik için)
    const { data: partnerEarnings } = await supabase
      .from('transactions')
      .select('partner_id, commission_amount')
      .eq('status', 'approved')
      .gte('transaction_date', startOfMonth.toISOString())
      .lte('transaction_date', endOfMonth.toISOString());

    // Partner bazında grupla (basitleştirilmiş)
    chartData = partnerEarnings?.reduce((acc, item) => {
      const partnerName = 'Partner';
      const existing = acc.find((d) => d.name === partnerName);
      if (existing) {
        existing.earnings += Number(item.commission_amount);
      } else {
        acc.push({
          name: partnerName,
          earnings: Number(item.commission_amount),
        });
      }
      return acc;
    }, [] as { name: string; earnings: number }[]) || [];

    // Bekleyen işlemler (basitleştirilmiş)
    const { data: pendTrans } = await supabase
      .from('transactions')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5);
    pendingTransactions = (pendTrans || []) as Transaction[];

  } catch (error) {
    console.error('Dashboard data fetch error:', error);
  }

  const monthName = currentMonth.toLocaleDateString('tr-TR', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted">{monthName} - Genel Bakış</p>
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
          value={partnerCount || 0}
          icon={Users}
          color="primary"
        />
        <StatsCard
          title="Aktif Hizmetler"
          value={serviceCount || 0}
          icon={Package}
          color="primary"
        />
        <StatsCard
          title="Bekleyen"
          value={pendingCount || 0}
          icon={Clock}
          color="warning"
        />
        <StatsCard
          title="Onaylanan"
          value={approvedCount || 0}
          icon={CheckCircle}
          color="success"
        />
        <StatsCard
          title="Reddedilen"
          value={rejectedCount || 0}
          icon={XCircle}
          color="danger"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Partner Bazlı Kazançlar
          </h2>
          <AdminChart data={chartData} />
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Bekleyen İşlemler
          </h2>
          <PendingTransactionsPreview transactions={pendingTransactions || []} />
        </div>
      </div>
    </div>
  );
}
