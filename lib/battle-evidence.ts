import { cardDef } from './demo-cards.ts';
import type { Duel, Hit, CombatFrame } from './demo-combat.ts';
const sideName = (side: number) => (side ? '敌方' : '我方');
const n = (value: number) => +value.toFixed(2);
export function formatHit(duel: Duel, hit: Hit, time: number) {
  const sourceSide = duel.player.some((c) => c.uid === hit.sourceUid)
    ? 0
    : duel.enemy.some((c) => c.uid === hit.sourceUid)
      ? 1
      : hit.kind === 'damage' || hit.kind === 'corrode'
        ? 1 - hit.side
        : hit.side;
  const source = `${sideName(sourceSide)}·${hit.source} [${hit.sourceUid ?? '宿主'}]`;
  const target = `${sideName(hit.side)}·${hit.targetName ?? (hit.targetLane !== undefined ? ['左路', '中路', '右路'][hit.targetLane] : '宿主')} [${hit.targetUid ?? '无目标实例'}]`;
  const effect =
    hit.kind === 'charge'
      ? `冷却计时实际推进 ${n(hit.value)} 秒${!hit.targetUid ? '（无目标，无收益）' : hit.value === 0 ? '（无收益）' : ''}`
      : hit.kind === 'damage'
        ? `屏障承伤 ${n(hit.barrierAbsorbed ?? 0)} / 宿主命中 ${n(hit.healthLoss ?? 0)}（含可能溢出伤害）`
        : `${hit.kind === 'heal' ? '有效治疗' : hit.kind === 'shield' ? '有效修复' : hit.kind === 'corrode' ? '叠加侵蚀' : '能量'} ${n(hit.value)}`;
  return `${n(time)}s · ${source} → ${target}：${effect}`;
}
export function battleEvidence(duel: Duel, frames: CombatFrame[]) {
  const last = frames.at(-1)!;
  const events = frames.flatMap((frame) =>
    frame.hits.map((hit) => ({ hit, time: frame.time })),
  );
  const breaks = frames.flatMap((frame, i) =>
    frame.barriers.flatMap((lanes, side) =>
      lanes.flatMap((b, lane) =>
        b.broken && !frames[i - 1]?.barriers[side][lane].broken
          ? [
              `${n(frame.time)}s · ${sideName(side)}${['左路', '中路', '右路'][lane]}屏障首次损毁`,
            ]
          : [],
      ),
    ),
  );
  const own = events.filter(({ hit }) =>
    duel.player.some((c) => c.uid === hit.sourceUid),
  );
  const useful =
    own.find(
      ({ hit }) => hit.kind === 'charge' && hit.value > 0 && hit.targetUid,
    ) ??
    own.find(
      ({ hit }) => ['shield', 'heal'].includes(hit.kind) && hit.value > 0,
    );
  const damage = own.find(({ hit }) => (hit.barrierAbsorbed ?? 0) > 0);
  const contribution = useful
    ? formatHit(duel, useful.hit, useful.time)
    : damage
      ? `${n(damage.time)}s · 我方${damage.hit.source} [${damage.hit.sourceUid}] 对敌方${damage.hit.targetName} [${damage.hit.targetUid}] 实际造成 ${n(damage.hit.barrierAbsorbed!)} 屏障伤害。`
      : '本场没有可记录的有效贡献。';
  const hostDamage = [0, 1].map((side) =>
    frames.reduce(
      (total, frame, i) =>
        total +
        Math.max(
          0,
          (frames[i - 1]?.hp[side] ?? duel.maxHp[side]) +
            frame.hits
              .filter((h) => h.side === side && h.kind === 'heal')
              .reduce((sum, h) => sum + h.value, 0) -
            frame.hp[side],
        ),
      0,
    ),
  );
  return {
    hp: last.hp,
    hostDamage: hostDamage.map(n),
    break: breaks[0] ?? '本场没有屏障损毁。',
    breaks,
    contribution,
    stats: duel.player.map((c) => ({
      uid: c.uid,
      name: cardDef(c.id).name,
      barrierDamage: n(
        own
          .filter(({ hit }) => hit.sourceUid === c.uid)
          .reduce((sum, { hit }) => sum + (hit.barrierAbsorbed ?? 0), 0),
      ),
    })),
  };
}
