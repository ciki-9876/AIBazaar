// Download only the selected CC0 maps, retaining source URLs and checksums.
import { mkdir, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = new URL('../../public/art-assets/material-study/', import.meta.url);
await mkdir(root, { recursive: true });
const ids = ['wood_table_001', 'brown_leather', 'grey_plaster_02', 'blue_metal_plate', 'concrete_floor_worn_001', 'metal_plate_02'];
const manifest = { license: 'CC0-1.0', licenseUrl: 'https://polyhaven.com/license', maps: [] };
for (const id of ids) {
  const response = await fetch(`https://api.polyhaven.com/files/${id}`);
  if (!response.ok) throw new Error(`${id}: ${response.status}`);
  const files = await response.json();
  for (const [key, suffix] of [['Diffuse', 'color'], ['nor_gl', 'normal'], ['arm', 'arm']]) {
    const file = files[key]?.['1k']?.jpg;
    if (!file) throw new Error(`Missing ${id}/${key}`);
    const name = `${id}-${suffix}.jpg`;
    try { await access(new URL(name, root)); }
    catch {
      const res = await fetch(file.url);
      if (!res.ok) throw new Error(`${name}: ${res.status}`);
      const bytes = Buffer.from(await res.arrayBuffer());
      if (createHash('md5').update(bytes).digest('hex') !== file.md5) throw new Error(`Checksum: ${name}`);
      await writeFile(new URL(name, root), bytes);
    }
    manifest.maps.push({ file: name, source: `https://polyhaven.com/a/${id}`, url: file.url, md5: file.md5, bytes: file.size });
  }
  console.log(`Downloaded ${id}`);
}
await writeFile(new URL('sources.json', root), JSON.stringify(manifest, null, 2));
