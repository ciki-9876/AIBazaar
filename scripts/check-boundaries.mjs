import {
  closure,
  walk,
  boundaryViolations,
  runtimeCycles,
} from './module-graph.mjs';

const targets = process.argv[2] ? [process.argv[2]] : ['elevator', 'cards'];
for (const target of targets) {
  if (!['elevator', 'cards'].includes(target))
    throw new Error(`Unknown product ${target}`);
  const entries = walk(`apps/${target}/app`).filter((file) =>
    /\/(page|layout)\.tsx$/.test(file),
  );
  if (!entries.length) throw new Error(`Missing ${target} entry points`);
  const graph = closure(entries),
    violations = boundaryViolations(graph.edges, target),
    cycles = runtimeCycles(graph.edges);
  if (violations.length || cycles.length)
    throw new Error(JSON.stringify({ target, violations, cycles }, null, 2));
  console.log(
    `${target}: ${graph.files.length} dependencies, no cross-product / experimental dependencies or runtime cycles`,
  );
}
