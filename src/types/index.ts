// Kullanıcı Rolleri
export type UserRole = 'admin' | 'partner';

// İşlem Durumları
export type TransactionStatus = 'pending' | 'approved' | 'rejected';

// Profil
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  updated_at?: string;
}

// Hizmet
export interface Service {
  id: string;
  name: string;
  description?: string;
  base_commission_rate: number; // Yüzde olarak (0-100)
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

// Partner Hizmet Ayarları
export interface PartnerServiceSetting {
  id: string;
  partner_id: string;
  service_id: string;
  custom_commission_rate?: number; // Null ise base rate kullanılır
  is_visible: boolean;
  created_at: string;
  updated_at?: string;
  // İlişkili veriler
  service?: Service;
  partner?: Profile;
}

// İşlem (Satış)
export interface Transaction {
  id: string;
  partner_id: string;
  service_id: string;
  customer_name: string;
  total_amount: number; // USD
  commission_rate: number; // İşlem anındaki komisyon oranı
  commission_amount: number; // Hesaplanan komisyon tutarı
  status: TransactionStatus;
  transaction_date: string;
  notes?: string;
  approved_at?: string;
  approved_by?: string;
  created_at: string;
  updated_at?: string;
  // İlişkili veriler
  service?: Service;
  partner?: Profile;
}

// Dashboard İstatistikleri
export interface DashboardStats {
  totalEarnings: number;
  totalTransactions: number;
  pendingTransactions: number;
  approvedTransactions: number;
  rejectedTransactions: number;
}

// Grafik Verisi
export interface ChartData {
  date: string;
  earnings: number;
  count: number;
}

// Tablo Filtre Seçenekleri
export interface TableFilters {
  status?: TransactionStatus;
  startDate?: string;
  endDate?: string;
  serviceId?: string;
}

// API Response Tipleri
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

// Sayfalama
export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
