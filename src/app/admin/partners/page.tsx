'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Loader2,
  Plus,
  Settings,
  Users,
  Mail,
  Calendar,
  DollarSign,
} from 'lucide-react';

interface Partner {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  total_earnings?: number;
  transaction_count?: number;
}

interface Service {
  id: string;
  name: string;
  base_commission_rate: number;
}

interface PartnerSetting {
  service_id: string;
  custom_commission_rate: number | null;
  is_visible: boolean;
}

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New Partner Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Settings Modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [partnerSettings, setPartnerSettings] = useState<PartnerSetting[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Partnerleri getir
    const { data: partnersData } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'partner')
      .order('created_at', { ascending: false });

    // Her partner için istatistikleri hesapla
    if (partnersData) {
      const partnersWithStats = await Promise.all(
        partnersData.map(async (partner) => {
          const { data: transactions } = await supabase
            .from('transactions')
            .select('commission_amount')
            .eq('partner_id', partner.id)
            .eq('status', 'approved');

          const total_earnings =
            transactions?.reduce(
              (sum, t) => sum + Number(t.commission_amount),
              0
            ) || 0;

          return {
            ...partner,
            total_earnings,
            transaction_count: transactions?.length || 0,
          };
        })
      );
      setPartners(partnersWithStats);
    }

    // Hizmetleri getir
    const { data: servicesData } = await supabase
      .from('services')
      .select('id, name, base_commission_rate')
      .eq('is_active', true)
      .order('name');

    setServices(servicesData || []);
    setLoading(false);
  };

  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Admin API ile kullanıcı oluştur
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          full_name: newName,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Kullanıcı oluşturulamadı');
      }

      setShowNewModal(false);
      setNewEmail('');
      setNewName('');
      setNewPassword('');
      fetchData();
    } catch (error) {
      console.error('Error creating partner:', error);
      alert(
        error instanceof Error ? error.message : 'Partner oluşturulurken hata oluştu'
      );
    }

    setSaving(false);
  };

  const openSettingsModal = async (partner: Partner) => {
    setSelectedPartner(partner);
    setShowSettingsModal(true);
    setLoadingSettings(true);

    // Partner ayarlarını getir
    const { data } = await supabase
      .from('partner_service_settings')
      .select('*')
      .eq('partner_id', partner.id);

    // Tüm hizmetler için ayar objesi oluştur
    const settings = services.map((service) => {
      const existing = data?.find((d) => d.service_id === service.id);
      return {
        service_id: service.id,
        custom_commission_rate: existing?.custom_commission_rate || null,
        is_visible: existing?.is_visible ?? true,
      };
    });

    setPartnerSettings(settings);
    setLoadingSettings(false);
  };

  const updateSetting = (
    serviceId: string,
    field: 'custom_commission_rate' | 'is_visible',
    value: number | boolean | null
  ) => {
    setPartnerSettings((prev) =>
      prev.map((s) =>
        s.service_id === serviceId ? { ...s, [field]: value } : s
      )
    );
  };

  const saveSettings = async () => {
    if (!selectedPartner) return;
    setSaving(true);

    // Mevcut ayarları sil ve yenilerini ekle
    await supabase
      .from('partner_service_settings')
      .delete()
      .eq('partner_id', selectedPartner.id);

    const settingsToInsert = partnerSettings.map((s) => ({
      partner_id: selectedPartner.id,
      service_id: s.service_id,
      custom_commission_rate: s.custom_commission_rate,
      is_visible: s.is_visible,
    }));

    await supabase.from('partner_service_settings').insert(settingsToInsert);

    setSaving(false);
    setShowSettingsModal(false);
  };

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
          <h1 className="text-2xl font-bold text-foreground">Partner Yönetimi</h1>
          <p className="text-muted">Partnerleri ve komisyon ayarlarını yönetin.</p>
        </div>
        <button onClick={() => setShowNewModal(true)} className="btn btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Yeni Partner
        </button>
      </div>

      {/* Partners Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {partners.length === 0 ? (
          <div className="col-span-full card p-8 text-center text-muted">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Henüz partner eklenmemiş.</p>
          </div>
        ) : (
          partners.map((partner) => (
            <div key={partner.id} className="card p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-semibold text-primary">
                    {partner.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <button
                  onClick={() => openSettingsModal(partner)}
                  className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-background"
                  title="Hizmet Ayarları"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>

              <h3 className="font-semibold text-foreground mb-1">
                {partner.full_name}
              </h3>
              <div className="flex items-center gap-2 text-sm text-muted mb-4">
                <Mail className="w-4 h-4" />
                <span>{partner.email}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
                <div>
                  <p className="text-xs text-muted">Toplam Kazanç</p>
                  <p className="font-semibold text-success">
                    ${partner.total_earnings?.toLocaleString('tr-TR', {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted">İşlem Sayısı</p>
                  <p className="font-semibold text-foreground">
                    {partner.transaction_count}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted mt-3">
                <Calendar className="w-3 h-3" />
                <span>
                  Kayıt:{' '}
                  {new Date(partner.created_at).toLocaleDateString('tr-TR')}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* New Partner Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Yeni Partner Ekle
            </h2>

            <form onSubmit={handleCreatePartner} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Ad Soyad *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="input"
                  placeholder="Örn: Ahmet Yılmaz"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  E-posta *
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="input"
                  placeholder="ornek@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Şifre *
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input"
                  placeholder="En az 6 karakter"
                  minLength={6}
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary flex-1"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Oluşturuluyor...
                    </>
                  ) : (
                    'Partner Oluştur'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="btn btn-outline flex-1"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && selectedPartner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Hizmet Ayarları
            </h2>
            <p className="text-muted mb-4">{selectedPartner.full_name}</p>

            {loadingSettings ? (
              <div className="py-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-muted bg-background p-3 rounded-lg">
                  Her hizmet için özel komisyon oranı belirleyebilir veya
                  partnere görünürlüğünü kapatabilirsiniz.
                </div>

                {services.map((service) => {
                  const setting = partnerSettings.find(
                    (s) => s.service_id === service.id
                  );
                  return (
                    <div
                      key={service.id}
                      className="flex flex-wrap items-center gap-4 p-4 border border-border rounded-lg"
                    >
                      <div className="flex-1 min-w-[200px]">
                        <p className="font-medium text-foreground">
                          {service.name}
                        </p>
                        <p className="text-sm text-muted">
                          Varsayılan: %{service.base_commission_rate}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div>
                          <label className="block text-xs text-muted mb-1">
                            Özel Oran (%)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={setting?.custom_commission_rate ?? ''}
                            onChange={(e) =>
                              updateSetting(
                                service.id,
                                'custom_commission_rate',
                                e.target.value
                                  ? parseFloat(e.target.value)
                                  : null
                              )
                            }
                            className="input w-24"
                            placeholder="-"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-muted mb-1">
                            Görünür
                          </label>
                          <input
                            type="checkbox"
                            checked={setting?.is_visible ?? true}
                            onChange={(e) =>
                              updateSetting(
                                service.id,
                                'is_visible',
                                e.target.checked
                              )
                            }
                            className="w-5 h-5 rounded border-border"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={saveSettings}
                disabled={saving || loadingSettings}
                className="btn btn-primary flex-1"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Kaydediliyor...
                  </>
                ) : (
                  'Kaydet'
                )}
              </button>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="btn btn-outline flex-1"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
