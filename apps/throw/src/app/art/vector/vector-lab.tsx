'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { EditorialScene } from '../../adventure/editorial-scene';
import {
  loadEditorialSceneManifest,
  EDITORIAL_ART_ROOT,
  type EditorialSceneManifest,
} from '../../adventure/editorial-scene-renderer';

const assets = [
  ['door', '门与木作'],
  ['bookshelf', '书架'],
  ['desk', '魔术桌'],
  ['hanginglamp', '吊灯'],
  ['window', '窗'],
  ['cabinet', '抽屉柜'],
  ['plant', '盆栽'],
  ['streetlamp', '街灯'],
  ['eli', '伊莱'],
] as const;
type AssetId = (typeof assets)[number][0];

function RasterSample({
  id,
  manifest,
}: {
  id: AssetId;
  manifest: EditorialSceneManifest | null;
}) {
  if (!manifest) return <span className="vl-loading">载入中</span>;
  const actor = id === 'eli';
  const atlas = actor ? manifest.atlases.hero : manifest.atlases.props;
  const frame = actor
    ? manifest.atlases.hero.idle[0]
    : manifest.atlases.props.frames.find((f) => f.id === id)!;
  const scale = 214 / frame.height;
  const style: CSSProperties = {
    width: frame.width * scale,
    height: 214,
  };
  return (
    <svg
      className="vl-raster"
      style={style}
      viewBox={`${frame.x} ${frame.y} ${frame.width} ${frame.height}`}
      aria-label={`现版${assets.find((a) => a[0] === id)?.[1]}`}
    >
      <title>现版{assets.find((a) => a[0] === id)?.[1]}位图</title>
      <image
        href={`${EDITORIAL_ART_ROOT}/${atlas.file}`}
        width={atlas.width}
        height={atlas.height}
      />
    </svg>
  );
}

