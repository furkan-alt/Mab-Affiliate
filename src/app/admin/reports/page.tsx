'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Loader2,
  Download,
  Calendar,
  TrendingUp,
  DollarSign,
  Users,
  Package,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import * as XLSX from 'xlsx';

interface MonthlyData {
  [key: string]: string | number;
  month: string;
  total: number;
  commission: number;
  count: number;
}

interface PartnerData {
  [key: string]: string | number;
  name: string;
  earnings: number;
  count: number;
}

interface ServiceData {
  [key: string]: string | number;
  name: string;
  revenue: number;
  count: number;
}

const COLORS = ['#1e3a5f', '#3182ce', '#63b3ed', '#38a169', '#d69e2e', '#e53e3e'];

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  // Data states
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [partnerData, setPartnerData] = useState<PartnerData[]>([]);
  const [serviceData, setServiceData] = useState<ServiceData[]>([]);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalCommission: 0,
    totalTransactions: 0,
    activePartners: 0,
  });

  const supabase = createClient();

  useEffect(() => {
    fetchReportData();
  }, [year, month]);

  const fetchReportData = async () => {
    setLoading(true);

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);

    // Aylık işlemler
    const { data: transactions } = await supabase
      .from('transactions')
      .select(`
        *,
        service:services(name),
        partner:profiles!transactions_partner_id_fkey(full_name)
      `)
      .eq('status', 'approved')
      .gte('transaction_date', startOfMonth.toISOString())
      .lte('transaction_date', endOfMonth.toISOString());

    if (transactions) {
      // Özet
      const totalRevenue = transactions.reduce(
        (sum, t) => sum + Number(t.total_amount),
        0
      );
      const totalCommission = transactions.reduce(
        (sum, t) => sum + Number(t.commission_amount),
        0
      );
      const activePartners = new Set(transactions.map((t) => t.partner_id)).size;

      setSummary({
        totalRevenue,
        totalCommission,
        totalTransactions: transactions.length,
        activePartners,
      });

      // Günlük trend
      const dailyMap = new Map<string, { total: number; commission: number; count: number }>();
      transactions.forEach((t) => {
        const day = new Date(t.transaction_date).getDate().toString();
        const existing = dailyMap.get(day) || { total: 0, commission: 0, count: 0 };
        dailyMap.set(day, {
          total: existing.total + Number(t.total_amount),
          commission: existing.commission + Number(t.commission_amount),
          count: existing.count + 1,
        });
      });

      const daily = Array.from(dailyMap.entries())
        .map(([day, data]) => ({
          month: `${day}. Gün`,
          ...data,
        }))
        .sort((a, b) => parseInt(a.month) - parseInt(b.month));
      setMonthlyData(daily);

      // Partner bazlı
      const partnerMap = new Map<string, { earnings: number; count: number }>();
      transactions.forEach((t) => {
        const name = (t.partner as { full_name: string })?.full_name || 'Bilinmeyen';
        const existing = partnerMap.get(name) || { earnings: 0, count: 0 };
        partnerMap.set(name, {
          earnings: existing.earnings + Number(t.commission_amount),
          count: existing.count + 1,
        });
      });

      const partners = Array.from(partnerMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.earnings - a.earnings);
      setPartnerData(partners);

      // Hizmet bazlı
      const serviceMap = new Map<string, { revenue: number; count: number }>();
      transactions.forEach((t) => {
        const name = (t.service as { name: string })?.name || 'Bilinmeyen';
        const existing = serviceMap.get(name) || { revenue: 0, count: 0 };
        serviceMap.set(name, {
          revenue: existing.revenue + Number(t.total_amount),
          count: existing.count + 1,
        });
      });

      const services = Array.from(serviceMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue);
      setServiceData(services);
    }

    setLoading(false);
  };

  const handleExport = () => {
    const monthName = new Date(year, month - 1).toLocaleDateString('tr-TR', {
      month: 'long',
      year: 'numeric',
    });

    // Özet sayfası
    const summarySheet = [
      ['MAB Partner Portal - Aylık Rapor'],
      [monthName],
      [],
      ['Metrik', 'Değer'],
      ['Toplam Ciro', `$${summary.totalRevenue.toFixed(2)}`],
      ['Toplam Komisyon', `$${summary.totalCommission.toFixed(2)}`],
      ['İşlem Sayısı', summary.totalTransactions],
      ['Aktif Partner', summary.activePartners],
    ];

    // Partner detayları
    const partnerSheet = [
      ['Partner', 'Kazanç ($)', 'İşlem Sayısı'],
      ...partnerData.map((p) => [p.name, p.earnings.toFixed(2), p.count]),
    ];

    // Hizmet detayları
    const serviceSheet = [
      ['Hizmet', 'Ciro ($)', 'İşlem Sayısı'],
      ...serviceData.map((s) => [s.name, s.revenue.toFixed(2), s.count]),
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summarySheet), 'Özet');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(partnerSheet), 'Partner Bazlı');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(serviceSheet), 'Hizmet Bazlı');

    XLSX.writeFile(wb, `rapor-${year}-${month.toString().padStart(2, '0')}.xlsx`);
  };

  const months = [
    { value: 1, label: 'Ocak' },
    { value: 2, label: 'Şubat' },
    { value: 3, label: 'Mart' },
    { value: 4, label: 'Nisan' },
    { value: 5, label: 'Mayıs' },
    { value: 6, label: 'Haziran' },
    { value: 7, label: 'Temmuz' },
    { value: 8, label: 'Ağustos' },
    { value: 9, label: 'Eylül' },
    { value: 10, label: 'Ekim' },
    { value: 11, label: 'Kasım' },
    { value: 12, label: 'Aralık' },
  ];

  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Raporlar</h1>
          <p className="text-muted">Aylık performans ve hakediş raporları.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted" />
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="input w-auto"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="input w-auto"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <button onClick={handleExport} className="btn btn-primary">
            <Download className="w-4 h-4 mr-2" />
            Rapor İndir
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted">Toplam Ciro</p>
              <p className="text-xl font-bold text-foreground">
                ${summary.totalRevenue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-success/10 text-success">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted">Toplam Komisyon</p>
              <p className="text-xl font-bold text-success">
                ${summary.totalCommission.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-secondary/10 text-secondary">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted">İşlem Sayısı</p>
              <p className="text-xl font-bold text-foreground">
                {summary.totalTransactions}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-warning/10 text-warning">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted">Aktif Partner</p>
              <p className="text-xl font-bold text-foreground">
                {summary.activePartners}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Günlük Trend
          </h2>
          {monthlyData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted">
              Bu ay için veri bulunmuyor.
            </div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fill: '#718096', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#718096', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                    }}
                    formatter={(value) => [
                      `$${Number(value).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="commission"
                    stroke="#38a169"
                    strokeWidth={2}
                    name="Komisyon"
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#1e3a5f"
                    strokeWidth={2}
                    name="Ciro"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Partner Performance */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Partner Performansı
          </h2>
          {partnerData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted">
              Bu ay için veri bulunmuyor.
            </div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={partnerData.slice(0, 5)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fill: '#718096', fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: '#718096', fontSize: 12 }}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                    }}
                    formatter={(value) => [
                      `$${Number(value).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
                      'Kazanç',
                    ]}
                  />
                  <Bar dataKey="earnings" fill="#1e3a5f" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Service Distribution */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Hizmet Dağılımı
          </h2>
          {serviceData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted">
              Bu ay için veri bulunmuyor.
            </div>
          ) : (
            <div className="h-[300px] flex items-center">
              <ResponsiveContainer width="60%" height="100%">
                <PieChart>
                  <Pie
                    data={serviceData}
                    dataKey="revenue"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) =>
                      `${name} (${((percent || 0) * 100).toFixed(0)}%)`
                    }
                  >
                    {serviceData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [
                      `$${Number(value).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {serviceData.map((service, index) => (
                  <div key={service.name} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm text-muted">{service.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Top Partners Table */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Partner Detayları
          </h2>
          {partnerData.length === 0 ? (
            <div className="text-center py-8 text-muted">
              Bu ay için veri bulunmuyor.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Partner</th>
                    <th className="text-right">İşlem</th>
                    <th className="text-right">Kazanç</th>
                  </tr>
                </thead>
                <tbody>
                  {partnerData.map((partner) => (
                    <tr key={partner.name}>
                      <td className="font-medium">{partner.name}</td>
                      <td className="text-right">{partner.count}</td>
                      <td className="text-right font-medium text-success">
                        ${partner.earnings.toLocaleString('tr-TR', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
