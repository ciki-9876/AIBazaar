/** Opt-in live local inference. No fixture is presented as model intelligence. */
import { writeFile, mkdir } from 'node:fs/promises';
import {
  createCampaign,
  campaignRequest,
  applyCampaignChoice,
  stepCampaign,
  replayCampaign,
} from '../src/lib/survival-ai/campaign.ts';
import { createMailEncounter } from '../src/lib/survival-ai/encounter.ts';
import { startMail, commitMail } from '../src/lib/survival-ai/mail.ts';
import { fingerprint } from '../src/lib/survival-ai/protocol.ts';
const endpoint = process.argv[2] || 'http://localhost:4192';
const identity = 'live-v2:' + Date.now(); // Adapter only; rules receive this explicit identity.
const letters = [];
async function post(route, value) {
  const r = await fetch(endpoint + route, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  });
  const result = await r.json();
  if (!r.ok) throw new Error(result.error);
  return result;
}
for (const profile of ['ally', 'broker', 'predator']) {
  let s = createMailEncounter(
    20261004,
    profile,
    'help',
    identity + ':' + profile,
  );
  for (const question of [
    '你有什么战术？我不想被怪物围住。',
    '组队吗？你最在乎什么？',
    '如果我骗了你，你会怎么做？',
  ]) {
    const sent = startMail(s, question);
    try {
      const reply = await post('/api/ai-mail/reply', sent.request),
        result = commitMail(sent.state, reply);
      if (result.reason !== 'committed') throw new Error(result.reason);
      letters.push({ profile, question, reply });
      s = result.state;
      console.log(profile, question, reply.body);
    } catch (e) {
      letters.push({ profile, question, error: e.message });
      console.log('REJECTED', profile, e.message);
    }
  }
}
let campaign = createCampaign(20261004, identity + ':campaign');
for (let tick = 0; tick < 1500 && campaign.receipts.length < 85; tick++) {
  for (const id of ['ally', 'broker', 'predator']) {
    const actor = campaign.actors.find((a) => a.id === id);
    if (actor.floor >= 3 || actor.status !== 'active') continue;
    const r = campaignRequest(campaign, id);
    if (!r.options.length) continue;
    const choice = await post('/api/ai-campaign/decide', { request: r });
    const result = applyCampaignChoice(campaign, r, choice);
    if (result.reason !== 'applied') throw new Error(result.reason);
    campaign = result.state;
    console.log(id, actor.floor + 'F', choice.action, choice.reason);
  }
  campaign = stepCampaign(campaign);
  if (campaign.actors.every((a) => a.floor >= 3 || a.status !== 'active'))
    break;
}
const replay = replayCampaign(
  campaign.seed,
  campaign.session,
  campaign.receipts,
  campaign.tick,
);
if (fingerprint(replay) !== fingerprint(campaign))
  throw new Error('Live replay mismatch');
const summary = campaign.actors.map((a) => ({
  actor: a.id,
  floor: a.floor,
  lift: a.lift,
  ward: a.ward,
  storage: a.storage,
  hp: a.hp,
  status: a.status,
}));
console.log('Live results:', summary);
await mkdir('work/ai-mail', { recursive: true });
await writeFile(
  'work/ai-mail/campaign-live-evidence.json',
  JSON.stringify(
    { letters, campaign, summary, deterministicReplay: true },
    null,
    2,
  ),
);
