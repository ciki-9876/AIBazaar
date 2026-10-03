import ts from 'typescript';
import fs from 'node:fs';
import { walk } from './module-graph.mjs';

// v1 replay compatibility: these existing comparisons keep an explicit English
// collation. New simulation code must use numeric or code-unit ordering.
const legacyCollation = new Set(['lib/arena-engine.ts', 'lib/arena-challenge.ts', 'lib/survival-room.ts', 'lib/demo-engine.ts', 'lib/card-framework/runtime.ts', 'lib/card-framework/selectors.ts']);
const forbidden = new Map([['Math', new Set(['random'])], ['Date', new Set(['now'])], ['performance', new Set(['now'])], ['crypto', new Set(['randomUUID', 'getRandomValues', 'randomBytes'])]]);
export function determinismViolations(text, file = 'simulation.ts') {
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const failures = [];
  const report = (node, reason) => failures.push({ file, line: ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1, reason });
  const inspect = (node) => {
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      const base = node.expression.getText(ast);
      const key = ts.isPropertyAccessExpression(node) ? node.name.text : ts.isStringLiteral(node.argumentExpression) ? node.argumentExpression.text : null;
      if (forbidden.has(base) && (key === null || forbidden.get(base).has(key))) report(node, 'ambient time or randomness');
    }
    if ((ts.isCallExpression(node) || ts.isNewExpression(node)) && ts.isIdentifier(node.expression) && node.expression.text === 'Date') report(node, 'Date belongs in an adapter');
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'localeCompare') {
      const locale = node.arguments[1];
      if (!legacyCollation.has(file) || !locale || !ts.isStringLiteral(locale) || locale.text !== 'en') report(node, 'locale-dependent ordering');
    }
    if (ts.isVariableDeclaration(node) && ts.isObjectBindingPattern(node.name) && node.initializer && forbidden.has(node.initializer.getText(ast))) {
      const base = node.initializer.getText(ast);
      for (const binding of node.name.elements) if (forbidden.get(base).has((binding.propertyName ?? binding.name).getText(ast))) report(binding, 'aliased ambient time or randomness');
    }
    ts.forEachChild(node, inspect);
  };
  inspect(ast);
  return failures;
}
export function checkDeterminism() {
  const files = [...walk('lib'), ...walk('packages/core')].filter((file) => file.endsWith('.ts') && !file.includes('.test.') && (/^lib\/(survival-|cards\/|wandeng-game|arena-(engine|catalog|challenge)|training-catalog|demo-engine|design-model|card-framework\/(runtime|selectors|canonical|registry|types|describe|samples))/.test(file) || file.startsWith('packages/core/')));
  const violations = files.flatMap((file) => determinismViolations(fs.readFileSync(file, 'utf8'), file));
  if (violations.length) throw new Error(JSON.stringify(violations, null, 2));
  return files.length;
}
