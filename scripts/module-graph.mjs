import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
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
export function resolveImport(from, specifier) {
  if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return null;
  const base = slash(
    path.normalize(
      specifier.startsWith('@/')
        ? specifier.slice(2)
        : path.join(path.dirname(from), specifier),
    ),
  );
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
  const add = (specifier, typeOnly = false) => {
    if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return;
    const target = resolveImport(file, specifier);
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
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        ts.isStringLiteral(node.arguments[0])
      )
        add(node.arguments[0].text);
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
  if (
    /^(packages\/|lib\/(site-path|utils)\.ts$|app\/(globals\.css|layout\.tsx)$|components\/)/.test(
      file,
    )
  )
    return 'shared';
  if (/^(apps\/elevator\/|app\/survival\/|lib\/survival-)/.test(file))
    return 'elevator';
  if (
    /^(apps\/cards\/|app\/(arena|wandeng)\/|lib\/(cards\/|arena-|wandeng-|training-|card-framework|card-types|card-illustrations|hero-cards|heroes|battle-slice-(fx|visual)|flat-battle-geometry))/.test(
      file,
    )
  )
    return 'cards';
  return 'experiments';
}
export function boundaryViolations(edges, product) {
  return edges.filter(({ from, to }) => {
    const a = owner(from),
      b = owner(to);
    return a === 'shared'
      ? b !== 'shared'
      : product
        ? !['shared', product].includes(b)
        : (a === 'elevator' && b === 'cards') ||
          (a === 'cards' && b === 'elevator');
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
