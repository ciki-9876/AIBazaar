'use client';
import {
appendMatch,
ARENA_ARCHIVE_KEY,
emptyArchive,
parseArchive,
serializeArchive,
summarizeMatch,
type ArenaArchive,
type ArenaMatch,
} from '@/lib/arena-archive';
import { CARD_RARITIES,sampleFighter } from '@/lib/arena-card-face';
import { amplifier,ARENA_CARDS,arenaCard } from '@/lib/arena-catalog';
import {
chooseCounter,
makeArenaDuel,
OPENING_LINEUP,
type ArenaLineup,
} from '@/lib/arena-challenge';
import { validateArenaBoard,type ArenaFrame } from '@/lib/arena-engine';
import {
amplifierStatus,
arenaReview,
cardStatus,
formationRelations,
placeOnArena,
rounded,
} from '@/lib/arena-presentation';
import { SETTLE_SECONDS } from '@/lib/battle-slice-fx';
import { cardDef } from '@/lib/cards/catalog';
import { simulateDuel,type Duel,type FighterCard } from '@/lib/cards/combat';
import { replayFrameIndex } from '@/lib/cards/playback';
import { sitePath } from '@/lib/site-path';
import {
ArrowLeft,
BookOpen,
ChevronRight,
Download,
Eye,
History,
Layers,
Maximize,
Minimize,
Pause,
Play,
RotateCcw,
Search,
Swords,
X,
} from 'lucide-react';
import {
useCallback,
useEffect,
useMemo,
useRef,
useState,
type CSSProperties,
} from 'react';
import './theme.css';
import { ArenaReview } from './arena-review';
import { ArenaTable,type Inspection,type Selection } from './arena-table';
import {
AmplifierPicker,
ArenaDialog,
EffectHelp,
LANES,
RARITIES,
} from './arena-ui';
import { CollectibleCard } from './collectible-card';
import { FlatTable } from './flat-table';
import { useArenaPlayback } from './use-arena-playback';

const kinds: Record<string, string> = {
  damage: '直击',
  burn: '灼烧',
  corrode: '侵蚀',
  shield: '修屏',
  heal: '治疗',
  tempo: '节奏',
  control: '控制',
  passive: '布阵',
};
type Phase = 'build' | 'fight' | 'result';
const emptyAmps = () => [null, null, null] as Array<string | null>;
const uid = () => crypto.randomUUID();

const starterBoard = (): FighterCard[] =>
  [
    ['arena-03', 0],
    ['arena-17', 3],
    ['arena-21', 4],
    ['arena-31', 5],
    ['arena-13', 6],
    ['arena-12', 8],
  ].map(([id, at], index) => ({
    ...sampleFighter(String(id)),
    uid: `player-starter-${index}`,
    at: Number(at),
  }));

