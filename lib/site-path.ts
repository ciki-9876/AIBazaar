// Public assets and ordinary anchors need the same prefix as the exported app.
export function sitePath(path: string) {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
  if (!path.startsWith('/') || path.startsWith('//')) return path;
  return `${base}${path}`;
}
