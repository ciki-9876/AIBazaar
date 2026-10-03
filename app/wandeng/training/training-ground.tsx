'use client';
import { useRef, useState } from 'react';
import Image from 'next/image';
import { SoulCard } from '../wandeng-cards';
import { BattlePlayback } from '../wandeng-battle';
import { LampDesk, Swords } from '../wandeng-pixel-icons';
import { AMPLIFIERS, amplifier } from '../../../lib/arena-catalog';
import { CARD_RARITIES } from '../../../lib/arena-card-face';
import {
  TRAINING_CARDS,
  TRAINING_RULESETS,
  TRAINING_STORIES,
  trainingText,
  type TrainingRuleset,
} from '../../../lib/training-catalog';
import {
  DEFAULT_TRAINING_AMPS,
  LOCKED_ASSISTANT,
  USER_TRAINING_CARDS,
  makeTrainingDuel,
  exportTrainingDuel,
  parseTrainingDuel,
} from '../../../lib/wandeng-training';
import { soulName, type Battle } from '../../../lib/wandeng-game';
import { sitePath } from '../../../lib/site-path';

const lanes = ['左路', '中路', '右路'];
export default function TrainingGround() {
  const [version, setVersion] = useState<TrainingRuleset>('tuned-v1');
  const [amps, setAmps] = useState<Array<string | null>>([
    ...DEFAULT_TRAINING_AMPS,
  ]);
  const [selected, setSelected] = useState('training-a');
  const [battle, setBattle] = useState<Battle | null>(null);
  const [replaying, setReplaying] = useState(false);
  const [run, setRun] = useState(0);
  const [importText, setImportText] = useState('');
  const [error, setError] = useState('');
  const stage = useRef<HTMLDivElement>(null);
  const preview = makeTrainingDuel(version, amps);
  const card = TRAINING_CARDS.find((c) => c.id === selected)!;
  const activeDuel = battle?.duel ?? preview;
  function start() {
    setRun((n) => n + 1);
    setReplaying(false);
    setError('');
    setBattle({ id: `training-${run + 1}`, kind: 'duel', duel: preview });
    stage.current?.scrollIntoView({ block: 'start' });
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([exportTrainingDuel(activeDuel)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wandeng-training.json';
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <main className="wd-root wd-training">
      <div className="wd-paper-grain" aria-hidden="true" />
      <div className="wd-shell">
        <header className="wd-topbar">
          <a className="wd-brand" href={sitePath('/wandeng')}>
            <span>
              <LampDesk size={28} />
            </span>
            <div>
              万灯城<small>许师傅的后院</small>
            </div>
          </a>
          <a className="wt-back" href={sitePath('/wandeng')}>
            ← 回到旅途
          </a>
        </header>
        <section className="wt-intro">
          <div>
            <span className="wt-stamp">第一回 · 借雨添灯</span>
            <h1>对战训练场</h1>
            <p>把你的奇思妙想摆上桌，听一听旧物如何回应。</p>
          </div>
          <div className="wt-rules">
            <strong>300</strong>
            <span>双方生命</span>
            <strong>90 × 3</strong>
            <span>基础护幕</span>
            <span>九格全开 · Lv0 / 成长品质0</span>
            <span>训练独立进行，旅途书签保持原样</span>
          </div>
        </section>
        <div ref={stage} className="wt-stage">
          {battle ? (
            <>
              <div className="wt-toolbar">
                <span>
                  {TRAINING_RULESETS[battle.duel.arena!.training!].title} ·
                  已固定本场输入
                </span>
                <button
                  onClick={() => {
                    setBattle(null);
                    setError('');
                  }}
                >
                  ← 返回整备
                </button>
                <button onClick={download}>导出这场回放</button>
              </div>
              <BattlePlayback
                key={battle.id}
                battle={battle}
                replay={replaying}
                training
              />
            </>
          ) : (
            <>
              <section className="wt-matchup" aria-label="公开对手阵容">
                <div>
                  <span className="wt-eyebrow">对手已锁定</span>
                  <h2>炉火不熄</h2>
                  <p>灼烧充能 / 承伤反击 / 侵蚀消耗</p>
                </div>
                <div className="wt-enemy-lines">
                  {lanes.map((name, lane) => (
                    <div key={name}>
                      <b>{name}</b>
                      <span>
                        {LOCKED_ASSISTANT.cards
                          .filter((c) => Math.floor(c.at / 3) === lane)
                          .map((c) => soulName(c.id))
                          .join(' · ')}
                      </span>
                      <small>
                        {amplifier(LOCKED_ASSISTANT.amps[lane])?.name}
                      </small>
                    </div>
                  ))}
                </div>
              </section>
              <section className="wt-prep" aria-label="你的训练阵容">
                <div className="wt-section-title">
                  <div>
                    <span className="wt-eyebrow">你的提案 · 六件全新旧物</span>
                    <h2>借雨添灯</h2>
                  </div>
                  <fieldset className="wt-versions" aria-label="数值版本">
                    {Object.entries(TRAINING_RULESETS).map(([key, value]) => (
                      <button
                        key={key}
                        aria-pressed={version === key}
                        onClick={() => setVersion(key as TrainingRuleset)}
                      >
                        {value.title}
                      </button>
                    ))}
                  </fieldset>
                </div>
                <p className="wt-version-note">
                  {version === 'original-v1'
                    ? '原案：B 直伤8，E 灼烧2层。其余按你的设计。'
                    : '调校：B 直伤8 → 30，E 灼烧2 → 4层。保留全部六张牌的效果与冷却。'}
                </p>
                <div className="wt-lanes">
                  {lanes.map((name, lane) => (
                    <section key={name} className="wt-lane">
                      <div className="wt-lane-label">
                        <b>{name}</b>
                        <span>
                          {['蓄能与回甘', '映照与增幅', '听雨与缝补'][lane]}
                        </span>
                      </div>
                      <div className="wt-cards">
                        {USER_TRAINING_CARDS.filter(
                          (c) => Math.floor(c.at / 3) === lane,
                        ).map((c) => (
                          <button
                            className="wt-card-choice"
                            key={c.uid}
                            aria-label={`查看${c.id.slice(-1).toUpperCase()}：${soulName(c.id)}`}
                            aria-pressed={selected === c.id}
                            onClick={() => setSelected(c.id)}
                            style={{
                              gridColumn: `${(c.at % 3) + 1} / span ${TRAINING_CARDS.find((d) => d.id === c.id)!.size}`,
                            }}
                          >
                            <span className="wt-letter">
                              {c.id.slice(-1).toUpperCase()}
                            </span>
                            <SoulCard card={c} duel={preview} compact />
                          </button>
                        ))}
                      </div>
                      <label className="wt-amp">
                        {name}增幅器
                        <select
                          aria-label={`${name}训练增幅器`}
                          value={amps[lane] ?? ''}
                          onChange={(e) =>
                            setAmps((old) =>
                              old.map((a, i) =>
                                i === lane ? e.target.value || null : a,
                              ),
                            )
                          }
                        >
                          <option value="">不装备</option>
                          {AMPLIFIERS.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <p className="wt-amp-rule">
                        {amplifier(amps[lane])?.text ??
                          '此路不获得增幅器效果。'}
                      </p>
                    </section>
                  ))}
                </div>
                <div className="wt-inspector" aria-live="polite">
                  <Image
                    src={sitePath(
                      `/art-assets/wandeng/training/${selected.slice(-1)}.png`,
                    )}
                    alt=""
                    width={144}
                    height={144}
                    unoptimized
                  />
                  <div>
                    <span className="wt-eyebrow">
                      {selected.slice(-1).toUpperCase()} · {card.size}格 ·{' '}
                      {CARD_RARITIES[card.rarity]} ·{' '}
                      {card.cd
                        ? `${card.cd}秒冷却`
                        : selected === 'training-e'
                          ? '被动 / 3秒触发间隔'
                          : '被动'}
                    </span>
                    <h3>{card.name}</h3>
                    <p>{trainingText(selected, version)}</p>
                    <blockquote>{TRAINING_STORIES[selected]}</blockquote>
                  </div>
                </div>
                <div className="wt-start">
                  <p>
                    已暂配两路层压框与一路药泵座，你可以自由更换。
                    <br />
                    上方为对手，下方为你；双方按同一条路线对位。
                  </p>
                  <button className="wd-primary" onClick={start}>
                    <Swords size={24} /> 开始对战 →
                  </button>
                </div>
              </section>
              <details className="wt-boundaries">
                <summary>这六件旧物如何配合</summary>
                <ul>
                  <li>
                    A
                    只从本路护幕实际承受的直接攻击攒能量；能量平均分配给紧邻卡牌，持续4秒。没有邻居时保留能量。
                  </li>
                  <li>
                    B
                    根据命中的实际伤害修幕，减伤、护幕溢出与过量伤害都会影响汲取；破幕后不能重建。
                  </li>
                  <li>
                    C
                    按每张输出牌的目标护幕剩余比例，在释放时锁定增幅。仅提高输出，不增加修复或充能；同类映照不叠乘。
                  </li>
                  <li>
                    D
                    的受伤包括灼烧、侵蚀跳伤。每次为左路物品推进0.25秒剩余冷却，不永久改变基础周期；冻结中的目标不能充能。
                  </li>
                  <li>
                    E 也响应 D 的被动触发与 F 的正常发动；满幕时 F
                    仍会发动。额外攻击不复制邻居技能，3秒触发间隔阻止循环连锁。
                  </li>
                  <li>
                    F 每秒修复5点；双方护幕破后无法重建，增幅器随本路护幕失效。
                  </li>
                </ul>
              </details>
            </>
          )}
        </div>
        <details className="wt-replay">
          <summary>保存与导入训练回放</summary>
          <p>保存双方完整输入与数值版本，之后可重复观看同一场对决。</p>
          <button onClick={download}>下载回放 JSON</button>
          <button
            onClick={() => {
              setImportText(exportTrainingDuel(activeDuel));
              setError('');
            }}
          >
            填入本场回放
          </button>
          <textarea
            aria-label="训练回放文本"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="在这里粘贴训练回放 JSON"
          />
          <button
            onClick={() => {
              try {
                const duel = parseTrainingDuel(importText);
                setRun((n) => n + 1);
                setBattle({ id: `imported-${run + 1}`, kind: 'duel', duel });
                setReplaying(true);
                setError('');
                stage.current?.scrollIntoView({ block: 'start' });
              } catch (e) {
                setError(e instanceof Error ? e.message : '导入失败');
              }
            }}
          >
            导入并回看
          </button>
          {error && <p role="alert">{error}</p>}
        </details>
        <footer className="wt-footer">
          今夜不谈输赢的价钱，只听旧物之间的回应。
        </footer>
      </div>
    </main>
  );
}
