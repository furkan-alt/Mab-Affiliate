'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function TestPage() {
  const [result, setResult] = useState<string>('Loading...');
  const supabase = createClient();

  useEffect(() => {
    const test = async () => {
      const results: Record<string, unknown> = {};

      // 1. Auth check
      const { data: { user } } = await supabase.auth.getUser();
      results.user = user ? { id: user.id, email: user.email } : null;

      // 2. Simple transactions query
      const { data: trans1, error: err1 } = await supabase
        .from('transactions')
        .select('*')
        .limit(5);
      results.simpleTransactions = { data: trans1, error: err1?.message };

      // 3. Transactions with service join
      const { data: trans2, error: err2 } = await supabase
        .from('transactions')
        .select('*, service:services(name)')
        .limit(5);
      results.transactionsWithService = { data: trans2, error: err2?.message };

      // 4. Transactions with partner join
      const { data: trans3, error: err3 } = await supabase
        .from('transactions')
        .select('*, partner:profiles(full_name, email)')
        .limit(5);
      results.transactionsWithPartner = { data: trans3, error: err3?.message };

      // 5. Full query
      const { data: trans4, error: err4 } = await supabase
        .from('transactions')
        .select('*, service:services(name), partner:profiles(full_name, email)')
        .eq('status', 'pending')
        .limit(5);
      results.fullQuery = { data: trans4, error: err4?.message };

      // 6. Profiles query
      const { data: profiles, error: err5 } = await supabase
        .from('profiles')
        .select('*')
        .limit(5);
      results.profiles = { data: profiles, error: err5?.message };

      setResult(JSON.stringify(results, null, 2));
    };

    test();
  }, [supabase]);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Debug Test</h1>
      <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-auto text-xs max-h-[80vh]">
        {result}
      </pre>
    </div>
  );
}
