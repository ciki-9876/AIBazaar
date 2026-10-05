"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import Image from "next/image";
import { AtlasArt, presentationAsset, type ArtDirection } from "./art";
import {
  initialWalk,
  walkStep,
  nearbySpot,
  WAYSTATION_SPOTS,
  WALK_STEP_MS,
  type SpotId,
} from "../lib/presentation/walk";
import { sitePath } from "../lib/site-path";

const conversations = {
  mentor: {
    title: "先听一听，风从哪里来",
    lines: [
      {
        speaker: "许师傅",
        text: "你带了满满一包器具。可有时，真正缺的，只是一把愿意坐下来的椅子。",
      },
      { speaker: "阿弦", text: "如果她还是不敢唱呢？我怕自己的歌帮不上忙。" },
      {
        speaker: "许师傅",
        text: "那就陪她听一会儿雨。不必今天就唱完，不必每一次都给出答案。",
      },
    ],
  },
  letter: {
    title: "一封来自小禾的信",
    lines: [
      {
        speaker: "小禾 · 来信",
        text: "阿弦，雨停驿站有个孩子，最近总把曲谱攥得皱皱的。她说自己再也不唱了，可每天还是会来。",
      },
      {
        speaker: "小禾 · 来信",
        text: "我们留了热茶和一把椅子。你路过的时候，愿意坐下来，听她说说吗？",
      },
      {
        speaker: "阿弦",
        text: "音乐盒还留着那半首曲子。也许，我可以先从听见她的第一句开始。",
      },
    ],
  },
  door: {
    title: "给第一句，留一点空间",
    lines: [
      {
        speaker: "阿弦",
        text: "这次不去舞台。就让音乐盒放在桌上，我们先唱给一个愿意听的人。",
      },
      {
        speaker: "许师傅",
        text: "当那些泄气的话变得太吵，跟着共鸣线，让你的歌继续。准备好，就进入心景吧。",
      },
    ],
  },
};
type ConversationId = keyof typeof conversations;

function Conversation({
  id,
  close,
  battlePath,
}: {
  id: ConversationId;
  close: () => void;
  battlePath: string;
}) {
  const [line, setLine] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const script = conversations[id],
    current = script.lines[line];
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      className="pa-conversation"
      ref={dialog}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <header>
        <small>{script.title}</small>
        <button onClick={close} aria-label="关闭对话">
          ×
        </button>
      </header>
      <b>{current.speaker}</b>
      <p>{current.text}</p>
      <footer>
        <span>
          {line + 1} / {script.lines.length}
        </span>
        {line < script.lines.length - 1 ? (
          <button autoFocus onClick={() => setLine(line + 1)}>
            继续听 →
          </button>
        ) : id === "door" ? (
          <a href={battlePath}>♪ 进入心景</a>
        ) : (
          <button onClick={close}>把这句话记在心里</button>
        )}
      </footer>
    </dialog>
  );
}