export default function ArenaExperience({
  presentation = '3d',
  initialSkin = 'storybook',
}: {
  presentation?: '3d' | '2d';
  initialSkin?: 'storybook' | 'sticker';
}) {
  const flat = presentation === '2d';
  const [skin, setSkin] = useState(initialSkin);
  const Table = flat ? FlatTable : ArenaTable;
  const [lineup, setLineup] = useState<ArenaLineup>(OPENING_LINEUP),
    [player, setPlayer] = useState<FighterCard[]>(() =>
      flat ? starterBoard() : [],
    ),
    [playerAmps, setPlayerAmps] = useState<Array<string | null>>(emptyAmps);
  const [selected, setSelected] = useState<Selection | null>(null),
    [search, setSearch] = useState(''),
    [kind, setKind] = useState('all');
  const [phase, setPhase] = useState<Phase>('build'),
    [snapshot, setSnapshot] = useState<Duel | null>(null),
    [archive, setArchive] = useState<ArenaArchive>(emptyArchive);
  const [currentMatch, setCurrentMatch] = useState<ArenaMatch | null>(null),
    [parentMatchId, setParentMatchId] = useState<string | null>(null),
    [notice, setNotice] = useState('');
  const [cursor, setCursor] = useState(0),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(1);
  const [inspection, setInspection] = useState<Inspection | null>(null),
    [ampLane, setAmpLane] = useState<number | null>(null),
    [expanded, setExpanded] = useState(false),
    [counterNote, setCounterNote] = useState('');
  const [catalogOpen, setCatalogOpen] = useState(false),
    [historyOpen, setHistoryOpen] = useState(false),
    [reviewOpen, setReviewOpen] = useState(false),
    [detailed, setDetailed] = useState(false),
    [reduced, setReduced] = useState(false);
  const clock = useRef(0),
    file = useRef<HTMLInputElement>(null),
    page = useRef<HTMLElement>(null),
    serial = useRef(0),
    resume = useRef(false),
    reviewRef = useRef<HTMLDivElement>(null),
    battleRef = useRef<HTMLElement>(null);
  const liveDuel = useMemo(
      () => makeArenaDuel(player, lineup, playerAmps),
      [player, lineup, playerAmps],
    ),
    duel = snapshot ?? liveDuel;
  const result = useMemo(() => simulateDuel(duel), [duel]),
    frames = result.frames as ArenaFrame[],
    frame = frames[Math.max(0, Math.min(cursor, frames.length - 1))];
  const review = useMemo(() => arenaReview(duel, frames), [duel, frames]);
  const filtered = ARENA_CARDS.filter(
    (c) =>
      (kind === 'all' || c.kind === kind) &&
      `${c.name}${c.text}`.includes(search.trim()),
  );
  useEffect(() => {
    const id = setTimeout(() => {
      setReduced(matchMedia('(prefers-reduced-motion: reduce)').matches);
      try {
        const raw = localStorage.getItem(ARENA_ARCHIVE_KEY);
        if (raw) setArchive(parseArchive(raw));
      } catch {
        setNotice('本机档案未能读取，仍可开始新对局。');
      }
    }, 0);
    return () => clearTimeout(id);
  }, []);
  const completeReplay = useCallback(() => {
    setPlaying(false); setPhase('result'); setReviewOpen(true);
  }, []);
  useArenaPlayback({ playing, speed, duration: result.duration + SETTLE_SECONDS,
    count: frames.length, clock, onFrame: setCursor, onComplete: completeReplay });
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(id);
  }, [notice]);
  useEffect(() => {
    const sync = () => {
      if (!document.fullscreenElement) setExpanded(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('dialog[open]')) {
        if (inspection) {
          setInspection(null);
          if (resume.current) setPlaying(true);
          resume.current = false;
        } else {
          setSelected(null);
          setCatalogOpen(false);
          setExpanded(false);
        }
      }
    };
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('keydown', esc);
    };
  }, [inspection]);
  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [expanded]);
  const toggleFullscreen = async () => {
    if (expanded) {
      setExpanded(false);
      if (document.fullscreenElement)
        await document.exitFullscreen().catch(() => {});
    } else {
      setExpanded(true);
      await page.current?.requestFullscreen?.().catch(() => {});
    }
  };
  const inspect = (v: Inspection) => {
    if (!inspection) resume.current = playing;
    setPlaying(false);
    setInspection(v);
  };
  const closeInspection = () => {
    setInspection(null);
    if (resume.current) setPlaying(true);
    resume.current = false;
  };
  const place = (at: number, value = selected ?? undefined) => {
    if (phase !== 'build') return;
    if (!value) {
      setNotice('选择武装库中的卡牌，再点击桌面空格。');
      return;
    }
    try {
      while (player.some((c) => c.uid === `player-${serial.current}`))
        serial.current++;
      const next = placeOnArena(
        player,
        value.id,
        at,
        value.uid ?? `player-${serial.current}`,
        !!value.uid,
      );
      if (!value.uid) serial.current++;
      setPlayer(next);
      setSnapshot(null);
      setInspection(null);
      setNotice(
        `${cardDef(value.id).name}已${value.uid ? '移动' : '放置'}到${LANES[Math.floor(at / 3)]}`,
      );
      if (value.uid) setSelected(null);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : '放置失败');
    }
  };
  const changeAmp = (lane: number, id: string | null) => {
    setPlayerAmps((old) => old.map((v, i) => (i === lane ? id : v)));
    setSnapshot(null);
  };
  const seek = (time: number) => {
    resume.current = false;
    setPlaying(false);
    clock.current = Math.max(0, Math.min(result.duration, time));
    if (clock.current === result.duration) clock.current += SETTLE_SECONDS;
    setCursor(replayFrameIndex(clock.current, frames.length));
  };
  const edit = () => {
    resume.current = false;
    setInspection(null);
    setSelected(null);
    setParentMatchId(currentMatch?.id ?? parentMatchId);
    setPhase('build');
    setSnapshot(null);
    setPlaying(false);
    setCurrentMatch(null);
    setReviewOpen(false);
    setCursor(0);
    clock.current = 0;
  };
  const save = (match: ArenaMatch) => {
    const next = appendMatch(archive, match);
    localStorage.setItem(ARENA_ARCHIVE_KEY, serializeArchive(next));
    setArchive(next);
  };
  const start = () => {
    if (!player.length) {
      setNotice('至少放置一张牌后才能开战。');
      return;
    }
    try {
      validateArenaBoard(player);
      const frozen = structuredClone(liveDuel);
      const computed = simulateDuel(frozen);
      const match = summarizeMatch(
        uid(),
        lineup.id,
        parentMatchId,
        frozen,
        computed,
      );
      save(match);
      setCurrentMatch(match);
      setSnapshot(frozen);
      setCursor(0);
      clock.current = 0;
      setPhase('fight');
      setPlaying(true);
      setNotice(`对局 #${archive.matches.length + 1} 已记录在本机。`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '对局未能开始');
    }
  };
  const resetReplay = () => {
    clock.current = 0;
    setCursor(0);
    setPhase('fight');
    setPlaying(true);
  };
  const counter = () => {
    if (!currentMatch || currentMatch.summary.winner !== 0) return;
    try {
      const answer = chooseCounter(
        currentMatch.duel.player,
        currentMatch.duel.arena!.amplifiers[0],
        lineup.id,
      );
      setLineup(answer.lineup);
      setPlayer(structuredClone(currentMatch.duel.player));
      setPlayerAmps([...currentMatch.duel.arena!.amplifiers[0]]);
      setParentMatchId(currentMatch.id);
      setCurrentMatch(null);
      setSnapshot(null);
      setPhase('build');
      setPlaying(false);
      setCursor(0);
      clock.current = 0;
      setCounterNote(
        `${answer.tested} 套候选阵容完成确定性对照；${answer.counterFound ? '找到了能取胜的应对' : '尚未找到能取胜的应对，已选表现最好的阵容'}。这是规则搜索，不代表语言模型已经看过并学习该局。`,
      );
      setInspection(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '调整失败');
    }
  };
  const exportArchive = () => {
    const blob = new Blob([serializeArchive(archive)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `f9-arena-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const importArchive = async (f: File | undefined) => {
    if (!f) return;
    try {
      const incoming = parseArchive(await f.text());
      const merged = { version: 1 as const, matches: [...archive.matches] };
      for (const match of incoming.matches)
        if (!merged.matches.some((x) => x.id === match.id))
          merged.matches.push(match);
      localStorage.setItem(ARENA_ARCHIVE_KEY, serializeArchive(merged));
      setArchive(merged);
      setNotice(
        `已合并 ${merged.matches.length - archive.matches.length} 场对局。`,
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '导入失败');
    }
    if (file.current) file.current.value = '';
  };
  const loadMatch = (match: ArenaMatch) => {
    const old = match.duel;
    setPlayer(structuredClone(old.player));
    setPlayerAmps([...old.arena!.amplifiers[0]]);
    setLineup({
      id: match.challengeId,
      title: old.name,
      thesis: '历史对局阵容',
      cards: structuredClone(old.enemy),
      amps: [...old.arena!.amplifiers[1]],
    });
    setCurrentMatch(match);
    setSnapshot(structuredClone(old));
    setParentMatchId(match.parentMatchId);
    setInspection(null);
    setPhase('result');
    setPlaying(false);
    const res = simulateDuel(old);
    setCursor(res.frames.length - 1);
    clock.current = res.duration + SETTLE_SECONDS;
  };

  const inspectedCard =
    inspection?.kind === 'card' ? arenaCard(inspection.id) : undefined;
  const inspectedAmp =
    inspection?.kind === 'amplifier' ? amplifier(inspection.id) : undefined;
  const selectedCard = arenaCard(selected?.id ?? '');
  const inspectFighter = inspection?.uid
    ? [...duel.player, ...duel.enemy].find((c) => c.uid === inspection.uid)
    : undefined;
  const relation = inspectFighter
    ? formationRelations(
        inspectFighter,
        inspection?.side ? duel.enemy : duel.player,
      )
    : undefined;
  const recentEvents =
    phase === 'build'
      ? []
      : review.events.filter((e) => e.time <= frame.time).slice(-3);
  const previousMatch = archive.matches.find(
    (m) => m.id === currentMatch?.parentMatchId,
  );
  const outcome =
    result.winner === 0 ? '你赢了' : result.winner === 1 ? '对手取胜' : '平局';
  function ampAction(side: number, lane: number) {
    if (side === 0 && phase === 'build') {
      setAmpLane(lane);
      return;
    }
    const id = duel.arena!.amplifiers[side][lane];
    if (id) inspect({ kind: 'amplifier', id, side, at: lane * 3 });
    else setNotice('此路未装备增幅器');
  }
  function host(side: number) {
    return (
      <div className={`tac-host ${side ? 'enemy' : 'own'}`}>
        <span>{side ? '敌方' : '我方'}宿主</span>
        <div className="tac-host-track">
          <i
            style={{ width: `${(100 * frame.hp[side]) / duel.maxHp[side]}%` }}
          />
        </div>
        <strong>
          {rounded(frame.hp[side])}
          <small> / {duel.maxHp[side]}</small>
        </strong>
        {(side ? duel.enemy : duel.player).some((c) => c.id === 'arena-38') && (
          <span>节拍 {frame.tempo[side]}/6</span>
        )}
      </div>
    );
  }
  return (
    <main
      ref={page}
      className={`arena-page tactical-page ${flat ? 'flat-arena light-arena' : ''} phase-${phase} ${expanded ? 'tactical-expanded' : ''} ${reduced ? 'reduce-motion' : ''}`}
      data-skin={flat ? skin : undefined}
      style={
        flat
          ? ({
              '--theme-art': `url("${sitePath(`/art-assets/arena-2d/animals-${skin}.png`)}")`,
            } as CSSProperties)
          : undefined
      }
    >
      <header className="tac-header">
        <a href={sitePath('/wandeng')} aria-label="返回万灯城">
          <ArrowLeft size={17} />
        </a>
        <span className="tac-brand">
          F9 <i>/</i> {flat ? '伙伴对战' : '战术桌'}
        </span>
        <nav aria-label="对局阶段">
          <span className={phase === 'build' ? 'active' : ''}>01 布阵</span>
          <ChevronRight size={12} />
          <span className={phase === 'fight' ? 'active' : ''}>02 交锋</span>
          <ChevronRight size={12} />
          <span className={phase === 'result' ? 'active' : ''}>03 复盘</span>
        </nav>
        <div className="tac-header-actions">
          <a
            className="tac-mode-link"
            href={sitePath(flat ? '/arena' : '/arena/2d')}
          >
            {flat ? '3D 战术桌' : '2D 卡牌桌'} ↗
          </a>
          <button
            onClick={() => {
              resume.current = playing;
              setPlaying(false);
              setHistoryOpen(true);
            }}
          >
            <History size={15} />
            对局档案 <b>{archive.matches.length}</b>
          </button>
          <button onClick={() => void toggleFullscreen()}>
            {expanded ? <Minimize size={15} /> : <Maximize size={15} />}
            <span>{expanded ? '退出全屏' : '全屏'}</span>
          </button>
        </div>
      </header>
      {flat && (
        <div className="animal-style-bar">
          <div>
            <strong>{skin === 'storybook' ? '绘本伙伴' : '贴纸伙伴'}</strong>
            <span>
              {skin === 'storybook'
                ? '温柔笔触 · 小小冒险'
                : '简单色块 · 鲜明个性'}
            </span>
          </div>
          <fieldset className="animal-style-switch" aria-label="美术版本">
            <button
              aria-pressed={skin === 'storybook'}
              onClick={() => {
                setSkin('storybook');
                window.history.replaceState(
                  null,
                  '',
                  sitePath('/arena/2d/storybook'),
                );
              }}
            >
              A+B · 绘本
            </button>
            <button
              aria-pressed={skin === 'sticker'}
              onClick={() => {
                setSkin('sticker');
                window.history.replaceState(
                  null,
                  '',
                  sitePath('/arena/2d/sticker'),
                );
              }}
            >
              A+G · 贴纸
            </button>
          </fieldset>
        </div>
      )}
      <div className="tac-command">
        <div>
          <small>OPPONENT / 对手阵容公开</small>
          <h1>{lineup.title}</h1>
          <p>{lineup.thesis}</p>
        </div>
        <div className="tac-command-actions">
          {phase === 'build' ? (
            <>
              {flat && (
                <>
                  <button
                    onClick={() => {
                      setPlayer(starterBoard());
                      setSelected(null);
                      setInspection(null);
                      setSnapshot(null);
                    }}
                  >
                    示例阵容
                  </button>
                  <button
                    onClick={() => {
                      setPlayer([]);
                      setSelected(null);
                      setInspection(null);
                      setSnapshot(null);
                    }}
                  >
                    清空布阵
                  </button>
                </>
              )}
              <span>
                {player.reduce((n, c) => n + cardDef(c.id).size, 0)} / 9 格 ·
                每路一件增幅器
              </span>
              <button
                className="tac-catalog-toggle"
                onClick={() => setCatalogOpen(!catalogOpen)}
              >
                <Layers size={15} />
                武装库
              </button>
              <button
                className="tac-primary"
                onClick={() => {
                  setInspection(null);
                  setSelected(null);
                  setCatalogOpen(false);
                  setReviewOpen(false);
                  start();
                }}
              >
                <Swords size={16} />
                开始对战
              </button>
            </>
          ) : (
            <>
              <strong className="tac-outcome">
                {phase === 'result' ? outcome : playing ? '交锋中' : '已暂停'}
              </strong>
              <button onClick={edit}>调整阵容</button>
              {phase === 'result' && currentMatch?.summary.winner === 0 && (
                <button
                  className="tac-primary"
                  onClick={() => {
                    setReviewOpen(false);
                    counter();
                  }}
                >
                  请对手应对 →
                </button>
              )}
            </>
          )}
        </div>
      </div>
      <div className="tac-layout">
        {phase === 'build' && (
          <aside
            className={`tac-catalog ${catalogOpen ? 'open' : ''}`}
            aria-label="武装库"
          >
            <div className="tac-section-title">
              <span>
                武装库 <small>50 件</small>
              </span>
              <button
                className="tac-mobile-close"
                onClick={() => setCatalogOpen(false)}
                aria-label="关闭武装库"
              >
                <X size={16} />
              </button>
            </div>
            <label className="tac-search">
              <Search size={14} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索名称或效果"
                aria-label="搜索卡牌"
              />
            </label>
            <div className="tac-kind-filters">
              {['all', ...Object.keys(kinds)].map((k) => (
                <button
                  key={k}
                  aria-pressed={kind === k}
                  onClick={() => setKind(k)}
                >
                  {k === 'all' ? '全部' : kinds[k]}
                </button>
              ))}
            </div>
            <div className="tac-catalog-list">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  className={`tac-catalog-card rarity-${c.rarity} ${selected?.id === c.id && !selected.uid ? 'selected' : ''}`}
                  draggable
                  onDragStart={(e) => {
                    setSelected({ id: c.id });
                    e.dataTransfer.setData(
                      'application/f9-card',
                      JSON.stringify({ id: c.id }),
                    );
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => {
                    setSelected({ id: c.id });
                    setInspection(null);
                    setCatalogOpen(false);
                  }}
                  aria-pressed={selected?.id === c.id && !selected.uid}
                >
                  {flat ? (
                    <>
                      <CollectibleCard
                        card={sampleFighter(c.id)}
                        mode="catalog"
                        reduced={reduced}
                      />
                      <span className="flat-catalog-size">{c.size} 格</span>
                    </>
                  ) : (
                    <>
                      <span className={`tac-catalog-emblem kind-${c.kind}`}>
                        {String(c.number).padStart(2, '0')}
                      </span>
                      <span>
                        <strong>{c.name}</strong>
                        <small>
                          {kinds[c.kind]} · {c.cd ? `${c.cd}秒` : '被动'} ·{' '}
                          {RARITIES[c.rarity]}
                        </small>
                      </span>
                      <b>
                        {c.size}
                        <small>格</small>
                      </b>
                    </>
                  )}
                </button>
              ))}
            </div>
            <footer>
              拖入桌面，或选牌后点击空格
              <br />
              同名至多两张 · 稀有度与占格独立
            </footer>
          </aside>
        )}
        <section
          ref={battleRef}
          className="tac-battle-column"
          aria-label="对战桌面"
        >
          {host(1)}
          <Table
            duel={duel}
            frames={frames}
            frame={frame}
            clock={clock}
            editing={phase === 'build'}
            selected={selected}
            reduced={reduced}
            detailed={detailed}
            inspected={inspection}
            onInspect={inspect}
            onPlace={place}
            onSelect={setSelected}
            onAmp={ampAction}
          />
          {host(0)}
          <div className="tac-controls">
            {phase === 'build' ? (
              <div className="tac-build-hint">
                {selectedCard ? (
                  <>
                    <b>{selectedCard.name}</b>
                    <span>{selectedCard.text}</span>
                    <button
                      onClick={() =>
                        inspect({
                          kind: 'card',
                          id: selectedCard.id,
                          side: 0,
                          at: 0,
                        })
                      }
                    >
                      词条详情
                    </button>
                    <button onClick={() => setSelected(null)}>取消选择</button>
                  </>
                ) : (
                  <span>
                    选择或拖入装备。点击桌上任意装备查看效果与布阵关系。
                  </span>
                )}
              </div>
            ) : (
              <>
                <button
                  aria-label={playing ? '暂停' : '播放'}
                  onClick={() => {
                    resume.current = false;
                    setInspection(null);
                    if (cursor === frames.length - 1) {
                      resetReplay();
                    } else setPlaying(!playing);
                  }}
                >
                  {playing ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button
                  aria-label="重播"
                  onClick={() => {
                    setInspection(null);
                    resetReplay();
                  }}
                >
                  <RotateCcw size={15} />
                </button>
                <button
                  onClick={() => seek(frame.time + 0.25)}
                  aria-label="前进一帧"
                >
                  +0.25s
                </button>
                <div className="tac-timeline">
                  <input
                    type="range"
                    aria-label="回放时间"
                    min={0}
                    max={frames.length - 1}
                    value={cursor}
                    onChange={(e) => seek(frames[Number(e.target.value)].time)}
                  />
                  <div className="tac-timeline-marks">
                    {review.events
                      .filter(
                        (e) =>
                          e.important &&
                          e.kind === 'break' &&
                          (phase === 'result' || e.time <= frame.time),
                      )
                      .map((e) => (
                        <button
                          key={e.id}
                          title={`${e.time}s ${e.text}`}
                          aria-label={`跳到${e.text}`}
                          style={{
                            left: `${(100 * e.time) / result.duration}%`,
                          }}
                          onClick={() => seek(e.time)}
                        />
                      ))}
                  </div>
                </div>
                <time>
                  {frame.time.toFixed(1)} / {result.duration.toFixed(1)}s
                </time>
                <button
                  onClick={() =>
                    setSpeed(speed === 1 ? 2 : speed === 2 ? 4 : 1)
                  }
                >
                  {speed}×
                </button>
              </>
            )}
            <div className="tac-view-options">
              <button
                aria-pressed={detailed}
                onClick={() => setDetailed(!detailed)}
              >
                <Eye size={13} />
                {detailed ? '详细' : '简洁'}
              </button>
              <button
                aria-pressed={reduced}
                onClick={() => setReduced(!reduced)}
              >
                减少动态
              </button>
            </div>
          </div>
          {(phase === 'build' || detailed) && (
            <div className="tac-live-strip" aria-live="off">
              {phase === 'build' ? (
                <span>查看敌方装备与增幅器，决定每一路的投入。</span>
              ) : (
                recentEvents.map((e) => (
                  <button key={e.id} onClick={() => seek(e.time)}>
                    <time>{e.time.toFixed(2)}s</time>
                    {e.text}
                  </button>
                ))
              )}
            </div>
          )}
        </section>
      </div>
      {counterNote && <p className="tac-counter-note">{counterNote}</p>}
      {currentMatch && phase !== 'build' && (
        <div ref={reviewRef} className="tac-review-container">
          <button
            className="tac-review-toggle"
            onClick={() => {
              setReviewOpen(!reviewOpen);
              if (!reviewOpen) {
                seek(result.duration);
                setPhase('result');
              }
            }}
          >
            {reviewOpen ? '收起整局复盘' : '查看整局复盘'}
            <span>关键事件 / 三路对照 / 装备运转 / 上局比较</span>
          </button>
          {reviewOpen && (
            <ArenaReview
              review={review}
              duel={duel}
              time={frame.time}
              onSeek={(time) => {
                seek(time);
                battleRef.current?.scrollIntoView({
                  block: 'start',
                  behavior: reduced ? 'auto' : 'smooth',
                });
              }}
              current={currentMatch}
              previous={previousMatch}
            />
          )}
        </div>
      )}
      {inspection && (
        <aside className="tac-inspector" aria-label="装备效果详情">
          <div className="tac-section-title">
            <span>
              {inspection.kind === 'card' && !inspection.uid
                ? '武装库 · 待布阵'
                : `${inspection.side ? '敌方' : '我方'} · ${LANES[Math.floor(inspection.at / 3)]}`}
            </span>
            <button onClick={closeInspection} aria-label="关闭效果详情">
              <X size={17} />
            </button>
          </div>
          <small className="tac-eyebrow">
            {inspectedCard ? 'EQUIPMENT / 装备' : 'AMPLIFIER / 增幅器'}
          </small>
          <h2>{inspectedCard?.name ?? inspectedAmp?.name}</h2>
          {flat && inspectedCard && (
            <div className="flat-detail-showcase">
              <CollectibleCard
                card={inspectFighter ?? sampleFighter(inspectedCard.id)}
                frame={inspectFighter && phase !== 'build' ? frame : undefined}
                side={inspection.side}
                duel={inspectFighter ? duel : undefined}
                mode="detail"
                reduced={reduced}
              />
            </div>
          )}
          <div className="tac-detail-meta">
            {inspectedCard ? (
              <>
                <span>
                  {(flat ? CARD_RARITIES : RARITIES)[inspectedCard.rarity]}
                </span>
                <span>{inspectedCard.size}格</span>
                <span>
                  {inspectedCard.cd ? `${inspectedCard.cd}秒周期` : '被动'}
                </span>
              </>
            ) : (
              <span>
                {(flat ? CARD_RARITIES : RARITIES)[inspectedAmp?.rarity ?? 0]}
              </span>
            )}
          </div>
          <p className="tac-effect-text">
            {inspectedCard?.text ?? inspectedAmp?.text}
          </p>
          {inspectFighter && (
            <>
              <div className="tac-state-list">
                {cardStatus(inspectFighter, frame).map((t) => (
                  <span key={t}>{t}</span>
                ))}
                {phase !== 'build' && (
                  <span>
                    已发动{' '}
                    {frame.cardState?.[inspectFighter.uid]?.activations ?? 0} 次
                  </span>
                )}
              </div>
              {relation?.note && (
                <p className="tac-detail-relation">{relation.note}</p>
              )}
              {phase === 'build' && inspection.side === 0 && (
                <div className="tac-detail-actions">
                  <button
                    onClick={() => {
                      setSelected({ id: inspection.id, uid: inspection.uid });
                      setInspection(null);
                      setNotice('点击新的空格移动；Escape 取消。');
                    }}
                  >
                    移动装备
                  </button>
                  <button
                    onClick={() => {
                      setPlayer((old) =>
                        old.filter((c) => c.uid !== inspection.uid),
                      );
                      setSnapshot(null);
                      setInspection(null);
                      setSelected(null);
                    }}
                  >
                    移回武装库
                  </button>
                </div>
              )}
            </>
          )}
          {inspectedAmp && (
            <p className="tac-detail-relation">
              当前：
              {amplifierStatus(
                duel,
                frame,
                inspection.side,
                Math.floor(inspection.at / 3),
              )}
            </p>
          )}
          <EffectHelp id={inspection.id} />
          {phase !== 'build' && (
            <>
              <h3>此刻之前的最近效果</h3>
              <div className="tac-inspector-events">
                {review.events
                  .filter(
                    (e) =>
                      e.time <= frame.time &&
                      (e.from === inspection.uid || e.to === inspection.uid),
                  )
                  .slice(-5)
                  .map((e) => (
                    <button key={e.id} onClick={() => seek(e.time)}>
                      {e.time.toFixed(2)}s · {e.text}
                    </button>
                  ))}
              </div>
              <footer>查看时暂停 · 关闭后恢复此前播放状态</footer>
            </>
          )}
        </aside>
      )}
      {ampLane !== null && (
        <AmplifierPicker
          lane={ampLane}
          rarityNames={flat ? CARD_RARITIES : RARITIES}
          current={playerAmps[ampLane]}
          onChoose={(id) => changeAmp(ampLane, id)}
          onClose={() => setAmpLane(null)}
        />
      )}
      {historyOpen && (
        <ArenaDialog
          title="对局档案"
          onClose={() => {
            setHistoryOpen(false);
            if (resume.current) setPlaying(true);
            resume.current = false;
          }}
          wide
        >
          <p>记录保存在当前浏览器，可导出备份。点击一场对局即可重建回放。</p>
          <div className="tac-history-list">
            {[...archive.matches].reverse().map((m, i) => (
              <button
                key={m.id}
                onClick={() => {
                  resume.current = false;
                  loadMatch(m);
                  setHistoryOpen(false);
                  setReviewOpen(true);
                }}
              >
                <small>#{archive.matches.length - i}</small>
                <span>
                  {m.duel.name}
                  <small>{new Date(m.createdAt).toLocaleString('zh-CN')}</small>
                </span>
                <b>
                  {m.summary.winner === 0
                    ? '胜'
                    : m.summary.winner === 1
                      ? '负'
                      : '平'}
                </b>
                <time>{m.summary.duration}s</time>
              </button>
            ))}
            {!archive.matches.length && (
              <p>完成第一场对局后，记录会出现在这里。</p>
            )}
          </div>
          <div className="arena-picker-actions">
            <button onClick={exportArchive}>
              <Download size={14} />
              导出记录
            </button>
            <button onClick={() => file.current?.click()}>
              <BookOpen size={14} />
              导入记录
            </button>
          </div>
        </ArenaDialog>
      )}
      <input
        ref={file}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => void importArchive(e.target.files?.[0])}
      />
      {notice && (
        <output className="arena-toast">
          {notice}
          <button onClick={() => setNotice('')} aria-label="关闭提示">
            <X size={15} />
          </button>
        </output>
      )}
    </main>
  );
}
