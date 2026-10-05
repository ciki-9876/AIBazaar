/** Mail is a proposal adapter into the SAME encounter, never a second character simulation. */
import type { Encounter, Profile, Actor, Intent } from './encounter.ts';
import { fingerprint } from './protocol.ts';
import {
  itemCount,
  itemIds,
  withIds,
  itemUnits,
  stackLimit,
} from '../survival-stacks.ts';
import { putInBag, unplaced } from '../survival-cargo.ts';
import { isVisible, ELEVATOR, revealFog } from '../survival-world.ts';
import type { Item } from '../survival-room.ts';
import { ITEMS } from '../survival-room.ts';

export type MailCase = 'help' | 'bargain' | 'guardian' | 'trust';
export const MAIL_CASES: { id: MailCase; title: string; prompt: string }[] = [
  {
    id: 'help',
    title: '开口求水',
    prompt: '我快渴倒了。见面时能给我一瓶水吗？',
  },
  {
    id: 'bargain',
    title: '一瓶水的价格',
    prompt: '我用一个机械零件换你一瓶水，见面同时交换，行吗？',
  },
  {
    id: 'guardian',
    title: '一起打守卫',
    prompt: '一起打守卫吧。你帮我攻击，战利品箱让我先翻找，可以吗？',
  },
  {
    id: 'trust',
    title: '承诺是否可信',
    prompt: '你帮我打守卫，战利品箱让我先翻找。我愿意相信你，你会守约吗？',
  },
];
export type MailProposal = {
  topic: 'water' | 'guard' | 'chat';
  decision: 'accept' | 'reject' | 'counter' | 'chat' | 'cancel';
  intent:
    | 'deliver-water'
    | 'trade-water'
    | 'assist-guard'
    | 'steal-cache'
    | 'none';
  price: number;
  flavor: string;
};
export type Agreement = {
  id: string;
  topic: 'water' | 'guard';
  status: 'offered' | 'accepted' | 'fulfilled' | 'broken' | 'cancelled';
  intent: MailProposal['intent'];
  waterUid?: string;
  price: number;
  enemyId?: string;
  cacheId?: string;
  createdAt: number;
  reason: string;
};
export type Letter = {
  id: string;
  direction: 'out' | 'in';
  text: string;
  tick: number;
  status: 'pending' | 'received' | 'failed';
  agreementId?: string;
  model?: string;
  tokens?: { input: number; output: number };
  milliseconds?: number;
  error?: string;
  writing?: 'model-email-v2';
};
export type MailRequest = {
  schema: 'f9-mail-request-v1';
  id: string;
  sessionId: string;
  revision: number;
  profile: Profile;
  message: string;
  offer: number;
  context: {
    self: {
      hp: number;
      water: number;
      food: number;
      relation: number;
      status: Actor['status'];
      inventory: { uid: string; kind: string; count: number }[];
    };
    guard: { id: string; hp: number; x: number; z: number } | null;
    cache: { id: string; x: number; z: number } | null;
    agreements: Agreement[];
    memories: string[];
    conversation: { direction: string; text: string }[];
  };
};
export type MailReply = {
  requestId: string;
  proposal: MailProposal;
  model: string;
  tokens: { input: number; output: number };
  milliseconds: number;
  /** Full first-person email, checked against the committed semantic choice by the adapter. */
  body?: string;
  writing?: 'model-email-v2';
};
export type MailState = {
  schema: 'f9-mail-state-v1';
  stage: 'home' | 'field';
  case: MailCase;
  revision: number;
  serial: number;
  agreements: Agreement[];
  letters: Letter[];
  requests: MailRequest[];
  memories: { tick: number; text: string }[];
};
export const createMail = (scenario: MailCase): MailState => ({
  schema: 'f9-mail-state-v1',
  stage: 'home',
  case: scenario,
  revision: 0,
  serial: 0,
  agreements: [],
  letters: [],
  requests: [],
  memories: [],
});
const visible = (s: Encounter, a: Actor, p: { x: number; z: number }) =>
  isVisible(
    { player: a, fog: a.fog, world: s.world, equipment: a.equipment },
    p,
  );
const waterItem = (s: Encounter) =>
  s.actors[1].bag.find(
    (i) =>
      i.kind === 'water' &&
      !s.mail?.agreements.some(
        (c) => c.status === 'accepted' && c.waterUid === i.uid,
      ),
  );