export default function ArtDemo({ direction }: { direction: ArtDirection }) {
  const summer = direction === "summer";
  const battlePath = sitePath(summer ? "/art/battle" : "/art/storybook/battle");
  const [walk, setWalk] = useState(initialWalk);
  const [moving, setMoving] = useState(false);
  const [conversation, setConversation] = useState<ConversationId | null>(null);
  const [page, setPage] = useState(0);
  const [choice, setChoice] = useState<"listen" | "music" | null>(null);
  const [quiet, setQuiet] = useState(false);
  const walkRef = useRef(walk),
    keys = useRef(new Set<string>());
  const sceneViewport = useRef<HTMLElement>(null);
  const pointer = useRef<-1 | 0 | 1>(0),
    destination = useRef<number | null>(null);
  const nearest = nearbySpot(walk);
  useEffect(() => {
    const view = sceneViewport.current;
    if (summer && view && view.scrollWidth > view.clientWidth)
      view.scrollLeft =
        (walk.x / 1000) * view.scrollWidth - view.clientWidth / 2;
  }, [walk.x, summer]);
  const story = [
    {
      speaker: "阿弦",
      text: "雨刚停。驿站的窗户亮着，桌上放着一封被仔细压平的信。有人还在等一个愿意听她唱歌的人。",
    },
    {
      speaker: "阿弦",
      text:
        choice === "music"
          ? "我把音乐盒放在桌上，没有转动发条。先问问她：你想从哪一句开始？"
          : "我拉开椅子，坐到她身边。今天不用去舞台，这里只有热茶、窗外的风，和愿意听的人。",
    },
    {
      speaker: "阿弦",
      text: "她小声说：我还是想和朋友一起唱。那些“你不行”的声音太吵了。我点点头：我们一起，给第一句留一点空间。",
    },
  ];
  const stop = useCallback(() => {
    keys.current.clear();
    pointer.current = 0;
    destination.current = null;
    setMoving(false);
  }, []);
  const interact = useCallback(() => {
    const spot = nearbySpot(walkRef.current);
    if (spot) {
      stop();
      setConversation(spot.id);
    }
  }, [stop]);
  const tapStep = useCallback((direction: -1 | 1) => {
    const next = walkStep(walkRef.current, direction, 1);
    walkRef.current = next;
    setWalk(next);
  }, []);

  useEffect(() => {
    if (!summer || conversation) return;
    const down = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLElement &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)
      )
        return;
      if (["ArrowLeft", "ArrowRight", "KeyA", "KeyD"].includes(event.code)) {
        event.preventDefault();
        if (!event.repeat && !keys.current.has(event.code))
          tapStep(event.code === "KeyA" || event.code === "ArrowLeft" ? -1 : 1);
        keys.current.add(event.code);
        destination.current = null;
      } else if (event.code === "KeyE" && !event.repeat) {
        event.preventDefault();
        interact();
      }
    };
    const up = (event: KeyboardEvent) => {
      keys.current.delete(event.code);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", stop);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", stop);
      stop();
    };
  }, [summer, conversation, stop, interact, tapStep]);
  useEffect(() => {
    if (!summer || conversation) return;
    let frame = 0,
      last = performance.now(),
      accumulated = 0;
    const update = (now: number) => {
      const state = walkRef.current;
      const left = keys.current.has("ArrowLeft") || keys.current.has("KeyA");
      const right = keys.current.has("ArrowRight") || keys.current.has("KeyD");
      const distance =
        destination.current === null ? 0 : destination.current - state.x;
      if (destination.current !== null && Math.abs(distance) < 3)
        destination.current = null;
      const direction =
        pointer.current ||
        (right && !left ? 1 : left && !right ? -1 : 0) ||
        (destination.current !== null ? (distance > 0 ? 1 : -1) : 0);
      let didMove = false;
      if (document.hidden || !direction) accumulated = 0;
      else {
        accumulated += Math.min(100, now - last);
        let steps = Math.min(5, Math.floor(accumulated / WALK_STEP_MS));
        if (destination.current !== null)
          steps = Math.min(steps, Math.floor(Math.abs(distance) / 3));
        if (steps > 0) {
          accumulated -= steps * WALK_STEP_MS;
          const next = walkStep(state, direction, steps);
          didMove = next.x !== state.x;
          walkRef.current = next;
          setWalk(next);
        } else didMove = true;
      }
      setMoving(didMove);
      last = now;
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [summer, conversation]);
  const approach = (id: SpotId) => {
    const spot = WAYSTATION_SPOTS.find((entry) => entry.id === id)!;
    if (nearbySpot(walkRef.current)?.id === id) {
      stop();
      setConversation(id);
    } else {
      destination.current =
        spot.id === "mentor"
          ? spot.x + (walkRef.current.x < spot.x ? -55 : 55)
          : spot.x;
      keys.current.clear();
    }
  };
  const hold = (event: PointerEvent<HTMLButtonElement>, value: -1 | 1) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    tapStep(value);
    pointer.current = value;
    destination.current = null;
  };
  return (
    <main className={`pa-root pa-${direction} ${quiet ? "pa-quiet" : ""}`}>
      <header className="pa-header">
        <a className="pa-brand" href={sitePath("/")}>
          <span>♪</span> 听风之旅 <small>美术试演</small>
        </a>
        <nav aria-label="美术方案">
          <a className={summer ? "is-selected" : ""} href={sitePath("/art")}>
            01 夏日像素
          </a>
          <a
            className={!summer ? "is-selected" : ""}
            href={sitePath("/art/storybook")}
          >
            02 手绘故事
          </a>
        </nav>
        <a className="pa-outline" href={sitePath("/outline")}>
          故事大纲 ↗
        </a>
      </header>
      <section className="pa-scene-wrap" ref={sceneViewport}>
        <section
          className="pa-scene"
          aria-label={summer ? "可行走的雨停驿站" : "雨停驿站对话场景"}
        >
          <Image
            className="pa-background"
            src={presentationAsset(
              summer ? "summer-scene-v2" : "storybook-scene",
            )}
            alt={
              summer
                ? "雨停后的湖畔驿站，橘色屋顶、蓝色山湖与门前石路"
                : "窗边洒满阳光的驿站，热茶、旧钢琴与来信"
            }
            draggable={false}
            width={1672}
            height={941}
            unoptimized
          />
          {summer && (
            <button
              className="pa-walk-target"
              aria-label="选择石路上的目的地"
              onClick={(event) => {
                if (conversation) return;
                const box = event.currentTarget.getBoundingClientRect();
                destination.current =
                  event.detail === 0
                    ? 530
                    : Math.max(
                        65,
                        Math.min(
                          935,
                          ((event.clientX - box.left) / box.width) * 1000,
                        ),
                      );
              }}
            />
          )}
          <div className="pa-place">
            <small>听风之旅 · 第一站</small>
            <h1>雨停驿站</h1>
            <span>雨停了，歌还没有开始。</span>
          </div>
          <button className="pa-view-toggle" onClick={() => setQuiet(!quiet)}>
            {quiet ? "显示界面" : "静静看看"}
          </button>
          {summer ? (
            <>
              <div className="pa-actor pa-mentor" style={{ left: "31%" }}>
                <AtlasArt direction="summer" index={11} />
              </div>
              <div
                className="pa-actor pa-player"
                style={{
                  left: `${walk.x / 10}%`,
                  transform: `translateX(-50%) scaleX(${moving ? walk.facing : 1})`,
                }}
                aria-label={`阿弦，位置 ${walk.x}`}
              >
                <AtlasArt
                  direction="summer"
                  hero
                  index={moving ? Math.floor(walk.steps / 5) % 4 : 4}
                />
              </div>
              {WAYSTATION_SPOTS.map((spot) => (
                <button
                  key={spot.id}
                  className={`pa-hotspot ${nearest?.id === spot.id ? "is-near" : ""}`}
                  style={{
                    left: `${spot.x / 10}%`,
                    bottom: spot.id === "mentor" ? "48%" : undefined,
                  }}
                  onClick={() => approach(spot.id)}
                  aria-label={`前往${spot.title}`}
                >
                  <i>＋</i>
                  <span>{spot.title}</span>
                </button>
              ))}
              {nearest && (
                <button
                  className="pa-near-prompt"
                  onClick={interact}
                  style={{ left: `${walk.x / 10}%` }}
                >
                  <kbd>E</kbd> {nearest.verb}
                </button>
              )}
              <div className="pa-touch-controls">
                <button
                  aria-label="向左走"
                  onPointerDown={(event) => hold(event, -1)}
                  onPointerUp={() => {
                    pointer.current = 0;
                  }}
                  onPointerCancel={() => {
                    pointer.current = 0;
                  }}
                >
                  ←
                </button>
                <button
                  aria-label="向右走"
                  onPointerDown={(event) => hold(event, 1)}
                  onPointerUp={() => {
                    pointer.current = 0;
                  }}
                  onPointerCancel={() => {
                    pointer.current = 0;
                  }}
                >
                  →
                </button>
              </div>
            </>
          ) : (
            <>
              <Image
                className="pa-standing-portrait"
                src={presentationAsset("storybook-hero-v2")}
                alt="治愈师阿弦的立绘"
                draggable={false}
                width={1024}
                height={1536}
                unoptimized
              />
              <section className="pa-story-dialogue" aria-label="故事对话">
                <div className="pa-speaker">
                  <span>♪</span>
                  <b>{story[page].speaker}</b>
                  <small>治愈师 · 把半首歌带在身边的人</small>
                </div>
                <p aria-live="polite">{story[page].text}</p>
                <footer>
                  <span>雨停后的第一封信 · {page + 1} / 3</span>
                  {page === 0 ? (
                    <div className="pa-choices">
                      <button
                        onClick={() => {
                          setChoice("listen");
                          setPage(1);
                        }}
                      >
                        先坐下来听
                      </button>
                      <button
                        onClick={() => {
                          setChoice("music");
                          setPage(1);
                        }}
                      >
                        把音乐盒放在桌上
                      </button>
                    </div>
                  ) : page === 1 ? (
                    <button onClick={() => setPage(2)}>继续 →</button>
                  ) : (
                    <a href={battlePath}>♪ 为第一句演奏</a>
                  )}
                </footer>
              </section>
            </>
          )}
        </section>
      </section>
      <footer className="pa-bottom">
        <span>
          {summer
            ? "A / D 或 ← / → 行走 · 点击石路前往 · 靠近后 E 交互"
            : "背景、立绘与对话 · 先听她说，再进入心景"}
        </span>
        <div>
          {!summer && (
            <button
              onClick={() => {
                setPage(0);
                setChoice(null);
              }}
            >
              重读这一页
            </button>
          )}
          <a href={battlePath}>试玩本版战斗 →</a>
        </div>
      </footer>
      {conversation && (
        <Conversation
          key={conversation}
          id={conversation}
          close={() => setConversation(null)}
          battlePath={battlePath}
        />
      )}
    </main>
  );
}
