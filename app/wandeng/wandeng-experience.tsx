'use client';

import { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  NotebookPen,
  Bookmark,
  LampDesk,
} from './wandeng-pixel-icons';
import { arenaCard } from '../../lib/arena-catalog';
import { sitePath } from '../../lib/site-path';
import { CARD_ROLES } from '../../lib/arena-card-face';
import type { ArenaFrame } from '../../lib/arena-engine';
import type { Duel, FighterCard } from '../../lib/cards/combat';
import { Art, SoulCard } from './wandeng-cards';
import {
  BattlePlayback,
  PreparationTable,
  CollectionDialog,
  HistoryDialog,
} from './wandeng-battle';
import {
  CHAPTERS,
  SOULS,
  WANDENG_SAVE_KEY,
  createWandeng,
  eventItems,
  eventOffers,
  fighter,
  parseWandeng,
  playerBoard,
  soulName,
  wandengReducer,
  type WandengAction,
  type WandengState,
} from '../../lib/wandeng-game';

type Act = (action: WandengAction) => void;
const fmt = (n: number) => Number(n.toFixed(1)).toString();
function Board({
  cards,
  select,
  selected,
  place,
  frame,
  side = 0,
  duel,
  lesson = false,
}: {
  cards: FighterCard[];
  select?: (uid: string) => void;
  selected?: string | null;
  place?: (at: number) => void;
  frame?: ArenaFrame;
  side?: number;
  duel?: Duel;
  lesson?: boolean;
}) {
  return (
    <div className="wd-board-scroll">
      <div className="wd-board">
        {[0, 1, 2].map((lane) => (
          <section className="wd-lane" key={lane}>
            <div className="wd-lane-caption">
              <span>{['左路', '中路', '右路'][lane]}</span>
              {frame ? (
                <span
                  className={
                    frame.barriers[side][lane].broken ? 'wd-broken' : ''
                  }
                >
                  屏障 {fmt(frame.barriers[side][lane].hp)}{' '}
                  <small>/ {frame.barriers[side][lane].maxHp}</small>
                  {frame.burn[side][lane] > 0 &&
                    ` · 灼烧 ${fmt(frame.burn[side][lane])}`}
                </span>
              ) : (
                <span>三个位置 · 物品不能跨路</span>
              )}
            </div>
            <div className="wd-lane-grid">
              {[0, 1, 2].map((col) => (
                <button
                  key={`slot-${col}`}
                  className={`wd-slot ${lesson && lane === 1 && col === 2 ? 'wd-slot-guide' : ''}`}
                  style={{ gridColumn: col + 1, gridRow: 1 }}
                  disabled={!place}
                  aria-label={`放入${['左路', '中路', '右路'][lane]}第${col + 1}格`}
                  onClick={() => place?.(lane * 3 + col)}
                >
                  <span>{lane * 3 + col + 1}</span>
                  {lesson && lane === 1 && col === 2 && <b>把座钟放这里</b>}
                </button>
              ))}
              {cards
                .filter((c) => Math.floor(c.at / 3) === lane)
                .map((c) => (
                  <button
                    key={c.uid}
                    className={`wd-card-button ${selected === c.uid ? 'wd-selected' : ''}`}
                    style={{
                      gridColumn: `${(c.at % 3) + 1} / span ${arenaCard(c.id)!.size}`,
                      gridRow: 1,
                    }}
                    onClick={() => select?.(c.uid)}
                    aria-label={`查看${soulName(c.id)}，${c.level}级`}
                  >
                    <SoulCard
                      card={c}
                      frame={frame}
                      side={side}
                      duel={duel}
                      compact
                    />
                  </button>
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
function Builder({
  state,
  act,
  lesson = false,
}: {
  state: WandengState;
  act: Act;
  lesson?: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(
    lesson
      ? (state.inventory.find((c) => c.id === 'arena-31')?.uid ?? null)
      : null,
  );
  const [catalog, setCatalog] = useState(false);
  const soul = state.inventory.find((c) => c.uid === selected);
  return (
    <section className="wd-builder">
      <div className="wd-section-heading">
        <div>
          <small>一起同行的旧物</small>
          <h2>{lesson ? '第一次，听它们一起说话' : '铺开你的随行布'}</h2>
        </div>
        {!lesson && (
          <div className="wd-builder-actions">
            <button className="wd-text-button" onClick={() => setCatalog(true)}>
              旧物图鉴 · 50
            </button>
            <button
              className="wd-text-button"
              onClick={() => act({ type: 'auto-place' })}
            >
              自动整理 ↗
            </button>
          </div>
        )}
      </div>
      {lesson ? (
        <Board
          cards={playerBoard(state)}
          selected={selected}
          select={setSelected}
          lesson={lesson}
          place={
            selected
              ? (at) => act({ type: 'place', uid: selected, at })
              : undefined
          }
        />
      ) : (
        <PreparationTable
          state={state}
          act={act}
          selected={selected}
          onSelect={setSelected}
        />
      )}
      <div
        className="wd-pack-row"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          try {
            const item = JSON.parse(
              e.dataTransfer.getData('application/f9-card'),
            );
            if (typeof item.uid === 'string')
              act({ type: 'place', uid: item.uid, at: null });
          } catch {
            /* Ignore non-card drops. */
          }
        }}
      >
        <span>储备口袋</span>
        {state.inventory
          .filter((c) => c.at === null)
          .map((c) => (
            <button
              className={`wd-pocket ${selected === c.uid ? 'active' : ''}`}
              onClick={() => setSelected(c.uid)}
              draggable
              onDragStart={(e) => {
                setSelected(c.uid);
                e.dataTransfer.setData(
                  'application/f9-card',
                  JSON.stringify({ id: c.id, uid: c.uid }),
                );
              }}
              key={c.uid}
            >
              <Art tile={SOULS[c.id].tile} />
              <span>
                {soulName(c.id)}
                <small>
                  {arenaCard(c.id)!.size} 格 · {c.level} 级
                </small>
              </span>
            </button>
          ))}
        {state.inventory.every((c) => c.at !== null) && (
          <small>口袋空着，伙伴都上阵了。</small>
        )}
      </div>
      {soul ? (
        <div className="wd-inspector">
          <Art tile={SOULS[soul.id].tile} />
          <div>
            <strong>
              {soulName(soul.id)}{' '}
              <small>{CARD_ROLES[arenaCard(soul.id)!.kind]}</small>
            </strong>
            <p>{SOULS[soul.id].story}</p>
            <p className="wd-rule">{arenaCard(soul.id)!.text}</p>
            <small>
              已修缮 {soul.level} 级 · 来源：{soul.origin}
              。选择空位即可放入；先收回占位的物品再替换。
            </small>
          </div>
          <div className="wd-inspector-actions">
            {soul.at !== null && (
              <button
                onClick={() => act({ type: 'place', uid: soul.uid, at: null })}
              >
                收回口袋
              </button>
            )}
            {!lesson && (
              <button
                disabled={state.coins < 6 || soul.level >= 6}
                onClick={() => act({ type: 'repair', uid: soul.uid })}
              >
                修缮 +2 级 · 6 路费
              </button>
            )}
          </div>
        </div>
      ) : (
        <p className="wd-hint">
          点选物品查看能力，再点空位安排位置。1、2、3 格物品共用九个位置。
        </p>
      )}
      {catalog && (
        <CollectionDialog state={state} close={() => setCatalog(false)} />
      )}
    </section>
  );
}
const panels = [
  [
    '修得好，就能卖个好价钱。',
    '你曾是旧物商行里最年轻的修复学徒。你的双手，能让生锈的发条重新转动。',
  ],
  [
    '它被擦亮，也被一次次转手。',
    '那只蓝色音乐盒总能卖出好价钱。可从没有人留下来，听完它的一首曲子。',
  ],
  [
    '为什么又不响了呢？',
    '再次回到你手里的时候，机芯完好如初。你却感觉到，有什么正在一点点消失。',
  ],
  [
    '“这一次，你愿意听完吗？”',
    '那天，你第一次听见物品的声音。后来，你离开商行，叩响了许师傅修理铺的门。',
  ],
];
function Comic({ act }: { act: Act }) {
  return (
    <section className="wd-story">
      <div className="wd-section-heading">
        <div>
          <small>序章 / 那首没有听完的曲子</small>
          <h1>
            有些声音，<em>只有你听得见。</em>
          </h1>
        </div>
        <span className="wd-pencil-note">翻开这一页，故事就开始了。</span>
      </div>
      <div className="wd-comic-grid">
        {panels.map(([quote, text], i) => (
          <article key={quote}>
            <Art tile={i} comic />
            <span className="wd-panel-number">0{i + 1}</span>
            <h3>{quote}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
      <div className="wd-story-next">
        <p>你想学会的，不再只有如何把东西修好。</p>
        <button
          className="wd-primary"
          onClick={() => act({ type: 'comic-done' })}
        >
          去见许师傅 <span>→</span>
        </button>
      </div>
    </section>
  );
}
function Lesson({ state, act }: { state: WandengState; act: Act }) {
  const ready = state.inventory.find((c) => c.id === 'arena-31')?.at === 5;
  return (
    <>
      <section className="wd-mentor">
        <Art tile={4} comic />
        <div>
          <small>许师傅的修理铺 · 清晨</small>
          <h1>
            先听见它们，
            <br />
            再学会与它们并肩。
          </h1>
          <blockquote>
            {state.lessonStep === 0
              ? '“物品的灵魂会化成卡片。铺开它们，它们就会依自己的节奏回应你。”'
              : ready
                ? '“很好。座钟会催动身边的缝纫盒，补好这一边的屏障。让它们试试看吧。”'
                : '“把黄铜座钟放在中路最右一格，紧挨着缝纫盒。伙伴的位置，也会改变它们的配合。”'}
          </blockquote>
          <p>
            三个方向，各有屏障。冷却转满，物品自动发动；屏障破裂后，攻击会伤及生命。胜负只看生命值。
          </p>
          {state.lessonStep === 0 ? (
            <button
              className="wd-primary"
              onClick={() => act({ type: 'lesson-next' })}
            >
              我来摆放第一件伙伴 →
            </button>
          ) : (
            <button
              className="wd-primary"
              disabled={!ready}
              onClick={() => act({ type: 'start-lesson' })}
            >
              和师傅练习一场 →
            </button>
          )}
        </div>
      </section>
      {state.lessonStep === 1 && <Builder state={state} act={act} lesson />}
      <p className="wd-hint">
        师傅的练习不收赎回费。数值颜色：银色直伤、橙色灼烧、深绿侵蚀、亮绿治疗、黄色修复屏障。
      </p>
    </>
  );
}
function Letter({ act }: { act: Act }) {
  return (
    <div className="wd-letter-scene">
      <div className="wd-letter-aside">
        <Art tile={6} />
        <p>
          练习结束，师傅把茶壶和夜灯交给你。
          <br />
          门缝里，正好落进一封新信。
        </p>
        <span className="wd-pencil-note">
          “你一直在等的，
          <br />
          　大概就是这封信吧。”
        </span>
      </div>
      <article className="wd-letter">
        <span className="wd-postmark">
          万灯城
          <br />
          归物所
        </span>
        <small>致 · 愿意听见旧物的人</small>
        <h1>这里，替它们留着一盏灯。</h1>
        <p>听许师傅说，你能听见那些微弱的声音。</p>
        <p>
          城里还有许多被遗忘的物品。有人等着它们开口，也有人只等着它们涨价。若你愿意，请带它们走一程，修好坏掉的地方，也听听没说完的话。
        </p>
        <p>
          我们不指定你带来什么。旅途结束时，把你照顾好的这一套物品送来就好。归物所会替它们寻找真正需要、也愿意珍惜它们的人。
        </p>
        <p>还在旅途中的时候，请安心让它们陪着你。</p>
        <footer>
          等你叩门的人
          <br />
          <strong>万灯归物所 · 林姨</strong>
        </footer>
        <button
          className="wd-primary"
          onClick={() => act({ type: 'read-letter' })}
        >
          把信收进背包 →
        </button>
      </article>
    </div>
  );
}
function Departure({ act }: { act: Act }) {
  return (
    <section className="wd-departure">
      <Art tile={5} comic />
      <div>
        <small>第一程 / 从修理铺到万灯桥</small>
        <h1>
          出发吧。
          <br />
          它们这次，<em>有你同行。</em>
        </h1>
        <p>师傅替你系紧背包，把 18 枚路费塞进侧袋。</p>
        <blockquote>
          “赢了，对方会让出一件物品。输了就付钱，把伙伴赎回来。钱不够，我先垫着——赚了路费再还。”
        </blockquote>
        <p>
          沿着拾灯旧街，穿过雨声寄售巷，最后走到万灯桥。路上的选择，会决定你带谁回家。
        </p>
        <button className="wd-primary" onClick={() => act({ type: 'depart' })}>
          走进拾灯旧街 →
        </button>
      </div>
    </section>
  );
}
function Journey({ state, act }: { state: WandengState; act: Act }) {
  const chapter = CHAPTERS[state.chapter];
  return (
    <>
      <section className="wd-journey-heading">
        <div>
          <small>旅途第 {state.chapter + 1} 程 / 共三程</small>
          <h1>{chapter.name}</h1>
          <p>{chapter.subtitle}</p>
        </div>
        <div
          className="wd-route"
          aria-label={`已完成 ${state.step} 个事件，共三个`}
        >
          {[0, 1, 2, 3].map((i) => (
            <span
              className={`${state.step > i ? 'done' : ''} ${state.step === i ? 'current' : ''}`}
              key={i}
            >
              {state.step > i ? '✓' : i === 3 ? '关' : i + 1}
            </span>
          ))}
        </div>
      </section>
      {state.step < 3 ? (
        <>
          <div className="wd-choice-heading">
            <h2>下一段路，想往哪里走？</h2>
            <span>选择一张窗口 · 完成后前进一步</span>
          </div>
          <div className="wd-events">
            {eventOffers(state).map((event, i) => (
              <button
                className="wd-event-card"
                key={event.id}
                onClick={() => act({ type: 'choose-event', id: event.id })}
              >
                <span className="wd-event-number">0{i + 1}</span>
                <Art tile={event.tile} />
                <span className="wd-event-label">{event.label}</span>
                <h3>{event.title}</h3>
                <p>{event.description}</p>
                <span className="wd-event-link">
                  走近看看 <b>↗</b>
                </span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <section className="wd-boss-card">
          <Art tile={state.chapter === 2 ? 1 : 7} />
          <div>
            <small>这一程的守关人</small>
            <h2>{chapter.boss}</h2>
            <blockquote>{chapter.quote}</blockquote>
            <p>
              胜利：接回随机一件对方物品，得到 10 路费。
              <br />
              战败：支付 {chapter.fee} 路费赎回全部伙伴，然后可以重新挑战。
            </p>
            <p className="wd-hint">
              下方可查看对手的完整阵容、屏障与增幅器。出发前调整阵容、修缮物品。
            </p>
            <button
              className="wd-primary"
              onClick={() => act({ type: 'start-boss' })}
            >
              发起灵魂对决 →
            </button>
          </div>
        </section>
      )}
      <div className="wd-travel-note">
        <span>✦ 旅途手记</span>
        <p>{state.journal.at(-1)}</p>
        <small>下一位守关人 · {chapter.boss}</small>
      </div>
      <Builder state={state} act={act} />
    </>
  );
}
function EventScene({ state, act }: { state: WandengState; act: Act }) {
  const event = eventOffers(state).find((e) => e.kind === state.selectedEvent)!;
  const kind = state.selectedEvent;
  return (
    <section className="wd-event-scene">
      <button
        className="wd-text-button"
        onClick={() => act({ type: 'cancel-event' })}
      >
        ← 返回路口
      </button>
      <small>{CHAPTERS[state.chapter].name} / 一次停留</small>
      <h1>{event.title}</h1>
      <p>{event.description}</p>
      {(kind === 'find' || kind === 'shop') && (
        <div className="wd-item-choices">
          {eventItems(state).map((id, i) => (
            <article key={id}>
              <SoulCard
                card={fighter({
                  uid: `offer-${i}`,
                  id,
                  level: 0,
                  at: null,
                  origin: '',
                })}
              />
              <blockquote>{SOULS[id].story}</blockquote>
              <button
                className="wd-primary"
                disabled={kind === 'shop' && state.coins < [6, 9][i]}
                onClick={() => act({ type: 'event-choice', choice: i })}
              >
                {kind === 'shop'
                  ? `付 ${[6, 9][i]} 路费，接它同行`
                  : '修好它，一起走'}{' '}
                →
              </button>
            </article>
          ))}
        </div>
      )}
      {kind === 'repair' && (
        <>
          <p className="wd-pencil-note">把灯拨亮一点。今天，你想多照顾谁？</p>
          <div className="wd-repair-list">
            {state.inventory.map((c) => (
              <button
                disabled={c.level >= 6}
                onClick={() =>
                  act({ type: 'event-choice', choice: 0, uid: c.uid })
                }
                key={c.uid}
              >
                <Art tile={SOULS[c.id].tile} />
                <strong>{soulName(c.id)}</strong>
                <span>
                  {c.level >= 6
                    ? '已经修缮到顶'
                    : `${c.level} → ${Math.min(6, c.level + 2)} 级`}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
      {kind === 'work' && (
        <div className="wd-event-single">
          <Art tile={4} />
          <blockquote>
            “明天还要出摊呢。你来得真是时候。”
            <br />
            <small>撑开伞的那一刻，老摊主笑了。</small>
          </blockquote>
          <button
            className="wd-primary"
            onClick={() => act({ type: 'event-choice', choice: 0 })}
          >
            修好伞骨，收下 10 路费 →
          </button>
        </div>
      )}
      {kind === 'duel' && (
        <div className="wd-event-single">
          <Art tile={7} />
          <blockquote>“守规矩就行：你赢了挑一件，输了付赎回费。”</blockquote>
          <p>
            获胜：随机接回一件物品、获得 6 路费。
            <br />
            战败：支付 6 路费，所有物品保留。钱不足时师傅垫付。
          </p>
          <button
            className="wd-primary"
            onClick={() => act({ type: 'event-choice', choice: 0 })}
          >
            接受对决 →
          </button>
        </div>
      )}
      {kind === 'duel' && <Builder state={state} act={act} />}
    </section>
  );
}
function Combat({ state, act }: { state: WandengState; act: Act }) {
  return (
    <BattlePlayback
      battle={state.battle!}
      previous={state.history.at(-1)}
      onFinish={() => act({ type: 'resolve-battle' })}
    />
  );
}
function Receipt({ state, act }: { state: WandengState; act: Act }) {
  const [replay, setReplay] = useState(false);
  const receipt = state.receipt!,
    lesson = state.battle!.kind === 'lesson',
    won = receipt.winner === 0;
  const reward = state.inventory.find((c) => c.uid === receipt.received);
  return (
    <section className="wd-receipt">
      <small>{lesson ? '许师傅的第一课' : '这一场对决已经结束'}</small>
      <h1>
        {won
          ? lesson
            ? '做得好，小归物师。'
            : '又一件物品，等到了回应。'
          : receipt.winner === 1
            ? '钱可以再赚。伙伴一起走。'
            : '难分胜负，另寻一个机会。'}
      </h1>
      {reward ? (
        <div className="wd-reward">
          <Art tile={SOULS[reward.id].tile} />
          <div>
            <h2>{soulName(reward.id)}</h2>
            <p>{SOULS[reward.id].story}</p>
            <span>从对方阵中接回 · {reward.level} 级 · 已放入储备口袋</span>
          </div>
        </div>
      ) : (
        <Art tile={lesson ? 7 : 4} />
      )}
      <p>
        {lesson
          ? won
            ? '“放映机负责冲开防线，缝纫盒替你守住中路。你看，旧物也能互相照顾。”'
            : '“别着急，调整好位置，我们再练一次。”'
          : won
            ? `本场获得 ${receipt.gain} 路费，收入会先偿还师傅垫付款。所有随行物品完整保留。`
            : receipt.winner === 1
              ? `已支付 ${receipt.paid} 路费${receipt.borrowed ? `，师傅另外垫付 ${receipt.borrowed} 路费` : ''}，赎回全部 ${state.inventory.length} 件物品。`
              : '本次不交换物品，也不收赎回费。'}
      </p>
      <div className="wd-receipt-facts">
        <span>对决 {fmt(receipt.duration)} 秒</span>
        <span>现有路费 {state.coins}</span>
        {state.debt > 0 && <span>待还师傅 {state.debt}</span>}
      </div>
      <button className="wd-text-button" onClick={() => setReplay(true)}>
        回看这场对决与复盘 →
      </button>
      {replay && (
        <HistoryDialog
          state={state}
          initial={state.battle!}
          close={() => setReplay(false)}
        />
      )}
      <button className="wd-primary" onClick={() => act({ type: 'continue' })}>
        {lesson && won
          ? '听见门外的邮铃声'
          : state.battle!.kind === 'boss' && won && state.chapter === 2
            ? '走向归物所'
            : '继续这段旅途'}{' '}
        →
      </button>
    </section>
  );
}
function Ending({
  state,
  act,
  home,
}: {
  state: WandengState;
  act: Act;
  home: () => void;
}) {
  return (
    <section className="wd-ending">
      <div className="wd-ending-intro">
        <Art tile={5} comic />
        <div>
          <small>终章 / 灯下有人等你</small>
          <h1>
            {state.delivered
              ? '它们的下一段故事，\n从这里开始。'
              : '这一路，\n你没有让谁被遗忘。'}
          </h1>
          <p>
            {state.delivered
              ? `林姨收下 ${state.inventory.length} 件修复好的物品，把每一个名字认真记进册子。它们会去到真正需要、也愿意珍惜它们的人身边。`
              : '门开了。没有订单，没有需要凑齐的清单。林姨先请你坐下，再轻轻问起每一件物品的故事。'}
          </p>
          <blockquote>
            {state.delivered
              ? '“你照顾过的，都有记录。等找到新家，我们会写信告诉你。”'
              : '“把它们交给我们吧。这次，不会再只有价签。”'}
          </blockquote>
          {state.debt > 0 && (
            <p className="wd-hint">
              给师傅的回信：还欠 {state.debt}{' '}
              枚路费。她在回信末尾写：“先把这一程走好。”
            </p>
          )}
          {state.delivered ? (
            <button className="wd-primary" onClick={home}>
              合上这本旅途手记 →
            </button>
          ) : (
            <button
              className="wd-primary"
              onClick={() => act({ type: 'deliver' })}
            >
              将这一套 {state.inventory.length} 件物品送交归物所 →
            </button>
          )}
        </div>
      </div>
      <div className="wd-section-heading">
        <h2>{state.delivered ? '本次送达的物品' : '一起抵达的伙伴'}</h2>
        <span>包括上阵物品与储备物品</span>
      </div>
      <div className="wd-ending-collection">
        {state.inventory.map((c) => (
          <article key={c.uid}>
            <Art tile={SOULS[c.id].tile} />
            <strong>{soulName(c.id)}</strong>
            <span>修缮 {c.level} 级</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function NewJourneyDialog({
  start,
  cancel,
}: {
  start: () => void;
  cancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="wd-modal"
      onCancel={cancel}
      aria-labelledby="new-title"
    >
      <h2 id="new-title">翻开一本新的手记？</h2>
      <p>当前旅途书签会被新旅途替换。</p>
      <button className="wd-primary" onClick={start}>
        开始新旅途
      </button>
      <button onClick={cancel}>保留当前旅途</button>
    </dialog>
  );
}
export default function WandengExperience() {
  const [history, setHistory] = useState(false),
    [catalog, setCatalog] = useState(false);
  const [state, setState] = useState<WandengState>(() => createWandeng());
  const [menu, setMenu] = useState(true),
    [ready, setReady] = useState(false),
    [saved, setSaved] = useState(false),
    [confirmNew, setConfirmNew] = useState(false),
    [notice, setNotice] = useState('');
  useEffect(() => {
    const task = requestAnimationFrame(() => {
      try {
        const raw = localStorage.getItem(WANDENG_SAVE_KEY);
        if (raw) {
          setState(parseWandeng(raw));
          setSaved(true);
        }
      } catch {
        setNotice('旧的旅途记录无法读取，你仍可以开启新旅途。');
      }
      setReady(true);
    });
    return () => cancelAnimationFrame(task);
  }, []);
  useEffect(() => {
    if (!ready || menu) return;
    try {
      localStorage.setItem(WANDENG_SAVE_KEY, JSON.stringify(state));
    } catch {
      queueMicrotask(() => setNotice('浏览器未能保存旅途，请保持此页面开启。'));
    }
  }, [state, ready, menu]);
  const act: Act = (action) => {
    try {
      const next = wandengReducer(state, action);
      setState(next);
      setNotice('');
      if (next.phase !== state.phase)
        window.scrollTo({ top: 0, behavior: 'instant' });
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : '这一步没有完成，请重试。',
      );
    }
  };
  const start = () => {
    setState(createWandeng());
    setSaved(true);
    setMenu(false);
    setConfirmNew(false);
    setNotice('');
    window.scrollTo(0, 0);
  };
  const goHome = () => {
    setMenu(true);
    window.scrollTo(0, 0);
  };
  return (
    <main className="wd-root">
      <div className="wd-paper-grain" aria-hidden="true" />
      <div className="wd-shell">
        <header className="wd-topbar">
          <button className="wd-brand" onClick={goHome}>
            <span>
              <LampDesk size={28} aria-hidden="true" />
            </span>
            <div>
              万灯城的归物师<small>一封给旧物的信</small>
            </div>
          </button>
          <div>
            <a className="wd-text-button" href={sitePath('/wandeng/training')}>
              对战训练场 ↗
            </a>
            <button className="wd-text-button" onClick={() => setCatalog(true)}>
              <BookOpen size={18} aria-hidden="true" /> 旧物图鉴
            </button>
            <button className="wd-text-button" onClick={() => setHistory(true)}>
              <NotebookPen size={18} aria-hidden="true" /> 对决手记
            </button>
            {!menu && (
              <>
                <span className="wd-coins">
                  ◉ {state.coins} <small>路费</small>
                </span>
                {state.debt > 0 && (
                  <span className="wd-debt">待还 {state.debt}</span>
                )}
                <button className="wd-text-button" onClick={goHome}>
                  <Bookmark size={17} aria-hidden="true" /> 旅途书签
                </button>
              </>
            )}
            {menu && (
              <span className="wd-edition">序章与三程旅途 · 可玩原型</span>
            )}
          </div>
        </header>
        {notice && (
          <div className="wd-notice" role="alert">
            {notice}
            <button onClick={() => setNotice('')} aria-label="关闭提示">
              ×
            </button>
          </div>
        )}
        {menu ? (
          <section className="wd-title">
            <div className="wd-title-copy">
              <small>从一间修理铺，走向一座有灯的城。</small>
              <h1>
                每一件旧物，
                <br />
                都在等一个<em>愿意听的人。</em>
              </h1>
              <p>
                听见被遗忘的声音，修好它们的灵魂。
                <br />
                把一路的相遇，带到温暖的归处。
              </p>
              <div className="wd-title-actions">
                {saved && (
                  <button
                    disabled={!ready}
                    className="wd-primary"
                    onClick={() => {
                      setMenu(false);
                      window.scrollTo(0, 0);
                    }}
                  >
                    {state.delivered ? '重读这段旅途' : '继续上次的旅途'} →
                  </button>
                )}
                <button
                  disabled={!ready}
                  className={saved ? 'wd-secondary' : 'wd-primary'}
                  onClick={() =>
                    saved && !state.delivered ? setConfirmNew(true) : start()
                  }
                >
                  开启新的旅途 →
                </button>
              </div>
              <span className="wd-pencil-note">旧物有灵，万灯有归。</span>
              <div className="wd-title-bottom">
                <span>四格序章</span>
                <i>·</i>
                <span>灵魂对决</span>
                <i>·</i>
                <span>卡片式旅途</span>
              </div>
            </div>
            <div className="wd-title-art">
              <Art tile={5} comic />
              <span className="wd-art-caption">
                万灯桥 / 傍晚六点，灯将亮起
              </span>
              <div className="wd-title-stamp">
                一路
                <br />
                同行
              </div>
            </div>
          </section>
        ) : (
          <div className="wd-content" key={state.phase}>
            {state.phase === 'comic' && <Comic act={act} />}
            {state.phase === 'lesson' && <Lesson state={state} act={act} />}
            {state.phase === 'letter' && <Letter act={act} />}
            {state.phase === 'departure' && <Departure act={act} />}
            {state.phase === 'journey' && <Journey state={state} act={act} />}
            {state.phase === 'event' && <EventScene state={state} act={act} />}
            {state.phase === 'battle' && <Combat state={state} act={act} />}
            {state.phase === 'result' && <Receipt state={state} act={act} />}
            {state.phase === 'ending' && (
              <Ending state={state} act={act} home={goHome} />
            )}
          </div>
        )}
        <footer className="wd-footer">
          <span>万灯归物所 · 今夜也为旧物留灯</span>
          <span>
            {menu ? '一段关于收集、修复与同行的故事' : '每次选择后自动记下旅途'}
          </span>
        </footer>
        {confirmNew && (
          <NewJourneyDialog start={start} cancel={() => setConfirmNew(false)} />
        )}
        {history && (
          <HistoryDialog state={state} close={() => setHistory(false)} />
        )}
        {catalog && (
          <CollectionDialog state={state} close={() => setCatalog(false)} />
        )}
      </div>
    </main>
  );
}
