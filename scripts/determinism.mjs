import ts from 'typescript';
import fs from 'node:fs';
import { walk } from './module-graph.mjs';

// v1 replay compatibility: these existing comparisons keep an explicit English
// collation. New simulation code must use numeric or code-unit ordering.
const legacyCollation = new Map([
  ['lib/arena-engine.ts', 3],
  ['apps/resonance/src/lib/arena-engine.ts', 3],
  ['lib/arena-challenge.ts', 1],
  ['lib/arena-presentation.ts', 1],
  ['lib/survival-room.ts', 1],
  ['lib/demo-engine.ts', 1],
  ['lib/card-framework/runtime.ts', 3],
  ['lib/card-framework/selectors.ts', 1],
]);
const metadataTime = new Map([['lib/arena-archive.ts', 'createdAt'], ['lib/design-review.ts', 'exportedAt'], ['lib/card-framework/validation.ts', 'generatedAt']]);
const forbidden = new Map([['Math', new Set(['random'])], ['Date', new Set(['now'])], ['performance', new Set(['now'])], ['crypto', new Set(['randomUUID', 'getRandomValues', 'randomBytes'])]]);
export function determinismViolations(text, file = 'simulation.ts') {
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const failures = [];
  let collations = 0;
  const report = (node, reason) => failures.push({ file, line: ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1, reason });
  const metadataDate = (node) => {
    for (let parent = node.parent; parent && !ts.isFunctionLike(parent); parent = parent.parent) {
      if (ts.isPropertyAssignment(parent)) return parent.name.getText(ast) === metadataTime.get(file);
    }
    return false;
  };
  const inspect = (node) => {
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      const base = node.expression.getText(ast).replace(/^globalThis\./, '');
      const key = ts.isPropertyAccessExpression(node) ? node.name.text : ts.isStringLiteral(node.argumentExpression) ? node.argumentExpression.text : null;
      if (forbidden.has(base) && (key === null || forbidden.get(base).has(key))) report(node, 'ambient time or randomness');
    }
    if ((ts.isCallExpression(node) || ts.isNewExpression(node)) && node.expression.getText(ast).replace(/^globalThis\./, '') === 'Date' && !metadataDate(node)) report(node, 'Date belongs in an adapter');
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'localeCompare') {
      const locale = node.arguments[1];
      collations++;
      if (collations > (legacyCollation.get(file) ?? 0) || !locale || !ts.isStringLiteral(locale) || locale.text !== 'en') report(node, 'locale-dependent ordering');
    }
    if (ts.isVariableDeclaration(node) && ts.isObjectBindingPattern(node.name) && node.initializer && forbidden.has(node.initializer.getText(ast))) {
      const base = node.initializer.getText(ast);
      for (const binding of node.name.elements) if (forbidden.get(base).has((binding.propertyName ?? binding.name).getText(ast))) report(binding, 'aliased ambient time or randomness');
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && forbidden.has(node.initializer.getText(ast).replace(/^globalThis\./, ''))) report(node, 'aliased ambient source');
    ts.forEachChild(node, inspect);
  };
  inspect(ast);
  return failures;
}
export function checkDeterminism() {
  const files = [
    ...walk('lib'),
    ...walk('packages/core'),
    ...walk('apps/resonance/src/lib'),
    ...walk('apps/throw/src/lib'),
  ].filter((file) => file.endsWith('.ts') && !file.includes('.test.'));
  const violations = files.flatMap((file) => determinismViolations(fs.readFileSync(file, 'utf8'), file));
  if (violations.length) throw new Error(JSON.stringify(violations, null, 2));
  return files.length;
}
