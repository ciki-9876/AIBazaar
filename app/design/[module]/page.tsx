import { notFound } from 'next/navigation';
import DesignWorkspace from '../workspace';
import { MODULES } from '@/lib/design-data';
export function generateStaticParams() {
  return MODULES.filter((m) => m.id !== 'overview').map((m) => ({
    module: m.id,
  }));
}
export default async function ModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = await params;
  const spec = MODULES.find((m) => m.id === module);
  if (!spec) return notFound();
  return <DesignWorkspace moduleId={spec.id} />;
}
