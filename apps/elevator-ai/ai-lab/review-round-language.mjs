/** Reviewed evidence for THIS recorded baseline, not a universal semantic classifier. */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const output = resolve(process.argv[2] || 'work/ai-training/round-2026-10-04');
const evidence = JSON.parse(
  await readFile(resolve(output, 'language-evidence.json'), 'utf8'),
);
const findings = [
  {
    scene: 'mail',
    index: 0,
    quote: '藏在柜子后',
    issue: '矮柜不遮挡视野，不能作为躲藏视野掩体。',
    kind: 'unsupported-mechanic',
  },
  {
    scene: 'mail',
    index: 2,
    quote: '我只在确认你到场后交付零件，你亦需交付水',
    issue: '权威约定是选手给水，玩家给零件；邮件把双方交换方向颠倒。',
    kind: 'state-contradiction',
  },
  {
    scene: 'mail',
    index: 3,
    quote: '用物资遮挡视野',
    issue: '库存物资不能生成视野掩体。',
    kind: 'unsupported-mechanic',
  },
  {
    scene: 'mail',
    index: 6,
    quote: '高点',
    issue: '房间是平面，不存在可占据的高处。',
    kind: 'unsupported-mechanic',
  },
  {
    scene: 'mail',
    index: 8,
    quote: '我会当场交付1个机械零件，你同时交付1瓶水',
    issue: '已接受的交易方向被颠倒。',
    kind: 'state-contradiction',
  },
];
for (const f of findings) {
  if (!evidence.mail[f.index]?.reply?.body.includes(f.quote))
    throw new Error('This annotation belongs to another inference run');
  f.profile = evidence.mail[f.index].profile;
}
const urgency = [9, 11, 12, 13, 14, 15, 17, 23].map((index) => {
  const d = evidence.decisions[index];
  return {
    scene: 'campaign',
    index,
    profile: d.profile,
    hp: d.request.self.hp,
    quote: d.choice.reason,
    kind: 'numeric-misunderstanding',
    issue:
      '精神90–95被描述为耗尽、接近临界或极限；实际归零才死亡。合法行动不代表理由正确。',
  };
});
for (const f of urgency)
  if (f.hp < 90) throw new Error('Review reference changed');
const letter = {
  scene: 'campaign-letter',
  index: 2,
  quote: '行囊与仓库资源均未使用',
  kind: 'state-contradiction',
  issue: '记录里已喝水，并已为正在进行的进食消耗食物。邮件不能宣称资源未使用。',
};
if (!evidence.campaignLetters[2].reply.body.includes(letter.quote))
  throw new Error('Review reference changed');
const review = {
  reviewer:
    'Codex review of recorded outputs against executable rules; not user acceptance',
  mailReviewed: 9,
  mailWithClearSemanticFailure: 5,
  findings: [...findings, ...urgency, letter],
  note: 'The backend accepted 9/9 letters and 24/24 actions. Its self-review missed these errors. No claim of semantic success or strategic training is made.',
  nextTrainingData:
    'Use these errors as rejected examples with state-grounded corrected alternatives for a later Qwen LoRA/preference round. Do not treat the old wording as positive labels.',
};
await writeFile(
  resolve(output, 'language-review.json'),
  JSON.stringify(review, null, 2) + '\n',
);
console.log(
  JSON.stringify({
    semanticFailures: 5,
    mailReviewed: 9,
    numericFailures: urgency.length,
  }),
);
