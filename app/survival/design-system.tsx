'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { X, Gem, ArrowRight } from 'lucide-react';
import { createSurvival, survivalAction, ITEMS } from '@/lib/survival-room';
import EquipmentBoard from './equipment';
import CargoGrid from './cargo';
import { sitePath } from '@/lib/site-path';
import { SURVIVAL_UI } from './design-tokens';
const names = [
  '墨影',
  '冷铁',
  '青铜',
  '苔灰',
  '旧金',
  '羊皮',
  '灰字',
  '磷光',
  '危险',
  '深渊',
];
export default function DesignSystem({ close }: { close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [sample, setSample] = useState(() => ({
    ...createSurvival(92620),
    status: 'running' as const,
    bag: [
      { ...ITEMS['energy-core'], uid: 'sample-core' },
      { ...ITEMS['lift-material'], uid: 'sample-x' },
      { ...ITEMS.water, uid: 'sample-water' },
    ],
  }));
  useEffect(() => {
    const d = ref.current!;
    d.showModal();
    return () => d.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="f9-design-system"
      aria-label="界面设计系统"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <header>
        <div>
          <small>F9 · 冥河庭院 / 界面图鉴</small>
          <h2>暗铜与磷光 · 像素界面</h2>
        </div>
        <button onClick={close} aria-label="关闭设计系统">
          <X />
        </button>
      </header>
      <div className="f9-design-body">
        <p className="f9-design-intro">
          16
          像素中文、细阶边缘与低饱和金属。高密度细节留给物品与表情，文字只服务操作。
        </p>
        <section>
          <h3>
            <span>01</span> 场景里的颜色
          </h3>
          <div className="f9-swatches">
            {Object.entries(SURVIVAL_UI).map(([key, color], i) => (
              <div key={key}>
                <i style={{ background: color }} />
                <strong>{names[i]}</strong>
                <small>{color}</small>
              </div>
            ))}
          </div>
        </section>
        <section>
          <Image
            unoptimized
            width={192}
            height={192}
            className="f9-demon-sample"
            src={sitePath('/art-assets/survival/demon-pixel-v3.png')}
            alt="黑色圆脸、红色眼睛、龇牙的像素恶魔"
          />
        </section>
        <section className="f9-type-spec">
          <h3>
            <span>02</span> 文字与层次
          </h3>
          <div>
            <h2>每一次归来，都有人等你。</h2>
            <p>
              GNU Unifont 原生 16 像素字形；正文 16 px，标题 32
              px。像素字体在场景绘字前预载，汉字与数字保持同一风格。
            </p>
            <p className="f9-ds-thought">这是什么玩意儿？人工智能？</p>
          </div>
        </section>
        <section>
          <h3>
            <span>03</span> 操作与反馈
          </h3>
          <div className="f9-control-samples">
            <button className="f9-primary">
              接入能源 <ArrowRight size={16} />
            </button>
            <button>稍后整理</button>
            <button disabled>能源不足</button>
            <span className="f9-receipt">
              <Gem size={16} /> + 低质脑浆 ×1
            </span>
            <kbd>E</kbd>
          </div>
          <div className="base-upgrade-progress">
            <progress
              className="survival-screen-reader"
              aria-label="进度样式示例"
              value={65}
              max={100}
            />
            <i style={{ width: '65%' }} />
            <span>居所升级 · 65 / 100</span>
          </div>
          <p>
            悬停提亮边缘；选中增加金色内框；禁用降低明度；键盘焦点使用清晰外框。减少动态模式保留全部信息。
          </p>
        </section>
        <section>
          <h3>
            <span>04</span> 装备与容器 · 可操作样本
          </h3>
          <EquipmentBoard
            state={sample}
            editing
            act={(a) => setSample((s) => survivalAction(s, a) as typeof sample)}
          />
          <CargoGrid
            state={sample}
            act={(a) => setSample((s) => survivalAction(s, a) as typeof sample)}
          />
          <p>这里使用游戏中的真实组件。调整样本不会改变当前存档或背包。</p>
        </section>
        <section>
          <h3>
            <span>05</span> 使用约定
          </h3>
          <p>
            心声固定在画面下方；物品图标有墨线与压暗底色；危险使用锈红；迷雾中不显示未发现物品。界面动效不参与角色与标签的空间投影。电梯里的屏幕和基地升级界面共用同一套画面。
          </p>
        </section>
      </div>
      <footer>
        <span>细像素界面 · v2</span>
        <span>Esc 返回设置</span>
      </footer>
    </dialog>
  );
}
