import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DollarSign, Users, Package, Clock, CheckCircle, XCircle } from 'lucide-react';
import StatsCard from '@/components/ui/StatsCard';
import AdminChart from '@/components/AdminChart';
import PendingTransactionsPreview from '@/components/PendingTransactionsPreview';

export default async function AdminDashboard() {
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

  // Toplam onaylı komisyon
  const { data: approvedData } = await supabase
    .from('transactions')
    .select('commission_amount')
    .eq('status', 'approved')
    .gte('transaction_date', startOfMonth.toISOString())
    .lte('transaction_date', endOfMonth.toISOString());

  const totalCommission = approvedData?.reduce(
    (sum, t) => sum + Number(t.commission_amount),
    0
  ) || 0;

  // Toplam partner sayısı
  const { count: partnerCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'partner');

  // Aktif hizmet sayısı
  const { count: serviceCount } = await supabase
    .from('services')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  // İşlem sayıları
  const { count: pendingCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  const { count: approvedCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved')
    .gte('transaction_date', startOfMonth.toISOString())
    .lte('transaction_date', endOfMonth.toISOString());

  const { count: rejectedCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'rejected')
    .gte('transaction_date', startOfMonth.toISOString())
    .lte('transaction_date', endOfMonth.toISOString());

  // Partner bazlı kazanç verisi (grafik için)
  const { data: partnerEarnings } = await supabase
    .from('transactions')
    .select(`
      partner_id,
      commission_amount,
      partner:profiles(full_name)
    `)
    .eq('status', 'approved')
    .gte('transaction_date', startOfMonth.toISOString())
    .lte('transaction_date', endOfMonth.toISOString());

  // Partner bazında grupla
  const chartData = partnerEarnings?.reduce((acc, item) => {
    const partner = item.partner as unknown as { full_name: string } | null;
    const partnerName = partner?.full_name || 'Bilinmeyen';
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

  // Bekleyen işlemler
  const { data: pendingTransactions } = await supabase
    .from('transactions')
    .select(`
      *,
      service:services(name),
      partner:profiles(full_name)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(5);

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
