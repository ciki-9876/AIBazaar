import { arenaCard, amplifier } from './arena-catalog.ts';
import { cardDef } from './demo-cards.ts';
import {
  placeArenaCard,
  validateArenaBoard,
  type ArenaFrame,
} from './arena-engine.ts';
import type { Duel, FighterCard, Hit } from './demo-combat.ts';

export const LANE_NAMES = ['左路', '中路', '右路'];
export const EFFECT_NAMES: Record<string, string> = {
  damage: '伤害',
  burn: '灼烧',
  corrode: '侵蚀',
  shield: '修屏',
  heal: '治疗',
  charge: '充能',
  haste: '疾速',
  slow: '迟滞',
  freeze: '冻结',
  ammo: '装填',
  amp: '增幅器',
};
export const EFFECT_COLORS: Record<string, string> = {
  damage: '#efc17f',
  burn: '#ff9966',
  corrode: '#c3d772',
  shield: '#83d6ce',
  heal: '#a3dba0',
  charge: '#eed28e',
  haste: '#eed28e',
  slow: '#b8a5dc',
  freeze: '#a3d9f1',
  ammo: '#d4c8a4',
  amp: '#eed28e',
};
export const rounded = (value: number) => Math.round(value * 10) / 10;

export function amplifierStatus(
  duel: Duel,
  frame: ArenaFrame,
  side: number,
  lane: number,
) {
  const id = duel.arena?.amplifiers[side][lane];
  if (!id) return '未装备';
  if (frame.barriers[side][lane].broken) return '破屏失效';
  if (!frame.amplifierActive[side][lane]) return '已停用';
  if (id === 'amp-07')
    return `储能 ${frame.amplifierState?.[side][lane].stored ?? 0}/24`;
  if (id === 'amp-10')
    return frame.amplifierState?.[side][lane].used ? '本战已触发' : '等待受击';
  if (
    id === 'amp-08' &&
    frame.barriers[side][lane].hp <= frame.barriers[side][lane].maxHp / 2
  )
    return '屏障不足 · 待机';
  return '运转';
}

export function placeOnArena(
  board: FighterCard[],
  id: string,
  at: number,
  uid: string,
  moving = false,
) {
  if (!moving) return placeArenaCard(board, id, at, uid);
  const current = board.find((c) => c.uid === uid);
  if (!current) throw Error('未找到要移动的装备');
  const next = board.map((c) => (c.uid === uid ? { ...c, at } : c));
  validateArenaBoard(next);
  return next.sort((a, b) => a.at - b.at || a.uid.localeCompare(b.uid));
}

export function placementPreview(
  board: FighterCard[],
  id: string,
  at: number,
  movingUid?: string,
) {
  try {
    placeOnArena(
      board,
      id,
      at,
      movingUid ?? '__placement-preview__',
      !!movingUid,
    );
    return { allowed: true, reason: '可放置' };
  } catch (e) {
    return {
      allowed: false,
      reason: e instanceof Error ? e.message : '此处不可放置',
    };
  }
}

export function formationRelations(card: FighterCard, allies: FighterCard[]) {
  const lane = Math.floor(card.at / 3),
    n = arenaCard(card.id)?.number;
  const same = allies
    .filter((c) => Math.floor(c.at / 3) === lane && c.uid !== card.uid)
    .sort((a, b) => a.at - b.at);
  const adjacent = same.filter(
    (c) =>
      c.at + cardDef(c.id).size === card.at ||
      card.at + cardDef(card.id).size === c.at,
  );
  let targets: FighterCard[] = [],
    note = '';
  if ([7, 12, 35, 42, 49].includes(n ?? 0)) {
    targets = adjacent;
    note = targets.length
      ? `紧邻：${targets.map((c) => cardDef(c.id).name).join('、')}`
      : '当前没有紧邻装备';
  }
  if ([31, 32].includes(n ?? 0)) {
    targets = adjacent.slice(0, 1);
    note = targets.length
      ? `优先作用于${cardDef(targets[0].id).name}`
      : '缺少紧邻目标';
  }
  if (n === 37) {
    targets = adjacent.filter((c) =>
      [1, 2].includes(arenaCard(c.id)?.number ?? 0),
    );
    note = targets.length
      ? '为相邻弹药武器装填；战斗中优先弹药较少者'
      : '附近没有可装填的武器';
  }
  if ([15, 39].includes(n ?? 0)) {
    targets = same.slice(0, 1);
    note = targets.length
      ? `联动目标：${cardDef(targets[0].id).name}`
      : '本路没有其他联动目标';
  }
  if ([41, 46].includes(n ?? 0))
    note = same.length ? '独占条件未满足' : '独占条件已满足';
  if (n === 38) {
    targets = [lane - 1, lane + 1].flatMap((l) =>
      allies
        .filter((c) => Math.floor(c.at / 3) === l)
        .sort((a, b) => a.at - b.at)
        .slice(0, 1),
    );
    note = '节拍达到4时，为相邻路最左侧装备充能';
  }
  if ([14, 40].includes(n ?? 0)) {
    targets = allies.filter(
      (c) => Math.abs(Math.floor(c.at / 3) - lane) === 1 && c.at % 3 === 1,
    );
    note = `相邻路线中格形成${n === 14 ? '热槽' : '冷槽'}，按装备起始格判定`;
  }
  if (n === 45) {
    targets = allies.filter(
      (c) => Math.floor(c.at / 3) !== lane && c.at % 3 === card.at % 3,
    );
    note = '联动其他路线中起始列相同的装备';
  }
  return { targets: targets.map((c) => c.uid), note };
}

