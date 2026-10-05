import { writeFile } from 'node:fs/promises';
import { createMailEncounter } from '../src/lib/survival-ai/encounter.ts';
import { startMail, commitMail } from '../src/lib/survival-ai/mail.ts';
const rows = [],
  base = 'chat-proof:' + Date.now();
for (const profile of ['ally', 'broker', 'predator']) {
  let s = createMailEncounter(20261004, profile, 'help', base + ':' + profile);
  for (const question of [
    '你有什么战术？我不想被怪物围住。',
    '组队吗？你最在乎什么？',
    '如果我骗了你，你会怎么做？',
  ]) {
    const sent = startMail(s, question);
    const response = await fetch('http://localhost:4192/api/ai-mail/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sent.request),
    });
    const reply = await response.json();
    if (!response.ok) throw new Error(reply.error);
    const result = commitMail(sent.state, reply);
    if (result.reason !== 'committed') throw new Error(result.reason);
    if (s.mail.agreements.length !== result.state.mail.agreements.length)
      throw new Error('Chat invented agreement');
    s = result.state;
    rows.push({ profile, question, reply });
    console.log(profile, question, reply.body);
  }
}
await writeFile(
  'work/ai-mail/chat-live-evidence.json',
  JSON.stringify(rows, null, 2),
);
