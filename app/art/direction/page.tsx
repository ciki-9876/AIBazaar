/* oxlint-disable next/no-html-link-for-pages -- Static export uses document navigation; client RSC navigation is unavailable on the host. */
import { sitePath } from '@/lib/site-path';
import Image from 'next/image';
import { common, flat, room, delivery, type Chapter } from './content';
function Chapters({ items }: { items: Chapter[] }) {
  return (
    <>
      {items.map((c) => (
        <section key={c.title}>
          <h3>{c.title}</h3>
          {c.paragraphs?.map((p) => (
            <p key={p.slice(0, 25)}>{p}</p>
          ))}
          {c.steps && (
            <ol>
              {c.steps.map((p) => (
                <li key={p.slice(0, 25)}>{p}</li>
              ))}
            </ol>
          )}
        </section>
      ))}
    </>
  );
}
export default function Direction() {
  return (
    <main className="art-dossier">
      <header>
        <a href={sitePath('/art/')}>← 返回战斗美术试验</a>
        <span className="art-kicker" style={{ marginTop: 30 }}>
          F9 / ART DIRECTION STUDY / 2026.09
        </span>
        <h1>
          同一个异常世界，
          <br />
          两种触摸它的方式。
        </h1>
        <p>
          从表现维度到统一艺术语言，从战斗与电梯基地到每张标签、每次命中。以下是可讨论的美术提案，尚未作为正式方向确认。
        </p>
        <nav>
          <a href="#premise">共同前提</a>
          <a href="#flat">A · 2D 炭笔档案</a>
          <a href="#room">B · 3D 工业异象</a>
          <a href="#delivery">范围与建议</a>
          <a href="#sources">参考依据</a>
          <a href={sitePath('/art-direction.md')} download>
            下载全文 Markdown ↓
          </a>
        </nav>
      </header>
      <section id="premise">
        <h2>世界保持不变，重新选择表现语言</h2>
        <Chapters items={common} />
        <table>
          <thead>
            <tr>
              <th>层级</th>
              <th>A / 炭笔档案</th>
              <th>B / 工业异象</th>
            </tr>
          </thead>
          <tbody>
            {[
              [
                '维度',
                '2D 分层背景、正交战斗与基地剖面',
                '真实 3D 场景、第一人称与战术俯视',
              ],
              ['主锚点', 'This War of Mine', 'Pacific Drive'],
              [
                '美术媒介',
                '炭笔、干刷、纸张与少量染色',
                '简化真实比例、搪瓷、金属、旧塑料',
              ],
              [
                '战斗',
                '物件档案铺开，左右三路正交读盘',
                '检查台对坐，镜头升起，实体物件匣对战',
              ],
              [
                '基地',
                '单屏剖面，设施成为可见生活物件',
                '生活舱第一人称，建造切换斜俯视',
              ],
              ['主要吸引力', '亲手留下的生存档案', '亲身居住的异常电梯'],
              [
                '主要投入',
                '插画质量、分层动画、媒介统一',
                '模型与材质、镜头、手部动画、优化',
              ],
            ].map((row) => (
              <tr key={row[0]}>
                {row.map((cell) => (
                  <td key={cell}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section id="flat">
        <h2>A / 2D · 炭笔档案</h2>
        <div className="art-plan-links">
          <a href={sitePath('/art/?mode=2d')}>进入 2D 战斗原型 →</a>
        </div>
        <Image
          src={sitePath('/art-assets/charcoal-scene.png')}
          alt="炭笔检查站：两端人物与中央负空间"
          width={1672}
          height={941}
          unoptimized
          style={{ width: '100%', height: 'auto', border: '1px solid #65715a' }}
        />
        <Chapters items={flat} />
      </section>
      <section id="room">
        <h2>B / 3D · 工业异象</h2>
        <div className="art-plan-links">
          <a href={sitePath('/art/?mode=3d')}>进入 3D 战斗原型 →</a>
        </div>
        <p className="art-note">
          主艺术锚点是《Pacific
          Drive》。对坐后升镜的局部调度借鉴《邪恶冥刻》提供的启发；桌面结构、世界设定与所有卡面由
          F9 的规则决定。
        </p>
        <Chapters items={room} />
      </section>
      <section id="delivery">
        <h2>原型范围、取舍与下一步</h2>
        <Chapters items={delivery} />
      </section>
      <section id="sources">
        <h2>参考依据</h2>
        <p>
          以下链接用于核实参考作品与观察其官方画面。本文具体的 F9
          色号、时间、镜头、设施、界面、制作顺序与推荐结论都是设计提案，不是对参考作品技术实现的断言。
        </p>
        <ul>
          <li>
            <a
              href="https://11bitstudios.com/games/this-war-of-mine/"
              target="_blank"
              rel="noreferrer"
            >
              11 bit studios · This War of Mine 官方页面与画面
            </a>
            ：生存者视角与庇护所主题。
          </li>
          <li>
            <a
              href="https://ir.11bitstudios.com/en/company-authorities/"
              target="_blank"
              rel="noreferrer"
            >
              11 bit studios · Company authorities
            </a>
            ：美术负责人关于作品炭笔美学的官方介绍。
          </li>
          <li>
            <a
              href="https://www.playstation.com/en-us/games/pacific-drive/"
              target="_blank"
              rel="noreferrer"
            >
              PlayStation · Pacific Drive 官方页面与画面
            </a>
            ：异常外界、车库基地与物件维护。
          </li>
          <li>
            <a
              href="https://blog.playstation.com/2023/11/30/unravel-the-gameplay-loop-of-pacific-drive-launching-on-ps5-feb-22/"
              target="_blank"
              rel="noreferrer"
            >
              Ironwood Studios · Pacific Drive 玩法循环介绍
            </a>
            ：维修、搜集与返回基地的循环。
          </li>
        </ul>
        <p>
          原型未使用参考游戏的原画、角色模型、界面截图或音频。原创背景与概念道具图由内置
          imagegen 生成；提示词记录保存在素材目录。
        </p>
      </section>
      <a className="art-return" href={sitePath('/art/')}>
        回到原型 ↑
      </a>
    </main>
  );
}
