'use client';
import { afterlightLine } from '@/lib/survival-afterlight';
import { ASCENT_COST } from '@/lib/survival-ascent';
import { guidePaused } from '@/lib/survival-guidance';
import {
  advanceDialogue,
  dialogueCue,
  openingLootReady,
  ROBOT_LINES,
} from '@/lib/survival-opening';
import {
  createAfterlightRehearsal,
  createHomecomingRehearsal,
} from '@/lib/survival-rehearsal';
import { distance, ELEVATOR, searchDuration } from '@/lib/survival-room';
import { brainExperience, countKind } from '@/lib/survival-stacks';
import { Flashlight, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { lazy, Suspense } from 'react';
import DesignSystem from './design-system';
import { uiVariables } from './design-tokens';
import DialogueBubble from './dialogue';
import EquipmentBoard from './equipment';
import GMPanel from './gm-panel';
import ItemHover from './item-hover';
import LiftSystem from './lift-system';
import Minimap from './minimap';
import './theme.css';
import TutorialGuide from './tutorial-guide';
import UpgradeSequence from './upgrade-sequence';
import { useOpeningController } from './use-opening-controller';
import Vitals from './vitals';

const Scene = lazy(() => import('./scene'));
export default function OpeningDemo() {
  const {
    state,
    opening,
    world,
    presentation,
    designSystem,
    setDesignSystem,
    saved,
    setSaved,
    upgradeShow,
    setUpgradeShow,
    consoleTab,
    setConsoleTab,
    gm,
    setGM,
    terminal,
    ready,
    setReady,
    paused,
    reduced,
    setReduced,
    muted,
    setMuted,
    generation,
    setGeneration,
    keys,
    audio,
    pauseDialog,
    autoDialogue,
    dismissed,
    controls,
    resetDialogue,
    commit,
    act,
    changeTerminal,
    openTerminal,
    door,
    setPause,
    restart,
    pauseVisible,
    move,
    edgeSpawns,
  } = useOpeningController();
  const equipmentVisible = [
    'reveal',
    'fight',
    'aftermath',
    'return',
    'expedition',
  ].includes(state.stage);
  const cue = state.guidance.active ? null : dialogueCue(state);
  const speech = cue && cue.key !== dismissed ? cue : null;
  const eyes =
    state.stage === 'waiting'
      ? 0
      : state.stage === 'eyes'
        ? Math.max(
            0,
            Math.min(1, state.beat / 76) -
              (reduced
                ? 0
                : 0.37 * Math.exp(-Math.pow((state.beat - 33) / 6, 2))),
          )
        : 1;
  const box = state.room.caches.find((c) => c.id === 'opening-box');
  const searchedCache = state.room.caches.find(
    (c) => c.id === state.room.searching,
  );
  const searching = !!searchedCache;
  return (
    <main
      className={`survival-page opening-page ${state.room.status} opening-stage-${state.stage}${reduced ? ' opening-reduced' : ''}`}
      data-opening-stage={state.stage}
      data-afterlight-phase={state.afterlight.phase}
      data-homecoming-scene={
        state.stage === 'home' ? state.homecoming.scene : undefined
      }
      style={uiVariables as React.CSSProperties}
    >
      <div
        className="survival-world"
        style={{ filter: reduced ? undefined : `blur(${(1 - eyes) * 6}px)` }}
      >
        <Suspense fallback={null}>
          <Scene
            key={`${generation}-${state.room.seed}`}
            state={world}
            presentation={presentation}
            opening={opening}
            reduced={reduced}
            onMove={move}
            onReady={() => setReady(true)}
            onDoor={door}
            onTerminal={(toggleAuto) => {
              if (toggleAuto) {
                controls.toggle();
                return;
              }
              const current = dialogueCue(opening.current);
              if (
                current?.speaker === 'robot' &&
                current.key !== dismissed &&
                opening.current.homecoming.scene !== 'mouth'
              )
                controls.skip();
              else openTerminal();
            }}
            onEdgeSpawns={edgeSpawns}
            paused={
              guidePaused(state.guidance) ||
              !!upgradeShow ||
              paused ||
              terminal ||
              state.stage === 'waiting'
            }
          />
        </Suspense>
      </div>
      <div className="survival-vignette" />
      <ItemHover state={state.room} />
      {eyes < 1 && (
        <div className="opening-eyes" aria-hidden="true">
          <i style={{ transform: `translateY(${-eyes * 108}%)` }} />
          <i style={{ transform: `translateY(${eyes * 108}%)` }} />
        </div>
      )}
      {state.stage === 'waiting' && (
        <div className="opening-entry">
          <span>F 9</span>
          <button
            disabled={!ready}
            onClick={() => {
              audio.current?.start();
              act({ type: 'enter' });
            }}
          >
            {ready ? (saved ? '重新开始' : '进入游戏') : '正在进入梦境…'}
          </button>
          {saved && (
            <button
              disabled={!ready}
              onClick={() => {
                audio.current?.start();
                setReady(false);
                commit({ ...saved, dialogueAuto: false });
                setGeneration((n) => n + 1);
                setConsoleTab(saved.lift.choosingFloor ? 'floors' : 'upgrade');
                changeTerminal(
                  saved.lift.choosingFloor ||
                    (saved.stage === 'home' &&
                      ['feed', 'upgrade'].includes(saved.homecoming.scene)),
                );
                setSaved(null);
              }}
            >
              继续旅程
            </button>
          )}
        </div>
      )}
      {speech &&
        !terminal &&
        (speech.speaker === 'player' || state.stage !== 'home') && (
          <DialogueBubble
            text={speech.text}
            speaker={speech.speaker}
            controls={controls}
            className="world-dialogue"
          />
        )}
      {state.stage === 'collapse' && (
        <div
          className="death-curtain"
          style={
            {
              '--death': Math.min(1, Math.max(0, (state.beat - 24) / 70)),
            } as React.CSSProperties
          }
        >
          <p>你撑不住了，安泊将你拖回了电梯</p>
          <small>背包留在了原地</small>
        </div>
      )}
      {upgradeShow && (
        <UpgradeSequence
          level={upgradeShow}
          reduced={reduced}
          paused={paused}
          done={() => {
            setUpgradeShow(null);
            if (upgradeShow === 2) {
              setConsoleTab('upgrade');
              changeTerminal(true);
            } else commit(advanceDialogue(opening.current));
          }}
        />
      )}
      {state.stage === 'equip-light' && (
        <section className="opening-found" aria-label="装备捡到的电筒">
          <Flashlight size={35} />
          <div>
            <small>拾起电筒</small>
            <p>也许还能用。</p>
          </div>
          <button onClick={() => act({ type: 'equip-light' })}>
            装备 <kbd>E</kbd>
          </button>
        </section>
      )}
      {searching && (
        <output className="opening-search">
          <i
            style={{
              width: `${(state.room.searchTicks / (searchedCache ? searchDuration(searchedCache, state.room.player.energy) : 90)) * 100}%`,
            }}
          />
          <span>翻找中…</span>
        </output>
      )}
      {state.stage === 'find-box' &&
        box &&
        distance(state.room.player, box) < 2.8 &&
        !searching && (
          <span className="opening-near-hint">靠近箱子，停下翻找</span>
        )}
      {equipmentVisible && (
        <div className="opening-equipment">
          <EquipmentBoard
            state={state.room}
            onOpen={state.stage === 'expedition' ? openTerminal : undefined}
          />
        </div>
      )}
      {['return', 'aftermath', 'expedition'].includes(state.stage) &&
        (state.stage === 'expedition' || openingLootReady(state)) &&
        distance(state.room.player, ELEVATOR) < 3 && (
          <button
            className="opening-return"
            onClick={() => act({ type: 'return' })}
          >
            回到电梯 <kbd>E</kbd>
          </button>
        )}
      {['aftermath', 'return'].includes(state.stage) &&
        !openingLootReady(state) && (
          <output className="opening-loot-reminder">
            带上地面的材料，再沿引路线返回 ·{' '}
            {
              state.room.caches.filter(
                (c) => c.item.kind === 'lift-material' && !c.opened,
              ).length
            }{' '}
            份尚未收取
          </output>
        )}
      {state.stage === 'door' && (
        <button className="survival-screen-reader" onClick={door}>
          按 E 打开右侧电梯按钮
        </button>
      )}
      {state.stage === 'home' &&
        ['mouth', 'complete'].includes(state.homecoming.scene) && (
          <button className="survival-screen-reader" onClick={openTerminal}>
            {state.homecoming.scene === 'mouth'
              ? '点击屏幕黑孔，或按 F 打开基地升级'
              : '按 F 访问左侧电梯终端'}
          </button>
        )}
      {state.stage === 'home' &&
        state.homecoming.scene === 'complete' &&
        state.afterlight.phase === 'safe' &&
        !terminal && (
          <button className="opening-return" onClick={openTerminal}>
            查看安全容器 <kbd>F</kbd>
          </button>
        )}
      <Vitals state={state} />
      {state.stage === 'expedition' && (
        <>
          <Minimap state={state.room} />
          <button className="opening-bag-toggle" onClick={openTerminal}>
            行囊 <kbd>B</kbd>
          </button>
          <aside className="field-quest" aria-label="任务目标">
            <small>任务目标</small>
            {state.room.floor === 3 ? (
              <>
                <h3>
                  探索
                  {state.room.world.theme === 'dunes' ? '风蚀遗庭' : '听雨庭'}
                </h3>
                <p>搜寻遗物，带回电梯</p>
              </>
            ) : !state.afterlight.equipmentTaught ? (
              <>
                <h3>{state.afterlight.waterFound ? '回到电梯' : '寻找饮水'}</h3>
                <p>
                  净水瓶{' '}
                  {state.afterlight.waterFound ? '1 / 1 · 已完成' : '0 / 1'}
                </p>
                <progress max={1} value={Number(state.afterlight.waterFound)} />
              </>
            ) : (
              <>
                <h3>
                  {ASCENT_COST.every(
                    (c) =>
                      (c.kind === 'lift-material'
                        ? brainExperience([
                            ...state.room.bag,
                            ...state.room.safe,
                          ])
                        : countKind(
                            [...state.room.bag, ...state.room.safe],
                            c.kind,
                          )) >= c.count,
                  )
                    ? '回到电梯'
                    : '寻找升级物资'}
                </h3>
                {ASCENT_COST.map((c) => (
                  <p key={c.kind}>
                    {c.kind === 'scrap' ? '机械零件' : '脑浆经验'}{' '}
                    {Math.min(
                      c.count,
                      c.kind === 'lift-material'
                        ? brainExperience([
                            ...state.room.bag,
                            ...state.room.safe,
                          ])
                        : countKind(
                            [...state.room.bag, ...state.room.safe],
                            c.kind,
                          ),
                    )}{' '}
                    / {c.count}
                  </p>
                ))}
              </>
            )}
          </aside>
        </>
      )}
      {terminal && (
        <LiftSystem
          state={state}
          act={act}
          dialogue={controls}
          speech={speech?.speaker === 'robot' ? speech : null}
          onPause={() => setPause(true)}
          playerSpeech={speech?.speaker === 'player' ? speech : null}
          tab={consoleTab}
          onTab={setConsoleTab}
          reduced={reduced}
          close={() => {
            if (state.homecoming.scene === 'upgrade') return;
            act({ type: 'close-mouth' });
            act({ type: 'close-floor' });
            changeTerminal(false);
          }}
        />
      )}
      <span className="survival-screen-reader" aria-live="polite">
        {state.stage === 'home'
          ? state.homecoming.scene === 'complete'
            ? afterlightLine(state.afterlight)
            : ROBOT_LINES[state.homecoming.scene]
          : ''}
        {state.stage === 'phone'
          ? '拿出手机。03:17，无信号，正在搜索网络。'
          : state.stage === 'find-light'
            ? '进入荒原。WASD 或点击地面移动，走近电筒拾取。'
            : state.stage === 'home'
              ? `已回到电梯，携带 ${countKind([...state.room.bag, ...state.room.safe], 'lift-material')} 份脑浆，包含安全容器内物品。`
              : ''}
      </span>
      {state.stage === 'home' &&
        state.afterlight.phase === 'recover-opening' && (
          <button className="opening-return" onClick={door}>
            回荒原寻找核心 <kbd>E</kbd>
          </button>
        )}
      {state.stage === 'home' &&
        state.afterlight.phase === 'eat-food' &&
        !terminal && (
          <button
            className="opening-return"
            onClick={() => {
              setConsoleTab('inventory');
              changeTerminal(true);
            }}
          >
            吃点面包 <kbd>F</kbd>
          </button>
        )}
      {state.stage === 'home' &&
        state.afterlight.breadGiven &&
        state.afterlight.phase === 'eat-food' &&
        state.afterlight.tick < 90 && (
          <output className="home-pickup" aria-live="polite">
            + 面包 × 1
          </output>
        )}
      {state.guidance.active && (
        <TutorialGuide
          key={state.guidance.active.id}
          guidance={state.guidance}
          dialogue={controls}
          acknowledge={() => {
            keys.current.clear();
            act({ type: 'ack-guide' });
          }}
        />
      )}
      {gm && (
        <GMPanel
          close={() => setGM(false)}
          jump={(next) => {
            setGM(false);
            changeTerminal(false);
            setReady(false);
            audio.current?.close();
            audio.current?.start();
            audio.current?.mute(muted);
            resetDialogue();
            commit({ ...next, dialogueAuto: autoDialogue });
            setPause(false);
            setGeneration((n) => n + 1);
            setUpgradeShow(
              next.stage === 'home' && next.homecoming.scene === 'upgrade'
                ? 1
                : null,
            );
            if (
              next.lift.choosingFloor ||
              (next.stage === 'home' && next.homecoming.scene === 'feed')
            ) {
              setConsoleTab(next.lift.choosingFloor ? 'floors' : 'upgrade');
              changeTerminal(true);
            }
          }}
        />
      )}
      {designSystem && <DesignSystem close={() => setDesignSystem(false)} />}
      {pauseVisible && !gm && !designSystem && (
        <dialog
          ref={pauseDialog}
          onCancel={(e) => {
            e.preventDefault();
            setPause(false);
          }}
          className="opening-pause"
          aria-label={state.room.status === 'dead' ? '梦境中断' : '设置与暂停'}
          onKeyDown={(e) => {
            if (e.key === 'Tab') {
              const all =
                e.currentTarget.querySelectorAll<HTMLButtonElement>('button');
              const first = all[0],
                last = all[all.length - 1];
              if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
              } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
              }
            }
          }}
        >
          <h2>{state.room.status === 'dead' ? '梦境中断' : '稍作停留'}</h2>
          {state.room.status !== 'dead' && (
            <button onClick={() => setPause(false)}>
              <Play size={16} />
              继续
            </button>
          )}
          <button
            onClick={() => {
              setMuted((v) => !v);
              audio.current?.mute(!muted);
            }}
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}声音：
            {muted ? '关' : '开'}
          </button>
          <button onClick={() => setReduced((v) => !v)}>
            减少动态：{reduced ? '开' : '关'}
          </button>
          <button onClick={() => setGM(true)}>GM · 引导阶段</button>
          <button onClick={() => setDesignSystem(true)}>界面设计系统</button>
          <button
            onClick={() => {
              changeTerminal(false);
              setReady(false);
              audio.current?.close();
              audio.current?.start();
              audio.current?.mute(muted);
              commit(createHomecomingRehearsal());
              setPause(false);
              setGeneration((n) => n + 1);
            }}
          >
            重播返程演出（重置试玩）
          </button>
          <button
            onClick={() => {
              changeTerminal(false);
              setReady(false);
              audio.current?.close();
              audio.current?.start();
              audio.current?.mute(muted);
              commit(createAfterlightRehearsal());
              setPause(false);
              setGeneration((n) => n + 1);
            }}
          >
            从开灯后体验（重置试玩）
          </button>
          <button onClick={restart}>
            <RotateCcw size={16} />
            重新体验开场
          </button>
        </dialog>
      )}
    </main>
  );
}
