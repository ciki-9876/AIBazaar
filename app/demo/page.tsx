'use client';
import { sitePath } from '@/lib/site-path';
import { rarityOf, growthCost } from '@/lib/demo-card-rules';
import { refineIngredient } from '@/lib/demo-engine';
/* oxlint-disable react/react-compiler -- Event handlers read the authoritative run ref; mount effects restore explicitly local browser state. */
/* oxlint-disable next/no-html-link-for-pages -- Static Sites hosting needs native anchors; RSC-prefetch navigation is unsupported. */
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import BattleEffects from './battle-effects';
import LootScene from './loot-scene';
import FocusGuide, { ContextHint, type GuideStep } from './focus-guide';
import TutorialFloor, { CostIcons } from './tutorial-floor';
import { tutorialFloor } from '@/lib/demo-engine';
import CardFace from './card-face';
import CardDetail from './card-detail';
import CargoGrid, { CargoProvider, CarryButton } from './cargo-grid';
import CostButton from './cost-button';
import ElevatorRoom from './elevator-room';
import IdentifyTable from './identify-table';
import { floorRoute } from '@/lib/demo-content';
import FieldWork, { ObjectInfo } from './field-work';
import Onboarding from './onboarding';
import { isFieldNode, OBJECTS, FIELD_TITLES } from '@/lib/field-items';
import BuildBoard from './build-board';
import IdentificationReveal from './identification-reveal';
import Homecoming from './homecoming';
import { describeCard } from '@/lib/card-description';
import { identificationState, makeDuel, makeItem } from '@/lib/demo-engine';
import { battleEvidence, formatHit } from '@/lib/battle-evidence';
import ScrollChrome from './scroll-chrome';
import {
  Sparkles,
  Coins,
  Settings,
  X,
  ArrowUp,
  ArrowRight,
  Heart,
  Zap,
  Backpack,
  Shield,
  BedDouble,
  Wrench,
  Radio,
  Trophy,
  Play,
  Pause,
  RotateCcw,
  Download,
  Upload,
  BookOpen,
  DoorOpen,
  Search,
  Leaf,
  KeyRound,
  Store,
  Check,
  ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  newRun,
  act,
  validSave,
  SAVE_KEY,
  RARITY,
  QUALITY,
  FACILITY,
  itemName,
  volume,
  bagCap,
  moduleUsed,
  currentFloor,
  currentNode,
  nodeName,
  itemCount,
  openCells,
  searchCost,
  travelCost,
  eventAt,
  nodeTitle,
  merchantOffers,
  offerPrice,
  sellPrice,
  rescueCost,
  cargoShape,
  migrateCargo,
  checkpoint,
  unlockedItem,
  FACILITY_LEVEL,
  LEVEL_GUIDE,
  puzzle,
  playerCards,
  ranking,
  upgradeCost,
} from '@/lib/demo-engine';
import type { Run, Action, Zone, Item } from '@/lib/demo-engine';
import { simulateDuel } from '@/lib/demo-combat';
import type { FighterCard, CombatFrame } from '@/lib/demo-combat';
import { cardDef, ALL_CARDS, CARDS, SCHOOLS } from '@/lib/demo-cards';
import './demo.css';
const zoneName: Record<Zone, string> = {
  bag: '随身背包',
  safe: '安全容器',
  warehouse: '基地仓库',
  board: '上阵卡组',
};
const phaseName: Record<string, string> = {
  intro: '等待接入',
  base: '电梯基地',
  floor: '楼层探索',
  combat: '自动战斗',
  ended: '协议结算',
};
export default function Demo() {
  const battlefieldRef = useRef<HTMLDivElement>(null);
  const [run, setRun] = useState<Run>(() => newRun(10909, true)),
    ref = useRef(run);
  const [ready, setReady] = useState(false),
    [saved, setSaved] = useState('正在读取本机存档'),
    [notice, setNotice] = useState(''),
    [tab, setTab] = useState('base'),
    [selected, setSelected] = useState<string | null>(null),
    [placing, setPlacing] = useState<string | null>(null),
    [refineUid, setRefineUid] = useState<string | null>(null),
    [pinned, setPinned] = useState(false),
    [inventoryTab, setInventoryTab] = useState('build'),
    [catalogId, setCatalogId] = useState(ALL_CARDS[0].id),
    [catalogOwner, setCatalogOwner] = useState('all'),
    [scanUid, setScanUid] = useState<string | undefined>(),
    [inspection, setInspection] = useState<{
      uid: string;
      source: string;
      scope: string;
      x: number;
      y: number;
    } | null>(null),
    [settings, setSettings] = useState(false),
    [sleepPrompt, setSleepPrompt] = useState(false),
    [sleeping, setSleeping] = useState(false),
    [news, setNews] = useState(false),
    [help, setHelp] = useState(false),
    [reset, setReset] = useState(false);
  const [cursor, setCursor] = useState(0),
    [playing, setPlaying] = useState(true),
    [speed, setSpeed] = useState(1);
  const [bagOpen, setBagOpen] = useState(false);
  const bagReturnTab = useRef('floor');
  const baseInspect = tab === 'inventory' || bagOpen;
  const fileRef = useRef<HTMLInputElement>(null);
  const storageKey = useRef(SAVE_KEY);
  useEffect(() => {
    if (!sleeping) return;
    const t = setTimeout(() => {
      setSleeping(false);
      setNews(true);
    }, 2200);
    return () => clearTimeout(t);
  }, [sleeping]);
  const hoverClose = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keepInspection = () => {
    if (hoverClose.current) clearTimeout(hoverClose.current);
  };
  const hideInspection = () => {
    if (baseInspect || pinned) return;
    keepInspection();
    hoverClose.current = setTimeout(() => setInspection(null), 220);
  };
  const showInspection = (
    uid: string,
    source: string,
    target: HTMLElement,
    clicked = false,
  ) => {
    if (pinned && !clicked) return;
    if (baseInspect && !clicked) return;
    keepInspection();
    setPinned(clicked);
    const rect = target.getBoundingClientRect();
    const width = Math.min(360, window.innerWidth - 24);
    const x =
      rect.right + 8 + width <= window.innerWidth
        ? rect.right + 8
        : Math.max(12, rect.left - width - 8);
    setInspection({
      uid,
      source,
      scope: `${run.phase}:${tab}:${inventoryTab}`,
      x,
      y: Math.max(12, Math.min(rect.top, window.innerHeight - 440)),
    });
  };
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setInspection(null);
        setPinned(false);
      }
    };
    window.addEventListener('keydown', close);
    return () => {
      window.removeEventListener('keydown', close);
      if (hoverClose.current) clearTimeout(hoverClose.current);
    };
  }, []);

  const commit = useCallback((next: Run) => {
    next = migrateCargo(next);
    ref.current = next;
    setRun(next);
    setNotice(next.notice);
  }, []);
  const dispatch = useCallback(
    (a: Action) => {
      if (sleeping) return null;
      try {
        const next = act(ref.current, a);
        commit(next);
        if ((a.type === 'pickup' || a.type === 'trade') && a.id)
          setSelected(a.id);
        if (a.type === 'enter') {
          setTab('floor');
          setInventoryTab('build');
        }
        if (a.type === 'begin') setTab('base');
        if (a.type === 'extract' || a.type === 'rescue' || a.type === 'sleep')
          setTab('base');
        if (a.type === 'resolve')
          setTab(next.phase === 'base' ? 'base' : 'floor');
        if (a.type === 'fight') {
          setCursor(0);
          setPlaying(true);
        }
        return next;
      } catch (e) {
        setNotice(e instanceof Error ? e.message : '操作失败');
        return null;
      }
    },
    [commit, sleeping],
  );
  // oxlint-disable-next-line react/react-compiler -- Restore explicitly device-local game state after hydration.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const qa =
        process.env.NODE_ENV === 'development' &&
        [
          'phase1',
          'items',
          'arrival',
          'first-floor',
          'onboarding6',
          'onboarding6-narrow',
          'onboarding8',
          'onboarding8-narrow',
        ].includes(params.get('qa') ?? '');
      const work =
        qa && params.get('qa') === 'items' ? params.get('work') : null;
      storageKey.current = qa
        ? SAVE_KEY + '.qa.' + params.get('qa') + (work ? '.' + work : '')
        : SAVE_KEY;
      const raw = localStorage.getItem(storageKey.current);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (validSave(parsed)) {
          if (
            parsed.catalogVersion !== 2 &&
            !localStorage.getItem(storageKey.current + '.pre-catalog12')
          )
            localStorage.setItem(storageKey.current + '.pre-catalog12', raw);
          commit(parsed);
          setTab(parsed.phase === 'floor' ? 'floor' : 'base');
        } else
          setNotice('存档格式无法识别，已保留原文件。可以导入备份或重新开局。');
      } else {
        let fresh = newRun(
          qa ? 10909 : crypto.getRandomValues(new Uint32Array(1))[0],
          !work,
        );
        if (work && isFieldNode(work)) {
          fresh = act(act(fresh, { type: 'begin' }), {
            type: 'enter',
            floor: 1,
          });
          currentFloor(fresh).nodes = [work, 'patrol', 'guardian'];
          for (const [id, obj] of Object.entries(OBJECTS))
            if (obj.node === work)
              fresh.items.push(makeItem('qa-' + id, id, 'physical'));
          setTab('floor');
        }
        commit(fresh);
      }
    } catch {
      setSaved('本机存档不可用，请导出备份');
    }
    setReady(true);
  }, [commit]);
  // oxlint-disable-next-line react/react-compiler -- Persist this device-local run and report storage failures.
  useEffect(() => {
    if (!ready || run.phase === 'intro') return;
    try {
      localStorage.setItem(storageKey.current, JSON.stringify(run));
      setSaved('本机自动保存');
    } catch {
      setSaved('保存失败 · 请立即导出备份');
    }
  }, [run, ready]);
  const battle = useMemo(
    () => (run.duel ? simulateDuel(run.duel) : null),
    [run.duel],
  );
  const tutorialBattle =
    tutorialFloor(run) &&
    run.phase === 'combat' &&
    currentNode(run) === 'patrol';
  const lessonStep = run.tutorialBattleStep ?? 0;
  const firstFire = Math.max(
    0,
    battle?.frames.findIndex((fr) =>
      fr.fired.includes(
        run.openingVersion === 2 ? 'starter-slingshot' : 'starter-gapblade',
      ),
    ) ?? 0,
  );
  const firstImpact = Math.max(
    firstFire,
    battle?.frames.findIndex((fr) =>
      fr.hits.some(
        (h) =>
          h.sourceUid ===
            (run.openingVersion === 2
              ? 'starter-slingshot'
              : 'starter-gapblade') && h.kind === 'damage',
      ),
    ) ?? 0,
  );
  const lessonActive =
    tutorialBattle &&
    lessonStep < 8 &&
    !bagOpen &&
    cursor >=
      [
        0,
        0,
        0,
        0,
        0,
        run.openingVersion === 2 ? firstFire + 2 : firstFire,
        firstImpact,
        firstImpact,
      ][lessonStep];
  const starterId =
    run.openingVersion === 2 ? 'starter-slingshot' : 'starter-gapblade';
  const starterName = run.openingVersion === 2 ? '弹弓' : '猎隙刃';
  const lessons: GuideStep[] = [
    {
      target: '.ed-vertical-battle',
      title: '先看整个棋盘',
      body: '棋盘从左到右分为左路、中路、右路。你的卡牌在下方，敌人在上方；同路彼此对战。',
    },
    {
      target: '[data-entity="host-0"] .ed-actor-info b',
      title: '这是你的生命',
      body: '这是你的宿主。生命降到 0 就会战败，屏障与防御卡可以保护它。',
    },
    {
      target: '[data-entity="host-1"] .ed-actor-info b',
      title: '这是敌人的生命',
      body: '把敌方宿主的生命降到 0，就能获得胜利。',
    },
    {
      target: '[data-entity="barrier-0-2"]',
      title: '每条路都有自己的屏障',
      body: '屏障先承受对应路线的攻击。屏障破裂后，这条路的攻击会直接伤到宿主。',
    },
    {
      target: `[data-entity="${starterId}"]`,
      title: `${starterName}会自己发动`,
      body: `进度走满，武器就会自动发动。${starterName}每3秒攻击一次；卡牌本身不会被打掉。`,
      next: '观察第一次出手',
    },
    {
      target:
        run.openingVersion === 2 ? '.ed-shot' : `[data-entity="${starterId}"]`,
      title: run.openingVersion === 2 ? '弹丸已经发射' : '即时命中',
      body:
        run.openingVersion === 2
          ? '弹弓属于弹道武器。弹丸需要飞到对面才结算伤害；冷兵器等即时武器会在发动时直接命中。'
          : '猎隙刃属于即时武器，发动时直接结算伤害，不需要等待弹道飞行。',
      next: '观察命中',
    },
    {
      target: '[data-entity="barrier-1-2"]',
      title: '敌方右路屏障被击破',
      body: '攻击先打屏障，超过屏障剩余生命的伤害会直接溢出到宿主。现在右路屏障已破，后续右路攻击将直接命中宿主。',
    },
    {
      target: '[data-entity="host-1"] .ed-actor-info b',
      title: '击败敌方宿主',
      body: '敌方宿主的生命已经减少。等敌方宿主生命归0即可获得胜利。',
      next: '继续战斗',
    },
  ];
  useEffect(() => {
    if (
      !battle ||
      !playing ||
      bagOpen ||
      lessonActive ||
      cursor >= battle.frames.length - 1
    )
      return;
    const timer = setTimeout(() => setCursor((c) => c + 1), 250 / speed);
    return () => clearTimeout(timer);
  }, [battle, playing, cursor, speed, lessonActive, bagOpen]);
  const frame = battle?.frames[Math.min(cursor, battle.frames.length - 1)];
  const previewDuel =
    run.phase === 'floor' &&
    ['patrol', 'elite', 'guardian', 'antechamber'].includes(currentNode(run))
      ? makeDuel(
          run,
          currentNode(run) === 'guardian' &&
            run.encounter !== null &&
            !run.encounterDone
            ? 'survivor'
            : 'guardian',
        )
      : null;
  const goBuild = (uid?: string) => {
    if (!bagOpen) bagReturnTab.current = tab;
    setBagOpen(true);
    uid ??= run.items.find(
      (x) => x.uid === run.tutorialRewardUid && x.zone !== 'board',
    )?.uid;
    setTab('inventory');
    setInventoryTab('build');
    setPlacing(uid ?? null);
    if (uid) setSelected(uid);
    setPinned(false);
    setInspection(null);
  };
  const closeBag = () => {
    if (
      tutorialFloor(run) &&
      run.tutorialRewardUid &&
      !run.items.some(
        (x) => x.uid === run.tutorialRewardUid && x.zone === 'board',
      )
    ) {
      setNotice('先把战利品拖到棋盘上。');
      return;
    }
    setBagOpen(false);
    if (
      !run.equipmentExplained &&
      run.items.some(
        (x) => x.uid === run.tutorialRewardUid && x.zone === 'board',
      )
    )
      dispatch({ type: 'equipment-explained' });
    setTab(bagReturnTab.current);
    setInspection(null);
    setPinned(false);
  };
  const f = currentFloor(run);
  const resetRun = () => {
    setBagOpen(false);
    commit(newRun(crypto.getRandomValues(new Uint32Array(1))[0], true));
    try {
      localStorage.removeItem(storageKey.current);
    } catch {}
    setTab('base');
    setSelected(null);
    setReset(false);
  };
  function exportRun() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(run, null, 2)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `f9-demo1-day${run.day}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  async function importRun(file?: File) {
    if (!file) return;
    try {
      if (file.size > 2000000) throw Error('存档文件过大');
      const value: unknown = JSON.parse(await file.text());
      if (!validSave(value)) throw Error('存档不兼容或内容损坏');
      if (value.catalogVersion !== 2)
        localStorage.setItem(
          storageKey.current + '.pre-catalog12.import',
          JSON.stringify(value),
        );
      commit(value);
      setTab(value.phase === 'floor' ? 'floor' : 'base');
      setCursor(0);
      setPlaying(true);
      setSelected(null);
      setNotice('已恢复导入的本机存档。');
    } catch (e) {
      setNotice(e instanceof Error ? e.message : '导入失败');
    }
    if (fileRef.current) fileRef.current.value = '';
  }
  function cardGrid(cards: FighterCard[], enemy = false, fr?: CombatFrame) {
    const locked = enemy
      ? []
      : Array.from({ length: 9 }, (_, i) => i).filter(
          (i) => !openCells(run).includes(i),
        );
    return (
      <div className={'ed-board ' + (enemy ? 'enemy' : '')}>
        {[0, 1, 2].map((lane) => (
          <div className="ed-lane" key={lane}>
            <div className="ed-lane-label">
              <b>{['左路', '中路', '右路'][lane]}</b>
            </div>
            <div className="ed-lane-cells">
              {[0, 1, 2].map((col) => {
                const at = lane * 3 + col;
                const card = cards.find((x) => x.at === at);
                if (
                  cards.some((x) => x.at < at && x.at + cardDef(x.id).size > at)
                )
                  return null;
                if (!card)
                  return (
                    <button
                      key={at}
                      style={{ gridColumn: col + 1 }}
                      className={
                        'ed-slot ' + (locked.includes(at) ? 'locked' : '')
                      }
                      disabled={!!fr || enemy || locked.includes(at)}
                      onClick={() =>
                        setNotice(
                          '在卡牌详情中点击“上阵”，系统会自动选择合适空位。',
                        )
                      }
                      aria-label={`${['左', '中', '右'][lane]}路第${col + 1}格${locked.includes(at) ? '未解锁' : '，放置所选卡牌'}`}
                    >
                      {locked.includes(at) ? (
                        <KeyRound size={15} />
                      ) : (
                        <span>
                          ＋<small>{at + 1}</small>
                        </span>
                      )}
                    </button>
                  );
                const c = cardDef(card.id),
                  side = enemy ? 1 : 0;
                return (
                  <button
                    key={card.uid}
                    data-entity={card.uid}
                    className={
                      'ed-card ed-card-v2 quality-' +
                      card.quality +
                      ' rarity-' +
                      card.rarity +
                      (selected === card.uid ? ' selected' : '') +
                      (fr?.fired.includes(card.uid) ? ' firing' : '') +
                      (fr?.hits.some((hit) => hit.targetUid === card.uid)
                        ? ' struck'
                        : '')
                    }
                    style={{ gridColumn: `${col + 1} / span ${c.size}` }}
                    onMouseEnter={(e) =>
                      showInspection(
                        card.uid,
                        enemy ? 'enemy' : 'inventory',
                        e.currentTarget,
                      )
                    }
                    onMouseLeave={hideInspection}
                    onFocus={(e) =>
                      showInspection(
                        card.uid,
                        enemy ? 'enemy' : 'inventory',
                        e.currentTarget,
                      )
                    }
                    onBlur={hideInspection}
                    onClick={(e) => {
                      if (enemy) {
                        showInspection(
                          card.uid,
                          'enemy',
                          e.currentTarget,
                          true,
                        );
                        return;
                      }
                      const item = run.items.find((x) => x.uid === card.uid);
                      if (!enemy && item)
                        selectItem(item, 'board', e.currentTarget);
                    }}
                    aria-label={`查看${c.name}，${RARITY[card.rarity].name}，${QUALITY[card.quality]}，强化${card.level}`}
                  >
                    <CardFace
                      card={card}
                      stored={fr?.stored?.[card.uid] ?? 0}
                      enemy={enemy}
                      progress={
                        fr
                          ? fr.timers[side][card.at] /
                            (fr.cd[side][card.at] || 1)
                          : 0
                      }
                      waiting={!!fr?.waiting.includes(card.uid)}
                      cooldown={fr?.cd[side][card.at]}
                      playing={
                        !!fr &&
                        playing &&
                        !lessonActive &&
                        cursor < (battle?.frames.length ?? 0) - 1
                      }
                      speed={speed}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }
  function actor(side: number, fr: CombatFrame) {
    return (
      <div
        data-entity={`host-${side}`}
        className={'ed-actor ' + (side ? 'enemy' : '')}
      >
        <div className="ed-host-hitboxes" aria-label="宿主三路受击区域">
          {[0, 1, 2].map((lane) => (
            <span key={lane} data-entity={`host-${side}-lane-${lane}`}>
              {['左路', '中路', '右路'][lane]}
            </span>
          ))}
        </div>
        <div className="ed-avatar">
          <span>{side ? '◈' : '◉'}</span>
          <small>{side ? 'SUBJECT' : 'YOU'}</small>
        </div>
        <div className="ed-actor-info">
          <div>
            <strong>{side ? run.duel!.name : '幸存者 #000 · 你'}</strong>
            <b>
              {Math.ceil(fr.hp[side])}
              <small> / {run.duel!.maxHp[side]}</small>
            </b>
          </div>
          <Progress
            value={(fr.hp[side] / run.duel!.maxHp[side]) * 100}
            aria-label={`${side ? '敌方' : '我方'}生命`}
            className="ed-hp"
          />
        </div>
        <div className="ed-floats" aria-hidden="true">
          {(
            battle?.frames
              .slice(Math.max(0, cursor - 6), cursor + 1)
              .flatMap((snapshot) =>
                snapshot.hits.map((hit, index) => ({
                  ...hit,
                  stamp: snapshot.time,
                  index,
                })),
              ) ?? []
          )
            .filter(
              (x) =>
                x.side === side &&
                x.kind !== 'charge' &&
                (x.kind !== 'damage' || (x.healthLoss ?? 0) > 0),
            )
            .map((hit) => (
              <span
                key={`${hit.stamp}-${hit.index}`}
                className={'ed-float ' + hit.kind}
                style={{
                  left: `${18 + ((hit.stamp * 68 + hit.index * 29) % 65)}%`,
                  top: `${15 + ((hit.stamp * 44 + hit.index * 23) % 48)}%`,
                }}
              >
                {hit.kind === 'damage' ? '−' : '+'}
                {Math.round((hit.healthLoss ?? hit.value) * 10) / 10}
                <small>
                  {hit.kind === 'shield'
                    ? '盾'
                    : hit.kind === 'energy'
                      ? '能'
                      : hit.kind === 'heal'
                        ? '治疗'
                        : hit.kind === 'damage' && hit.healthLoss === 0
                          ? '盾吸收'
                          : ''}
                </small>
              </span>
            ))}
        </div>
      </div>
    );
  }
  function grid(zone: Zone) {
    const shape = cargoShape(run, zone);
    return (
      <section className="ed-panel">
        <div className="ed-panel-title">
          <h3>{zoneName[zone]}</h3>
          <span>
            {volume(run.items.filter((x) => x.zone === zone))} /{' '}
            {shape.capacity} 格
          </span>
        </div>
        <CargoGrid
          items={run.items.filter((x) => x.zone === zone)}
          zone={zone}
          {...shape}
        />
      </section>
    );
  }
  function inventory() {
    const tabs = [
      ['build', '上阵构筑'],
      ['bag', '背包'],
      ['safe', '安全容器'],
      ...(run.phase === 'base' ? [['warehouse', '仓库']] : []),
      ['catalog', '卡牌图鉴'],
    ];
    const catalogCards = ALL_CARDS.filter(
      (c) => catalogOwner === 'all' || c.school === catalogOwner,
    );
    const definition =
      catalogCards.find((c) => c.id === catalogId) ?? catalogCards[0];
    const owned = run.items.filter(
      (x) => x.type === 'card' && x.id === definition.id,
    );
    const specimen = owned[0] ?? {
      uid: 'catalog-' + definition.id,
      id: definition.id,
      at: 0,
      rarity: rarityOf(definition.id),
      quality: 0,
      level: 0,
    };
    return (
      <section className="ed-inventory-pages">
        {bagOpen && run.phase === 'combat' && (
          <p className="ed-packing-note">
            战斗已暂停 · 布阵修改用于下一场，本场阵容保持不变
          </p>
        )}
        {bagOpen &&
          run.tutorialRewardUid &&
          !run.equipmentExplained &&
          run.items.some((x) => x.uid === run.tutorialRewardUid) &&
          tutorialFloor(run) &&
          inventoryTab === 'build' && (
            <ContextHint
              mandatory
              key={
                run.items.find((x) => x.uid === run.tutorialRewardUid)?.zone ===
                'board'
                  ? 'placed'
                  : 'placing'
              }
              step={
                run.items.find((x) => x.uid === run.tutorialRewardUid)?.zone ===
                'board'
                  ? {
                      target: '.ed-planning-board',
                      title: '武器已经上阵',
                      body: '武器从1件增加到2件，弹弓和猎隙刃会各自发动。这里也能移动、换位；关闭背包即可继续探索。',
                    }
                  : {
                      target: '.ed-build-candidates',
                      title: '把战利品放上桌面',
                      body: '把左侧的猎隙刃拖到右侧棋盘的亮色空位。松手即可上阵；也可以点卡牌后点空位。先装备这把武器，再继续探索。',
                    }
              }
            />
          )}
        <nav className="ed-inventory-tabs" aria-label="行装与构筑子页">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              aria-pressed={inventoryTab === id}
              className={inventoryTab === id ? 'active' : ''}
              onClick={() => {
                setInventoryTab(id);
                setInspection(null);
              }}
            >
              {label}
            </button>
          ))}
          <a className="ed-lab-link" href={sitePath('/lab')}>
            流派试验场 ↗
          </a>
          <a className="ed-lab-link" href={sitePath('/design')}>
            物品用途手册 ↗
          </a>
        </nav>
        <div className="ed-inventory-page-body">
          {inventoryTab === 'catalog' ? (
            <>
              <section className="ed-panel ed-atlas-panel">
                <h3>
                  卡牌图鉴 · {catalogCards.length} / {ALL_CARDS.length} 种
                </h3>
                <p>
                  已拥有{' '}
                  {
                    new Set(
                      run.items
                        .filter((x) => x.type === 'card')
                        .map((x) => x.id),
                    ).size
                  }{' '}
                  / {ALL_CARDS.length}
                </p>
                <nav
                  className="ed-inventory-tabs ed-catalog-filters"
                  aria-label="按流派筛选"
                >
                  {[
                    { id: 'all', name: '全部' },
                    ...Object.entries(SCHOOLS).map(([id, name]) => ({
                      id,
                      name,
                    })),
                  ].map((owner) => (
                    <button
                      key={owner.id}
                      aria-pressed={catalogOwner === owner.id}
                      className={catalogOwner === owner.id ? 'active' : ''}
                      onClick={() => {
                        setCatalogOwner(owner.id);
                        const first = ALL_CARDS.find(
                          (c) => owner.id === 'all' || c.school === owner.id,
                        );
                        if (first) setCatalogId(first.id);
                      }}
                    >
                      {owner.name}
                    </button>
                  ))}
                </nav>
                <div className="ed-atlas-grid">
                  {catalogCards.map((c) => {
                    const cards = run.items.filter(
                      (x) => x.type === 'card' && x.id === c.id,
                    );
                    return (
                      <button
                        key={c.id}
                        className={
                          'ed-atlas-tile ' +
                          (catalogId === c.id ? 'selected' : '')
                        }
                        onClick={() => setCatalogId(c.id)}
                      >
                        <span>
                          {cards.length
                            ? '已拥有 ×' + cards.length
                            : '尚未拥有'}
                        </span>
                        <div
                          className={
                            'ed-card ed-card-v2 rarity-' +
                            rarityOf(c.id) +
                            ' quality-0'
                          }
                        >
                          <CardFace
                            card={{
                              uid: 'atlas-' + c.id,
                              id: c.id,
                              at: 0,
                              rarity: rarityOf(c.id),
                              quality: 0,
                              level: 0,
                            }}
                            enemy={false}
                          />
                        </div>
                        <small>{c.size} 格</small>
                      </button>
                    );
                  })}
                </div>
              </section>
              <aside className="ed-panel ed-fixed-details">
                <h3>{definition.name}</h3>
                <ObjectInfo id={definition.id} />
                <p>
                  {definition.id === 'slingshot'
                    ? '新开局初始武器 · 不进入实体掉落池'
                    : CARDS.some((c) => c.id === definition.id)
                      ? '当前冒险可获得 · 搜刮 / 游商 / 战利品'
                      : '仅英雄试验场展示 · 尚未接入冒险掉落'}
                </p>
                <p>
                  {owned.length
                    ? '当前拥有 ' + owned.length + ' 张'
                    : '尚未拥有 · 展示基础属性'}
                </p>
                <CardDetail
                  card={{
                    ...specimen,
                    at: specimen.at ?? 0,
                    rarity: specimen.rarity ?? 0,
                  }}
                />
              </aside>
            </>
          ) : (
            <>
              {inventoryTab === 'build' ? (
                <BuildBoard
                  run={run}
                  selected={selected}
                  placing={placing}
                  onSelect={(item, target) => {
                    setPlacing(null);
                    selectItem(item, 'inventory', target);
                  }}
                  onPlacing={setPlacing}
                  onAction={dispatch}
                />
              ) : (
                grid(inventoryTab as Zone)
              )}
              {inventoryTab !== 'build' && (
                <aside className="ed-panel ed-fixed-details ed-inspect-dialog">
                  {inspected ? itemDetailBody() : <p>尚未选择物品</p>}
                </aside>
              )}
            </>
          )}
        </div>
      </section>
    );
  }
  function loot() {
    const items = f.stock.filter((x) => unlockedItem(run, x.id));
    if (f.routeVersion === 5)
      return (
        <section className="ed-panel ed-first-loot">
          <h3>{items.length ? '箱子里的东西' : '箱子已经空了'}</h3>
          {items.map((x) => (
            <article key={x.uid}>
              <div>
                <strong>
                  {itemName(x)}
                  {x.amount > 1 ? ` ×${x.amount}` : ''}
                </strong>
                <p>
                  {x.id === 'rubber'
                    ? '一块完整的隔热垫，边缘还很结实。'
                    : x.id === 'supply'
                      ? '密封完好的干粮，适合带回电梯。'
                      : '散落在箱底的几枚金币。'}
                </p>
              </div>
              <button onClick={() => dispatch({ type: 'pickup', id: x.uid })}>
                拿走{itemName(x)}
              </button>
            </article>
          ))}
        </section>
      );
    return (
      <section className="ed-panel">
        <h3>待拾取物品 · {items.length} 件</h3>
        <CargoGrid
          items={items}
          zone="loot"
          columns={4}
          capacity={Math.min(
            96,
            Math.max(12, ...items.map((x) => (x.slot ?? 0) + x.volume * 4 + 4)),
          )}
        />
      </section>
    );
  }
  function terminal() {
    return (
      <>
        <p className="ed-unlock-note">
          Lv.{run.level} · {LEVEL_GUIDE[run.level - 1]}
          {run.level < 6 && <small>下一级：{LEVEL_GUIDE[run.level]}</small>}
        </p>
        <div
          className={
            'ed-base-grid ed-terminal-content ' +
            (tab === 'prep' ? 'show-prep' : 'show-upgrades')
          }
        >
          <section className="ed-panel">
            <div className="ed-panel-title">
              <h3>电梯改造 / Lv.{run.level}</h3>
              <span>
                金币 {run.material} · 模块 {moduleUsed(run)} / {run.moduleCap}
              </span>
            </div>
            <div className="ed-module-plan">
              <div style={{ gridColumn: 'span 2' }}>
                <BedDouble />
                固定床位 · 2 槽
              </div>
              {run.installed.map((id) => {
                const f = FACILITY.find((x) => x.id === id)!;
                return (
                  <div key={id} style={{ gridColumn: `span ${f.slots}` }}>
                    <Wrench />
                    {f.name}
                  </div>
                );
              })}
              {Array.from(
                { length: run.moduleCap - moduleUsed(run) },
                (_, i) => (
                  <div className="empty" key={i}>
                    空槽
                  </div>
                ),
              )}
            </div>
            <div className="ed-actions">
              <CostButton
                cost={6}
                disabled={run.moduleCap >= 10}
                onClick={() => dispatch({ type: 'expand' })}
              >
                扩建 +2 槽
              </CostButton>
              <CostButton
                cost={upgradeCost(run)}
                disabled={run.level >= 6}
                onClick={() => dispatch({ type: 'upgrade' })}
              >
                电梯升级
              </CostButton>
            </div>
          </section>
          <section className="ed-panel">
            <p className="ed-kicker">PREPARATION</p>
            <h3>下一次出发</h3>
            <div className="ed-prep">
              <span>
                上阵 <b>{playerCards(run).length} 张卡</b>
              </span>
              <span>
                背包{' '}
                <b>
                  {volume(run.items.filter((x) => x.zone === 'bag'))} /{' '}
                  {bagCap(run)}
                </b>
              </span>
              <span className={run.level < 3 ? 'ed-hidden' : ''}>
                鉴定仪 <b>{itemCount(run, 'scanner', false)} 个</b>
              </span>
              <span className={run.level < 5 ? 'ed-hidden' : ''}>
                探索整备 <b>{run.adapted ? '已准备' : '未准备'}</b>
              </span>
            </div>
            <div className="ed-actions">
              <button onClick={() => setTab('inventory')}>
                <Backpack size={17} />
                整理行装
              </button>
              <button onClick={() => dispatch({ type: 'deposit' })}>
                交付资源
              </button>
              {run.level >= 3 && !run.items.some((x) => x.id === 'scanner') && (
                <CostButton
                  cost={4}
                  onClick={() => dispatch({ type: 'craft-scanner' })}
                >
                  重制鉴定仪 · 2 电力
                </CostButton>
              )}
            </div>
          </section>
        </div>
        <div
          className={'ed-section-title ' + (tab === 'prep' ? 'ed-hidden' : '')}
        >
          <h2>把庇护所建起来</h2>
        </div>
        <div className={'ed-facilities ' + (tab === 'prep' ? 'ed-hidden' : '')}>
          {FACILITY.filter(
            (f) =>
              run.level >= FACILITY_LEVEL[f.id] || run.installed.includes(f.id),
          ).map((f) => {
            const built = run.installed.includes(f.id),
              used = run.facilityUsed.includes(f.id);
            return (
              <section
                className={'ed-panel ' + (built ? 'built' : '')}
                key={f.id}
              >
                <div className="ed-panel-title">
                  <h3>{f.name}</h3>
                  <small>{f.slots} 槽</small>
                </div>
                <p>{f.desc}</p>
                <div className="ed-actions">
                  {built ? (
                    <>
                      <CostButton
                        cost={
                          (
                            { grow: 1, workshop: 1, adapt: 2 } as Record<
                              string,
                              number
                            >
                          )[f.id] ?? 0
                        }
                        className={used ? '' : 'ed-primary'}
                        disabled={used}
                        onClick={() =>
                          f.id === 'identify'
                            ? setTab('identify')
                            : dispatch({ type: 'facility', id: f.id })
                        }
                      >
                        {used ? <Check size={15} /> : <Wrench size={15} />}{' '}
                        {used ? '今日已完成' : '使用设施'}
                      </CostButton>
                      <button
                        disabled={f.id === 'identify'}
                        onClick={() => dispatch({ type: 'remove', id: f.id })}
                      >
                        拆除 +{Math.floor(f.cost / 2)}
                      </button>
                    </>
                  ) : (
                    <CostButton
                      cost={f.cost}
                      onClick={() => dispatch({ type: 'build', id: f.id })}
                    >
                      建造
                    </CostButton>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </>
    );
  }
  function map() {
    const first =
      run.day === 1 &&
      !run.used &&
      checkpoint(run) === 0 &&
      [5, 6].includes(run.floors[0].routeVersion ?? 0);
    const destinations = (
      <div className="ed-floor-map">
        {first && (
          <section className="ed-first-destination ed-panel">
            <p className="ed-kicker">01 / 第一站</p>
            <h2>{run.floors[0].name}</h2>
            <p>{run.floors[0].detail}</p>
            <p>门外传来脚步声。握紧武器，找一条通往信标的路。</p>
            <p className="ed-departure-cost" data-guide="departure-energy">
              出发 <CostIcons supply={1} energy={4} />
            </p>
            {run.openingVersion === 2 && !run.energyExplained && (
              <FocusGuide
                step={{
                  target: '[data-guide="departure-energy"]',
                  title: '出发前，看看精力',
                  body: `叶子代表精力。你目前有${run.stamina}点；这次出发消耗4点。搜刮、赶路和操作机关也需要精力，休息和补给可以恢复。`,
                  next: '知道了，准备出发',
                }}
                onNext={() => dispatch({ type: 'energy-explained' })}
              />
            )}
            <button
              className="ed-primary"
              onClick={() => dispatch({ type: 'enter', floor: 1 })}
            >
              前往第一层 <ArrowRight size={16} />
            </button>
          </section>
        )}
      </div>
    );
    return (
      <>
        <div className="ed-section-title">
          <div>
            <p className="ed-kicker">THE ONLY DIRECTION IS UP</p>
            <h2>{first ? '门外，第一站。' : '电梯通往哪里？'}</h2>
          </div>
        </div>
        {first && destinations}
        <details className="ed-destinations" open={first ? undefined : true}>
          {first && <summary>查看其他楼层</summary>}
          <div className="ed-floor-map">
            {run.floors
              .filter((fl) => !first || fl.id !== 1)
              .map((fl) => {
                const locked = fl.id < checkpoint(run);
                return (
                  <button
                    key={fl.id}
                    disabled={locked || run.used}
                    className={
                      'ed-floor-tile ' +
                      (run.clears.includes(fl.id) ? 'cleared' : '')
                    }
                    onClick={() => dispatch({ type: 'enter', floor: fl.id })}
                  >
                    <span className="ed-floor-number">
                      {String(fl.id).padStart(2, '0')}
                      <small>FLOOR</small>
                    </span>
                    <div>
                      <h3>{fl.name}</h3>
                      <p>{fl.detail}</p>
                      {([4, 5, 6].includes(fl.routeVersion ?? 0)
                        ? fl.nodes
                        : floorRoute(run.seed, fl.id)
                      )
                        .filter(isFieldNode)
                        .map((node) => {
                          const tools = Object.entries(OBJECTS).filter(
                            ([, o]) => o.node === node,
                          );
                          const carried = run.items.filter(
                            (x) =>
                              x.type === 'physical' &&
                              ['bag', 'safe'].includes(x.zone) &&
                              tools.some(([id]) => id === x.id),
                          ).length;
                          return (
                            <p className="ed-tool-forecast" key={node}>
                              {FIELD_TITLES[node]} ·{' '}
                              {fl.workResolved?.includes(node)
                                ? '已处理，无重复奖励'
                                : tools.map(([, o]) => o.name).join(' / ') +
                                  `（已带${carried}件实体）`}
                            </p>
                          );
                        })}
                      <div className="ed-tags">
                        <span>物资 {fl.stock.length}</span>
                        <span>挑战 {16 + fl.id * 5}</span>
                        {fl.visitors.length > 0 && (
                          <span>已有 {fl.visitors.length} 人触达</span>
                        )}
                      </div>
                    </div>
                    <span className="ed-floor-enter">
                      {locked
                        ? '无法下降'
                        : run.clears.includes(fl.id)
                          ? '已通关'
                          : run.used
                            ? '明日可出发'
                            : '进入 →'}
                    </span>
                  </button>
                );
              })}
          </div>
        </details>
      </>
    );
  }
  function fieldInventory() {
    return (
      <section className="ed-field-bag">
        <p>金币 {run.material}</p>
        {grid('bag')}
        {grid('safe')}
        <details className="ed-field-board">
          <summary>上阵卡组</summary>
          {cardGrid(playerCards(run))}
        </details>
      </section>
    );
  }
  function trading() {
    const items = merchantOffers(run).map((x) => ({ ...x, slot: undefined }));
    return (
      <section className="ed-panel">
        <h3>商人商品</h3>
        <p>金币 {run.material}</p>
        <CargoGrid
          items={items}
          zone="shop"
          columns={4}
          capacity={Math.max(12, items.reduce((n, x) => n + x.volume, 0) * 2)}
        />
      </section>
    );
  }
  function floor() {
    if (tutorialFloor(run))
      return (
        <TutorialFloor
          run={run}
          onAction={dispatch}
          intel={enemyIntel}
          onBuild={goBuild}
        />
      );
    const node = currentNode(run),
      active = !!run.interaction,
      ev = eventAt(run);
    const fights = node === 'guardian' && run.encounter ? 2 : 1,
      round =
        node === 'guardian' && run.encounter && !run.encounterDone ? 1 : fights;
    return (
      <>
        <section
          className={
            'ed-floor-scene scene-' +
            (run.floor % 4) +
            (active ? ' engaged' : '') +
            (f.routeVersion === 5 ? ' ed-first-route' : '')
          }
        >
          <div className="ed-orbit" aria-hidden="true">
            <div />
            <span>{run.floor}</span>
          </div>
          <div className="ed-scene-copy">
            <p className="ed-kicker">
              FLOOR {String(run.floor).padStart(2, '0')} /{' '}
              {active
                ? '正在' + (run.interaction === 'trade' ? '交易' : '搜查')
                : 'EXPLORATION'}
            </p>
            <h1>{f.name}</h1>
            {!active && <p>{f.detail}</p>}
            <div className="ed-tags">
              <span>{run.objective ? '主目标完成' : '尚未提交通关'}</span>
            </div>
          </div>
        </section>
        <div
          className="ed-route"
          style={{
            gridTemplateColumns: `repeat(${f.nodes.length + 1},minmax(76px,1fr))`,
          }}
        >
          {[...f.nodes, 'exit'].map((n, i) => (
            <div
              key={i}
              className={i === run.node ? 'active' : i < run.node ? 'done' : ''}
            >
              <b>{i < run.node ? '✓' : i + 1}</b>
              <span>{nodeName[n]}</span>
            </div>
          ))}
        </div>
        {active ? (
          <>
            <div className="ed-interaction-heading">
              <div>
                <h2>{nodeTitle(run)}</h2>
              </div>
              <button
                className="ed-primary"
                onClick={() => dispatch({ type: 'next-node' })}
              >
                继续前进 · {travelCost(run)} 精力 <ArrowRight size={16} />
              </button>
            </div>
            <div className="ed-interaction-grid">
              {run.interaction === 'search' ? loot() : trading()}
              {f.routeVersion === 5 ? (
                <section className="ed-panel">
                  <h3>随身行囊</h3>
                  <p>拾起的东西都收在这里，离开房间时会随你一起带走。</p>
                  <p>
                    缓冲垫 ×
                    {
                      run.items.filter(
                        (x) =>
                          x.id === 'rubber' &&
                          x.type === 'physical' &&
                          ['bag', 'safe'].includes(x.zone),
                      ).length
                    }
                  </p>
                  <details>
                    <summary>查看行装</summary>
                    {fieldInventory()}
                  </details>
                </section>
              ) : (
                fieldInventory()
              )}
            </div>
            <div className="ed-actions">
              <button onClick={() => dispatch({ type: 'extract' })}>
                提前撤离 · 8 精力
              </button>
              <button
                className="ed-danger"
                onClick={() => dispatch({ type: 'rescue' })}
              >
                紧急回收 · {rescueCost(run)} 生命
              </button>
            </div>
          </>
        ) : (
          <div className="ed-explore-grid">
            <section className="ed-panel ed-node">
              <p className="ed-kicker">
                NODE {run.node + 1} / {nodeName[node]}
              </p>
              <h2>{nodeTitle(run)}</h2>
              {enemyIntel()}
              {isFieldNode(node) ? (
                <FieldWork
                  key={`${run.floor}-${node}`}
                  run={run}
                  onAction={dispatch}
                />
              ) : node === 'antechamber' ? (
                <>
                  <p>
                    隔着半掩的内门，你看见守卫的弩臂正在缓慢收紧。归返信标在它身后闪烁。
                  </p>
                  <button
                    className="ed-primary"
                    onClick={() => dispatch({ type: 'approach-guardian' })}
                  >
                    推开内门 · {travelCost(run)} 精力
                  </button>
                </>
              ) : node === 'event' ? (
                <>
                  <p>{ev.text}</p>
                  <div className="ed-actions">
                    <button
                      className="ed-primary"
                      onClick={() => dispatch({ type: 'event', choice: 0 })}
                    >
                      谨慎通过 · {ev.safeCost} 精力
                    </button>
                    <CostButton
                      cost={ev.kind === 2 ? 2 : 0}
                      onClick={() => dispatch({ type: 'event', choice: 1 })}
                    >
                      {ev.kind === 2 ? '修复通路 · 恢复 6 精力' : ev.alt}
                    </CostButton>
                  </div>
                </>
              ) : node === 'search' ? (
                <>
                  <p>灰尘覆盖着旧箱子，角落里还有些没被带走的东西。</p>
                  <div className="ed-actions">
                    <button
                      className="ed-primary"
                      onClick={() => dispatch({ type: 'search' })}
                    >
                      <Search size={16} />
                      搜查区域 · {searchCost(run)} 精力
                    </button>
                    <button onClick={() => dispatch({ type: 'skip' })}>
                      跳过搜查
                    </button>
                  </div>
                </>
              ) : node === 'merchant' ? (
                <>
                  <p>
                    游商把油布铺在地上，露出几件擦得发亮的工具。他拍了拍腰间的钱袋，示意你靠近。
                  </p>
                  <div className="ed-actions">
                    <button
                      className="ed-primary"
                      onClick={() => dispatch({ type: 'open-trade' })}
                    >
                      <Store size={16} />
                      查看商品 / 开始交易
                    </button>
                    <button onClick={() => dispatch({ type: 'skip' })}>
                      离开商人
                    </button>
                  </div>
                </>
              ) : node === 'puzzle' ? (
                <>
                  <p>{puzzle(run).text}</p>
                  <div className="ed-field-readout">
                    <span>现场提示</span>
                    <strong>{puzzle(run).hint}</strong>
                    <p>达成后：门锁开启，通往下一节点。</p>
                  </div>
                  <div className="ed-actions">
                    {puzzle(run).options.map((n) => (
                      <button
                        key={n}
                        onClick={() => dispatch({ type: 'puzzle', choice: n })}
                      >
                        输入 {n} · 4 精力
                      </button>
                    ))}
                  </div>
                </>
              ) : node === 'rest' ? (
                <>
                  <p>这里暂时没有威胁。坐下来，喘一口气。</p>
                  <div className="ed-actions">
                    <button
                      className="ed-primary"
                      onClick={() => dispatch({ type: 'rest' })}
                    >
                      短暂休整 · +8 精力
                    </button>
                    <button
                      className={run.level < 2 ? 'ed-hidden' : ''}
                      onClick={() => dispatch({ type: 'rest', choice: 1 })}
                    >
                      消耗药品 · +25 精力
                    </button>
                  </div>
                </>
              ) : node === 'hazard' ? (
                <>
                  <p>
                    前方的警示灯忽明忽暗。防护装置早已断电，狭窄的过道里不断传来碎裂声。
                  </p>
                  <div className="ed-actions">
                    <button
                      className="ed-primary"
                      onClick={() => dispatch({ type: 'hazard' })}
                    >
                      穿越 · 8 精力
                    </button>
                    <button
                      className={run.level < 3 ? 'ed-hidden' : ''}
                      onClick={() => dispatch({ type: 'hazard', choice: 1 })}
                    >
                      启动防护 · 2 电力
                    </button>
                  </div>
                </>
              ) : node === 'cache' ? (
                <>
                  <p>
                    旧箱里放着一只苹果和一枚打火机。箱盖摇摇欲坠，只够你伸手取走一件。
                  </p>
                  <div className="ed-actions">
                    <button onClick={() => dispatch({ type: 'cache' })}>
                      拿走苹果
                    </button>
                    <button
                      onClick={() => dispatch({ type: 'cache', choice: 1 })}
                    >
                      拿走打火机
                    </button>
                    <button
                      onClick={() => dispatch({ type: 'cache', choice: 2 })}
                    >
                      不拿，继续前进
                    </button>
                  </div>
                </>
              ) : node === 'bargain' ? (
                <>
                  <p>
                    计量器亮起了绿灯。转动那只沉重的手轮，投币口便会吐出几枚金币。
                  </p>
                  <div className="ed-actions">
                    <button
                      onClick={() => dispatch({ type: 'bargain', choice: 1 })}
                    >
                      转动手轮 · −12 精力 / +4 金币
                    </button>
                    <button onClick={() => dispatch({ type: 'bargain' })}>
                      拒绝并前进
                    </button>
                  </div>
                </>
              ) : node === 'patrol' || node === 'elite' ? (
                <>
                  <h3>{node === 'patrol' ? '外围巡逻者' : '精英看守'}</h3>
                  <details>
                    <summary>交战风险</summary>
                    <p>
                      战败损失35精力，无战斗奖励；保留生命和行装，继续前进。
                    </p>
                  </details>
                  <button
                    className="ed-primary"
                    onClick={() => dispatch({ type: 'fight' })}
                  >
                    挑战{node === 'patrol' ? '巡逻者' : '精英看守'}
                  </button>
                </>
              ) : node === 'guardian' ? (
                <>
                  {f.routeVersion !== 5 && (
                    <div className="ed-fight-queue">
                      <b>
                        本节点共 {fights} 场战斗 · 即将第 {round}/{fights} 场
                      </b>
                      {run.encounter && (
                        <p className={run.encounterDone ? 'finished' : ''}>
                          {run.encounterDone ? '✓ 已完成' : '① 待挑战'} 幸存者 #
                          {run.encounter} · 封锁对决
                        </p>
                      )}
                      <p>
                        {fights === 2 ? '②' : '①'} {nodeTitle(run)} · 最终 BOSS
                      </p>
                    </div>
                  )}
                  <p>
                    {run.encounter && !run.encounterDone
                      ? '另一名幸存者挡住了通道。守卫的脚步声从他身后传来。'
                      : '守卫站在归返信标前，握紧了武器。'}
                  </p>
                  <div className="ed-actions">
                    <button
                      className="ed-primary"
                      onClick={() => dispatch({ type: 'fight' })}
                    >
                      {f.routeVersion === 5
                        ? '挑战楼层守卫'
                        : `开始第 ${round}/${fights} 场：${run.encounter && !run.encounterDone ? '幸存者对决' : 'BOSS 战'}`}
                    </button>
                    <button onClick={() => setTab('inventory')}>
                      调整构筑
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p>归返信标亮了。电梯仍在原处等你。</p>
                  <button
                    className="ed-primary"
                    onClick={() => dispatch({ type: 'extract' })}
                  >
                    完成撤离 · 8 精力
                  </button>
                </>
              )}
            </section>
            <aside className="ed-panel">
              <h3>归返</h3>
              <div className="ed-actions vertical">
                <button onClick={() => dispatch({ type: 'extract' })}>
                  现在撤离 · 8 精力
                </button>
                <button onClick={() => setTab('inventory')}>整理行装</button>
                <button
                  className="ed-danger"
                  onClick={() => dispatch({ type: 'rescue' })}
                >
                  紧急回收 · {rescueCost(run)} 生命
                </button>
              </div>
            </aside>
          </div>
        )}
        {f.history.length > 0 && (
          <details className="ed-panel">
            <summary>本层其他幸存者留下的痕迹</summary>
            {f.history.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </details>
        )}
      </>
    );
  }
  function enemyIntel() {
    if (!previewDuel) return null;
    const threats = [0, 1, 2].map((lane) =>
      previewDuel.enemy
        .filter(
          (c) =>
            Math.floor(c.at / 3) === lane &&
            ['damage', 'corrode'].includes(cardDef(c.id).kind),
        )
        .reduce(
          (sum, c) =>
            sum + describeCard(c).effects[0].value / describeCard(c).cd,
          0,
        ),
    );
    const lane = threats.indexOf(Math.max(...threats));
    const mechanism =
      previewDuel.enemy.find((c) =>
        ['nailer', 'springbow', 'fuse', 'sealant', 'distiller'].includes(c.id),
      ) ?? previewDuel.enemy[0];
    return (
      <section className="ed-enemy-intel">
        <h3>开战前 · 敌情</h3>
        <p>
          主要威胁：{['左路', '中路', '右路'][lane]} · 敌方宿主{' '}
          {previewDuel.maxHp[1]}
        </p>
        <p>
          {cardDef(mechanism.id).name}：
          {describeCard(mechanism).summary ||
            describeCard(mechanism)
              .effects.map((e) => e.text)
              .join(' · ')}
        </p>
        <details>
          <summary>查看敌阵</summary>
          <div className="ed-board-scroll">
            {cardGrid(previewDuel.enemy, true)}
          </div>
        </details>
        <button onClick={() => goBuild()}>根据敌情布阵</button>
      </section>
    );
  }

  function barrierRow(side: number, fr: CombatFrame) {
    return (
      <div className={'ed-barriers ' + (side ? 'enemy' : '')}>
        {fr.barriers[side].map((barrier, lane) => (
          <div
            key={lane}
            data-entity={`barrier-${side}-${lane}`}
            className={
              'ed-barrier ' +
              (barrier.broken ? 'broken' : '') +
              (fr.hits.some(
                (h) =>
                  h.side === side &&
                  h.targetLane === lane &&
                  h.kind === 'damage',
              )
                ? ' struck'
                : '')
            }
          >
            <div>
              <Shield size={14} />
              <strong>{['左路', '中路', '右路'][lane]}屏障</strong>
              {!!fr.corrosion?.[side]?.[lane] && (
                <em
                  className="ed-corrosion-badge"
                  title="每层每秒伤害 1，并削减屏障上限 1；破路后持续伤害宿主。"
                >
                  侵蚀 {Math.round(fr.corrosion[side][lane] * 10) / 10}
                </em>
              )}
              <span>
                {barrier.broken
                  ? '已损毁 · 宿主暴露'
                  : `${Math.ceil(barrier.hp)} / ${Math.ceil(barrier.maxHp)}`}
              </span>
            </div>
            <div
              className="ed-barrier-track"
              // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- Custom barrier track shares the game combat animation.
              role="progressbar"
              aria-label={`${side ? '敌方' : '我方'}${['左路', '中路', '右路'][lane]}屏障`}
              aria-valuemin={0}
              aria-valuemax={barrier.maxHp}
              aria-valuenow={Math.ceil(barrier.hp)}
            >
              <i style={{ width: (barrier.hp / barrier.maxHp) * 100 + '%' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }
  function combat() {
    if (!battle || !frame || !run.duel) return null;
    const finished = cursor >= battle.frames.length - 1;
    const evidence = battleEvidence(run.duel, battle.frames);
    return (
      <section className={'ed-combat' + (finished ? ' is-finished' : '')}>
        <p className="ed-stage-warning" hidden={tutorialFloor(run)}>
          {run.duel.kind === 'survivor'
            ? '幸存者 AI 对战 · 战败触发强制回收，损失生命和普通背包。'
            : run.duel?.stage === 'boss' ||
                (!run.duel?.stage && run.duel?.kind === 'guardian')
              ? '最终 BOSS · 战败触发强制回收，损失生命和普通背包。'
              : '普通 / 精英战斗 · 战败仅损失 35 精力并进入下一个节点，保留生命和背包。'}
        </p>
        <div className="ed-section-title">
          <div>
            <p className="ed-kicker">
              {run.duel.kind === 'survivor'
                ? 'SEALED ENCOUNTER'
                : 'FLOOR GUARDIAN'}
            </p>
            <h2>
              {run.duel.kind === 'survivor'
                ? '第 1/2 场 · 幸存者封锁战'
                : run.duel.stage === 'normal'
                  ? '外围巡逻者'
                  : run.duel.stage === 'elite'
                    ? '精英看守'
                    : '楼层守卫'}
            </h2>
          </div>
          <span>{frame.time.toFixed(2)}s</span>
        </div>
        <section className="ed-battle-scroll" aria-label="双方三路对战棋盘">
          <div className="ed-vertical-battle" ref={battlefieldRef}>
            <BattleEffects
              surface={battlefieldRef}
              frames={battle.frames}
              cursor={cursor}
              playing={playing && !lessonActive && !finished}
              speed={speed}
            />
            {actor(1, frame)}
            {barrierRow(1, frame)}
            {cardGrid(run.duel.enemy, true, frame)}
            <div className="ed-battle-divider">
              <span>左路</span>
              <span>中路</span>
              <span>右路</span>
            </div>
            {cardGrid(run.duel.player, false, frame)}
            {barrierRow(0, frame)}
            {actor(0, frame)}
          </div>
        </section>
        <div className="ed-battle-controls">
          <button onClick={() => setPlaying((x) => !x)}>
            {playing ? <Pause size={16} /> : <Play size={16} />}{' '}
            {playing ? '暂停' : '播放'}
          </button>
          <button
            onClick={() => setSpeed((x) => (x === 1 ? 2 : x === 2 ? 4 : 1))}
          >
            {speed}× 速度
          </button>
          <button
            disabled={tutorialBattle && lessonStep < 8}
            onClick={() => setCursor(battle.frames.length - 1)}
          >
            跳至结果
          </button>
        </div>
        <details className="ed-visual-guide">
          <summary>卡牌与弹道图例</summary>
          <p>
            底色：灰色普通、蓝色罕见、黄色稀有、暗金传说、红色奇迹。品质：基础单线框、精制双线框、大师雕角框。左上角为强化等级；蒙层铺满时发动。卡牌不承伤，后方屏障保护宿主。
          </p>
          <p>
            直线流光：伤害红、治疗绿、屏障修复黄、灼烧橙、毒素墨绿、冰冻淡蓝。侵蚀使用墨绿弹道；灼烧与冰冻颜色为后续效果预留。弹道飞行
            0.75–1.5 秒后结算效果；暂停会冻结弹道位置。
          </p>
        </details>
        <details className="ed-battle-log-details">
          <summary>战斗记录</summary>
          <div className="ed-combat-log">
            {battle.frames
              .slice(0, cursor + 1)
              .flatMap((fr) => [
                ...fr.hits.map((h) => formatHit(run.duel!, h, fr.time)),
                ...fr.log,
              ])
              .map((line, i) => (
                <p key={i}>{line}</p>
              ))}
          </div>
        </details>
        {finished && (
          <section
            className={'ed-battle-result ' + (battle.winner === 0 ? 'won' : '')}
          >
            <div className="victory-emblem">
              <Trophy size={48} />
              <Sparkles size={24} />
            </div>
            <div>
              {battle.timedOut && <p>90 秒平局，未击败敌人，不获得奖励。</p>}
              <h2>
                {battle.winner === 0
                  ? '胜利'
                  : battle.winner === -1
                    ? battle.timedOut
                      ? '战斗陷入僵局。'
                      : '同归于尽。'
                    : run.duel.kind === 'survivor' ||
                        run.duel.stage === 'boss' ||
                        !run.duel.stage
                      ? '电梯启动了回收。'
                      : '负伤继续前进。'}
              </h2>
              <details className="victory-records">
                <summary>对战记录</summary>{' '}
                <div className="ed-result-evidence">
                  <p>
                    宿主实际损伤：我方 {evidence.hostDamage[0]} / 敌方{' '}
                    {evidence.hostDamage[1]} · 我方剩余{' '}
                    {Math.ceil(evidence.hp[0])}/{run.duel.maxHp[0]}
                  </p>
                  <p>{evidence.break}</p>
                  <p>{evidence.contribution}</p>
                  <details>
                    <summary>详细统计与破路记录</summary>
                    {evidence.breaks.map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                    {evidence.stats.map((s) => (
                      <p key={s.uid}>
                        {s.name} [{s.uid}] · 对敌方屏障实际伤害{' '}
                        {s.barrierDamage}
                      </p>
                    ))}
                    <p>
                      充能记录表示冷却计时推进，不等于缩短战斗时间；贡献不代表单牌决定胜负。
                    </p>
                    <details>
                      <summary>逐事件日志</summary>
                      {battle.frames
                        .flatMap((fr) => [
                          ...fr.hits.map((hit) =>
                            formatHit(run.duel!, hit, fr.time),
                          ),
                          ...fr.log.map((line) => `${fr.time}s · ${line}`),
                        ])
                        .map((line, i) => (
                          <p key={i}>{line}</p>
                        ))}
                    </details>
                  </details>
                </div>
              </details>
              <p hidden={battle.winner === 0}>
                {battle.timedOut
                  ? run.duel.kind === 'survivor' ||
                    run.duel.stage === 'boss' ||
                    !run.duel.stage
                    ? '消耗 15 精力，返回停靠点。生命与物品保留，无通关进度。'
                    : '消耗 15 精力及下一节点路费，保留生命与物品，继续前进。'
                  : battle.winner === 0
                    ? run.duel.kind === 'survivor'
                      ? '幸存者封锁战结束，下一场是楼层守卫。确认后可先整理或提前撤离。'
                      : run.duel.stage === 'normal' ||
                          run.duel.stage === 'elite'
                        ? '本阶段胜利，确认后继续深入。最终 BOSS 仍未击败。'
                        : '本层全部战斗已结束。返回楼层后撤离提交通关。'
                    : run.duel.kind === 'survivor' ||
                        run.duel.stage === 'boss' ||
                        (!run.duel.stage && run.duel.kind === 'guardian')
                      ? `本次回收消耗 ${rescueCost(run)} 生命，普通背包丢失。`
                      : '本次战败损失 35 精力，进入当前楼层的下一个节点。生命与背包保留，不领取战斗奖励。'}
              </p>
            </div>
            <button
              className="ed-primary"
              onClick={() => dispatch({ type: 'resolve' })}
            >
              {battle.winner === 0 ? '领取战利品' : '确认结果'}{' '}
              <ArrowRight size={17} />
            </button>
            <button
              onClick={() => {
                setCursor(0);
                setPlaying(true);
              }}
            >
              重播
            </button>
          </section>
        )}
      </section>
    );
  }
  function survivors() {
    const rows = ranking(run);
    return (
      <>
        <div className="ed-section-title">
          <div>
            <p className="ed-kicker">100 ELEVATORS / ONE PROTOCOL</p>
            <h2>还亮着的屏幕</h2>
          </div>
          <p>
            {run.bots.filter((b) => b.alive).length + (run.quota > 0 ? 1 : 0)}{' '}
            人存活 · 按已通关最高楼层排名，同层并列。
            <br />
            机器人每日选择 1–2 层进度，并按构筑与挑战强度结算。
          </p>
        </div>
        <div className="ed-table-wrap">
          <table>
            <thead>
              <tr>
                <th>排名</th>
                <th>幸存者</th>
                <th>最高通关</th>
                <th>已抵达</th>
                <th>生命</th>
                <th>状态与原因</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr
                  key={b.id}
                  className={b.id === 0 ? 'you' : !b.alive ? 'eliminated' : ''}
                >
                  <td>{b.rank}</td>
                  <td>
                    #{String(b.id).padStart(3, '0')}
                    {b.id === 0 ? ' · 你' : ''}
                  </td>
                  <td>{b.best} F</td>
                  <td>{b.floor} F</td>
                  <td>{b.quota}</td>
                  <td>{b.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  }
  const inspected =
    inspection && inspection.scope === `${run.phase}:${tab}:${inventoryTab}`
      ? (inspection.source === 'enemy'
          ? (run.phase === 'combat' ? run.duel : previewDuel)?.enemy.map(
              (c) => ({
                ...c,
                type: 'card' as const,
                zone: 'board' as const,
                volume: cardDef(c.id).size,
                amount: 1,
              }),
            )
          : inspection.source === 'loot'
            ? f?.stock
            : inspection.source === 'shop'
              ? merchantOffers(run)
              : run.items
        )?.find((x) => x.uid === inspection.uid)
      : undefined;
  const inspectItem = (item: Item, source: string, target: HTMLElement) => {
    if (!baseInspect) showInspection(item.uid, source, target);
  };
  const selectItem = (item: Item, source: string, target: HTMLElement) => {
    setSelected(item.uid);
    showInspection(item.uid, source, target, true);
  };
  const placeItem = (item: Item, from: string, to: string, slot: number) => {
    if (to === 'loot') {
      if (from === 'loot')
        dispatch({
          type: 'arrange-stock',
          id: item.uid,
          slot,
          rotated: item.rotated,
        });
      else if (from !== 'shop') dispatch({ type: 'drop', id: item.uid });
      return;
    }
    if (!['bag', 'safe', 'warehouse'].includes(to)) return;
    dispatch({
      type: from === 'loot' ? 'pickup' : from === 'shop' ? 'trade' : 'move',
      id: item.uid,
      to: to as Zone,
      slot,
      rotated: item.rotated,
    });
  };
  const itemAction = (a: Action) => {
    const next = dispatch(a);
    if (next && !next.items.some((x) => x.uid === inspection?.uid))
      setInspection(null);
  };
  function itemDetailBody() {
    return (
      <>
        {' '}
        <h3>{inspected && itemName(inspected)}</h3>
        <p>
          {inspected?.volume} 格 ·{' '}
          {inspected?.type === 'card'
            ? '卡牌'
            : inspected?.type === 'physical'
              ? '未鉴定实体'
              : '物品'}
        </p>
        {inspected && (
          <>
            {inspected.type === 'card' ? (
              <CardDetail
                card={{
                  ...inspected,
                  at: inspected.at ?? 0,
                  rarity: inspected.rarity ?? 0,
                }}
              />
            ) : inspected.type === 'physical' ? (
              <ObjectInfo id={inspected.id} />
            ) : (
              <p>
                {inspected.id === 'apple'
                  ? '食用恢复 25 精力。'
                  : inspected.id === 'scanner'
                    ? '一次性消耗品：鉴定一件实体物品后消失。'
                    : inspected.id === 'lighter'
                      ? '可以用于特定事件。'
                      : ((
                          {
                            supply:
                              '密封补给：出勤或睡眠消耗 1；携带时可食用恢复 25 精力。',
                            fuel: '燃料罐：发电机消耗 1 罐产生 8 电力。',
                            medicine:
                              '医疗包：使用恢复 35 精力，或用于医疗设施与休整。',
                            scrap:
                              '废料束：强化卡牌的主要材料；也可回收金币或加工燃料。',
                          } as Record<string, string>
                        )[inspected.id] ?? `数量 ${inspected.amount}。`)}
              </p>
            )}
            <div
              className={
                'ed-actions ' +
                ((run.phase === 'combat' && !bagOpen) ||
                inspection?.source === 'enemy'
                  ? 'ed-hidden'
                  : '')
              }
            >
              {inspection?.source === 'shop' ? (
                <CostButton
                  cost={offerPrice(inspected)}
                  onClick={() =>
                    itemAction({ type: 'trade', id: inspected.uid })
                  }
                >
                  购买
                </CostButton>
              ) : inspection?.source === 'loot' ? (
                <button
                  onClick={() =>
                    itemAction({ type: 'pickup', id: inspected.uid })
                  }
                >
                  拾取到背包
                </button>
              ) : (
                <>
                  {inspected.type === 'physical' && (
                    <div className="ed-identify-status">
                      <p>{identificationState(run).reason}</p>
                      <p>
                        {run.phase === 'base'
                          ? identificationState(run).reason
                          : '本次消耗 1 个鉴定仪'}
                      </p>
                      <button
                        disabled={
                          run.phase === 'combat' ||
                          !!run.loot ||
                          !identificationState(run).allowed
                        }
                        onClick={() =>
                          run.phase === 'base'
                            ? (setBagOpen(false),
                              setScanUid(inspected.uid),
                              setInspection(null),
                              setPinned(false),
                              setTab('identify'))
                            : itemAction({ type: 'scan', id: inspected.uid })
                        }
                      >
                        {run.phase === 'base'
                          ? '选择实体鉴定'
                          : '鉴定 · 消耗 1 仪器'}
                      </button>
                    </div>
                  )}
                  {inspected.type === 'card' && (
                    <>
                      <button
                        onClick={() => {
                          goBuild(inspected.uid);
                          setPlacing(inspected.uid);
                        }}
                      >
                        手动落点 ·{' '}
                        {inspected.zone === 'board'
                          ? '移动 / 换位'
                          : '上阵 / 替换'}
                      </button>
                      <button
                        className="ed-primary"
                        onClick={() =>
                          itemAction({
                            type:
                              inspected.zone === 'board' ? 'unequip' : 'equip',
                            id: inspected.uid,
                          })
                        }
                      >
                        {inspected.zone === 'board'
                          ? '下阵至背包'
                          : '上阵 · 自动安排'}
                      </button>
                      {run.phase === 'base' && run.level >= 2 && (
                        <>
                          <button
                            disabled={
                              inspected.level >= 5 ||
                              itemCount(run, 'scrap', false) <
                                growthCost(inspected.level)
                            }
                            onClick={() =>
                              itemAction({ type: 'grow', id: inspected.uid })
                            }
                          >
                            强化 +1 · {growthCost(inspected.level)} 废料
                          </button>
                          <button
                            disabled={
                              inspected.quality >= 2 ||
                              !refineIngredient(run, inspected)
                            }
                            onClick={() => setRefineUid(inspected.uid)}
                          >
                            查看吞噬方案 · 升至
                            {QUALITY[Math.min(2, inspected.quality + 1)]}
                          </button>
                          <small>
                            {refineIngredient(run, inspected)
                              ? `消耗：${itemName(inspected)} · ${QUALITY[inspected.quality]} · Lv ${refineIngredient(run, inspected)!.level}（未上阵）。返还素材卡 80% 强化废料。`
                              : '需要一张未上阵、同名、同品阶卡牌；不消耗金币。'}
                          </small>
                          {refineUid === inspected.uid &&
                            refineIngredient(run, inspected) && (
                              <section className="ed-refine-preview">
                                <h4>吞噬前核对副本与成长变化</h4>
                                <p>
                                  保留：{itemName(inspected)} [{inspected.uid}]
                                  · Lv {inspected.level} ·{' '}
                                  {QUALITY[inspected.quality]} →{' '}
                                  {QUALITY[Math.min(2, inspected.quality + 1)]}
                                </p>
                                <p>
                                  消耗：
                                  {itemName(
                                    refineIngredient(run, inspected)!,
                                  )}{' '}
                                  [{refineIngredient(run, inspected)!.uid}] ·{' '}
                                  {
                                    zoneName[
                                      refineIngredient(run, inspected)!.zone
                                    ]
                                  }{' '}
                                  · Lv {refineIngredient(run, inspected)!.level}
                                </p>
                                <p>
                                  周期{' '}
                                  {
                                    describeCard({
                                      ...inspected,
                                      at: inspected.at ?? 0,
                                      rarity: inspected.rarity ?? 0,
                                    }).cd
                                  }{' '}
                                  →{' '}
                                  {
                                    describeCard({
                                      ...inspected,
                                      at: inspected.at ?? 0,
                                      rarity: inspected.rarity ?? 0,
                                      quality: Math.min(
                                        2,
                                        inspected.quality + 1,
                                      ),
                                    }).cd
                                  }{' '}
                                  秒
                                </p>
                                <p>
                                  当前：
                                  {describeCard({
                                    ...inspected,
                                    at: 0,
                                    rarity: inspected.rarity ?? 0,
                                  })
                                    .effects.map((e) => e.text)
                                    .join(' · ')}
                                </p>
                                <CardDetail
                                  card={{
                                    ...inspected,
                                    at: 0,
                                    rarity: inspected.rarity ?? 0,
                                    quality: Math.min(2, inspected.quality + 1),
                                  }}
                                />
                                <button
                                  onClick={() => {
                                    itemAction({
                                      type: 'refine',
                                      id: inspected.uid,
                                    });
                                    setRefineUid(null);
                                  }}
                                >
                                  确认吞噬此副本
                                </button>
                                <button onClick={() => setRefineUid(null)}>
                                  取消吞噬
                                </button>
                              </section>
                            )}
                          {inspected.zone !== 'board' &&
                            run.items.find(
                              (x) =>
                                x.zone === 'board' &&
                                x.id === inspected.id &&
                                x.quality === inspected.quality,
                            ) && (
                              <button
                                onClick={() => {
                                  const main = run.items.find(
                                    (x) =>
                                      x.zone === 'board' &&
                                      x.id === inspected.id &&
                                      x.quality === inspected.quality,
                                  )!;
                                  goBuild(main.uid);
                                }}
                              >
                                查看已上阵同卡的吞噬方案
                              </button>
                            )}
                        </>
                      )}
                    </>
                  )}
                  {['apple', 'supply', 'medicine'].includes(inspected.id) && (
                    <button
                      disabled={run.phase === 'combat' || !!run.loot}
                      onClick={() =>
                        itemAction({ type: 'consume', id: inspected.uid })
                      }
                    >
                      使用 · 恢复 {inspected.id === 'medicine' ? 35 : 25} 精力
                    </button>
                  )}
                  {(['bag', 'safe', 'warehouse'] as Zone[])
                    .filter(
                      (z) =>
                        inspected.zone !== 'board' &&
                        z !== inspected.zone &&
                        (run.phase === 'base' || z !== 'warehouse'),
                    )
                    .map((to) => (
                      <button
                        key={to}
                        onClick={() =>
                          itemAction({
                            type: 'move',
                            id: inspected.uid,
                            to,
                          })
                        }
                      >
                        移至{zoneName[to]}
                      </button>
                    ))}

                  {run.interaction === 'trade' &&
                    inspected.zone !== 'board' && (
                      <button
                        onClick={() =>
                          itemAction({ type: 'sell', id: inspected.uid })
                        }
                      >
                        出售 +{sellPrice(inspected)} 金币
                      </button>
                    )}
                  {inspected.zone !== 'board' &&
                    (run.phase !== 'base' || run.level >= 2) && (
                      <button
                        disabled={tutorialFloor(run)}
                        onClick={() =>
                          itemAction({
                            type: run.phase === 'base' ? 'recycle' : 'drop',
                            id: inspected.uid,
                          })
                        }
                      >
                        {run.phase === 'base' ? '分解换金币' : '丢弃'}
                      </button>
                    )}
                </>
              )}
              {(run.phase !== 'combat' || bagOpen) &&
                inspected.zone !== 'board' && (
                  <CarryButton
                    item={inspected}
                    from={inspection!.source}
                    onCarry={() => setInspection(null)}
                  />
                )}
            </div>
          </>
        )}
      </>
    );
  }
  return (
    <CargoProvider
      onLoot={(item) => dispatch({ type: 'pickup', id: item.uid })}
      onPlace={placeItem}
      onInspect={inspectItem}
      onSelect={selectItem}
      onDismiss={hideInspection}
    >
      <ScrollChrome />
      {run.identification &&
        run.items.find((x) => x.uid === run.identification?.uid) && (
          <IdentificationReveal
            key={run.identification.uid}
            item={run.items.find((x) => x.uid === run.identification?.uid)!}
            onClose={() => dispatch({ type: 'close-identification' })}
          />
        )}

      {lessonActive && (
        <FocusGuide
          step={lessons[lessonStep]}
          index={lessonStep}
          total={8}
          paused
          onNext={() => dispatch({ type: 'tutorial-step', choice: lessonStep })}
        />
      )}
      <main inert={!!run.identification}
        className={
          'elevator-demo ed-immersive ' +
          (tutorialFloor(run) && ['floor', 'combat'].includes(run.phase)
            ? ' guided-expedition '
            : '') +
          (run.phase === 'combat' && !bagOpen ? 'in-combat ' : '') +
          (lessonActive && lessonStep === 0 ? ' lesson-lanes ' : '') +
          (run.phase === 'base' ? 'at-base ' : '') +
          (run.phase === 'base' && tab === 'base' ? 'in-room' : '') +
          (run.phase === 'base' &&
          tab === 'base' &&
          run.day === 1 &&
          !run.used &&
          checkpoint(run) === 0
            ? ' first-arrival'
            : '')
        }
      >
        {run.phase !== 'intro' &&
          (run.bagUnlocked || run.openingVersion !== 2) && (
            <button
              className="ed-global-bag"
              onClick={() => (bagOpen ? closeBag() : goBuild())}
              aria-label={bagOpen ? '返回游戏' : '打开背包与布阵'}
            >
              {bagOpen ? <X size={22} /> : <Backpack size={22} />}
              {bagOpen ? '返回' : '背包'}
            </button>
          )}
        <header className="ed-header">
          <button
            className="ed-settings-button"
            aria-label="设置"
            onClick={() => setSettings(true)}
          >
            <Settings size={20} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => void importRun(e.target.files?.[0])}
          />
        </header>
        {run.phase === 'intro' ? (
          <section className="ed-intro ed-intro-room">
            <div inert className="ed-intro-backdrop">
              <ElevatorRoom
                arrival
                floor={0}
                day={1}
                used={false}
                level={1}
                onTable={() => {}}
                onIdentify={() => {}}
                onDoor={() => {}}
                onBed={() => {}}
                onTerminal={() => {}}
              />
            </div>
            <div className="ed-door">
              <span>↑</span>
              <b>00</b>
              <small>只能向上</small>
            </div>
            <div>
              <p className="ed-kicker">未知位置 / 00:00</p>
              {notice && notice !== '电梯没有下行按钮。' && (
                <output className="ed-hint" aria-live="polite">
                  {notice}
                </output>
              )}
              <h1>
                醒来之后，
                <br />
                世界只剩向上。
              </h1>
              <p>
                你在一部没有下行按钮的电梯里醒来。
                <br />
                门外传来一阵轻响。
              </p>
              <div className="ed-actions">
                <button
                  className="ed-primary"
                  disabled={!ready}
                  onClick={() => dispatch({ type: 'begin' })}
                >
                  起身看看 <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </section>
        ) : (
          <>
            <div className="ed-resources">
              {[
                ['生命', run.quota, Heart],
                ['精力', run.stamina, Leaf],
                ['金币', run.material, Coins],
                ['电力', run.power, Zap],
              ].map(([name, n, I]) => {
                const C = I as LucideIcon;
                return (
                  <div
                    key={String(name)}
                    title={
                      (
                        {
                          生命: '有限的生存次数。睡眠消耗 1；幸存者 AI、BOSS 战败或主动救援按回收费用扣除。',
                          精力: '出勤、探索和撤离需要精力；睡眠、苹果和药品可以恢复。',
                          补给: '出勤消耗 1；睡眠消耗 1 并恢复更多精力。',
                          金币: '购买物品、升级电梯和建造设施。',
                          电力: '用于设备制造、种植和探索整备。',
                          燃料: '发电机将 1 燃料转为 8 电力。',
                          药品: '医疗站或休整点消耗药品恢复精力。',
                          废料: '强化卡牌，也可回收金币或制成燃料。',
                        } as Record<string, string>
                      )[String(name)]
                    }
                  >
                    <C size={16} />
                    <span>{String(name)}</span>
                    <b>{String(n)}</b>
                  </div>
                );
              })}
            </div>
            <div className="ed-shell">
              <aside className="ed-sidebar">
                <p className="ed-kicker">
                  DAY {String(run.day).padStart(2, '0')}
                </p>
                <div className="ed-floor-display">
                  {String(run.floor).padStart(2, '0')}
                  <small>当前楼层 / 10</small>
                </div>
                <p className="ed-phase">
                  <span /> {phaseName[run.phase]}
                </p>
                <nav>
                  {[
                    ['base', '电梯基地', BedDouble],
                    ['map', '选择楼层', ArrowUp],
                    ['floor', '继续探索', DoorOpen],
                    ['inventory', '行装与构筑', Backpack],
                  ].map(([id, name, I]) => {
                    const C = I as LucideIcon;
                    return (
                      <button
                        key={String(id)}
                        className={tab === id ? 'active' : ''}
                        disabled={
                          run.phase === 'combat' ||
                          ((id === 'base' || id === 'map') &&
                            run.phase === 'floor') ||
                          (id === 'floor' && run.phase !== 'floor')
                        }
                        onClick={() => setTab(String(id))}
                      >
                        <C size={17} />
                        {String(name)}
                        <ChevronRight size={13} />
                      </button>
                    );
                  })}
                </nav>
              </aside>
              <div className={`ed-main view-${tab}`}>
                {!bagOpen &&
                  tutorialFloor(run) &&
                  run.phase === 'floor' &&
                  tab === 'inventory' && (
                    <button
                      className="tutorial-build-return"
                      onClick={() => {
                        setTab('floor');
                        setInspection(null);
                        setPinned(false);
                      }}
                    >
                      返回房间 <ArrowRight size={18} />
                    </button>
                  )}
                {!bagOpen && run.phase === 'base' && tab !== 'base' && (
                  <div className="ed-terminal-nav">
                    <span>
                      {['upgrades', 'survivors', 'log', 'prep'].includes(tab)
                        ? '电梯系统'
                        : tab === 'inventory'
                          ? '桌面 / 行装与构筑'
                          : tab === 'identify'
                            ? '鉴定台 / 物品解析'
                            : '门禁 / 选择楼层'}
                    </span>
                    {['upgrades', 'survivors', 'log', 'prep'].includes(tab) && (
                      <nav aria-label="电梯系统界面">
                        {[
                          ['upgrades', '电梯改造'],
                          ['survivors', '幸存者榜'],
                          ['log', '旅程日志'],
                          ['prep', '下一次出发'],
                        ].map(([id, label]) => (
                          <button
                            key={id}
                            className={tab === id ? 'active' : ''}
                            onClick={() => setTab(id)}
                          >
                            {label}
                          </button>
                        ))}
                      </nav>
                    )}
                    <button
                      onClick={() => setTab('base')}
                      aria-label="返回电梯房间"
                    >
                      <X size={20} />
                    </button>
                  </div>
                )}

                {!(notice || run.notice).startsWith('协议生效：') && (
                  <output
                    className={
                      'ed-notice' +
                      (notice && notice !== run.notice
                        ? ' ed-action-error'
                        : '')
                    }
                    aria-live="polite"
                  >
                    <Radio size={15} />
                    <span>{notice || run.notice}</span>
                  </output>
                )}
                {!bagOpen &&
                  run.phase !== 'combat' &&
                  run.phase !== 'ended' &&
                  (tab === 'inventory' ? (
                    <Onboarding key="inventory" context="inventory" />
                  ) : tab === 'map' &&
                    !(
                      run.day === 1 &&
                      !run.used &&
                      [5, 6].includes(run.floors[0].routeVersion ?? 0)
                    ) ? (
                    <Onboarding key="map" context="map" />
                  ) : tab === 'upgrades' || tab === 'prep' ? (
                    <Onboarding key="terminal" context="terminal" />
                  ) : tab === 'base' &&
                    run.phase === 'base' &&
                    !(run.day === 1 && !run.used && checkpoint(run) === 0) ? (
                    <Onboarding key="room" context="room" />
                  ) : tab === 'floor' &&
                    ![5, 6].includes(f.routeVersion ?? 0) &&
                    !isFieldNode(currentNode(run)) ? (
                    <Onboarding key="explore" context="explore" />
                  ) : null)}
                {bagOpen ? (
                  <section className="global-bag-view">
                    <header>
                      <h2>行囊与战斗桌面</h2>
                      <button onClick={closeBag} aria-label="关闭背包">
                        完成整理 <X size={19} />
                      </button>
                    </header>
                    {inventory()}
                  </section>
                ) : run.loot ? (
                  <LootScene
                    loot={run.loot}
                    onAction={dispatch}
                    onBag={() => goBuild()}
                  />
                ) : run.phase === 'combat' ? (
                  combat()
                ) : run.phase === 'ended' ? (
                  <>
                    <section className="ed-ending">
                      <Trophy size={54} />
                      <p className="ed-kicker">END OF TRANSMISSION</p>
                      <h1>{run.ending}</h1>
                      <div>
                        <span>
                          <b>{run.best}</b>最高通关楼层
                        </span>
                        <span>
                          <b>{ranking(run).find((x) => x.id === 0)!.rank}</b>
                          本局排名
                        </span>
                        <span>
                          <b>{run.day}</b>存活天数
                        </span>
                      </div>
                      <p>
                        {run.ending.includes('完成')
                          ? '电梯停在第十层。广播第一次没有命令，只说了一句：我们还会再见。'
                          : '屏幕暗了下来。你到过的高度仍会被记住。'}
                      </p>
                      <button
                        className="ed-primary"
                        onClick={() => setReset(true)}
                      >
                        开启新的电梯
                      </button>
                    </section>
                    {survivors()}
                  </>
                ) : tab === 'base' ? (
                  <>
                    {run.homeGuide && run.homeGuide !== 'done' && (
                      <Homecoming
                        run={run}
                        onAction={dispatch}
                        onSleep={() => setSleepPrompt(true)}
                      />
                    )}
                    <ElevatorRoom
                      arrival={
                        run.day === 1 && !run.used && checkpoint(run) === 0
                      }
                      floor={checkpoint(run)}
                      day={run.day}
                      used={run.used}
                      level={run.level}
                      onTable={() => setTab('inventory')}
                      onIdentify={() =>
                        run.level >= 4 ? setTab('identify') : setTab('upgrades')
                      }
                      onDoor={() => setTab('map')}
                      onBed={() => setSleepPrompt(true)}
                      onTerminal={() => setTab('upgrades')}
                    />
                  </>
                ) : tab === 'upgrades' || tab === 'prep' ? (
                  <>
                    <Homecoming
                      run={run}
                      onAction={dispatch}
                      onSleep={() => setSleepPrompt(true)}
                    />
                    {terminal()}
                  </>
                ) : tab === 'map' ? (
                  map()
                ) : tab === 'floor' ? (
                  floor()
                ) : tab === 'identify' ? (
                  <IdentifyTable
                    items={run.items}
                    initialUid={scanUid}
                    onBuild={goBuild}
                    onScan={(uid) => {
                      const next = dispatch({ type: 'scan', id: uid });
                      if (next) setNotice('物品已交由鉴定台处理。');
                      return next?.items.find((x) => x.uid === uid) ?? null;
                    }}
                  />
                ) : tab === 'inventory' ? (
                  inventory()
                ) : tab === 'survivors' ? (
                  survivors()
                ) : (
                  <section className="ed-panel">
                    <h2>旅程日志</h2>
                    {run.log.map((line, i) => (
                      <p className="ed-log-line" key={i}>
                        {line}
                      </p>
                    ))}
                  </section>
                )}
              </div>
            </div>
          </>
        )}
        {inspected && inspection && !baseInspect && (
          <dialog
            open
            className={
              'ed-item-tooltip ed-inspect-dialog' +
              (pinned ? ' ed-pinned-detail' : '')
            }
            aria-modal={false}
            tabIndex={-1}
            aria-label="物品详情"
            style={{
              left: inspection.x,
              top: inspection.y,
              maxHeight: `calc(100dvh - ${inspection.y + 12}px)`,
            }}
            onPointerEnter={keepInspection}
            onPointerLeave={hideInspection}
            onFocusCapture={keepInspection}
            onBlurCapture={hideInspection}
          >
            <button
              className="ed-close-detail"
              onClick={() => {
                setInspection(null);
                setPinned(false);
              }}
            >
              关闭详情
            </button>
            {run.phase === 'combat' && (
              <p className="ed-detail-play-state">
                {playing ? '战斗继续播放' : '战斗已暂停'}
              </p>
            )}
            {itemDetailBody()}
          </dialog>
        )}
        <Dialog open={settings} onOpenChange={setSettings}>
          <DialogContent className="ed-dialog">
            <DialogTitle>设置与记录</DialogTitle>
            <DialogDescription>f9 · 幸存者电梯</DialogDescription>
            <p>
              最高通关 {run.best} F · 第 {run.day} 天 · {saved}
            </p>
            <div className="ed-actions">
              <button
                onClick={() => {
                  setSettings(false);
                  setHelp(true);
                }}
              >
                <BookOpen size={16} />
                指南
              </button>
              <button onClick={exportRun}>
                <Download size={16} />
                导出存档
              </button>
              <button onClick={() => fileRef.current?.click()}>
                <Upload size={16} />
                导入存档
              </button>
              <button
                onClick={() => {
                  setSettings(false);
                  setReset(true);
                }}
              >
                <RotateCcw size={16} />
                重新开始
              </button>
              <a href={sitePath('/design/')}>设计档案 ↗</a>
              <a href={sitePath('/art/?mode=3d')}>3D 原型 · 战斗 ↗</a>
              <a href={sitePath('/art/base/refined/')}>3D 原型 · 电梯基地 ↗</a>
              <a href={sitePath('/legacy/')}>旧档备份 ↗</a>
            </div>
          </DialogContent>
        </Dialog>
        {sleeping && (
          <output className="ed-sleep-film">
            <i />
            <p>电梯缓缓熄灯</p>
            <b>DAY {run.day}</b>
            <small>门外的世界仍在继续……</small>
          </output>
        )}
        <Dialog open={news && !sleeping} onOpenChange={setNews}>
          <DialogContent className="ed-dialog ed-daily-news">
            <DialogTitle>
              昨日幸存者速报 · 第 {run.dailyReport?.day} 天
            </DialogTitle>
            <DialogDescription>
              电梯系统已汇总其他 99 名参与者的动向。
            </DialogDescription>
            <p>
              仍存活 {run.bots.filter((b) => b.alive).length} 人 · 昨日阵亡{' '}
              {run.dailyReport?.rows.filter((b) => b.wasAlive && !b.alive)
                .length ?? 0}{' '}
              人
            </p>
            <div className="ed-news-list">
              {[...(run.dailyReport?.rows ?? [])]
                .sort(
                  (a, b) =>
                    Number(b.wasAlive && !b.alive) -
                      Number(a.wasAlive && !a.alive) || b.floor - a.floor,
                )
                .map((b) => (
                  <article key={b.id}>
                    <b>
                      #{String(b.id).padStart(3, '0')} ·{' '}
                      {b.alive ? '存活' : '阵亡'}
                    </b>
                    <span>
                      {b.previousFloor}F → {b.floor}F
                    </span>
                    <p>{b.status}</p>
                  </article>
                ))}
            </div>
            <button onClick={() => setNews(false)}>开始新的一天</button>
          </DialogContent>
        </Dialog>
        <Dialog open={sleepPrompt} onOpenChange={setSleepPrompt}>
          <DialogContent className="ed-dialog">
            <DialogTitle>让门外的世界再等一会儿。</DialogTitle>
            <DialogDescription>
              睡一觉，醒来就是下一天。每日没有倒计时。
            </DialogDescription>
            <p>
              生命 −1。
              {itemCount(run, 'supply', false) > 0
                ? '消耗 1 补给，恢复 50 精力。'
                : '没有补给，仅恢复 15 精力。'}
              {!run.used && '今天尚未出勤，睡眠会放弃今天的出发机会。'}
            </p>
            <p>
              基地可用密封补给总量：{itemCount(run, 'supply', false)} →{' '}
              {Math.max(0, itemCount(run, 'supply', false) - 1)}
              。按现有物品顺序从仓库、背包或安全容器扣除，具体来源显示在睡眠结果中。
            </p>
            <button
              className="ed-primary"
              onClick={() => {
                const next = dispatch({ type: 'sleep' });
                if (next) {
                  setSleepPrompt(false);
                  setSleeping(true);
                }
              }}
            >
              睡到明天
            </button>
          </DialogContent>
        </Dialog>
        <Dialog open={help} onOpenChange={setHelp}>
          <DialogContent className="ed-dialog">
            <DialogTitle>欢迎加入幸存者游戏</DialogTitle>
            <DialogDescription>
              100
              名参与者，每人一部电梯。正常航行只能向上；未通关撤离返回原停靠点。高层奖励更多，合理的卡牌构筑能帮助你走得更远。
            </DialogDescription>
            <div className="ed-help">
              <h3>准备 → 出勤 → 撤离 → 成长</h3>
              <p>
                每天一次出勤，无倒计时。睡觉推进一天并扣 1 生命。有补给恢复 50
                精力，没有补给恢复 15。初始 12 生命。
              </p>
              <p>
                楼层由事件、搜索、解谜、商人和守卫组成。搜索后自行挑选物资，预留
                8 精力正常返回；完成守卫后撤离才会提交最高通关楼层。
              </p>
              <p>
                实体使用一次性鉴定仪变成卡牌。Lv.4
                鉴定台可降低鉴定成本。上阵卡不占背包，1–3
                格卡不可跨路。安全容器独立计量。
              </p>
              <p>
                回收扣
                3、5、7……生命，普通背包丢失。成功正常撤回重置连续救援计数；睡觉不重置。装备与基地保留，生命耗尽则本局结束。
              </p>
              <p>
                十层是本 Demo
                的完整范围，撤离第十层后结算。楼层使用离线种子重组，尚未接入大模型；机器人采用可解释的数值模拟。
              </p>
              <p>
                卡牌持续自动发动，不承受攻击。伤害先扣同路屏障，击破时的溢出伤害进入宿主；屏障本场不重建，破路后直击宿主。90
                秒未分胜负则平局，无击败奖励。卡牌稀有度固定，消耗废料强化，吞噬同名同品阶卡牌升阶。
              </p>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={reset} onOpenChange={setReset}>
          <DialogContent className="ed-dialog">
            <DialogTitle>开始新的一局？</DialogTitle>
            <DialogDescription>
              当前进度会被新局替换。需要保留时，请先用顶部下载按钮导出存档。
            </DialogDescription>
            <div className="ed-actions">
              <button onClick={() => setReset(false)}>继续当前旅程</button>
              <button className="ed-primary" onClick={resetRun}>
                确认重新开始
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </CargoProvider>
  );
}