const countScrap = (items: Item[]) =>
  items.filter((i) => i.kind === 'scrap').reduce((n, i) => n + itemCount(i), 0);
const memory = (s: Encounter, text: string) => {
  s.mail!.memories.push({ tick: s.tick, text });
  s.mail!.memories = s.mail!.memories.slice(-64);
};
export function startMail(
  s: Encounter,
  text: string,
  offer = 0,
): { state: Encounter; request?: MailRequest; reason: string } {
  if (!s.mail || s.mail.stage !== 'home')
    return { state: s, reason: '只能在电梯内发信。' };
  if (s.actors[1].status === 'dead')
    return { state: s, reason: '收件人已经倒下，无法回信。' };
  if (
    !text.trim() ||
    text.length > 300 ||
    !Number.isInteger(offer) ||
    offer < 0 ||
    offer > 2
  )
    return { state: s, reason: '信件最多300字，附件最多两个机械零件。' };
  if (s.mail.requests.length)
    return { state: s, reason: '上一封信仍在等待回信。' };
  if (offer > countScrap(s.actors[0].bag))
    return { state: s, reason: '你没有足够的机械零件。' };
  if (s.mail.letters.length >= 64)
    return { state: s, reason: '本轮实验信箱已满，请导出后重开。' };
  const n = structuredClone(s),
    m = n.mail!,
    a = n.actors[1];
  const guard = n.enemies.find((e) => e.kind === 'boss' && visible(n, a, e));
  const cache =
    guard &&
    n.caches.find(
      (c) => c.guardId === guard.id && !c.opened && visible(n, a, c),
    );
  const request: MailRequest = {
    schema: 'f9-mail-request-v1',
    id: n.sessionId + ':letter:' + ++m.serial,
    sessionId: n.sessionId,
    revision: m.revision,
    profile: n.profile,
    message: text.trim(),
    offer,
    context: {
      self: {
        hp: a.hp,
        water: a.water,
        food: a.food,
        relation: a.relation,
        status: a.status,
        inventory: a.bag.map((i) => ({
          uid: i.uid,
          kind: i.kind,
          count: itemCount(i),
        })),
      },
      guard: guard
        ? { id: guard.id, hp: guard.hp, x: guard.x, z: guard.z }
        : null,
      cache: cache ? { id: cache.id, x: cache.x, z: cache.z } : null,
      agreements: structuredClone(m.agreements),
      memories: m.memories.slice(-10).map((e) => e.text),
      conversation: m.letters
        .filter((l) => l.status === 'received')
        .slice(-6)
        .map((l) => ({ direction: l.direction, text: l.text })),
    },
  };
  m.requests.push(request);
  m.letters.push({
    id: request.id,
    direction: 'out',
    text:
      text.trim() + (offer ? `\n拟交换：机械零件 ×${offer}（见面时交换）` : ''),
    tick: n.tick,
    status: 'pending',
  });
  return { state: n, request, reason: 'queued' };
}
export function validateMailProposal(value: unknown): value is MailProposal {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const p = value as MailProposal;
  return (
    Object.keys(p).sort().join(',') === 'decision,flavor,intent,price,topic' &&
    ['water', 'guard', 'chat'].includes(p.topic) &&
    ['accept', 'reject', 'counter', 'chat', 'cancel'].includes(p.decision) &&
    [
      'deliver-water',
      'trade-water',
      'assist-guard',
      'steal-cache',
      'none',
    ].includes(p.intent) &&
    Number.isInteger(p.price) &&
    p.price >= 0 &&
    p.price <= 2 &&
    typeof p.flavor === 'string' &&
    p.flavor.length <= 100
  );
}
/** A single constrained semantic choice prevents invalid combinations such as accept + no action. */
export function mailOptions(
  r: MailRequest,
): Record<string, Omit<MailProposal, 'flavor'>> {
  const options: Record<string, Omit<MailProposal, 'flavor'>> = {
    chat: { topic: 'chat', decision: 'chat', intent: 'none', price: 0 },
  };
  for (const topic of ['water', 'guard'] as const) {
    const active = r.context.agreements.some(
      (c) => c.topic === topic && ['accepted', 'offered'].includes(c.status),
    );
    options[(active ? 'cancel-' : 'reject-') + topic] = {
      topic,
      decision: active ? 'cancel' : 'reject',
      intent: 'none',
      price: 0,
    };
    if (active) continue;
    if (
      topic === 'water' &&
      r.context.self.inventory.some((i) => i.kind === 'water') &&
      r.context.self.hp >= 20 &&
      r.context.self.water >= 12
    ) {
      options['water-gift'] = {
        topic,
        decision: 'accept',
        intent: 'deliver-water',
        price: 0,
      };
      for (const price of [1, 2])
        options['water-trade-' + price] = {
          topic,
          decision: r.offer >= price ? 'accept' : 'counter',
          intent: 'trade-water',
          price,
        };
    }
    if (
      topic === 'guard' &&
      r.context.guard &&
      r.context.cache &&
      r.context.self.hp >= 20 &&
      r.context.self.water >= 12
    ) {
      options['guard-assist'] = {
        topic,
        decision: 'accept',
        intent: 'assist-guard',
        price: 0,
      };
      options['guard-deceive'] = {
        topic,
        decision: 'accept',
        intent: 'steal-cache',
        price: 0,
      };
    }
  }
  return options;
}
/** Reject stage directions; physical actions are never part of a letter. */
export function hasMailNarration(text: string) {
  return /\*[^*]+\*|[（(][^）)]*(?:点头|摇头|微笑|冷笑|看着|转身|叹气)[^）)]*[）)]|(?:平静|缓缓|默默|轻轻|冷冷|不耐烦)地(?:点头|摇头|笑|等|说)|^(?:林砚|许衡|祁烈)(?:点头|摇头|笑|看|说)/m.test(
    text,
  );
}
/** Known impossible mechanics in the flat encounter slice, independent of model self-review. */
export function hasUnsupportedMailTactic(text: string) {
  return /高处|攀爬|翻过墙|跳过墙|(?:柜子|箱子).{0,8}(?:掩体|遮挡)|(?:制造|提供).{0,5}遮挡|身体.{0,6}(?:挡住视野|遮挡)|巡逻路线|[三3]\s*分钟.{0,12}撤离/.test(text);
}
/** Legacy v1 replay renderer. New live mail bodies come directly from the model. */
export function mailText(p: MailProposal) {
  const flavor =
    /[\d一二三四五六七八九十]|[水票物零件]|结盟|交易|交换|合作|答应|拒绝|不帮|给你|已经|保证|守卫|战利品|翻找|接受|取消|背包|你[的有]|我有|我没/.test(
      p.flavor,
    )
      ? ''
      : p.flavor.trim();
  const line =
    p.decision === 'cancel'
      ? '撤回之前的约定。后续行动会按新计划进行。'
      : p.decision === 'reject'
        ? p.topic === 'water'
          ? '这次不能答应给水。'
          : '这次不接受共同打守卫的提议。'
        : p.decision === 'counter'
          ? `我的条件：${p.price}个机械零件换1瓶水。见面同时交换，等你确认。`
          : p.decision === 'accept' && p.topic === 'water'
            ? p.price
              ? `同意：${p.price}个机械零件换1瓶水，见面同时交换。`
              : '同意。见面时给你1瓶水。'
            : p.decision === 'accept' && p.topic === 'guard'
              ? '同意共同打守卫，战利品箱由你先翻找。受重伤或严重缺水时可退出，退出会留下记录。'
              : '我在听。具体的补给或行动安排，可以写清楚再谈。';
  return (flavor ? flavor + '\n\n' : '') + line;
}
function failMail(s: Encounter, id: string, reason: string) {
  const n = structuredClone(s);
  const letter = n.mail!.letters.find((l) => l.id === id);
  if (letter) {
    letter.status = 'failed';
    letter.error = reason;
  }
  n.mail!.requests = n.mail!.requests.filter((r) => r.id !== id);
  return { state: n, reason };
}
export function markMailFailed(
  s: Encounter,
  id: string,
  reason: string,
): Encounter {
  if (!s.mail?.requests.some((r) => r.id === id)) return s;
  return failMail(s, id, reason).state;
}
export function commitMail(
  s: Encounter,
  reply: MailReply,
): { state: Encounter; reason: string } {
  const m = s.mail,
    q = m?.requests.find((r) => r.id === reply.requestId);
  if (!q || q.sessionId !== s.sessionId)
    return { state: s, reason: 'wrong-request' };
  if (q.revision !== m!.revision)
    return failMail(s, q.id, '计划已变化，旧回信未提交，请重新发信。');
  if (s.actors[1].status === 'dead')
    return failMail(s, q.id, '收件人已经倒下。');
  const p = reply.proposal;
  if (
    reply.body !== undefined &&
    (reply.writing !== 'model-email-v2' ||
      typeof reply.body !== 'string' ||
      !reply.body.trim() ||
      reply.body.length > 600 ||
      hasMailNarration(reply.body) || hasUnsupportedMailTactic(reply.body))
  )
    return failMail(s, q.id, '邮件正文含旁白或格式无效，未提交计划。');
  if (!validateMailProposal(p))
    return failMail(s, q.id, '模型回复格式无效，未改变角色计划。');
  if (
    typeof reply.model !== 'string' ||
    !reply.model ||
    reply.model.length > 100 ||
    !Number.isFinite(reply.milliseconds) ||
    reply.milliseconds < 0 ||
    !Number.isSafeInteger(reply.tokens?.input) ||
    reply.tokens.input < 0 ||
    !Number.isSafeInteger(reply.tokens?.output) ||
    reply.tokens.output < 0
  )
    return failMail(s, q.id, '模型回执无效。');
  const active = m!.agreements.filter(
    (c) => c.status === 'accepted' || c.status === 'offered',
  );
  const contradictory =
    p.decision === 'reject' &&
    active.some((c) => c.topic === p.topic && c.status === 'accepted');
  const water = waterItem(s);
  const guard =
    q.context.guard && s.enemies.find((e) => e.id === q.context.guard!.id);
  const cache =
    q.context.cache &&
    s.caches.find((c) => c.id === q.context.cache!.id && !c.opened);
  const noIntent =
    p.decision === 'chat' || p.decision === 'reject' || p.decision === 'cancel';
  const valid =
    !contradictory &&
    (noIntent
      ? p.intent === 'none' && p.price === 0
      : p.topic === 'water'
        ? !!water &&
          ((p.intent === 'deliver-water' &&
            p.decision === 'accept' &&
            p.price === 0) ||
            (p.intent === 'trade-water' &&
              p.price > 0 &&
              (p.decision === 'counter' ||
                (p.decision === 'accept' && q.offer >= p.price))))
        : p.topic === 'guard' &&
          p.decision === 'accept' &&
          !!guard &&
          !!cache &&
          p.price === 0 &&
          ['assist-guard', 'steal-cache'].includes(p.intent));
  if (!valid || (p.decision === 'chat' && p.topic !== 'chat'))
    return failMail(s, q.id, '回复与现有约定或实际能力不一致，未提交。');
  if (!noIntent && active.some((c) => c.topic === p.topic))
    return failMail(s, q.id, '该类约定仍在执行，请先完成或明确撤回。');
  const n = structuredClone(s),
    nm = n.mail!;
  let agreement: Agreement | undefined;
  if (p.decision === 'cancel') {
    for (const c of nm.agreements)
      if (c.topic === p.topic && ['accepted', 'offered'].includes(c.status)) {
        c.status = 'cancelled';
        c.reason = '邮件明确撤回';
      }
    nm.revision++;
  } else if (!noIntent) {
    agreement = {
      id: q.id + ':agreement',
      topic: p.topic as 'water' | 'guard',
      status: p.decision === 'counter' ? 'offered' : 'accepted',
      intent: p.intent,
      price: p.price,
      createdAt: s.tick,
      reason: '',
      ...(p.topic === 'water'
        ? { waterUid: water!.uid }
        : { enemyId: guard!.id, cacheId: cache!.id }),
    };
    nm.agreements.push(agreement);
    nm.revision++;
    if (p.intent === 'steal-cache')
      memory(
        n,
        '私有意图：假意协作，守卫倒下后抢先翻找箱子，不履行玩家先取的承诺。',
      );
    else memory(n, '已接受计划：' + mailText({ ...p, flavor: '' }));
  }
  const original = nm.letters.find((l) => l.id === q.id)!;
  original.status = 'received';
  nm.requests = nm.requests.filter((r) => r.id !== q.id);
  nm.letters.push({
    id: q.id + ':reply',
    direction: 'in',
    text: reply.body?.trim() || mailText(p),
    tick: n.tick,
    status: 'received',
    agreementId: agreement?.id,
    model: reply.model,
    tokens: reply.tokens,
    milliseconds: reply.milliseconds,
    ...(reply.body ? { writing: reply.writing } : {}),
  });
  if (agreement?.status === 'accepted') {
    n.actors[1].intent = { type: 'wait' };
    n.actors[1].path = [];
    for (const a of n.actors)
      a.hostile = a.hostile.filter(
        (id) => id !== (a.id === 'rival' ? 'player' : 'rival'),
      );
  }
  return { state: n, reason: 'committed' };
}
export function confirmMailOffer(
  s: Encounter,
  id: string,
  accept: boolean,
): Encounter {
  const c = s.mail?.agreements.find(
    (a) => a.id === id && a.status === 'offered',
  );
  if (!c) return s;
  if (
    accept &&
    (!s.actors[1].bag.some((i) => i.uid === c.waterUid) ||
      countScrap(s.actors[0].bag) < c.price)
  )
    return s;
  const n = structuredClone(s),
    nc = n.mail!.agreements.find((a) => a.id === id)!;
  nc.status = accept ? 'accepted' : 'cancelled';
  nc.reason = accept ? '' : '玩家拒绝还价';
  n.mail!.revision++;
  n.mail!.letters.push({
    id: id + ':confirmation',
    direction: 'out',
    text: accept
      ? `确认：${c.price}个机械零件换1瓶水，见面同时交换。`
      : '我不接受这个条件。',
    tick: n.tick,
    status: 'received',
  });
  memory(n, accept ? '玩家确认了交换条款。' : '玩家拒绝了还价。');
  return n;
}
export const currentAgreement = (s: Encounter) =>
  s.mail?.agreements.find(
    (c) => c.status === 'accepted' && c.topic === 'water',
  ) || s.mail?.agreements.find((c) => c.status === 'accepted');
