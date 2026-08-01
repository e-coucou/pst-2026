import { redirect } from 'next/navigation';
import { hasResidenceAccess } from '@/lib/residence-access';

export default async function ResidenceContactsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await hasResidenceAccess(2))) {
    redirect('/render');
  }

  return <>{children}</>;
}
