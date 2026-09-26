import type { CombatFrame, Duel } from './demo-combat.ts';
import { validateArenaBoard } from './arena-engine.ts';
import { AMPLIFIERS } from './arena-catalog.ts';

export const ARENA_ARCHIVE_KEY = 'f9-arena-matches-v1';
export type ArenaMatch = {
  id: string;
  createdAt: string;
  challengeId: string;
  parentMatchId: string | null;
  duel: Duel;
  summary: {
    winner: number;
    duration: number;
    timedOut: boolean;
    finalHp: number[];
    finalBarriers: number[][];
    damageToHost: number[];
    damageToBarrier: number[];
    totalHits: number;
    brokenAt: Array<Array<number | null>>;
    events: Array<{ at: number; text: string }>;
  };
};
export type ArenaArchive = { version: 1; matches: ArenaMatch[] };
export const emptyArchive = (): ArenaArchive => ({ version: 1, matches: [] });

export function summarizeMatch(id: string, challengeId: string, parentMatchId: string | null, duel: Duel, result: { frames: CombatFrame[]; winner: number; duration: number; timedOut: boolean }): ArenaMatch {
  const brokenAt: Array<Array<number | null>> = [[null, null, null], [null, null, null]];
  const damageToHost = [0, 0], damageToBarrier = [0, 0];
  const events: Array<{ at: number; text: string }> = [];
  let totalHits = 0;
  for (const frame of result.frames) {
    for (let side = 0; side < 2; side++) for (let lane = 0; lane < 3; lane++)
      if (frame.barriers[side][lane].broken && brokenAt[side][lane] === null) brokenAt[side][lane] = frame.time;
    for (const hit of frame.hits) {
      if (hit.kind === 'damage' || hit.kind === 'burn' || hit.kind === 'corrode') {
        totalHits++;
        damageToHost[hit.side] += hit.healthLoss ?? 0;
        damageToBarrier[hit.side] += hit.barrierAbsorbed ?? 0;
      }
    }
    for (const text of frame.log) if (events.length < 80) events.push({ at: frame.time, text });
  }
  const last = result.frames.at(-1)!;
  return {
    id, createdAt: new Date().toISOString(), challengeId, parentMatchId, duel: structuredClone(duel),
    summary: { winner: result.winner, duration: result.duration, timedOut: result.timedOut,
      finalHp: [...last.hp], finalBarriers: last.barriers.map((row) => row.map((b) => b.hp)),
      damageToHost: damageToHost.map((x) => Math.round(x * 10) / 10), damageToBarrier: damageToBarrier.map((x) => Math.round(x * 10) / 10),
      totalHits, brokenAt, events },
  };
}
export function parseArchive(raw: string): ArenaArchive {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 1 || !('matches' in value) || !Array.isArray(value.matches))
    throw Error('对局档案格式不符');
  const knownAmps = new Set(AMPLIFIERS.map((amp) => amp.id));
  const ids = new Set<string>();
  for (const match of value.matches) {
    if (!match || typeof match !== 'object' || typeof match.id !== 'string' || !match.id || ids.has(match.id) ||
      typeof match.createdAt !== 'string' || typeof match.challengeId !== 'string' || !match.duel?.arena || !match.summary)
      throw Error('对局档案包含无效记录');
    ids.add(match.id);
    const duel = match.duel as Duel;
    if (duel.arena?.version !== 1 || !Array.isArray(duel.player) || !Array.isArray(duel.enemy) ||
      !Array.isArray(duel.arena.amplifiers) || duel.arena.amplifiers.length !== 2 ||
      duel.arena.amplifiers.some((row) => !Array.isArray(row) || row.length !== 3 || row.some((id) => id !== null && !knownAmps.has(id))) ||
      !Array.isArray(duel.maxHp) || duel.maxHp.length !== 2 || duel.maxHp.some((hp) => !Number.isFinite(hp) || hp <= 0))
      throw Error('对局档案包含无效战斗输入');
    validateArenaBoard(duel.player); validateArenaBoard(duel.enemy);
    if (![-1, 0, 1].includes(match.summary.winner) || !Number.isFinite(match.summary.duration) ||
      !Array.isArray(match.summary.finalHp) || match.summary.finalHp.length !== 2 ||
      !Array.isArray(match.summary.brokenAt) || match.summary.brokenAt.length !== 2)
      throw Error('对局档案包含无效战斗结果');
  }
  return value as ArenaArchive;
}
export function appendMatch(archive: ArenaArchive, match: ArenaMatch): ArenaArchive {
  if (archive.matches.some((x) => x.id === match.id)) throw Error('对局编号重复');
  return { version: 1, matches: [...archive.matches, match] };
}
