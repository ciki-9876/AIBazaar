import type { CardDraft, Effect, Magnitude, Selector } from './types.ts';
const fmt = (n: number) => Number(n.toFixed(2)).toString();
export function describeSelector(s: Selector): string {
  const side = { ally: '己方', enemy: '敌方', both: '双方' }[s.side];
  const scope: Record<string, string> = {
    self: '自身',
    same_lane: '本路',
    adjacent_lanes: '相邻路线',
    fixed_lanes: (s.scope.lanes ?? [])
      .map((l) => ({ left: '左路', center: '中路', right: '右路' })[l])
      .join('、'),
    adjacent_left: '紧邻左侧',
    adjacent_right: '紧邻右侧',
    adjacent_both: '紧邻两侧',
    opposing_overlap: '对位占格重叠',
    all: '全部',
    event_source: '本次事件来源',
    event_target: '本次事件目标',
  };
  const sizes =
    s.filters.sizes?.map((n) => ['', '小型', '中型', '大型'][n]).join('/') ??
    '';
  const filters = [
    sizes,
    s.filters.hasCooldown === true
      ? '有冷却'
      : s.filters.hasCooldown === false
        ? '纯被动'
        : '',
    s.filters.barrierStates
      ?.map(
        (x) => ({ intact: '未破', pending_break: '待破', broken: '已破' })[x],
      )
      .join('/'),
    s.filters.statusKinds?.join('/'),
  ]
    .filter(Boolean)
    .join('、');
  const select =
    s.selection.mode === 'all'
      ? ''
      : s.selection.mode === 'random'
        ? `随机${s.selection.count}个`
        : s.selection.mode === 'first'
          ? `按稳定顺序前${s.selection.count}个`
          : `${s.selection.metric === 'attack' ? '攻击力' : s.selection.metric === 'healthRatio' ? '生命比例' : '剩余冷却'}${s.selection.mode === 'highest' ? '最高' : '最低'}的${s.selection.count}个`;
  return `${side}${scope[s.scope.kind]}${s.side === 'enemy' && s.scope.kind.startsWith('adjacent_') && s.entity === 'card' ? '（投影位置）' : ''}${filters ? `、${filters}` : ''}${select}${{ card: '卡牌', barrier: '护幕', core: '核心', lane: '路线' }[s.entity]}${s.excludeSelf ? '（排除自身）' : ''}`;
}
function magnitude(m: Magnitude): string {
  if (m.kind === 'fixed') return fmt(m.value);
  const source =
    m.kind === 'attack_ratio'
      ? '攻击力'
      : {
          barrierLoss: '本次实际护幕损失',
          coreLoss: '本次实际核心损失',
          totalLoss: '本次实际总损失',
          effectiveAmount: '本次实际恢复量',
        }[m.field];
  return `${source}的${fmt(m.ratioBps / 100)}%${m.cap === null ? '' : `（最多${fmt(m.cap)}）`}`;
}
export function describeEffect(e: Effect): string {
  const t = describeSelector(e.target),
    amount = e.magnitude ? magnitude(e.magnitude) : '',
    p = e.params ?? {};
  const distribution =
    e.distribution === 'split_total' ? '全部目标共分' : '每个目标各';
  const actions: Record<string, string> = {
    physical_damage: `${distribution}受到${amount}物理伤害${e.target.entity === 'core' ? '，绕过护幕' : e.target.entity === 'barrier' ? '，不溢出核心' : '，先护幕后溢出核心'}`,
    apply_burn: `${distribution}获得${amount}灼烧强度（每0.5秒按强度伤害并减1）`,
    apply_corrosion: `${distribution}获得${amount}侵蚀强度（每秒伤害并削幕上限，不自然衰减）`,
    repair_barrier: `${distribution}修复${amount}，不超过当前上限，破幕无效`,
    heal_core: `${distribution}治疗${amount}，不超过生命上限`,
    advance_cooldown: `充能${fmt((p.amountMs ?? 0) / 1000)}秒，冻结或无冷却时无效`,
    trigger_chain: '请求公开连锁入口，不消费自然冷却',
    haste: `冷却加速${fmt((p.rateBps ?? 0) / 100)}%，持续${fmt((p.durationMs ?? 0) / 1000)}秒`,
    slow: `冷却减速${fmt((p.rateBps ?? 0) / 100)}%，持续${fmt((p.durationMs ?? 0) / 1000)}秒`,
    freeze: `冻结${fmt((p.durationMs ?? 0) / 1000)}秒`,
    modify_attack: `攻击力${(p.delta ?? 0) >= 0 ? '+' : ''}${fmt((p.delta ?? 0) / (p.mode === 'percent' ? 100 : 1))}${p.mode === 'percent' ? '%' : ''}，持续${fmt((p.durationMs ?? 0) / 1000)}秒`,
  };
  return `${t}：${actions[e.kind]}`;
}
export function describeCard(d: CardDraft): string {
  const eventNames: Record<string, string> = {
    battle_started: '战斗开始',
    time_reached: '战斗到指定时间',
    interval_elapsed: '世界时间间隔到达',
    card_activated: '卡牌发动',
    chain_received: '接受连锁',
    cooldown_advanced: '获得有效充能',
    damage_dealt: '造成实际伤害',
    damage_received: '受到实际伤害',
    barrier_broken: '护幕破损',
    barrier_zero: '护幕归零',
    barrier_grace_started: '进入待破',
    barrier_grace_ended: '结束待破',
    healing_done: '产生有效治疗',
    healing_received: '收到有效治疗',
    repair_done: '产生有效修复',
    barrier_repaired: '护幕有效修复',
    status_applied: '状态生效',
    status_expired: '状态到期',
    attack_changed: '攻击力变化',
    corruption_started: '腐化开始',
    corruption_pulse: '每轮腐化',
  };
  const lines = d.mechanics.abilities.map((a) => {
    const w = a.when,
      f = w.filters;
    let when =
      w.event === 'cooldown_ready'
        ? `每${fmt(d.mechanics.cooldownMs! / 1000)}秒`
        : w.event === 'time_reached'
          ? `战斗进行到${f.atMs! / 1000}秒时`
          : w.event === 'interval_elapsed'
            ? `从${f.firstAtMs! / 1000}秒起每${f.periodMs! / 1000}秒`
            : `当${w.subjects ? describeSelector(w.subjects) : ''}${eventNames[w.event]}时`;
    if (f.activationKinds)
      when += `（${f.activationKinds.map((k) => ({ cycle: '周期', reactive: '响应', chain: '连锁' })[k]).join('/')}）`;
    if (f.damageKinds) when += `（${f.damageKinds.join('/')}）`;
    if (f.statusKinds) when += `（${f.statusKinds.join('/')}）`;
    if (w.occurrence.everyNth > 1)
      when += `，每第${w.occurrence.everyNth}次合格事件`;
    for (const g of w.guards)
      when +=
        g.kind === 'barrier_state'
          ? `，若${g.side}的${g.scope.kind}护幕处于${g.states.join('/')}`
          : `，若${describeSelector(g.target)}的${g.stat}${{ lt: '<', lte: '≤', eq: '=', gte: '≥', gt: '>' }[g.op]}${g.value}`;
    return `${when}：${a.effects.map(describeEffect).join('；')}。${a.delivery.kind === 'projectile' ? `飞行${a.delivery.travelMs! / 1000}秒，释放时锁定目标与数值。` : ''}${a.limits ? `本能力间隔${a.limits.internalCooldownMs / 1000}秒，每战最多${a.limits.maxActivationsPerBattle}次。` : ''}`;
  });
  for (const s of d.mechanics.specialRules)
    lines.push(
      `战初为${describeSelector(s.target)}登记一次${s.params.durationMs / 1000}秒延缓破损；零血仍溢出核心，期间修至正血可救回，到期先于同刻修复。`,
    );
  if (d.mechanics.chainEntryAbilityId)
    lines.push(`公开连锁入口：${d.mechanics.chainEntryAbilityId}。`);
  return lines.join('\n');
}