export function cardStatus(card: FighterCard, frame: ArenaFrame) {
  const id = card.uid,
    n = arenaCard(card.id)?.number,
    s = frame.cardState?.[id];
  const values: string[] = [];
  for (const [label, map] of [
    ['冻结', frame.freeze],
    ['迟滞', frame.slow],
    ['疾速', frame.haste],
  ] as const)
    if (map?.[id] > 0) values.push(`${label} ${rounded(map[id])}秒`);
  if ([1, 2].includes(n ?? 0)) values.push(`弹药 ${frame.ammo?.[id] ?? 6}/6`);
  if ((frame.stored[id] ?? 0) > 0)
    values.push(`储能 ${rounded(frame.stored[id])}`);
  if (s?.growth) values.push(`成长 +${s.growth}`);
  if (s?.upgrade && n !== 49)
    values.push(`升阶 +${Math.round(s.upgrade * 100)}%`);
  if (n === 49 && s?.upgrade) values.push('升阶已完成');
  if (n === 47 && s)
    values.push(
      s.questHits >= 2 && s.questAbsorbed >= 45
        ? '工序已完成'
        : `工序 ${Math.min(2, s.questHits)}/2次 · ${Math.min(45, s.questAbsorbed)}/45伤`,
    );
  if (n === 50 && s)
    values.push(
      s.overdrive > 0 ? `过载 ${s.overdrive}秒` : `承压 ${s.rage}/30`,
    );
  if (s?.regen) values.push(`再生 ${s.regen}/秒`);
  return values;
}

