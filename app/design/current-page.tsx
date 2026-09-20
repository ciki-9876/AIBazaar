import { sitePath } from '@/lib/site-path';
import CardDetail from '../demo/card-detail';
/* oxlint-disable next/no-html-link-for-pages -- Native navigation is used by the existing portable Sites build. */
import { CARDS, SCHOOLS } from '@/lib/demo-cards';
import { OBJECTS, FIELD_NODES, FIELD_TITLES } from '@/lib/field-items';
import { ARCHETYPES } from '@/lib/demo-archetypes';
export default function DesignHome() {
  return (
    <main className="elevator-demo object-handbook">
      <header>
        <a href={sitePath('/')}>← 返回电梯</a>
        <a href={sitePath('/lab')}>打开三路试验场 ↗</a>
        <h1>一件旧物，两种未来</h1>
        <p>
          保留实体，解决门外的机关；带回基地免费鉴定，让它在战斗中运转。两种形态共用同一件物品，不能同时拥有。
        </p>
      </header>
      <section>
        <h2>现场作业</h2>
        <p>
          先搜查物资，再选择工具和操作方案。预览不收费；每次提交消耗2精力，成功后另付路费。没有工具可以花6精力绕行（另计路费，永久放弃此处奖励）。每处机关每层只结算一次。
        </p>
        <div className="object-work-grid">
          {FIELD_NODES.map((node) => (
            <article key={node}>
              <h3>{FIELD_TITLES[node]}</h3>
              <p>
                {
                  {
                    salvage: '观察承重标记，选择拆解位置。',
                    relay: '记住公开信号，按序连接三个端子。',
                    balance: '调整配重，让两臂力矩相等。',
                    pressure: '开关1、2、4单位阀门，凑出安全释放量。',
                    chemistry: '根据铭牌比例，投入正确份数的试剂。',
                    purify: '按沉淀、加热、冷凝的工艺设定次序。',
                  }[node]
                }
              </p>
              <small>
                {Object.values(OBJECTS)
                  .filter((o) => o.node === node)
                  .map((o) => o.name)
                  .join(' / ')}
              </small>
            </article>
          ))}
        </div>
      </section>
      <section>
        <h2>12件实体与转化结果</h2>
        <div className="object-catalog">
          {CARDS.map((c) => {
            const o = OBJECTS[c.id];
            return (
              <article key={c.id}>
                <span>
                  {SCHOOLS[c.school!]} · {c.size}格
                </span>
                <h3>{o.name}</h3>
                <p>{o.use}</p>
                <strong>
                  {FIELD_TITLES[o.node]} · {o.verb}
                </strong>
                <p>{o.benefit}。</p>
                <p className={o.consumed ? 'object-consumed' : ''}>
                  {o.consumed
                    ? '消耗型：用尽后本体消失，无法再转化。'
                    : '耐用型：每次出勤限用一次；使用后仍可转化。'}
                </p>
                <hr />
                <h4>转化后：{c.name}</h4>
                <CardDetail
                  card={{
                    id: c.id,
                    uid: c.id,
                    at: 0,
                    quality: 0,
                    level: 0,
                    rarity: c.rarity ?? 0,
                  }}
                />
              </article>
            );
          })}
        </div>
      </section>
      <section>
        <h2>准备与研究</h2>
        <p>
          下一场战斗准备：额外宿主生命最多32、每路额外屏障最多36，生命变化还会按30%影响各路基础屏障；界面显示实际变化。开战时写入战斗配置并消耗。敌情预览与实际开战一致。牵引索让接下来3段路程从3精力降为1；撤离或回收时，未用完的出勤准备失效。
        </p>
        <p>
          菌种研究在本局永久增加宿主生命，上限10；校准记录积存最多4金币抵扣，下次电梯升级自动使用。它们不会跨新开局保留。机关完成记录保存在楼层中，睡眠和重返都不能重复领奖。
        </p>
      </section>
      <section>
        <h2>完整九格构筑</h2>
        <p>这些是试验场的完整配方；冒险仍按电梯等级逐步解锁格子。</p>
        {ARCHETYPES.map((a) => (
          <article key={a.id}>
            <h3>{a.name}</h3>
            <p>{a.core}</p>
            <p>
              {[0, 1, 2]
                .map(
                  (lane) =>
                    `${['上', '中', '下'][lane]}路：${a.variants[0]
                      .slice(lane * 2, lane * 2 + 2)
                      .map((id) => CARDS.find((c) => c.id === id)!.name)
                      .join('＋')}`,
                )
                .join('；')}
            </p>
            <p>弱点：{a.weakness}</p>
          </article>
        ))}
        <p>
          基础品质的标准配方形成相互克制。换牌、精制或大师成长会改变关系，不能仅凭流派名称判断胜负。
        </p>
      </section>
    </main>
  );
}
