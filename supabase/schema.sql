-- MAB Affiliate System - Veritabanı Şeması
-- Bu dosyayı Supabase SQL Editor'de çalıştırın

-- 1. Profiles tablosu (auth.users ile bağlantılı)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'partner' CHECK (role IN ('admin', 'partner')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Services tablosu (Hizmetler)
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    base_commission_rate DECIMAL(5,2) NOT NULL DEFAULT 10.00 CHECK (base_commission_rate >= 0 AND base_commission_rate <= 100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Partner Service Settings tablosu (Partner'a özel ayarlar)
CREATE TABLE IF NOT EXISTS public.partner_service_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    custom_commission_rate DECIMAL(5,2) CHECK (custom_commission_rate >= 0 AND custom_commission_rate <= 100),
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(partner_id, service_id)
);

-- 4. Transactions tablosu (Satış/İşlem kayıtları)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
    customer_name TEXT NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount >= 0),
    commission_rate DECIMAL(5,2) NOT NULL CHECK (commission_rate >= 0 AND commission_rate <= 100),
    commission_amount DECIMAL(12,2) NOT NULL CHECK (commission_amount >= 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_services_active ON public.services(is_active);
CREATE INDEX IF NOT EXISTS idx_partner_settings_partner ON public.partner_service_settings(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_settings_service ON public.partner_service_settings(service_id);
CREATE INDEX IF NOT EXISTS idx_transactions_partner ON public.transactions(partner_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(transaction_date);

-- RLS (Row Level Security) Politikaları
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_service_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Profiles Politikaları
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can insert profiles" ON public.profiles
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can update profiles" ON public.profiles
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Services Politikaları
CREATE POLICY "Anyone authenticated can view active services" ON public.services
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage services" ON public.services
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Partner Service Settings Politikaları
CREATE POLICY "Partners can view own settings" ON public.partner_service_settings
    FOR SELECT USING (auth.uid() = partner_id);

CREATE POLICY "Admins can view all settings" ON public.partner_service_settings
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can manage settings" ON public.partner_service_settings
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Transactions Politikaları
CREATE POLICY "Partners can view own transactions" ON public.transactions
    FOR SELECT USING (auth.uid() = partner_id);

CREATE POLICY "Admins can view all transactions" ON public.transactions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Partners can insert own transactions" ON public.transactions
    FOR INSERT WITH CHECK (auth.uid() = partner_id);

CREATE POLICY "Admins can update transactions" ON public.transactions
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Trigger: Updated_at otomatik güncelleme
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at
    BEFORE UPDATE ON public.services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partner_settings_updated_at
    BEFORE UPDATE ON public.partner_service_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Yeni kullanıcı oluşturulduğunda profil oluştur
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'partner')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- View: Partner için görünür hizmetler ve komisyon oranları
CREATE OR REPLACE VIEW public.partner_visible_services AS
SELECT
    s.id,
    s.name,
    s.description,
    s.base_commission_rate,
    pss.partner_id,
    COALESCE(pss.custom_commission_rate, s.base_commission_rate) as effective_commission_rate,
    pss.is_visible
FROM public.services s
LEFT JOIN public.partner_service_settings pss ON s.id = pss.service_id
WHERE s.is_active = true;

-- View: Transaction özet bilgileri
CREATE OR REPLACE VIEW public.transaction_summary AS
SELECT
    t.id,
    t.partner_id,
    p.full_name as partner_name,
    t.service_id,
    s.name as service_name,
    t.customer_name,
    t.total_amount,
    t.commission_rate,
    t.commission_amount,
    t.status,
    t.transaction_date,
    t.notes,
    t.approved_at,
    ap.full_name as approved_by_name,
    t.created_at
FROM public.transactions t
JOIN public.profiles p ON t.partner_id = p.id
JOIN public.services s ON t.service_id = s.id
LEFT JOIN public.profiles ap ON t.approved_by = ap.id;