export type ReviewEvent = {
  id: string;
  time: number;
  text: string;
  kind: string;
  side: number;
  lane: number;
  important: boolean;
  from?: string;
  to?: string;
};
export type LaneReview = {
  barrier: number;
  host: number;
  repair: number;
  periodic: number;
  brokenAt: number | null;
};
export type CardReview = {
  fired: number;
  damage: number;
  repair: number;
  heal: number;
  charge: number;
  control: number;
  ammo: number;
};
export function arenaReview(duel: Duel, frames: ArenaFrame[]) {
  const events: ReviewEvent[] = [],
    lanes: LaneReview[][] = [0, 1].map(() =>
      [0, 1, 2].map(() => ({
        barrier: 0,
        host: 0,
        repair: 0,
        periodic: 0,
        brokenAt: null,
      })),
    );
  const cards: Record<string, CardReview> = Object.fromEntries(
    [...duel.player, ...duel.enemy].map((c) => [
      c.uid,
      {
        fired: 0,
        damage: 0,
        repair: 0,
        heal: 0,
        charge: 0,
        control: 0,
        ammo: 0,
      },
    ]),
  );
  const healing = [0, 0],
    regeneration = [0, 0];
  const byUid = new Map([...duel.player, ...duel.enemy].map((c) => [c.uid, c]));
  const name = (id: string) =>
    byUid.has(id)
      ? cardDef(byUid.get(id)!.id).name
      : id.startsWith('barrier-')
        ? `${id.split('-')[1] === '0' ? '我方' : '敌方'}${LANE_NAMES[Number(id.split('-')[2])]}持续效果`
        : id.startsWith('amp-')
          ? (amplifier(
              duel.arena?.amplifiers[Number(id.split('-')[1])]?.[
                Number(id.split('-')[2])
              ],
            )?.name ?? '增幅器')
          : '路线效果';
  const add = (e: Omit<ReviewEvent, 'id'>) =>
    events.push({ ...e, id: `event-${events.length}` });
  const hostTouched = [false, false];
  frames.forEach((f, i) => {
    for (const uid of f.fired) if (cards[uid]) cards[uid].fired++;
    for (const h of f.hits) {
      const lane = h.targetLane ?? 0,
        l = lanes[h.side][lane],
        owner = h.side === 0 ? '我方' : '敌方';
      const damage = (h.barrierAbsorbed ?? 0) + (h.healthLoss ?? 0),
        stats = h.sourceUid ? cards[h.sourceUid] : undefined;
      l.barrier += h.barrierAbsorbed ?? 0;
      l.host += h.healthLoss ?? 0;
      if (h.periodic) l.periodic += damage;
      if (h.kind === 'shield') l.repair += h.value;
      if (h.kind === 'heal') {
        healing[h.side] += h.value;
        if (h.periodic) regeneration[h.side] += h.value;
      }
      if (stats && !h.periodic) {
        stats.damage += damage;
        if (h.kind === 'shield') stats.repair += h.value;
        if (h.kind === 'heal') stats.heal += h.value;
        if (h.kind === 'charge') stats.charge += h.value;
        if (h.kind === 'ammo') stats.ammo += h.value;
        if (['freeze', 'slow'].includes(h.kind) && h.value > 0) stats.control++;
      }
      let detail = '';
      if (damage > 0)
        detail = [
          h.barrierAbsorbed ? `屏障 −${rounded(h.barrierAbsorbed)}` : '',
          h.healthLoss ? `宿主 −${rounded(h.healthLoss)}` : '',
        ]
          .filter(Boolean)
          .join(' / ');
      else if (h.value > 0)
        detail = `${EFFECT_NAMES[h.kind] ?? h.kind} +${rounded(h.value)}${['burn', 'corrode'].includes(h.kind) ? '层' : ['charge', 'haste', 'slow', 'freeze'].includes(h.kind) ? '秒' : ''}`;
      if (h.kind === 'amp' && h.value > 0)
        detail = h.targetName ?? '增幅器状态改变';
      if ((h.blocked ?? 0) > 0)
        detail += `${detail ? ' / ' : ''}减免 ${rounded(h.blocked!)}`;
      if (detail)
        add({
          time: f.time,
          text: `${h.source} → ${h.targetUid && byUid.has(h.targetUid) ? name(h.targetUid) : `${owner}${LANE_NAMES[lane]}`}：${detail}`,
          kind: h.kind,
          side: h.side,
          lane,
          important: h.kind === 'amp',
          from: h.periodic ? undefined : h.sourceUid,
          to: h.targetUid,
        });
      if ((h.healthLoss ?? 0) > 0 && !hostTouched[h.side]) {
        hostTouched[h.side] = true;
        add({
          time: f.time,
          text: `${owner}宿主首次受伤 · ${LANE_NAMES[lane]}`,
          kind: 'host',
          side: h.side,
          lane,
          important: true,
        });
      }
    }
    for (const link of f.links ?? []) {
      const c = byUid.get(link.to),
        side = duel.player.some((x) => x.uid === link.to) ? 0 : 1,
        lane = c ? Math.floor(c.at / 3) : 0;
      add({
        time: f.time,
        text: `${name(link.from)} → ${name(link.to)}：${link.label}`,
        kind: 'link',
        side,
        lane,
        important: link.label === '升阶',
        from: link.from,
        to: link.to,
      });
    }
    if (!i) return;
    for (let side = 0; side < 2; side++)
      for (let lane = 0; lane < 3; lane++) {
        const owner = side === 0 ? '我方' : '敌方',
          previous = frames[i - 1];
        if (
          f.barriers[side][lane].broken &&
          !previous.barriers[side][lane].broken
        ) {
          lanes[side][lane].brokenAt = f.time;
          add({
            time: f.time,
            text: `${owner}${LANE_NAMES[lane]}破屏${duel.arena?.amplifiers[side][lane] ? ' · 增幅器失效' : ''}`,
            kind: 'break',
            side,
            lane,
            important: true,
          });
        } else if (
          f.amplifierActive[side][lane] !== previous.amplifierActive[side][lane]
        ) {
          add({
            time: f.time,
            text: `${owner}${LANE_NAMES[lane]}${amplifier(duel.arena?.amplifiers[side][lane])?.name ?? '增幅器'}${f.amplifierActive[side][lane] ? '恢复运转' : '被停用'}`,
            kind: 'amp',
            side,
            lane,
            important: true,
          });
        }
      }
    for (const c of byUid.values()) {
      const s = f.cardState?.[c.uid],
        before = frames[i - 1].cardState?.[c.uid];
      if (
        s &&
        before &&
        ((s.questHits >= 2 &&
          s.questAbsorbed >= 45 &&
          !(before.questHits >= 2 && before.questAbsorbed >= 45)) ||
          (s.overdrive > 0 && before.overdrive <= 0))
      )
        add({
          time: f.time,
          text: `${cardDef(c.id).name} · ${s.overdrive > 0 ? '进入过载' : '工序完成'}`,
          kind: 'growth',
          side: duel.player.some((x) => x.uid === c.uid) ? 0 : 1,
          lane: Math.floor(c.at / 3),
          important: true,
          to: c.uid,
        });
    }
  });
  return { events, lanes, cards, healing, regeneration };
}

export function hitEndpoint(hit: Hit) {
  return hit.targetUid ?? `barrier-${hit.side}-${hit.targetLane ?? 0}`;
}
