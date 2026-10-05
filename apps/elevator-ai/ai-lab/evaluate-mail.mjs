/** Opt-in live inference evidence. Unit tests never substitute these fixtures for an actual model. */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  createMailEncounter,
  encounterRequest,
  applyEncounterReply,
  stepEncounter,
  playerCommand,
} from '../src/lib/survival-ai/encounter.ts';
import {
  startMail,
  commitMail,
  departMail,
  confirmMailOffer,
  MAIL_CASES,
} from '../src/lib/survival-ai/mail.ts';
import { chooseEncounter } from '../src/lib/survival-ai/encounter-policy.ts';
import model from '../src/lib/survival-ai/encounter-model.json' with { type: 'json' };
const endpoint = process.argv[2] || 'http://localhost:4192';
const rows = [];
const cases = [
  ['ally', 'help', 0],
  ['broker', 'help', 0],
  ['predator', 'help', 0],
  ['broker', 'bargain', 1],
  ['ally', 'guardian', 0],
  ['predator', 'trust', 0],
];
async function send(s, text, offer = 0) {
  const sent = startMail(s, text, offer);
  if (!sent.request) throw new Error(sent.reason);
  const response = await fetch(endpoint + '/api/ai-mail/reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sent.request),
  });
  const reply = await response.json();
  if (!response.ok) throw new Error(reply.error);
  const committed = commitMail(sent.state, reply);
  rows.push({
    profile: s.profile,
    case: s.mail.case,
    message: text,
    request: sent.request,
    reply,
    receipt: committed.reason,
  });
  console.log(
    s.profile,
    s.mail.case,
    reply.proposal.intent,
    reply.proposal.decision,
    committed.reason,
    Math.round(reply.milliseconds) + 'ms',
  );
  if (committed.reason !== 'committed') throw new Error(committed.reason);
  return committed.state;
}
for (const [profile, scenario, offer] of cases) {
  let s = createMailEncounter(
    20261003,
    profile,
    scenario,
    'live:' + profile + ':' + scenario,
  );
  s = await send(s, MAIL_CASES.find((c) => c.id === scenario).prompt, offer);
  if (s.mail.agreements[0]?.status === 'offered')
    s = confirmMailOffer(s, s.mail.agreements[0].id, true);
  if (s.mail.agreements[0]?.status === 'accepted') {
    s = await send(s, '再确认一下，我们刚才的约定还有效吗？');
    const live = rows.at(-1);
    live.retained = s.mail.agreements[0].status === 'accepted';
    if (!live.retained && s.mail.agreements[0].status !== 'cancelled')
      throw new Error('Promise lost without explicit cancel');
  }
  s = departMail(s);
  if (s.mail.agreements[0]?.topic === 'guard')
    s = playerCommand(s, { type: 'move', to: { x: 49.5, z: 66.5 } });
  for (let i = 0; i < 360 && s.actors[0].status === 'active'; i++) {
    if (i % 15 === 0 && s.actors[1].status === 'active') {
      const q = encounterRequest(s);
      s = applyEncounterReply(s, q, chooseEncounter(model, q)).state;
    }
    s = stepEncounter(s);
  }
  rows.at(-1).observed = {
    playerWater: s.actors[0].bag
      .filter((i) => i.kind === 'water')
      .map((i) => i.uid),
    rivalHP: s.actors[1].hp,
    agreements: s.mail.agreements,
    guardAlive: s.enemies.some((e) => e.kind === 'boss'),
  };
}
const folder = fileURLToPath(
  new URL('../../../work/ai-mail/', import.meta.url),
);
await mkdir(folder, { recursive: true });
await writeFile(
  folder + 'live-evidence.json',
  JSON.stringify(
    {
      schema: 'f9-mail-live-evidence-v1',
      model: 'Qwen3-4B-Instruct-2507 Q4_K_M',
      rows,
    },
    null,
    2,
  ),
);
console.log('Recorded', rows.length, 'real model replies. No paid API used.');