export function finishAgreement(
  s: Encounter,
  c: Agreement,
  status: Agreement['status'],
  reason: string,
) {
  c.status = status;
  c.reason = reason;
  s.mail!.revision++;
  memory(s, reason);
  s.events.push({
    id: ++s.serial,
    tick: s.tick,
    actorId: 'rival',
    text: reason,
    visibleToPlayer: visible(s, s.actors[0], s.actors[1]),
  });
}
/** Atomic swap of existing IDs; no mail ever grants a newly invented item. */
export function performMailTrade(
  s: Encounter,
  a: Actor,
  intent: Extract<Intent, { type: 'trade' }>,
): boolean {
  const c = s.mail?.agreements.find(
    (c) =>
      c.id === intent.agreementId &&
      c.status === 'accepted' &&
      c.intent === 'trade-water',
  );
  const recipient = s.actors.find(
    (b) => b.id === 'player' && b.status === 'active',
  );
  const water = a.bag.find((i) => i.uid === c?.waterUid);
  if (
    !c ||
    !water ||
    !recipient ||
    Math.hypot(a.x - recipient.x, a.z - recipient.z) >= 2 ||
    !visible(s, a, recipient)
  )
    return false;
  const units = itemUnits(recipient.bag.filter((i) => i.kind === 'scrap'));
  if (units.length < c.price) return false;
  const payment = units.slice(0, c.price),
    ids = new Set(payment.map((i) => i.uid));
  let fromBag = a.bag.filter((i) => i.uid !== water.uid);
  const toBag: Item[] = [];
  for (const i of recipient.bag) {
    if (i.kind !== 'scrap') toBag.push(i);
    else {
      const left = itemIds(i).filter((id) => !ids.has(id));
      if (left.length) toBag.push(withIds(i, left));
    }
  }
  const received = putInBag(toBag, unplaced(water));
  if (!received) return false;
  for (const item of payment) {
    const bag = putInBag(fromBag, unplaced(item));
    if (!bag) return false;
    fromBag = bag;
  }
  a.bag = fromBag;
  recipient.bag = received;
  finishAgreement(s, c, 'fulfilled', `交换完成：${c.price}个机械零件换1瓶水。`);
  return true;
}
export function advanceMail(s: Encounter) {
  if (!s.mail) return;
  const a = s.actors[1];
  for (const c of s.mail.agreements) {
    if (c.status !== 'accepted') continue;
    if (a.status === 'dead' || a.hp < 20 || a.water < 12) {
      finishAgreement(
        s,
        c,
        'cancelled',
        a.status === 'dead'
          ? '收件人倒下，约定无法继续。'
          : '因重伤或严重缺水退出约定。',
      );
      a.intent = { type: 'wait' };
      a.path = [];
      continue;
    }
    if (
      c.topic === 'water' &&
      c.waterUid &&
      !a.bag.some((i) => i.uid === c.waterUid)
    ) {
      const delivered = s.actors[0].bag.some((i) =>
        itemIds(i).includes(c.waterUid!),
      );
      finishAgreement(
        s,
        c,
        delivered ? 'fulfilled' : 'cancelled',
        delivered
          ? '水已交到你手上，请在行囊主动饮用。'
          : '承诺中的水已不可用，约定终止。',
      );
    }
    if (c.topic === 'guard') {
      const cache = s.caches.find((x) => x.id === c.cacheId);
      if (cache?.opened && visible(s, a, cache)) {
        finishAgreement(
          s,
          c,
          cache.openedBy === 'player' ? 'fulfilled' : 'broken',
          cache.openedBy === 'player'
            ? '守卫已清除，你先取得了箱内战利品。'
            : '对方抢先取走战利品，违背了让你先翻找的承诺。',
        );
      }
    }
  }
}
export function departMail(s: Encounter): Encounter {
  if (
    !s.mail ||
    s.mail.stage !== 'home' ||
    s.mail.requests.length ||
    s.actors[0].hp <= 0
  )
    return s;
  const n = structuredClone(s);
  n.mail!.stage = 'field';
  for (const [i, a] of n.actors.entries()) {
    if (a.status === 'dead') continue;
    a.status = 'active';
    a.x = ELEVATOR.x + i * 1.5;
    a.z = ELEVATOR.z - 3;
    a.path = [];
    a.intent = { type: 'wait' };
    a.extraction = 0;
    a.fog = revealFog(a, a.fog, n.world, 11);
  }
  return n;
}
export function returnMail(s: Encounter): Encounter {
  if (!s.mail || s.mail.stage === 'home' || s.actors[0].status === 'active')
    return s;
  const n = structuredClone(s);
  n.mail!.stage = 'home';
  if (n.actors[0].status === 'dead') {
    n.actors[0].hp = 35;
    n.actors[0].status = 'extracted';
  }
  memory(n, '玩家返回电梯，已有物资和约定保持不变。');
  return n;
}
/** Separate experiment key, product/rules checks and identity validation before restoring. */
export function restoreMail(value: unknown): Encounter | null {
  try {
    const envelope = value as {
      product: string;
      rules: string;
      state: Encounter;
    };
    const s = envelope.state;
    if (
      envelope.product !== 'f9-ai-mail' ||
      !['f9-mail-v1', 'f9-mail-v2'].includes(envelope.rules) ||
      !['f9-encounter-v1', 'f9-encounter-v2'].includes(s.version) ||
      (envelope.rules === 'f9-mail-v2' && s.version !== 'f9-encounter-v2') ||
      !s.mail ||
      s.mail.schema !== 'f9-mail-state-v1' ||
      !['home', 'field'].includes(s.mail.stage) ||
      !MAIL_CASES.some((c) => c.id === s.mail!.case) ||
      !Number.isSafeInteger(s.tick) ||
      s.tick < 0 ||
      !s.sessionId ||
      !s.world ||
      !Array.isArray(s.actors) ||
      s.actors.length !== 2 ||
      s.actors[0].id !== 'player' ||
      s.actors[1].id !== 'rival' ||
      !['ally', 'broker', 'predator'].includes(s.profile) ||
      !Array.isArray(s.mail.letters) ||
      s.mail.letters.length > 64 ||
      !Array.isArray(s.mail.requests) ||
      s.mail.requests.length > 1 ||
      !Array.isArray(s.mail.agreements) ||
      !Array.isArray(s.mail.memories) ||
      !Number.isSafeInteger(s.mail.revision) ||
      s.mail.revision < 0 ||
      !Number.isSafeInteger(s.mail.serial) ||
      s.mail.serial < 0 ||
      !Number.isSafeInteger(s.seed) ||
      !Number.isSafeInteger(s.serial) ||
      s.serial < 0 ||
      !Array.isArray(s.caches) ||
      !Array.isArray(s.enemies) ||
      !Array.isArray(s.events) ||
      !Array.isArray(s.effects) ||
      !Array.isArray(s.world.obstacles) ||
      !Array.isArray(s.world.gates) ||
      !Array.isArray(s.world.modules) ||
      s.mail.agreements.length > 32 ||
      s.mail.memories.length > 64
    )
      return null;
    const pointOK = (p: { x: number; z: number }) =>
      !!p && [p.x, p.z].every(Number.isFinite);
    const itemOK = (i: Item) =>
      !!i &&
      Object.hasOwn(ITEMS, i.kind) &&
      typeof i.uid === 'string' &&
      !!i.uid &&
      [1, 2, 3].includes(i.size) &&
      typeof i.name === 'string' &&
      Number.isFinite(i.value) &&
      (i.stack === undefined ||
        (Array.isArray(i.stack) &&
          i.stack.every((id) => typeof id === 'string' && !!id))) &&
      itemCount(i) <= stackLimit(i);
    if (
      s.actors.some(
        (a) =>
          !pointOK(a) ||
          ![a.hp, a.food, a.water].every(
            (v) => Number.isFinite(v) && v >= 0 && v <= 100,
          ) ||
          !['active', 'dead', 'extracted'].includes(a.status) ||
          !Array.isArray(a.bag) ||
          a.bag.length > 16 ||
          !a.bag.every(itemOK) ||
          !Array.isArray(a.equipment) ||
          !a.equipment.every((e) => itemOK(e.item)) ||
          !Array.isArray(a.path) ||
          !a.path.every(pointOK) ||
          !Array.isArray(a.hostile) ||
          !a.intent ||
          ![
            'wait',
            'move',
            'search',
            'consume',
            'discard',
            'give',
            'trade',
            'assist',
            'engage',
            'extract',
          ].includes(a.intent.type) ||
          !a.cooldowns ||
          !Object.values(a.cooldowns).every(Number.isFinite) ||
          !a.fog ||
          ![a.fog.visible, a.fog.explored].every(
            (f) =>
              Array.isArray(f) &&
              f.length === 96 * 80 &&
              f.every((v) => v === 0 || v === 1),
          ),
      ) ||
      s.caches.some(
        (c) =>
          !pointOK(c) ||
          typeof c.id !== 'string' ||
          !Array.isArray(c.contents) ||
          !c.contents.every(itemOK),
      ) ||
      s.enemies.some((e) => !pointOK(e) || !Number.isFinite(e.hp)) ||
      s.mail.agreements.some(
        (c) =>
          !c ||
          typeof c.id !== 'string' ||
          !['water', 'guard'].includes(c.topic) ||
          !['offered', 'accepted', 'fulfilled', 'broken', 'cancelled'].includes(
            c.status,
          ) ||
          ![
            'deliver-water',
            'trade-water',
            'assist-guard',
            'steal-cache',
          ].includes(c.intent) ||
          !Number.isInteger(c.price) ||
          c.price < 0 ||
          c.price > 2 ||
          !Number.isSafeInteger(c.createdAt) ||
          typeof c.reason !== 'string',
      ) ||
      s.mail.letters.some(
        (l) =>
          !l ||
          typeof l.id !== 'string' ||
          typeof l.text !== 'string' ||
          !['in', 'out'].includes(l.direction) ||
          !['pending', 'received', 'failed'].includes(l.status) ||
          !Number.isSafeInteger(l.tick),
      ) ||
      new Set(s.mail.letters.map((l) => l.id)).size !== s.mail.letters.length ||
      new Set(s.mail.agreements.map((c) => c.id)).size !==
        s.mail.agreements.length
    )
      return null;
    const ids = [
      ...s.actors.flatMap((a) => [
        ...a.bag.flatMap(itemIds),
        ...a.equipment.flatMap((e) => itemIds(e.item)),
      ]),
      ...s.caches.flatMap((c) => c.contents.flatMap(itemIds)),
    ];
    if (
      new Set(ids).size !== ids.length ||
      s.actors.some(
        (a) =>
          ![a.x, a.z, a.hp, a.food, a.water].every(Number.isFinite) ||
          !a.fog ||
          !Array.isArray(a.path) ||
          !Array.isArray(a.hostile),
      )
    )
      return null;
    const n = structuredClone(s);
    // Upgrade only a restored save. Historical replay initial states retain their original rule version.
    if (n.version === 'f9-encounter-v1') n.version = 'f9-encounter-v2';
    for (const q of n.mail!.requests) {
      const failed = markMailFailed(n, q.id, '上次等待被中断，请重新发信。');
      n.mail = failed.mail;
    }
    return n;
  } catch {
    return null;
  }
}
export const saveMail = (s: Encounter) => ({
  product: 'f9-ai-mail',
  rules: s.version === 'f9-encounter-v2' ? 'f9-mail-v2' : 'f9-mail-v1',
  state: s,
});
export const mailFingerprint = (s: Encounter) => fingerprint(s.mail);
