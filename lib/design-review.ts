import { MODULES, DESIGN_VERSION } from './design-data.ts';
import type { ModuleId } from './design-data.ts';
export type ReviewStatus = 'pending' | 'changes' | 'approved';
export type ModuleReview = {
  status: ReviewStatus;
  notes: string;
  checks: number[];
  decisions: Record<string, string>;
  updatedAt: string;
};
export type Reviews = Partial<Record<ModuleId, ModuleReview>>;
export const REVIEW_KEY = 'f9.elevator.design.review.v03';
export const emptyReview = (): ModuleReview => ({
  status: 'pending',
  notes: '',
  checks: [],
  decisions: {},
  updatedAt: '',
});
export function parseReviews(raw: string | null): Reviews {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    if (!v || v.version !== DESIGN_VERSION || typeof v.reviews !== 'object')
      return {};
    const out: Reviews = {};
    for (const m of MODULES) {
      const r = v.reviews[m.id];
      if (
        !r ||
        !['pending', 'changes', 'approved'].includes(r.status) ||
        typeof r.notes !== 'string' ||
        !Array.isArray(r.checks) ||
        !r.checks.every(
          (n: unknown) => Number.isInteger(n) && Number(n) >= 0,
        ) ||
        typeof r.decisions !== 'object' ||
        !r.decisions
      )
        continue;
      if (!Object.values(r.decisions).every((x) => typeof x === 'string'))
        continue;
      out[m.id] = {
        status: r.status,
        notes: r.notes,
        checks: r.checks,
        decisions: r.decisions,
        updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : '',
      };
    }
    return out;
  } catch {
    return {};
  }
}
export function serializeReviews(reviews: Reviews) {
  return JSON.stringify({ version: DESIGN_VERSION, reviews });
}
export function exportReviews(reviews: Reviews) {
  return {
    schemaVersion: 1,
    documentVersion: DESIGN_VERSION,
    exportedAt: new Date().toISOString(),
    storage: 'browser-local',
    modules: MODULES.map((m) => ({
      moduleId: m.id,
      title: m.title,
      ...(reviews[m.id] || emptyReview()),
    })),
  };
}
