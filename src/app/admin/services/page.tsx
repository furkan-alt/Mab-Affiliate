'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Package,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface Service {
  id: string;
  name: string;
  description?: string;
  base_commission_rate: number;
  is_active: boolean;
  created_at: string;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [commissionRate, setCommissionRate] = useState('10');
  const [isActive, setIsActive] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching services:', error);
    } else {
      setServices(data || []);
    }
    setLoading(false);
  };

  const openModal = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setName(service.name);
      setDescription(service.description || '');
      setCommissionRate(service.base_commission_rate.toString());
      setIsActive(service.is_active);
    } else {
      setEditingService(null);
      setName('');
      setDescription('');
      setCommissionRate('10');
      setIsActive(true);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingService(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const serviceData = {
      name: name.trim(),
      description: description.trim() || null,
      base_commission_rate: parseFloat(commissionRate),
      is_active: isActive,
    };

    if (editingService) {
      const { error } = await supabase
        .from('services')
        .update(serviceData)
        .eq('id', editingService.id);

      if (error) {
        console.error('Error updating service:', error);
      }
    } else {
      const { error } = await supabase.from('services').insert(serviceData);

      if (error) {
        console.error('Error creating service:', error);
      }
    }

    setSaving(false);
    closeModal();
    fetchServices();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu hizmeti silmek istediğinizden emin misiniz?')) return;

    const { error } = await supabase.from('services').delete().eq('id', id);

    if (error) {
      console.error('Error deleting service:', error);
      alert('Hizmet silinemedi. Bağlı işlemler olabilir.');
    } else {
      fetchServices();
    }
  };

  const toggleActive = async (service: Service) => {
    const { error } = await supabase
      .from('services')
      .update({ is_active: !service.is_active })
      .eq('id', service.id);

    if (error) {
      console.error('Error toggling service:', error);
    } else {
      fetchServices();
    }
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
          <h1 className="text-2xl font-bold text-foreground">Hizmet Yönetimi</h1>
          <p className="text-muted">Satış yapılabilecek hizmetleri yönetin.</p>
        </div>
        <button onClick={() => openModal()} className="btn btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Yeni Hizmet
        </button>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.length === 0 ? (
          <div className="col-span-full card p-8 text-center text-muted">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Henüz hizmet eklenmemiş.</p>
          </div>
        ) : (
          services.map((service) => (
            <div key={service.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div
                  className={`p-2 rounded-lg ${
                    service.is_active
                      ? 'bg-success/10 text-success'
                      : 'bg-muted/10 text-muted'
                  }`}
                >
                  <Package className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleActive(service)}
                    className={`p-2 rounded-lg ${
                      service.is_active
                        ? 'text-success hover:bg-success/10'
                        : 'text-muted hover:bg-muted/10'
                    }`}
                    title={service.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                  >
                    {service.is_active ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => openModal(service)}
                    className="p-2 rounded-lg text-muted hover:text-foreground hover:bg-background"
                    title="Düzenle"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(service.id)}
                    className="p-2 rounded-lg text-muted hover:text-danger hover:bg-danger/10"
                    title="Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="font-semibold text-foreground mb-1">
                {service.name}
              </h3>
              {service.description && (
                <p className="text-sm text-muted mb-3">{service.description}</p>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="text-sm text-muted">Komisyon Oranı</span>
                <span className="font-semibold text-primary">
                  %{service.base_commission_rate}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              {editingService ? 'Hizmeti Düzenle' : 'Yeni Hizmet Ekle'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Hizmet Adı *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                  placeholder="Örn: Şirket Kuruluşu"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Açıklama
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input min-h-[80px] resize-y"
                  placeholder="Hizmet hakkında kısa açıklama..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Varsayılan Komisyon Oranı (%) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  className="input"
                  required
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded border-border"
                />
                <label
                  htmlFor="isActive"
                  className="text-sm font-medium text-foreground"
                >
                  Aktif (Partnerlere görünür)
                </label>
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
                      Kaydediliyor...
                    </>
                  ) : editingService ? (
                    'Güncelle'
                  ) : (
                    'Ekle'
                  )}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn btn-outline flex-1"
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