export default function VectorLab() {
  const [medium, setMedium] = useState<'raster' | 'vector'>('vector');
  const [selected, setSelected] = useState<AssetId>('bookshelf');
  const [zoom, setZoom] = useState(1);
  const [night, setNight] = useState(false);
  const [walking, setWalking] = useState(false);
  const [position, setPosition] = useState(610);
  const [facing, setFacing] = useState<-1 | 1>(1);
  const [manifest, setManifest] = useState<EditorialSceneManifest | null>(null);
  const [assetError, setAssetError] = useState(false);
  const tour = useRef({ x: 610, direction: 1, last: 0 });
  useEffect(() => {
    let disposed = false;
    void loadEditorialSceneManifest()
      .then((value) => {
        if (!disposed) setManifest(value);
      })
      .catch(() => {
        if (!disposed) setAssetError(true);
      });
    return () => {
      disposed = true;
    };
  }, []);
  useEffect(() => {
    if (!walking) return;
    let raf = 0;
    tour.current.last = 0;
    const walk = (time: number) => {
      const current = tour.current;
      if (current.last && !document.hidden) {
        current.x +=
          Math.min(time - current.last, 40) * 0.14 * current.direction;
        if (current.x > 1140) {
          current.x = 1140;
          current.direction = -1;
        }
        if (current.x < 370) {
          current.x = 370;
          current.direction = 1;
        }
        setPosition(current.x);
        setFacing(current.direction as -1 | 1);
      }
      current.last = time;
      raf = requestAnimationFrame(walk);
    };
    raf = requestAnimationFrame(walk);
    return () => cancelAnimationFrame(raf);
  }, [walking]);
  const label = assets.find((a) => a[0] === selected)![1];
  return (
    <main className="vl-page">
      <header className="vl-header">
        <Link className="vl-brand" href="/">
          ♠ <span>THE LAST ACE</span>
        </Link>
        <nav>
          <Link href="/">现版主线</Link>
          <Link href="/art/vector/play" className="vl-play">
            进入 SVG 试演 ↗
          </Link>
        </nav>
      </header>
      <section className="vl-intro">
        <span className="vl-eyebrow">ILLUSTRATION WORKSHOP / 01</span>
        <h1>
          同一种温度，
          <br />
          另一种画法。
        </h1>
        <p>
          沿用你选定的画风。对照原版插画与可编辑的矢量母版，看看轮廓、材质与人物动作的差别。
        </p>
      </section>
      <section className="vl-scene-section" aria-label="工作室画风对照">
        <div className="vl-section-head">
          <h2>里德的工作室</h2>
          <fieldset className="vl-switch" aria-label="场景版本">
            <button
              aria-pressed={medium === 'raster'}
              onClick={() => setMedium('raster')}
            >
              现版插画
            </button>
            <button
              aria-pressed={medium === 'vector'}
              onClick={() => setMedium('vector')}
            >
              SVG 试演
            </button>
          </fieldset>
          <button
            className="vl-walk"
            aria-pressed={walking}
            onClick={() => setWalking(!walking)}
          >
            {walking ? '停下脚步' : '演示行走'}
          </button>
        </div>
        <div className="vl-scene">
          <div className="vl-world">
            <EditorialScene
              mapId="workshop"
              playerX={position}
              facing={facing}
              walking={walking}
              tick={0}
              artMode={medium}
            />
          </div>
          <span className="vl-scene-note">
            {medium === 'vector'
              ? 'SVG 家具与主角 · 保留现版导师与装饰'
              : '现版插画'}{' '}
            / 同一灯光
          </span>
        </div>
      </section>
      <section className="vl-detail-section" aria-label="素材放大对照">
        <div className="vl-section-head">
          <h2>看近一点</h2>
          <fieldset className="vl-switch" aria-label="放大倍率">
            {[1, 2, 4].map((value) => (
              <button
                key={value}
                aria-pressed={zoom === value}
                onClick={() => setZoom(value)}
              >
                {value}×
              </button>
            ))}
          </fieldset>
          <button
            className="vl-walk"
            aria-pressed={night}
            onClick={() => setNight(!night)}
          >
            {night ? '恢复原色' : '试试夜巡配色'}
          </button>
        </div>
        <fieldset className="vl-asset-tabs" aria-label="选择素材">
          {assets.map(([id, name]) => (
            <button
              key={id}
              aria-pressed={selected === id}
              onClick={() => setSelected(id)}
            >
              {name}
            </button>
          ))}
        </fieldset>
        <div className="vl-pair">
          <figure>
            <div className="vl-closeup">
              <div className="vl-zoom" style={{ transform: `scale(${zoom})` }}>
                {assetError ? (
                  <span>素材载入失败，请刷新。</span>
                ) : (
                  <RasterSample id={selected} manifest={manifest} />
                )}
              </div>
            </div>
            <figcaption>
              <strong>现版 · {label}</strong>
              <span>AI 插画母版 / 位图</span>
            </figcaption>
          </figure>
          <figure>
            <div className="vl-closeup">
              <div className="vl-zoom" style={{ transform: `scale(${zoom})` }}>
                <Image
                  className="vl-vector"
                  unoptimized
                  width={200}
                  height={256}
                  src={`/art-assets/throw/vector-v1/${selected}${night ? '-midnight' : ''}.svg`}
                  alt={`SVG ${label}`}
                />
              </div>
            </div>
            <figcaption>
              <strong>SVG · {label}</strong>
              <span>
                {night ? '同一造型，替换配色' : '独立路径 / 分层造型'}
              </span>
            </figcaption>
          </figure>
        </div>
      </section>
      <footer className="vl-footer">
        <p>这是一轮制作方式试验。主线继续使用已选定的插画版本。</p>
        <a href="/art-assets/throw/vector-v1/eli.svg" download="eli.svg">
          下载主角 SVG ↓
        </a>
        <a
          href={`/art-assets/throw/vector-v1/${selected}.svg`}
          download={`${selected}.svg`}
        >
          下载所选素材 ↓
        </a>
      </footer>
    </main>
  );
}
