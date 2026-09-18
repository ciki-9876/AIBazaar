import DesignHome from '../page';
import { MODULES } from '@/lib/design-data';
export function generateStaticParams() {
  return MODULES.filter((m) => m.id !== 'overview').map((m) => ({
    module: m.id,
  }));
}
export default DesignHome;
