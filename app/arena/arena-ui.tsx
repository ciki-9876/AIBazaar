'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, Shield, X } from 'lucide-react';
import { AMPLIFIERS, amplifier, arenaEffectHelp } from '@/lib/arena-catalog';
import { cardDef } from '@/lib/demo-cards';
import type { FighterCard } from '@/lib/demo-combat';

export const LANES = ['左路', '中路', '右路'];
export const RARITIES = ['普通', '精良', '稀有', '史诗', '奇迹'];

export function ArenaDialog({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`arena-inspection ${wide ? 'arena-inspection-wide' : ''}`}
      aria-label={title}
      onClose={onClose}
    >
      <div className="arena-inspection-top">
        <span>{title}</span>
        <button
          type="button"
          autoFocus
          onClick={() => ref.current?.close()}
          aria-label={`关闭${title}`}
        >
          <X size={18} />
        </button>
      </div>
      {children}
    </dialog>
  );
}

export function EffectHelp({ id }: { id: string }) {
  const help = arenaEffectHelp(id);
  return (
    <details className="arena-effect-help">
      <summary>词条与细则</summary>
      <p>
        有周期的卡牌在冷却结束时发动一次。未指定目标的攻击和状态作用于敌方本路；伤害先由屏障承受，溢出或破屏后伤害宿主。卡牌不会被攻击摧毁。
      </p>
      <dl>
        {help.map(({ term, text }, index) => (
          <div key={`${term}-${index}`}>
            <dt>{term}</dt>
            <dd>{text}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

export function AmplifierPicker({
  lane,
  current,
  onChoose,
  onClose,
}: {
  lane: number;
  current: string | null;
  onChoose: (id: string | null) => void;
  onClose: () => void;
}) {
  const [choice, setChoice] = useState(current);
  const selected = amplifier(choice);
  return (
    <ArenaDialog title={`${LANES[lane]} · 选择增幅器`} onClose={onClose} wide>
      <p className="arena-picker-rule">
        查看效果后点击装备。每路一件；屏障击破后失效。
      </p>
      <fieldset className="arena-amp-options" aria-label="增幅器效果列表">
        <button
          className={choice === null ? 'selected' : ''}
          onClick={() => setChoice(null)}
          aria-pressed={choice === null}
        >
          <strong>不装备</strong>
          <span>此路不使用增幅器。</span>
        </button>
        {AMPLIFIERS.map((amp) => (
          <button
            key={amp.id}
            className={choice === amp.id ? 'selected' : ''}
            onClick={() => setChoice(amp.id)}
            aria-pressed={choice === amp.id}
          >
            <span className="arena-amp-option-title">
              <strong>{amp.name}</strong>
              <small>
                {RARITIES[amp.rarity]}
                {current === amp.id ? ' · 已装备' : ''}
              </small>
            </span>
            <span>{amp.text}</span>
          </button>
        ))}
      </fieldset>
      {selected && (
        <div className="arena-picker-help">
          <EffectHelp id={selected.id} />
        </div>
      )}
      <div className="arena-picker-actions">
        <span>{selected?.name ?? '不装备'}</span>
        <button
          className="arena-primary"
          onClick={() => {
            onChoose(choice);
            onClose();
          }}
        >
          <Check size={16} />
          {selected ? `装备${selected.name}` : '确认不装备'}
        </button>
      </div>
    </ArenaDialog>
  );
}

export function FormationBoard({
  player,
  enemy,
  playerAmps,
  enemyAmps,
  editable,
  onSlot,
  onAmp,
  onInspect,
}: {
  player: FighterCard[];
  enemy: FighterCard[];
  playerAmps: Array<string | null>;
  enemyAmps: Array<string | null>;
  editable: boolean;
  onSlot: (at: number) => void;
  onAmp: (lane: number) => void;
  onInspect: (
    inspection:
      | { kind: 'card'; id: string; at: number }
      | { kind: 'amplifier'; id: string; lane: number },
  ) => void;
}) {
  const slots = (cards: FighterCard[], lane: number, opponent: boolean) => (
    <div
      className={`arena-formation-slots ${opponent ? 'enemy' : 'own'}`}
      aria-label={`${opponent ? '敌方' : '己方'}${LANES[lane]}卡牌`}
    >
      {[0, 1, 2].map((col) => {
        const at = lane * 3 + col,
          card = cards.find(
            (c) => c.at <= at && at < c.at + cardDef(c.id).size,
          );
        if (card && card.at !== at) return null;
        const def = card && cardDef(card.id);
        if (opponent && !card)
          return (
            <span className="arena-formation-empty" key={at}>
              {col + 1}
            </span>
          );
        return (
          <button
            key={at}
            className={`arena-slot ${card ? 'occupied' : ''}`}
            style={{ gridColumn: `${col + 1} / span ${def?.size ?? 1}` }}
            disabled={!opponent && !editable}
            aria-label={
              opponent
                ? `查看敌方${LANES[lane]}${def?.name}的效果`
                : card
                  ? `移除己方${LANES[lane]}${def?.name}`
                  : `放在${LANES[lane]}第${col + 1}格`
            }
            onClick={() =>
              opponent && card
                ? onInspect({ kind: 'card', id: card.id, at })
                : onSlot(at)
            }
          >
            {def ? (
              <>
                <strong>{def.name}</strong>
                <small>
                  {def.size}格{!opponent && editable ? ' · 移除' : ''}
                </small>
              </>
            ) : (
              <>
                <span>＋</span>
                <small>{col + 1}</small>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
  return (
    <div className="arena-formation-scroll">
      <div className="arena-formation">
        <div className="arena-formation-core enemy">敌方宿主 · 远端</div>
        <div className="arena-formation-lanes">
          {LANES.map((lane, l) => (
            <section
              className="arena-formation-lane"
              key={lane}
              aria-label={`${lane}布阵`}
            >
              <button
                className="arena-formation-barrier enemy"
                disabled={!enemyAmps[l]}
                onClick={() =>
                  enemyAmps[l] &&
                  onInspect({ kind: 'amplifier', id: enemyAmps[l]!, lane: l })
                }
              >
                <Shield size={13} />
                <span>{amplifier(enemyAmps[l])?.name ?? '无增幅器'}</span>
                <small>敌方屏障</small>
              </button>
              {slots(enemy, l, true)}
              <div className="arena-formation-lane-name">
                <span>↑</span>
                <strong>{lane}</strong>
                <span>↓</span>
              </div>
              {slots(player, l, false)}
              <button
                className="arena-formation-barrier own"
                disabled={!editable}
                onClick={() => onAmp(l)}
                aria-label={`选择${lane}增幅器`}
              >
                <Shield size={13} />
                <span>{amplifier(playerAmps[l])?.name ?? '选择增幅器'}</span>
                <small>己方屏障</small>
              </button>
            </section>
          ))}
        </div>
        <div className="arena-formation-core own">己方宿主 · 近端</div>
      </div>
    </div>
  );
}
