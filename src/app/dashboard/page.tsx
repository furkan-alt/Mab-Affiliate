import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DollarSign, ShoppingCart, Clock, CheckCircle } from 'lucide-react';
import StatsCard from '@/components/ui/StatsCard';
import DashboardChart from '@/components/DashboardChart';
import RecentTransactions from '@/components/RecentTransactions';

export default async function PartnerDashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // İstatistikleri al
  const currentMonth = new Date();
  const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

  // Toplam onaylı kazanç
  const { data: approvedData } = await supabase
    .from('transactions')
    .select('commission_amount')
    .eq('partner_id', user.id)
    .eq('status', 'approved')
    .gte('transaction_date', startOfMonth.toISOString())
    .lte('transaction_date', endOfMonth.toISOString());

  const totalEarnings = approvedData?.reduce(
    (sum, t) => sum + Number(t.commission_amount),
    0
  ) || 0;

  // İşlem sayıları
  const { count: totalTransactions } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('partner_id', user.id)
    .gte('transaction_date', startOfMonth.toISOString())
    .lte('transaction_date', endOfMonth.toISOString());

  const { count: pendingCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('partner_id', user.id)
    .eq('status', 'pending');

  const { count: approvedCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('partner_id', user.id)
    .eq('status', 'approved')
    .gte('transaction_date', startOfMonth.toISOString())
    .lte('transaction_date', endOfMonth.toISOString());

  // Günlük kazanç verisi (grafik için)
  const { data: dailyData } = await supabase
    .from('transactions')
    .select('transaction_date, commission_amount')
    .eq('partner_id', user.id)
    .eq('status', 'approved')
    .gte('transaction_date', startOfMonth.toISOString())
    .lte('transaction_date', endOfMonth.toISOString())
    .order('transaction_date', { ascending: true });

  // Günlük verileri grupla
  const chartData = dailyData?.reduce((acc, item) => {
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

  // Son işlemler
  const { data: recentTransactions } = await supabase
    .from('transactions')
    .select(`
      *,
      service:services(name)
    `)
    .eq('partner_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  const monthName = currentMonth.toLocaleDateString('tr-TR', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted">
            {monthName} - Hakediş özeti
          </p>
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
          value={totalTransactions || 0}
          icon={ShoppingCart}
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
      </div>

      {/* Chart */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Günlük Kazanç Grafiği
        </h2>
        <DashboardChart data={chartData} />
      </div>

      {/* Recent Transactions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Son İşlemler
        </h2>
        <RecentTransactions transactions={recentTransactions || []} />
      </div>
    </div>
  );
}
