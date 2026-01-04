import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Admin email - Edge runtime'da env variable erişimi sınırlı olduğu için burada tanımlıyoruz
const ADMIN_EMAIL = 'info@mehmetakifbirkan.com';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Public routes - giriş gerektirmeyen sayfalar
  const publicRoutes = ['/login', '/auth/callback'];
  const isPublicRoute = publicRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // Kullanıcı giriş yapmamış ve public route değilse login'e yönlendir
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Kullanıcı giriş yapmış ve login sayfasındaysa dashboard'a yönlendir
  if (user && request.nextUrl.pathname === '/login') {
    const url = request.nextUrl.clone();

    // Kullanıcının rolünü kontrol et
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // Profile yoksa oluştur
    if (!profile) {
      const isAdmin = user.email === ADMIN_EMAIL;
      await supabase.from('profiles').insert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email,
        role: isAdmin ? 'admin' : 'partner',
      });
      url.pathname = isAdmin ? '/admin' : '/dashboard';
    } else if (profile.role === 'admin') {
      url.pathname = '/admin';
    } else {
      url.pathname = '/dashboard';
    }

    return NextResponse.redirect(url);
  }

  // Admin routes kontrolü
  if (user && request.nextUrl.pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // Profile yoksa veya admin değilse dashboard'a yönlendir
    if (!profile || profile.role !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
