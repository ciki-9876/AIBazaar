'use client';
import { ITEM_PROPERTIES, TRAIT_LABELS } from '@/lib/survival-item-traits';
import { useState } from 'react';
import { putInBag } from '@/lib/survival-cargo';
import { ArrowDownToLine, ShieldCheck } from 'lucide-react';
import { PixelGear } from './pixel-gear';
import {
  EQUIPMENT_SIZE,
  SAFE_SIZE,
  capacity,
  adjacent,
  fits,
  weaponStats,
  type ItemKind,
  type SurvivalAction,
  type SurvivalState,
} from '@/lib/survival-room';

export const gearDescription: Partial<Record<ItemKind, string>> = {
  phone: '13 伤害 · 2.3 秒 · 9 米。自动发出冷色光束。',
  flashlight:
    '21 伤害 · 2.9 秒 · 9 米。自动发出聚焦光束；装备时光明视野 +2 米（不叠加）。',
  'lift-material': '打爆怪物掉落脑浆很合理，升级电脑需要脑浆也很合理',
  'energy-core': '从荒原箱子中找到的供能电容。可投喂给电梯终端，激活一级照明。',
  nail: '23 伤害 · 0.77 秒 · 7 米。自动射击最近的可见敌人。',
  coil: '22 伤害 · 2 秒 · 4.8 米。电击最多 4 个可见敌人。',
  blade: '32 伤害 · 1.2 秒 · 2.8 米。切割范围内所有可见敌人。',
  laser: '58 伤害 · 3 秒 · 11 米。朝最近敌人发射贯穿光束，机械会阻挡。',
  capacitor: '紧贴左右两侧的武器伤害 +25%。空格会断开连接。',
  coolant: '紧贴左右两侧的武器攻击频率 +20%。空格会断开连接。',
};
export function GearIcon({
  kind,
  size = 25,
}: {
  kind: ItemKind;
  size?: number;
}) {
  return <PixelGear kind={kind} size={size <= 32 ? 32 : 64} />;
}
export default function EquipmentBoard({
  state,
  editing = false,
  act,
  onOpen,
  minimal = false,
}: {
  state: SurvivalState;
  editing?: boolean;
  act?: (a: SurvivalAction) => void;
  onOpen?: () => void;
  minimal?: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [previewSlot, setPreviewSlot] = useState<number | null>(null);
  const gear = state.equipment.find((e) => e.item.uid === selected);
  const stats = gear ? weaponStats(state, gear) : null;
  const preview =
    gear &&
    previewSlot !== null &&
    fits(state.equipment, gear.item.size, previewSlot, gear.item.uid)
      ? {
          ...state,
          equipment: state.equipment.map((e) =>
            e.item.uid === gear.item.uid ? { ...e, slot: previewSlot } : e,
          ),
        }
      : state;
  const used = state.equipment.reduce((n, e) => n + e.item.size, 0);
  return (
    <section
      className={`equipment-panel ${editing ? 'editing' : 'compact'} ${minimal ? 'gear-minimal' : ''}`}
      aria-label="十格自动装备"
    >
      <div className="equipment-heading">
        <span>
          {minimal ? '装备' : '自动装备'}{' '}
          <b>
            {used} / {EQUIPMENT_SIZE}
          </b>
        </span>
        {!minimal && (
          <small>
            {editing ? '选中装备，再点编号调整起始格' : '紧贴相邻生效 · B 整理'}
          </small>
        )}
      </div>
      <div
        className="equipment-strip"
        data-drop-zone={editing ? 'equipment' : undefined}
      >
        {Array.from({ length: EQUIPMENT_SIZE }, (_, slot) => (
          <button
            key={slot}
            className="equipment-anchor"
            style={{ gridColumn: slot + 1, gridRow: 1 }}
            disabled={
              !editing ||
              !gear ||
              !fits(state.equipment, gear.item.size, slot, gear.item.uid)
            }
            aria-label={`移到第 ${slot + 1} 格`}
            onPointerEnter={() => setPreviewSlot(slot)}
            onPointerLeave={() => setPreviewSlot(null)}
            onFocus={() => setPreviewSlot(slot)}
            onBlur={() => setPreviewSlot(null)}
            onClick={() =>
              gear && act?.({ type: 'equip', uid: gear.item.uid, slot })
            }
          >
            {String(slot + 1).padStart(2, '0')}
          </button>
        ))}
        {Array.from({ length: EQUIPMENT_SIZE }, (_, slot) => (
          <span
            key={slot}
            className="equipment-empty"
            style={{ gridColumn: slot + 1, gridRow: 2 }}
          >
            ·
          </span>
        ))}
        {state.equipment.map((e) => {
          const effective = weaponStats(state, e),
            connected = preview.equipment.some(
              (n) =>
                adjacent(
                  preview.equipment.find((p) => p.item.uid === e.item.uid) || e,
                  n,
                ) &&
                ((effective &&
                  (n.item.kind === 'capacitor' || n.item.kind === 'coolant')) ||
                  (!effective && weaponStats(state, n))),
            );
          const remaining = Math.max(
            0,
            (state.cooldowns[e.item.uid] || 0) - state.tick,
          );
          return (
            <button
              key={e.item.uid}
              data-drag-uid={editing ? e.item.uid : undefined}
              data-item-uid={e.item.uid}
              className={`equipment-card ${e.item.kind} ${gear?.item.uid === e.item.uid ? 'selected' : ''} ${connected ? 'linked' : ''} ${preview !== state ? 'link-preview' : ''}`}
              style={{
                gridColumn: `${e.slot + 1} / span ${e.item.size}`,
                gridRow: 2,
              }}
              onClick={() =>
                editing
                  ? setSelected((current) =>
                      current === e.item.uid ? null : e.item.uid,
                    )
                  : onOpen?.()
              }
              title={`${e.item.name} · ${e.item.size} 格\n${gearDescription[e.item.kind]}`}
              aria-label={`选择${e.item.name}，${e.item.size} 格，起始第 ${e.slot + 1} 格`}
            >
              <GearIcon kind={e.item.kind} size={editing ? 31 : 23} />
              <b>{e.item.name}</b>
              {!minimal && (
                <small>
                  {effective
                    ? `${effective.damage} 伤害${effective.amp ? ' ↑' : ''}`
                    : e.item.kind === 'capacitor'
                      ? '相邻增伤'
                      : '相邻加速'}
                </small>
              )}
              {effective && (
                <i
                  style={{
                    width: `${Math.max(0, 1 - remaining / effective.interval) * 100}%`,
                  }}
                />
              )}
              {connected && <em aria-label="相邻连接生效" />}
            </button>
          );
        })}
      </div>
      {editing && (!minimal || gear) && (
        <div className="equipment-inspector">
          {gear ? (
            <>
              <div>
                <strong>
                  {gear.item.name} <small>{gear.item.size} 格</small>
                </strong>
                <div className="item-traits">
                  {ITEM_PROPERTIES[gear.item.kind].traits.map((t) => (
                    <span key={t}>{TRAIT_LABELS[t]}</span>
                  ))}
                </div>
                {(!minimal || !stats) && (
                  <p>{gearDescription[gear.item.kind]}</p>
                )}
                {stats && (
                  <p className="effective-stats">
                    实际：{stats.damage} 伤害 /{' '}
                    {(stats.interval / 30).toFixed(2)} 秒
                    {stats.amp ? ` · 增伤 +${stats.amp * 25}%` : ''}
                    {stats.cooling ? ` · 频率 +${stats.cooling * 20}%` : ''}
                    {minimal && gear.item.kind === 'flashlight'
                      ? ' · 光明视野 +2m'
                      : ''}
                  </p>
                )}
              </div>
              <div className="equipment-actions">
                <button
                  onClick={() => act?.({ type: 'unequip', uid: gear.item.uid })}
                  disabled={!putInBag(state.bag, gear.item)}
                >
                  <ArrowDownToLine size={14} />
                  卸下
                </button>
                <button
                  onClick={() => act?.({ type: 'protect', uid: gear.item.uid })}
                  disabled={capacity(state.safe) + gear.item.size > SAFE_SIZE}
                >
                  <ShieldCheck size={14} />
                  保护
                </button>
              </div>
            </>
          ) : (
            <p>
              相邻按装备的左右边缘判断。一格增幅模块夹在两把武器之间，可以同时强化它们；空格会断开连接。
            </p>
          )}
        </div>
      )}
    </section>
  );
}
