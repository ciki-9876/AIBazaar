'use client';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, Download, Pause, Play, RotateCcw, Search, Shield, Swords, X } from 'lucide-react';
import { AMPLIFIERS, ARENA_CARDS, arenaCard, amplifier } from '@/lib/arena-catalog';
import { appendMatch, ARENA_ARCHIVE_KEY, emptyArchive, parseArchive, summarizeMatch, type ArenaArchive, type ArenaMatch } from '@/lib/arena-archive';
import { chooseCounter, makeArenaDuel, OPENING_LINEUP, type ArenaLineup } from '@/lib/arena-challenge';
import { placeArenaCard, validateArenaBoard, type ArenaFrame } from '@/lib/arena-engine';
import { simulateDuel, type Duel, type FighterCard } from '@/lib/demo-combat';
import { cardDef } from '@/lib/demo-cards';
import { sitePath } from '@/lib/site-path';
import type { Anchor, BoardAnchors } from '@/app/art/slice/scene';
import './arena.css';

const Scene = lazy(() => import('@/app/art/slice/scene'));
const LANES = ['左路', '中路', '右路'];
const RARITIES = ['普通', '精良', '稀有', '史诗', '奇迹'];
const kinds: Record<string, string> = { damage: '直击', burn: '灼烧', corrode: '侵蚀', shield: '修屏', heal: '治疗', tempo: '节奏', control: '控制', passive: '布阵' };
type Phase = 'build' | 'fight' | 'result';
const emptyAmps = () => [null, null, null] as Array<string | null>;
const uid = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `match-${Date.now()}`;

