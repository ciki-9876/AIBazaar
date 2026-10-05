const experiments = [
  {
    title: '离屏导播',
    state: '本地模型',
    detail:
      '观察三名选手独自探索、带回物资、建设电梯与升层；可暂停写信询问他们的计划。',
    href: '/survival/ai-campaign',
    action: '进入异步行动实验',
  },
  {
    title: '竞争者遭遇',
    state: '可试玩',
    detail:
      '三种人物倾向、八种冲突局面。观察 AI 如何移动、搜刮、援助和争夺资源。',
    href: '/survival/ai-demo',
    action: '进入遭遇实验',
  },
  {
    title: '电梯邮箱',
    state: '本地模型',
    detail: '向竞争者写信，谈补给、交换或合作；进入房间验证承诺是否兑现。',
    href: '/survival/ai-mail',
    action: '进入电梯邮箱',
  },
];

export default function ElevatorAiPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-16 text-[#e9e5d5]">
      <p className="text-sm uppercase tracking-[0.28em] text-[#e6ad68]">
        F9 · Experimental project
      </p>
      <h1 className="mt-4 text-4xl font-semibold">电梯 AI 实验区</h1>
      <p className="mt-4 max-w-2xl leading-7 text-[#b6c0b4]">
        AI
        选手与实时决策在这里单独试验。当前实验结论尚未确定，不会改变电梯主项目的规则或发布包。
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {experiments.map((experiment) => (
          <section
            className="rounded-lg border border-[#394337] bg-[#19231f] p-6"
            key={experiment.title}
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-medium">{experiment.title}</h2>
              <span className="rounded border border-[#756344] px-2 py-1 text-xs text-[#e6ad68]">
                {experiment.state}
              </span>
            </div>
            <p className="mt-4 leading-6 text-[#b6c0b4]">{experiment.detail}</p>
            <a
              href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}${experiment.href}`}
              className="mt-6 inline-flex items-center gap-4 border border-[#a58b59] bg-[#c8ae78] px-5 py-3 font-semibold text-[#15201c] transition-colors hover:bg-[#e0c68d] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e6ad68]"
            >
              {experiment.action}
              <span aria-hidden="true">→</span>
            </a>
          </section>
        ))}
      </div>
      <p className="mt-10 border-t border-[#394337] pt-5 text-sm text-[#87958b]">
        实验完成后，由明确的合并决定将经过验证的实现并回安泊电梯求生。
      </p>
    </main>
  );
}
