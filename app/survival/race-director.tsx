'use client';
import { useEffect, useRef, useState } from 'react';
import {
  ChevronsRight,
  Radio,
  Ticket,
  ShieldCheck,
  X,
  Settings,
  Trophy,
} from 'lucide-react';
import type { OpeningAction, OpeningState } from '@/lib/survival-opening';
import { racePlayer, raceNextCheckpoint } from '@/lib/survival-race';
import { raceTime } from './race-console';
import ProgrammeAd from './programme-ad';

export default function RaceDirector({
  state,
  act,
  restart,
  onPause,
  paused,
  reduced,
}: {
  state: OpeningState;
  act: (a: OpeningAction) => void;
  restart: () => void;
  onPause: () => void;
  paused: boolean;
  reduced: boolean;
}) {
  const r = state.race!,
    p = racePlayer(r),
    scene = r.scene;
  const ref = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState(0);
  const [auto, setAuto] = useState(false);
  useEffect(() => {
    const d = ref.current!;
    d.showModal();
    return () => d.close();
  }, []);
  useEffect(() => {
    if (!auto || scene !== 'briefing' || paused) return;
    const timer = window.setTimeout(
      () => (step < 2 ? setStep(step + 1) : act({ type: 'ack-race' })),
      6000,
    );
    return () => window.clearTimeout(timer);
  }, [auto, scene, paused, step, act]);
  const guardian = state.room.enemies.some(
    (e) => e.kind === 'boss' && e.hp > 0,
  );
  const winner = r.contestants.find((c) => c.status === 'winner');
  return (
    <dialog
      ref={ref}
      className={`race-director race-scene-${scene}`}
      onCancel={(e) => {
        e.preventDefault();
        onPause();
      }}
      style={{ animationPlayState: paused ? 'paused' : 'running' }}
      aria-label="百层竞速节目"
    >
      <header>
        <span className="race-live">
          <i /> 安泊 / 百层竞速
        </span>
        <span>SEASON 01 · 007</span>
        <button aria-label="设置与暂停" onClick={onPause}>
          <Settings size={16} />
        </button>
      </header>
      {scene === 'briefing' ? (
        <ProgrammeAd paused={paused} reduced={reduced} />
      ) : (
        <div className="race-stage-art" aria-hidden="true">
          <div className="race-stage-grid" />
          <div className="race-door left" />
          <div className="race-door right" />
          <span>
            {scene === 'promotion'
              ? '晋级'
              : scene === 'victory'
                ? '100'
                : scene === 'eliminated'
                  ? '注销'
                  : scene === 'review'
                    ? `${p.floor}F`
                    : '100'}
          </span>
          <i />
          <b>ANBO / ON AIR</b>
        </div>
      )}
      <section className="race-director-copy">
        {scene === 'briefing' ? (
          <>
            <small>参赛登记 / {String(step + 1).padStart(2, '0')}</small>
            <h2>
              {
                ['你不在梦里。', '上面，是你的终点。', '007号，节目开始。'][
                  step
                ]
              }
            </h2>
            <button
              className="race-programme-bubble"
              onClick={() =>
                step < 2 ? setStep(step + 1) : act({ type: 'ack-race' })
              }
            >
              <Radio size={18} />
              <span>
                {
                  [
                    '欢迎参加百层竞速。你的电梯，也是你的休息室。',
                    '先到100层的人获胜。拿通行证，决定上几层；越过的低层永远关闭。',
                    '每十层接受审查。每段12分钟，击败驻守者并提交2张通行证。倒下可被救回，资格超时会被注销。',
                  ][step]
                }
              </span>
              <ChevronsRight size={18} />
            </button>
            <div className="race-intro-strip">
              <span>
                <Ticket size={17} /> 通行证上楼
              </span>
              <span>
                <ShieldCheck size={17} /> 十层审查
              </span>
              <span>100层优胜</span>
            </div>
            <footer>
              <label>
                <input
                  type="checkbox"
                  checked={auto}
                  onChange={(e) => setAuto(e.target.checked)}
                />{' '}
                自动播放
              </label>
              <button
                className="race-primary"
                onClick={() =>
                  step < 2 ? setStep(step + 1) : act({ type: 'ack-race' })
                }
              >
                {step < 2 ? '继续' : '开始竞速'}
                <ChevronsRight size={18} />
              </button>
            </footer>
          </>
        ) : scene === 'review' ? (
          <>
            <small>资格审查 / {p.floor}层</small>
            <h2>门会为谁打开？</h2>
            <p className="race-review-clock">
              剩余 {raceTime(p.deadline - r.tick)}
            </p>
            <div className="race-review-conditions">
              <p className={!guardian ? 'ready' : ''}>
                <ShieldCheck size={20} /> 驻守者{' '}
                {!guardian ? '已击败' : '未击败'}
              </p>
              <p className={p.passes.length >= 2 ? 'ready' : ''}>
                <Ticket size={20} /> 通行证 {p.passes.length} / 2
              </p>
            </div>
            <p className="race-fine-print">
              提交2张 · 余票每张转为5电梯经验 · 晋级获下一段通行证×2
            </p>
            <footer>
              <button onClick={() => act({ type: 'ack-race' })}>
                继续准备
              </button>
              <button
                className="race-primary"
                disabled={guardian || p.passes.length < 2}
                onClick={() => act({ type: 'submit-review' })}
              >
                提交审查 <ShieldCheck size={17} />
              </button>
            </footer>
          </>
        ) : scene === 'promotion' ? (
          <>
            <small>审查完成 / 007号</small>
            <h2>资格保留。</h2>
            <p className="race-result-line">你的电梯，接通下一赛段。</p>
            <div className="race-reward">
              <Ticket size={30} />
              <b>+2</b>
              <span>下一赛段通行证</span>
            </div>
            {!!r.result?.converted && (
              <p>余票转存电梯经验 +{r.result.converted}</p>
            )}
            <footer>
              <span>
                {p.floor + 1}—{Math.min(100, p.floor + 10)}层开放
              </span>
              <button
                className="race-primary"
                onClick={() => act({ type: 'ack-race' })}
              >
                继续向上 <ChevronsRight size={18} />
              </button>
            </footer>
          </>
        ) : scene === 'victory' ? (
          <>
            <small>本季优胜 / 007号</small>
            <h2>你先到了。</h2>
            <p>100层。最后一扇门，为你打开。</p>
            <div className="race-reward">
              <Trophy size={32} />
              <b>{raceTime(r.tick)}</b>
              <span>真实比赛用时</span>
            </div>
            <footer>
              <span>记录已保存</span>
              <button className="race-primary" onClick={restart}>
                重新开始
              </button>
            </footer>
          </>
        ) : (
          <>
            <small>资格注销 / 007号</small>
            <h2>电梯不再响应。</h2>
            <p>
              {winner
                ? `${winner.name}率先抵达100层，本季结束。`
                : `你未在时限内通过${raceNextCheckpoint(p)}层审查。`}
            </p>
            <div className="race-reward">
              <X size={30} />
              <b>{p.floor}F</b>
              <span>最终抵达楼层</span>
            </div>
            <footer>
              <span>倒下可以救援。淘汰意味着本季结束。</span>
              <button className="race-primary" onClick={restart}>
                重新开始
              </button>
            </footer>
          </>
        )}
      </section>
    </dialog>
  );
}
