import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export default async function ResidencePriveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data: isSuper, error: rpcError } = await supabase.rpc('is_super');

  if (rpcError || isSuper !== true) {
    redirect('/render');
  }

  return <>{children}</>;
}
