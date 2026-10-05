import ArtDemo from '../../src/presentation/art-demo';
import '../../src/presentation/art-demo.css';

export const metadata = { title: '美术试演 · 夏日像素 · 听风之旅' };
export default function Page() {
  return <ArtDemo direction="summer" />;
}
