# MAB Partner Portal - Affiliate Yönetim Sistemi

Partner (Affiliate) satış takip ve hakediş yönetim paneli. Partnerlerin getirdiği müşterileri sisteme girmesi, Admin'in bu satışları onaylaması ve ay sonunda hakedişlerin şeffaf bir şekilde görüntülenmesini sağlar.

## Teknoloji Yığını

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript
- **Backend/Database:** Supabase (Auth, PostgreSQL)
- **Styling:** Tailwind CSS
- **Grafikler:** Recharts
- **Deployment:** Vercel

## Kurulum

### 1. Bağımlılıkları Yükleyin

```bash
npm install
```

### 2. Supabase Kurulumu

#### 2.1 Supabase Projesi Oluşturma
1. [Supabase Dashboard](https://supabase.com/dashboard) adresine gidin
2. "New Project" ile yeni proje oluşturun
3. Project Settings > API bölümünden aşağıdaki bilgileri alın:
   - Project URL
   - anon public key
   - service_role key (gizli tutun!)

#### 2.2 Veritabanı Şemasını Oluşturma
1. Supabase Dashboard > SQL Editor'e gidin
2. `supabase/schema.sql` dosyasının içeriğini kopyalayın
3. SQL Editor'de çalıştırın

#### 2.3 Admin Kullanıcısı Oluşturma
Supabase Dashboard > Authentication > Users bölümünden:
1. "Add user" > "Create new user" tıklayın
2. Email: `info@mehmetakifbirkan.com` (veya istediğiniz admin emaili)
3. Şifre belirleyin
4. "Auto Confirm User" seçeneğini işaretleyin
5. Kullanıcı oluştuktan sonra, SQL Editor'de şu komutu çalıştırın:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'info@mehmetakifbirkan.com';
```

### 3. Environment Değişkenleri

`.env.local` dosyası oluşturun:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Geliştirme Sunucusunu Başlatın

```bash
npm run dev
```

Tarayıcıda [http://localhost:3000](http://localhost:3000) adresini açın.

## Kullanım

### Admin Paneli
- **Dashboard:** Genel istatistikler ve bekleyen işlemler
- **İşlem Yönetimi:** Satışları onaylama/reddetme
- **Partnerler:** Partner hesapları oluşturma ve komisyon ayarları
- **Hizmetler:** Satılabilecek hizmetleri tanımlama
- **Raporlar:** Aylık performans raporları ve Excel export

### Partner Paneli
- **Dashboard:** Kişisel kazanç ve işlem özeti
- **Yeni Satış:** Müşteri kaydı oluşturma
- **İşlem Geçmişi:** Tüm satışları görüntüleme ve filtreleme

## Proje Yapısı

```
src/
├── app/
│   ├── admin/           # Admin sayfaları
│   ├── dashboard/       # Partner sayfaları
│   ├── login/           # Giriş sayfası
│   └── api/             # API route'ları
├── components/          # React bileşenleri
├── lib/
│   └── supabase/        # Supabase client'ları
└── types/               # TypeScript tipleri
```

## Deployment (Vercel)

1. GitHub'a push edin
2. [Vercel](https://vercel.com) üzerinde import edin
3. Environment değişkenlerini Vercel'e ekleyin
4. Deploy edin

## Lisans

Bu proje özel kullanım içindir.

