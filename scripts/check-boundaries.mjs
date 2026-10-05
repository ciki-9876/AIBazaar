import {
  closure,
  walk,
  boundaryViolations,
  runtimeCycles,
  productSources,
  SOURCE_ROOTS,
} from './module-graph.mjs';
import { PROJECTS } from './products.mjs';

const targets = process.argv[2] ? [process.argv[2]] : PROJECTS;
for (const target of targets) {
  if (!PROJECTS.includes(target))
    throw new Error(`Unknown product ${target}`);
  const entries = walk(`apps/${target}/app`).filter((file) =>
    /\/(page|layout)\.tsx$/.test(file),
  );
  if (!entries.length) throw new Error(`Missing ${target} entry points`);
  const source = productSources(SOURCE_ROOTS.flatMap(walk), target);
  const graph = closure([...entries, ...source]),
    violations = boundaryViolations(graph.edges, target),
    cycles = runtimeCycles(graph.edges);
  if (violations.length || cycles.length)
    throw new Error(JSON.stringify({ target, violations, cycles }, null, 2));
  console.log(
    `${target}: ${graph.files.length} dependencies, no cross-product / experimental dependencies or runtime cycles`,
  );
}
