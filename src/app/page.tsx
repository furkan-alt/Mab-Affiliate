import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role === 'admin') {
      redirect('/admin');
    } else {
      redirect('/dashboard');
    }
  } catch (error) {
    console.error('Home page profile fetch error:', error);
    // Hata durumunda dashboard'a yönlendir
    redirect('/dashboard');
  }
}
