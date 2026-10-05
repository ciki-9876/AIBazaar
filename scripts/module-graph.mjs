import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const SOURCE_ROOTS = ['app', 'apps', 'lib', 'packages', 'components', 'hooks', 'scripts', 'tests', 'experiments'];
export const slash = (value) => value.replaceAll('\\', '/');
export function walk(directory) {
  if (!fs.existsSync(path.resolve(ROOT, directory))) return [];
  return fs
    .readdirSync(path.resolve(ROOT, directory), { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? [
            'node_modules',
            'dist',
            '.public',
            '.vinext',
            '.vite',
            '.next',
          ].includes(entry.name)
          ? []
          : walk(`${directory}/${entry.name}`)
        : [`${directory}/${entry.name}`],
    );
}
export function workspacePackages() {
  const packages = new Map();
  for (const root of ['apps', 'packages']) {
    const directory = path.resolve(ROOT, root);
    if (!fs.existsSync(directory)) continue;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const manifest = path.join(directory, entry.name, 'package.json');
      if (!entry.isDirectory() || !fs.existsSync(manifest)) continue;
      const pkg = JSON.parse(fs.readFileSync(manifest, 'utf8'));
      if (pkg.name) packages.set(pkg.name, { directory: `${root}/${entry.name}`, manifest: pkg });
    }
  }
  return packages;
}
export function resolveImport(from, specifier, packages = workspacePackages()) {
  // Vite worker wrappers remain dependencies of the underlying source and its product owner.
  specifier = specifier.replace(/\?worker$/, '');
  const packageName = [...packages.keys()].find((name) => specifier === name || specifier.startsWith(`${name}/`));
  if (!specifier.startsWith('.') && !specifier.startsWith('@/') && !packageName) return null;
  let packagePath;
  if (packageName) {
    const { directory, manifest } = packages.get(packageName);
    const subpath = specifier.slice(packageName.length + 1);
    const exported = manifest.exports?.[subpath ? `./${subpath}` : '.'];
    const target = typeof exported === 'string' ? exported : exported?.import ?? exported?.default;
    packagePath = path.join(directory, target ?? (subpath || manifest.module || manifest.main || 'index.ts'));
  }
  const base = slash(
    path.normalize(
      packageName ? packagePath : specifier.startsWith('@/')
        ? (() => {
            const project = from.match(/^apps\/(resonance|throw)\//)?.[1];
            return project
              ? path.join('apps', project, 'src', specifier.slice(2))
              : specifier.slice(2);
          })()
        : path.join(path.dirname(from), specifier),
    ),
  );
  if (base.startsWith('../') || path.isAbsolute(base)) throw new Error(`Import outside workspace: ${specifier}`);
  return (
    [
      base,
      ...[
        '.ts',
        '.tsx',
        '.mjs',
        '.js',
        '.css',
        '.json',
        '/index.ts',
        '/index.tsx',
      ].map((ext) => base + ext),
    ].find(
      (file) =>
        fs.existsSync(path.resolve(ROOT, file)) &&
        fs.statSync(path.resolve(ROOT, file)).isFile(),
    ) || null
  );
}
export function dependencies(file) {
  const text = fs.readFileSync(path.resolve(ROOT, file), 'utf8'),
    edges = [];
  const packages = workspacePackages();
  const add = (specifier, typeOnly = false) => {
    if (!specifier.startsWith('.') && !specifier.startsWith('@/') && ![...packages.keys()].some((name) => specifier === name || specifier.startsWith(`${name}/`))) return;
    const target = resolveImport(file, specifier, packages);
    if (!target)
      throw new Error(`Missing local dependency: ${file} -> ${specifier}`);
    edges.push({ from: file, to: target, typeOnly });
  };
  if (file.endsWith('.css')) {
    for (const match of text.matchAll(/@import\s+['"]([^'"]+)['"]/g))
      add(match[1]);
  } else if (!file.endsWith('.json')) {
    const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    const visit = (node) => {
      if (
        ts.isImportDeclaration(node) &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        const clause = node.importClause,
          named = clause?.namedBindings;
        add(
          node.moduleSpecifier.text,
          !!clause &&
            (clause.phaseModifier === ts.SyntaxKind.TypeKeyword ||
              (!clause.name &&
                named &&
                ts.isNamedImports(named) &&
                named.elements.every((e) => e.isTypeOnly))),
        );
      }
      if (
        ts.isExportDeclaration(node) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      )
        add(
          node.moduleSpecifier.text,
          /^export\s+type\b/.test(node.getText(ast)) ||
            (node.exportClause &&
              ts.isNamedExports(node.exportClause) &&
              node.exportClause.elements.every((e) => e.isTypeOnly)),
        );
      if (
        ts.isImportTypeNode(node) &&
        ts.isLiteralTypeNode(node.argument) &&
        ts.isStringLiteral(node.argument.literal)
      )
        add(node.argument.literal.text, true);
      if (
        ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
      ) {
        if (!node.arguments[0] || !ts.isStringLiteral(node.arguments[0])) throw new Error(`Non-static module import: ${file}`);
        add(node.arguments[0].text);
      }
      ts.forEachChild(node, visit);
    };
    visit(ast);
  }
  return edges;
}
export function closure(entries) {
  const files = new Set(),
    edges = [];
  const visit = (file) => {
    if (files.has(file)) return;
    files.add(file);
    for (const edge of dependencies(file)) {
      edges.push(edge);
      visit(edge.to);
    }
  };
  entries.forEach(visit);
  return { files: [...files].sort((a, b) => a.localeCompare(b)), edges };
}

export function owner(file) {
  if (file === 'app/survival/waterworks/page.tsx') return 'experiments';
  const sourceProject = file.match(/^apps\/(resonance|throw)\/src\//)?.[1];
  if (sourceProject) return sourceProject;
  const appProject = file.match(/^apps\/(elevator|resonance|throw|elevator-ai)\//)?.[1];
  if (appProject) return appProject;
  if (
    /^(packages\/|lib\/(site-path|utils)\.ts$|app\/(globals\.css|layout\.tsx)$|components\/|hooks\/|scripts\/product-config\.ts$)/.test(
      file,
    )
  )
    return 'shared';
  if (/^(apps\/elevator\/|app\/survival\/|lib\/survival-)/.test(file))
    return 'elevator';
  if (/^(app\/(arena|wandeng)\/|lib\/(cards\/|arena-|wandeng-|training-|card-framework|card-types|card-illustrations|hero-cards|heroes|battle-slice-(fx|visual)|flat-battle-geometry))/.test(file))
    return 'experiments';
  return 'experiments';
}
export function productSources(files, product) {
  return files.filter((file) => /\.(ts|tsx|mjs|js)$/.test(file) && !/\.test\./.test(file) && [product, 'shared'].includes(owner(file)));
}
export function boundaryViolations(edges, product) {
  return edges.filter(({ from, to }) => {
    const a = owner(from),
      b = owner(to);
    return a === 'shared'
      ? b !== 'shared'
      : product
        ? !['shared', product].includes(b)
        : ['elevator', 'resonance', 'throw', 'elevator-ai'].includes(a) && !['shared', a].includes(b);
  });
}
export function runtimeCycles(edges) {
  const adj = new Map();
  for (const e of edges)
    if (!e.typeOnly) adj.set(e.from, [...(adj.get(e.from) || []), e.to]);
  const visited = new Set(),
    active = new Set(),
    cycles = [];
  const visit = (node, trail) => {
    if (active.has(node)) {
      cycles.push([...trail.slice(trail.indexOf(node)), node]);
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    active.add(node);
    for (const next of adj.get(node) || []) visit(next, [...trail, node]);
    active.delete(node);
  };
  for (const node of adj.keys()) visit(node, []);
  return cycles;
}
