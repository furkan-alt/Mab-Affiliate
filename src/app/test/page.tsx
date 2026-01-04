'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function TestPage() {
  const [status, setStatus] = useState<string>('Checking...');
  const [details, setDetails] = useState<Record<string, unknown>>({});
  const supabase = createClient();

  useEffect(() => {
    const check = async () => {
      try {
        // 1. Auth durumu
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError) {
          setStatus('Auth Error');
          setDetails({ authError: authError.message });
          return;
        }

        if (!user) {
          setStatus('Not Logged In');
          setDetails({ user: null });
          return;
        }

        // 2. Profile sorgusu
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        setStatus('Logged In');
        setDetails({
          userId: user.id,
          email: user.email,
          profile: profile,
          profileError: profileError?.message || null,
        });

      } catch (err) {
        setStatus('Error');
        setDetails({ error: String(err) });
      }
    };

    check();
  }, [supabase]);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Auth Test Page</h1>

      <div className="mb-4 p-4 rounded bg-gray-100">
        <strong>Status:</strong> {status}
      </div>

      <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-auto text-sm">
        {JSON.stringify(details, null, 2)}
      </pre>

      <div className="mt-4 space-x-2">
        <a href="/login" className="text-blue-600 underline">Login Page</a>
        <a href="/admin" className="text-blue-600 underline">Admin Page</a>
        <a href="/dashboard" className="text-blue-600 underline">Dashboard</a>
      </div>
    </div>
  );
}
