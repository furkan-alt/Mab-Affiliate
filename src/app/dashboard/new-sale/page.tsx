'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, AlertCircle, CheckCircle } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  effective_commission_rate: number;
}

export default function NewSalePage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [notes, setNotes] = useState('');

  const router = useRouter();
  const supabase = createClient();

  // Seçili hizmetin komisyon oranını hesapla
  const selectedService = services.find((s) => s.id === serviceId);
  const commissionRate = selectedService?.effective_commission_rate || 0;
  const commissionAmount = totalAmount
    ? (parseFloat(totalAmount) * commissionRate) / 100
    : 0;

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    // Partner'a görünür hizmetleri getir
    const { data, error } = await supabase
      .from('partner_service_settings')
      .select(`
        service_id,
        custom_commission_rate,
        is_visible,
        service:services(id, name, base_commission_rate, is_active)
      `)
      .eq('partner_id', user.id)
      .eq('is_visible', true);

    if (error) {
      console.error('Error fetching services:', error);
      setLoading(false);
      return;
    }

    interface ServiceType {
      id: string;
      name: string;
      base_commission_rate: number;
      is_active: boolean;
    }

    const visibleServices = data
      ?.filter((item) => {
        const service = item.service as unknown as ServiceType | null;
        return service && service.is_active;
      })
      .map((item) => {
        const service = item.service as unknown as ServiceType;
        return {
          id: service.id,
          name: service.name,
          effective_commission_rate:
            item.custom_commission_rate ?? service.base_commission_rate,
        };
      }) || [];

    setServices(visibleServices);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
        setSubmitting(false);
        return;
      }

      const { error: insertError } = await supabase.from('transactions').insert({
        partner_id: user.id,
        service_id: serviceId,
        customer_name: customerName.trim(),
        total_amount: parseFloat(totalAmount),
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        status: 'pending',
        notes: notes.trim() || null,
      });

      if (insertError) {
        throw insertError;
      }

      setSuccess(true);

      // Form'u temizle
      setCustomerName('');
      setServiceId('');
      setTotalAmount('');
      setNotes('');

      // 2 saniye sonra dashboard'a yönlendir
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err) {
      console.error('Error submitting sale:', err);
      setError('İşlem kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.');
    }

    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="card p-8 text-center">
          <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            İşlem Başarıyla Kaydedildi!
          </h2>
          <p className="text-muted">
            Satış kaydınız onay için yöneticiye iletildi.
          </p>
          <p className="text-sm text-muted mt-4">
            Dashboard&apos;a yönlendiriliyorsunuz...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Yeni Satış Ekle</h1>
        <p className="text-muted">
          Getirdiğiniz müşteriyi sisteme kaydedin.
        </p>
      </div>

      <div className="card p-6">
        {services.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-warning mx-auto mb-3" />
            <p className="text-muted">
              Size tanımlı aktif hizmet bulunmuyor. Lütfen yöneticinizle
              iletişime geçin.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="customerName"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Müşteri Adı *
              </label>
              <input
                id="customerName"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="input"
                placeholder="Örn: Ahmet Yılmaz"
                required
                disabled={submitting}
              />
            </div>

            <div>
              <label
                htmlFor="service"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Hizmet *
              </label>
              <select
                id="service"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="input"
                required
                disabled={submitting}
              >
                <option value="">Hizmet seçin...</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} (%{service.effective_commission_rate} komisyon)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="totalAmount"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Hizmet Bedeli (USD) *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-medium">
                  $
                </span>
                <input
                  id="totalAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  className="input pl-10"
                  placeholder="0.00"
                  required
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Komisyon Hesaplama */}
            {serviceId && totalAmount && (
              <div className="p-4 rounded-lg bg-success/5 border border-success/20">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted">
                    Tahmini Komisyon (%{commissionRate})
                  </span>
                  <span className="text-lg font-bold text-success">
                    ${commissionAmount.toLocaleString('tr-TR', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Notlar (Opsiyonel)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input min-h-[100px] resize-y"
                placeholder="Ek bilgi veya notlar..."
                disabled={submitting}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary w-full h-11"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 mr-2" />
                  Satış Kaydet
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
