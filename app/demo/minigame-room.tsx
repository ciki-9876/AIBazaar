'use client';
import { useState, type ReactNode } from 'react';
import {
  PackageOpen,
  RotateCcw,
  HelpCircle,
  Star,
  ArrowRight,
  Leaf,
} from 'lucide-react';
import { itemName, type Run, type Action } from '@/lib/demo-engine';
import { startMinigame, rewardStars } from '@/lib/minigame';
import {
  PIPE_SHAPES,
  rotatedPipe,
  pipeFlow,
  pipeConnected,
} from '@/lib/tutorial-pipes';
import FocusGuide from './focus-guide';
// A board adapter supplies content; this shell owns the common room affordances.
export function MinigameShell({
  tools,
  reward,
  controls,
  children,
}: {
  tools: ReactNode;
  reward: ReactNode;
  controls: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="minigame-shell">
      <aside className="minigame-tools">
        <h3>可用物品</h3>
        {tools}
      </aside>
      <div className="minigame-board">{children}</div>
      <aside className="minigame-reward">{reward}</aside>
      <footer>{controls}</footer>
    </section>
  );
}
export default function PressureGame({
  run,
  onAction,
}: {
  run: Run;
  onAction: (a: Action) => unknown;
}) {
  const game = run.minigame ?? startMinigame(run.seed),
    remaining = game.moves + game.bonus - game.used;
  const [guide, setGuide] = useState(0);
  const wet = pipeFlow(game.board),
    solved = pipeConnected(game.board);
  const tools = run.items.filter(
    (x) =>
      x.type === 'physical' &&
      ['bag', 'safe'].includes(x.zone) &&
      ['sealant', 'rubber'].includes(x.id) &&
      x.uid !== 'tutorial-rubber',
  );
  const hints = [
    {
      target: '.minigame-board',
      title: '特殊玩法房间',
      body: '这里藏着一只检修宝箱。转动管道，把左上入口连到右下出口，就能泄压开箱。',
    },
    {
      target: '.minigame-moves',
      title: '每次旋转用掉一步',
      body: '基础有12步，没有倒计时。剩余0–1步得1星，2–3步得2星，4步以上得3星；星级越高，箱子里的奖励越多。',
    },
    {
      target: '.minigame-tools',
      title: '工具让操作更从容',
      body: '不用道具也能接通。消耗一份补漏胶可多操作4步；缓冲垫先留在背包，稍后可以鉴定。',
    },
    {
      target: '.minigame-shell footer',
      title: '由你决定怎么通过',
      body: '接通后点完成领奖。卡住可以重置，或跳过并放弃奖励；问号可以重看说明。',
    },
  ];
  return (
    <>
      <MinigameShell
        tools={
          <>
            {tools.map((x) => (
              <button
                className="rarity-0"
                key={x.uid}
                onClick={() => onAction({ type: 'minigame-tool', id: x.uid })}
              >
                <strong>{itemName(x)}</strong>
                <span>消耗 1 件 · +4 步</span>
              </button>
            ))}
            {!tools.length && <p>无需物品也可挑战</p>}
          </>
        }
        reward={
          <>
            <PackageOpen size={64} />
            <strong>检修宝箱</strong>
            <div aria-label={`${rewardStars(remaining)}星奖励`}>
              {[1, 2, 3].map((n) => (
                <Star
                  key={n}
                  size={20}
                  fill={n <= rewardStars(remaining) ? 'currentColor' : 'none'}
                />
              ))}
            </div>
          </>
        }
        controls={
          <>
            <button onClick={() => onAction({ type: 'minigame-skip' })}>
              跳过
            </button>
            <button onClick={() => onAction({ type: 'minigame-reset' })}>
              <RotateCcw size={17} />
              重置
            </button>
            <button aria-label="玩法帮助" onClick={() => setGuide(0)}>
              <HelpCircle size={18} />
            </button>
            <button
              className="ed-primary"
              disabled={!solved}
              onClick={() => onAction({ type: 'minigame-complete' })}
            >
              完成 <ArrowRight size={18} /> <Leaf size={16} /> 2
            </button>
          </>
        }
      >
        <p className="minigame-moves">
          剩余 <b>{remaining}</b> 步
        </p>
        <div className="pipe-board">
          <span>入口 →</span>
          <div className="pipe-grid">
            {PIPE_SHAPES.map((shape, i) => {
              const mask = rotatedPipe(shape, game.board[i]);
              return (
                <button
                  key={i}
                  disabled={!shape || remaining === 0}
                  className={`${wet.has(i) ? 'wet' : ''} ${!shape ? 'pipe-empty' : ''}`}
                  aria-label={`旋转管道${i + 1}`}
                  onClick={() => onAction({ type: 'minigame-play', choice: i })}
                >
                  {shape > 0 && (
                    <svg viewBox="0 0 100 100">
                      {[
                        [1, 50, 0],
                        [2, 100, 50],
                        [4, 50, 100],
                        [8, 0, 50],
                      ]
                        .filter(([bit]) => mask & bit)
                        .map(([bit, x, y]) => (
                          <path
                            key={bit}
                            d={`M50 50 L${x} ${y}`}
                            className="pipe-line"
                          />
                        ))}
                      <circle cx="50" cy="50" r="9" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
          <span>→ {solved ? '已接通' : '出口'}</span>
        </div>
      </MinigameShell>
      {guide < hints.length && (
        <FocusGuide
          step={hints[guide]}
          index={guide}
          total={hints.length}
          onNext={() => setGuide(guide + 1)}
        />
      )}
    </>
  );
}