export default function ArenaPage() {
  const [lineup, setLineup] = useState<ArenaLineup>(OPENING_LINEUP);
  const [player, setPlayer] = useState<FighterCard[]>([]);
  const [playerAmps, setPlayerAmps] = useState<Array<string | null>>(emptyAmps);
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('all');
  const [phase, setPhase] = useState<Phase>('build');
  const [snapshot, setSnapshot] = useState<Duel | null>(null);
  const [archive, setArchive] = useState<ArenaArchive>(emptyArchive);
  const [currentMatch, setCurrentMatch] = useState<ArenaMatch | null>(null);
  const [parentMatchId, setParentMatchId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [ready, setReady] = useState(false);
  const [anchors, setAnchors] = useState<Anchor[]>([]);
  const [board, setBoard] = useState<BoardAnchors>({ barriers: [], cores: [], lanes: [] });
  const [detail, setDetail] = useState<string | null>(null);
  const [counterNote, setCounterNote] = useState('');
  const clock = useRef(0);
  const file = useRef<HTMLInputElement>(null);
  const serial = useRef(0);
  const liveDuel = useMemo(() => makeArenaDuel(player, lineup, playerAmps), [player, lineup, playerAmps]);
  const duel = snapshot ?? liveDuel;
  const result = useMemo(() => simulateDuel(duel), [duel]);
  const frame = result.frames[Math.min(cursor, result.frames.length - 1)] as ArenaFrame;
  const filtered = ARENA_CARDS.filter((card) => (kind === 'all' || card.kind === kind) && (`${card.name}${card.text}`.includes(search.trim())));
  const onAnchors = useCallback((value: Anchor[]) => setAnchors(value), []);
  const onBoard = useCallback((value: BoardAnchors) => setBoard(value), []);
  const onReady = useCallback(() => setReady(true), []);

  useEffect(() => {
    const id = setTimeout(() => {
      try { const raw = localStorage.getItem(ARENA_ARCHIVE_KEY); if (raw) setArchive(parseArchive(raw)); }
      catch { setNotice('本机对局档案未能读取；仍可开始新对局并导出记录。'); }
    }, 0);
    return () => clearTimeout(id);
  }, []);
  useEffect(() => {
    if (!playing) return;
    let handle = 0;
    let previous = performance.now();
    const tick = (time: number) => {
      clock.current = Math.min(result.duration, clock.current + (time - previous) * speed / 1000);
      previous = time;
      setCursor(Math.min(result.frames.length - 1, Math.floor(clock.current * 4 + 1e-8)));
      if (clock.current < result.duration) handle = requestAnimationFrame(tick);
      else { setPlaying(false); setPhase('result'); }
    };
    handle = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
  }, [playing, result, speed]);
  useEffect(() => { if (!notice) return; const id = setTimeout(() => setNotice(''), 5000); return () => clearTimeout(id); }, [notice]);

  const chooseSlot = (at: number) => {
    if (phase !== 'build') return;
    const occupant = player.find((card) => card.at <= at && at < card.at + cardDef(card.id).size);
    if (occupant) { setPlayer((board) => board.filter((card) => card.uid !== occupant.uid)); setSnapshot(null); return; }
    if (!selected) { setNotice('先从左侧选择一张牌，再点击己方空格。'); return; }
    try {
      const next = placeArenaCard(player, selected, at, `player-${serial.current++}`);
      setPlayer(next); setSnapshot(null); setDetail(selected);
    } catch (error) { setNotice(error instanceof Error ? error.message : '放置失败'); }
  };
  const changeAmp = (lane: number, id: string | null) => { setPlayerAmps((old) => old.map((v, i) => i === lane ? id : v)); setSnapshot(null); };
  const save = (match: ArenaMatch) => {
    const next = appendMatch(archive, match);
    localStorage.setItem(ARENA_ARCHIVE_KEY, JSON.stringify(next));
    setArchive(next);
  };
  const start = () => {
    if (!player.length) { setNotice('至少放置一张牌后才能开战。'); return; }
    try {
      validateArenaBoard(player);
      const frozen = structuredClone(liveDuel);
      const computed = simulateDuel(frozen);
      const match = summarizeMatch(uid(), lineup.id, parentMatchId, frozen, computed);
      save(match);
      setCurrentMatch(match); setSnapshot(frozen); setCursor(0); clock.current = 0; setPhase('fight'); setPlaying(true);
      setNotice(`对局 #${archive.matches.length + 1} 已记录在本机。`);
    } catch (error) { setNotice(error instanceof Error ? error.message : '对局未能开始'); }
  };
  const resetReplay = () => { clock.current = 0; setCursor(0); setPhase('fight'); setPlaying(true); };
  const counter = () => {
    if (!currentMatch || currentMatch.summary.winner !== 0) return;
    try {
      const answer = chooseCounter(currentMatch.duel.player, currentMatch.duel.arena!.amplifiers[0], lineup.id);
      setLineup(answer.lineup);
      setPlayer(structuredClone(currentMatch.duel.player));
      setPlayerAmps([...currentMatch.duel.arena!.amplifiers[0]]);
      setParentMatchId(currentMatch.id);
      setCurrentMatch(null); setSnapshot(null); setPhase('build'); setPlaying(false); setCursor(0); clock.current = 0;
      setCounterNote(`${answer.tested} 套候选阵容完成确定性对照；${answer.counterFound ? '找到了能取胜的应对' : '尚未找到能取胜的应对，已选表现最好的阵容'}。这是规则搜索，不代表语言模型已经看过并学习该局。`);
    } catch (error) { setNotice(error instanceof Error ? error.message : '调整失败'); }
  };
  const exportArchive = () => {
    const blob = new Blob([JSON.stringify(archive, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `f9-arena-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const importArchive = async (f: File | undefined) => {
    if (!f) return;
    try {
      const incoming = parseArchive(await f.text());
      const merged = { version: 1 as const, matches: [...archive.matches] };
      for (const match of incoming.matches) if (!merged.matches.some((x) => x.id === match.id)) merged.matches.push(match);
      localStorage.setItem(ARENA_ARCHIVE_KEY, JSON.stringify(merged)); setArchive(merged);
      setNotice(`已合并 ${merged.matches.length - archive.matches.length} 场对局。`);
    } catch (error) { setNotice(error instanceof Error ? error.message : '导入失败'); }
    if (file.current) file.current.value = '';
  };
  const loadMatch = (match: ArenaMatch) => {
    const old = match.duel;
    setPlayer(structuredClone(old.player)); setPlayerAmps([...old.arena!.amplifiers[0]]);
    setLineup({ id: match.challengeId, title: old.name, thesis: '历史对局阵容', cards: structuredClone(old.enemy), amps: [...old.arena!.amplifiers[1]] });
    setCurrentMatch(match); setSnapshot(structuredClone(old)); setParentMatchId(match.parentMatchId);
    setPhase('result'); setPlaying(false); const res = simulateDuel(old); setCursor(res.frames.length - 1); clock.current = res.duration;
  };
  const viewed = arenaCard(detail ?? selected ?? '');
  return <main className="arena-page">
    <header className="arena-header">
      <div className="arena-brand"><a href={sitePath('/art/chamber')} aria-label="返回美术原型"><ArrowLeft size={17} /></a><span className="arena-mark">F9 <i>/</i> TACTICAL LAB</span><span className="arena-version">对战博弈模拟 · 实验规则 v0</span></div>
      <div className="arena-header-right"><span className="arena-live"><i /> 本地确定性模拟</span><button onClick={exportArchive}><Download size={15} />导出对局</button></div>
    </header>
    <div className="arena-layout">
      <aside className="arena-catalog">
        <div className="arena-panel-title"><span>01 / 武装库</span><strong>{ARENA_CARDS.length} 张实验牌</strong></div>
        <label className="arena-search"><Search size={16} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索卡牌或效果" /></label>
        <div className="arena-filters">{['all', ...Object.keys(kinds)].map((key) => <button key={key} className={kind === key ? 'active' : ''} onClick={() => setKind(key)}>{key === 'all' ? '全部' : kinds[key]}</button>)}</div>
        <div className="arena-card-list">{filtered.map((card) => <button key={card.id} className={`arena-card rarity-${card.rarity} ${selected === card.id ? 'selected' : ''}`} onClick={() => { setSelected(card.id); setDetail(card.id); }} aria-pressed={selected === card.id}>
          <span className="arena-card-glyph">{String(card.number).padStart(2, '0')}</span><span className="arena-card-copy"><strong>{card.name}</strong><small>{kinds[card.kind]} · {card.cd ? `${card.cd} 秒` : '被动'}</small></span><span className="arena-card-tail"><b>{card.size}格</b><small>{RARITIES[card.rarity]}</small></span>
        </button>)}</div>
      </aside>
      <section className="arena-main">
        <div className="arena-stage">
          <Suspense fallback={<div className="arena-stage-loading">战术室正在点亮…</div>}><Scene duel={duel} frame={frame} frames={result.frames} clock={clock} reduced={false} chamber={{ view: 'table', opened: true, taken: true, cleared: false }} materialStyle="tactile" onAnchors={onAnchors} onBoardAnchors={onBoard} onReady={onReady} /></Suspense>
          <div className="arena-stage-shade" />
          <div className="arena-stage-top"><div><small>模拟对手 / {lineup.id.toUpperCase()}</small><strong>{lineup.title}</strong><p>{lineup.thesis}</p></div><span>宿主 {Math.round(frame.hp[1])} / {duel.maxHp[1]}</span></div>
          {ready && <div className="arena-scene-labels">{[0, 1].flatMap((side) => (side ? duel.enemy : duel.player).map((card) => {
            const a = anchors[side * 9 + card.at], b = anchors[side * 9 + card.at + cardDef(card.id).size - 1];
            if (!a || !b) return null;
            return <div key={card.uid} className={`arena-scene-card ${side ? 'enemy' : 'own'}`} style={{ left: (a.x + b.x) / 2, top: Math.min(a.y, b.y) - 22 }}><span>{cardDef(card.id).name}</span><small>{frame.cd[side][card.at] ? `${Math.max(0, frame.cd[side][card.at] - frame.timers[side][card.at]).toFixed(1)}s` : '被动'}</small></div>;
          }))}{board.barriers.map((a, index) => { const side = Math.floor(index / 3), lane = index % 3, b = frame.barriers[side][lane]; return <div key={index} className={`arena-scene-shield ${side ? 'enemy' : 'own'} ${b.broken ? 'broken' : ''}`} style={{ left: a.x, top: a.y }}><Shield size={12} />{b.broken ? '破屏' : `${Math.round(b.hp)}/${Math.round(b.maxHp)}`}</div>; })}</div>}
          <div className="arena-stage-bottom"><span>己方宿主 <b>{Math.round(frame.hp[0])} / {duel.maxHp[0]}</b></span><span>{LANES.map((lane, i) => `${lane} ${frame.barriers[0][i].broken ? '破屏' : Math.round(frame.barriers[0][i].hp)}`).join('  /  ')}</span></div>
        </div>
        <div className="arena-workbench">
          <div className="arena-workbench-heading"><div><small>02 / 布阵台</small><h1>{phase === 'build' ? '选择牌，再点击己方空格' : '战斗记录'}</h1></div><span>9 格全开放 · 同名至多 2 张 · 每路独立增幅器</span></div>
          <div className="arena-enemy-brief">{LANES.map((lane, l) => <div key={lane}><small>敌方{lane} · {amplifier(lineup.amps[l])?.name ?? '无增幅器'}</small><span>{lineup.cards.filter((card) => Math.floor(card.at / 3) === l).map((card) => cardDef(card.id).name).join(' + ') || '空路'}</span></div>)}</div>
          {viewed && <div className="arena-selected-brief"><strong>{viewed.name}</strong><span>{viewed.text}</span><small>{RARITIES[viewed.rarity]} · {viewed.size} 格 · {viewed.cd ? `${viewed.cd} 秒周期` : '被动'}</small></div>}
          <div className="arena-lane-rows">{LANES.map((lane, l) => <div key={lane} className="arena-lane-row"><div className="arena-lane-id"><small>0{l + 1}</small><strong>{lane}</strong></div><div className="arena-lane-slots">{[0, 1, 2].map((col) => { const at = l * 3 + col, card = player.find((x) => x.at <= at && at < x.at + cardDef(x.id).size); return <button key={at} className={`arena-slot ${card ? 'occupied' : ''} ${card?.at === at ? 'start' : ''}`} onClick={() => chooseSlot(at)} disabled={phase !== 'build'} title={card ? `${cardDef(card.id).name} · 点击移除` : `放在${lane}第${col + 1}格`}>{card ? card.at === at ? <><strong>{cardDef(card.id).name}</strong><small>{cardDef(card.id).size}格 · 点击移除</small></> : <span className="arena-slot-cont">╴延伸╶</span> : <><span>+</span><small>{col + 1}</small></>}</button>; })}</div><label className="arena-amp-select"><small>屏障增幅器</small><select value={playerAmps[l] ?? ''} onChange={(e) => changeAmp(l, e.target.value || null)} disabled={phase !== 'build'}><option value="">不装备</option>{AMPLIFIERS.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label></div>)}</div>
          {playerAmps.some(Boolean) && <div className="arena-amp-summary">{playerAmps.map((id, lane) => id && <p key={lane}><b>{LANES[lane]} · {amplifier(id)?.name}</b>{amplifier(id)?.text}</p>)}</div>}
          <div className="arena-actions">{phase === 'build' ? <button className="arena-primary" onClick={start}><Swords size={17} />开始对战并记录</button> : <><button onClick={() => { if (cursor >= result.frames.length - 1) { clock.current = 0; setCursor(0); } setPlaying(!playing); if (phase === 'result') setPhase('fight'); }}><span>{playing ? <Pause size={16} /> : <Play size={16} />}</span>{playing ? '暂停' : '播放'}</button><button onClick={resetReplay}><RotateCcw size={16} />重播</button><label className="arena-timeline"><input type="range" min={0} max={result.frames.length - 1} value={cursor} onChange={(e) => { const next = Number(e.target.value); setCursor(next); clock.current = next / 4; setPlaying(false); setPhase(next === result.frames.length - 1 ? 'result' : 'fight'); }} /><span>{frame.time.toFixed(1)} / {result.duration.toFixed(1)}s</span></label><button onClick={() => setSpeed(speed === 1 ? 2 : speed === 2 ? 4 : 1)}>{speed}×</button></>}{phase !== 'build' && <button className="arena-secondary" onClick={() => { setParentMatchId(currentMatch?.id ?? parentMatchId); setPhase('build'); setSnapshot(null); setPlaying(false); setCurrentMatch(null); setCursor(0); clock.current = 0; }}>调整己方阵容</button>}</div>
          {phase === 'result' && currentMatch && <div className="arena-result"><strong>{currentMatch.summary.winner === 0 ? '你赢了' : currentMatch.summary.winner === 1 ? '对手取胜' : '限时平局'}</strong><span>己方 {Math.round(frame.hp[0])} HP · 对手 {Math.round(frame.hp[1])} HP · {result.duration.toFixed(1)} 秒</span>{currentMatch.summary.winner === 0 && <button onClick={counter}>申请调整对手阵容 →</button>}</div>}
          {phase === 'result' && currentMatch && <div className="arena-postmortem">
            <div><small>宿主承伤</small><strong>我方 {Math.round(currentMatch.summary.damageToHost[0])} / 对手 {Math.round(currentMatch.summary.damageToHost[1])}</strong></div>
            <div><small>屏障承伤</small><strong>我方 {Math.round(currentMatch.summary.damageToBarrier[0])} / 对手 {Math.round(currentMatch.summary.damageToBarrier[1])}</strong></div>
            <div><small>对手首度破屏</small><strong>{LANES.map((lane, i) => `${lane} ${currentMatch.summary.brokenAt[1][i] === null ? '未破' : `${currentMatch.summary.brokenAt[1][i]}s`}`).join(' · ')}</strong></div>
          </div>}
          {counterNote && <p className="arena-counter-note">{counterNote}</p>}
        </div>
      </section>
      <aside className="arena-intel">
        <section className="arena-intel-block"><div className="arena-panel-title"><span>03 / 战术情报</span></div><h2>{viewed ? viewed.name : lineup.title}</h2><p>{viewed ? viewed.text : lineup.thesis}</p>{viewed ? <div className="arena-detail-meta"><span>{RARITIES[viewed.rarity]}</span><span>{viewed.size} 格</span><span>{viewed.cd ? `${viewed.cd}s 周期` : '被动'}</span></div> : null}</section>
        <section className="arena-intel-block"><div className="arena-panel-title"><span>对手阵容</span><strong>{lineup.cards.length} 件</strong></div>{LANES.map((lane, l) => <div key={lane} className="arena-opponent-lane"><small>{lane} · {amplifier(lineup.amps[l])?.name ?? '无增幅器'}</small><div>{lineup.cards.filter((c) => Math.floor(c.at / 3) === l).map((c) => <span key={c.uid}>{cardDef(c.id).name} <i>{cardDef(c.id).size}格</i></span>)}</div></div>)}</section>
        <section className="arena-intel-block arena-history"><div className="arena-panel-title"><span>04 / 对局档案</span><strong>{archive.matches.length} 场</strong></div><p>每场保存完整布阵、增幅器、规则版本、胜负、伤害及破屏时间。点击可复现回放。</p><div className="arena-history-list">{[...archive.matches].reverse().slice(0, 20).map((match) => <button key={match.id} onClick={() => loadMatch(match)}><span>{match.duel.name}<small>{new Date(match.createdAt).toLocaleString('zh-CN')}</small></span><b>{match.summary.winner === 0 ? '胜' : match.summary.winner === 1 ? '负' : '平'}</b></button>)}</div><div className="arena-archive-actions"><button onClick={exportArchive}><Download size={15} /> 导出 JSON</button><button onClick={() => file.current?.click()}><BookOpen size={15} /> 导入 JSON</button><input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => void importArchive(e.target.files?.[0])} /></div></section>
        <div className="arena-note">实验牌的数值与规则仍在校准。美术物件为已完成原型资产的暂用映射；结算只依赖规则数据。</div>
      </aside>
    </div>
    {notice && <output className="arena-toast">{notice}<button onClick={() => setNotice('')} aria-label="关闭提示"><X size={15} /></button></output>}
  </main>;
}
