import { redirect } from 'next/navigation';
import { hasResidenceAccess } from '@/lib/residence-access';

export default async function ResidenceDocumentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await hasResidenceAccess(1))) {
    redirect('/render');
  }

  return <>{children}</>;
}
