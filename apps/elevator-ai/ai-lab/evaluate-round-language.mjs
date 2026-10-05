/** Live baseline with per-inference accounting, including rejected drafts and retries.
 * Runs the existing adapter in a private harness; neither live dev config nor model weights change.
 */
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mailModelPlugin } from './mail-server.ts';
import {
  createMailEncounter,
  encounterRequest,
  applyEncounterReply,
  stepEncounter,
} from '../src/lib/survival-ai/encounter.ts';
import {
  startMail,
  commitMail,
  confirmMailOffer,
  departMail,
} from '../src/lib/survival-ai/mail.ts';
import {
  hasMailNarration,
  hasUnsupportedMailTactic,
} from '../src/lib/survival-ai/mail.ts';
import {
  createCampaign,
  campaignRequest,
  applyCampaignChoice,
  stepCampaign,
  replayCampaign,
} from '../src/lib/survival-ai/campaign.ts';
import { chooseEncounter } from '../src/lib/survival-ai/encounter-policy.ts';
import checkpoint from '../src/lib/survival-ai/encounter-model.json' with { type: 'json' };
import { fingerprint } from '../src/lib/survival-ai/protocol.ts';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const output = resolve(
  root,
  process.argv[2] || 'work/ai-training/round-2026-10-04',
);
const evaluationSeed = Number(process.argv[3] || 20261004);
if (!Number.isSafeInteger(evaluationSeed))
  throw new Error('Invalid language evaluation seed');
let completedOutput = false;
try {
  await access(resolve(output, 'language-report.json'));
  completedOutput = true;
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
if (completedOutput)
  throw new Error(
    'Language baseline already complete. Supply a new output directory.',
  );
await mkdir(output, { recursive: true });
const config = JSON.parse(
  await readFile(resolve(root, 'work/ai-mail/runtime.json'), 'utf8'),
);
if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(config.endpoint))
  throw new Error('Only the local model is permitted in this calibration');
const calls = [],
  mail = [],
  decisions = [],
  campaignLetters = [];
const save = (name, value) =>
  writeFile(resolve(output, name), JSON.stringify(value, null, 2) + '\n');
let label = 'initialization';
const proxy = createServer(async (req, res) => {
  const started = performance.now();
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString('utf8');
    const upstream = await fetch(config.endpoint + req.url, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...(config.key ? { Authorization: 'Bearer ' + config.key } : {}),
      },
      ...(req.method === 'POST' ? { body } : {}),
      signal: AbortSignal.timeout(90000),
    });
    const raw = await upstream.text();
    if (req.url === '/chat/completions') {
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = null;
      }
      calls.push({
        call: calls.length + 1,
        label,
        requestHash: fingerprint(JSON.parse(body)),
        status: upstream.status,
        milliseconds: performance.now() - started,
        usage: parsed?.usage || null,
        finishReason: parsed?.choices?.[0]?.finish_reason,
        output: parsed?.choices?.[0]?.message?.content,
      });
      await save('language-token-ledger.json', calls);
    }
    res.statusCode = upstream.status;
    res.setHeader('Content-Type', 'application/json');
    res.end(raw);
  } catch (error) {
    calls.push({
      call: calls.length + 1,
      label,
      status: 'transport-failure',
      usage: null,
      error: error.message,
    });
    await save('language-token-ledger.json', calls);
    res.statusCode = 503;
    res.end(JSON.stringify({ error: 'Local inference failed' }));
  }
});
await new Promise((done) => proxy.listen(0, '127.0.0.1', done));
const previousURL = process.env.F9_MAIL_LLM_URL;
process.env.F9_MAIL_LLM_URL = `http://127.0.0.1:${proxy.address().port}`;
let middleware;
const plugin = mailModelPlugin(root);
plugin.configureServer({
  middlewares: {
    use: (handler) => {
      middleware = handler;
    },
  },
});
const adapter = createServer((req, res) => {
  void middleware(req, res, () => {
    res.statusCode = 404;
    res.end();
  });
});
await new Promise((done) => adapter.listen(0, '127.0.0.1', done));
const endpoint = `http://127.0.0.1:${adapter.address().port}`;
async function post(route, body) {
  const r = await fetch(endpoint + route, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(180000),
  });
  const result = await r.json();
  if (!r.ok) throw new Error(result.error);
  return result;
}
try {
  for (const profile of ['ally', 'broker', 'predator']) {
    let s = createMailEncounter(
      evaluationSeed,
      profile,
      'help',
      `language:${evaluationSeed}:${profile}`,
    );
    for (const question of [
      '你有什么战术？我不想被怪物围住。',
      '给我一瓶水好吗？我现在饮水很低。',
      '再确认一下，你刚才说的约定还有效吗？',
    ]) {
      label = `mail:${profile}:${mail.length + 1}`;
      const sent = startMail(s, question);
      if (!sent.request) throw new Error(sent.reason);
      const firstCall = calls.length;
      try {
        const reply = await post('/api/ai-mail/reply', sent.request),
          result = commitMail(sent.state, reply);
        if (result.reason !== 'committed') throw new Error(result.reason);
        s = result.state;
        if (s.mail.agreements.at(-1)?.status === 'offered')
          s = confirmMailOffer(s, s.mail.agreements.at(-1).id, true);
        mail.push({
          profile,
          question,
          request: sent.request,
          reply,
          accepted: true,
          narration: hasMailNarration(reply.body),
          unsupported: hasUnsupportedMailTactic(reply.body),
          callRange: [firstCall + 1, calls.length],
          agreements: structuredClone(s.mail.agreements),
        });
        console.log(
          JSON.stringify({
            phase: 'mail',
            profile,
            accepted: true,
            calls: calls.length - firstCall,
          }),
        );
      } catch (error) {
        // A failed draft is still inference cost and is not an accepted good answer.
        mail.push({
          profile,
          question,
          accepted: false,
          error: error.message,
          callRange: [firstCall + 1, calls.length],
        });
        s = sent.state;
        console.log(
          JSON.stringify({
            phase: 'mail',
            profile,
            accepted: false,
            error: error.message,
          }),
        );
      }
    }
    s = departMail(s);
    const before = s.actors.map((a) => ({
      id: a.id,
      bag: a.bag.map((i) => i.uid),
    }));
    for (let i = 0; i < 180 && s.actors[1].status === 'active'; i++) {
      if (i % 15 === 0) {
        const q = encounterRequest(s);
        s = applyEncounterReply(s, q, chooseEncounter(checkpoint, q)).state;
      }
      s = stepEncounter(s);
    }
    mail.at(-1).physical = {
      before,
      after: s.actors.map((a) => ({ id: a.id, bag: a.bag.map((i) => i.uid) })),
      agreements: s.mail.agreements,
    };
  }
  let campaign = createCampaign(
    evaluationSeed,
    `language:${evaluationSeed}:campaign`,
  );
  // Three honest short courses; enough to measure planning and live mail against ongoing plans.
  for (let tick = 0; tick < 160; tick++) {
    for (const profile of ['ally', 'broker', 'predator']) {
      if (decisions.filter((d) => d.profile === profile).length >= 8) continue;
      const r = campaignRequest(campaign, profile);
      if (!r.options.length) continue;
      label = `campaign:${profile}:${tick}`;
      const firstCall = calls.length;
      try {
        const choice = await post('/api/ai-campaign/decide', { request: r }),
          result = applyCampaignChoice(campaign, r, choice);
        if (result.reason !== 'applied') throw new Error(result.reason);
        decisions.push({
          profile,
          tick,
          request: r,
          choice,
          accepted: true,
          callRange: [firstCall + 1, calls.length],
        });
        campaign = result.state;
      } catch (error) {
        decisions.push({
          profile,
          tick,
          accepted: false,
          error: error.message,
          callRange: [firstCall + 1, calls.length],
        });
      }
    }
    if (tick === 3)
      for (const profile of ['ally', 'broker', 'predator']) {
        label = `campaign-letter:${profile}`;
        const request = campaignRequest(campaign, profile),
          before = fingerprint(campaign);
        try {
          const reply = await post('/api/ai-campaign/letter', {
            request,
            message: '你现在在哪儿，正在做什么？我希望知道你的真实进度。',
          });
          campaignLetters.push({
            profile,
            facts: request.self,
            reply,
            stateUnchanged: fingerprint(campaign) === before,
          });
        } catch (error) {
          campaignLetters.push({ profile, error: error.message });
        }
      }
    campaign = stepCampaign(campaign);
  }
  const replay = replayCampaign(
    campaign.seed,
    campaign.session,
    campaign.receipts,
    campaign.tick,
  );
  if (fingerprint(replay) !== fingerprint(campaign))
    throw new Error('Campaign replay mismatch');
  await save('language-evidence.json', {
    mail,
    decisions,
    campaignLetters,
    campaign,
  });
  const measurable = calls.filter((c) => c.usage),
    input = measurable.reduce((n, c) => n + c.usage.prompt_tokens, 0),
    outputTokens = measurable.reduce(
      (n, c) => n + c.usage.completion_tokens,
      0,
    );
  const totalsByScene = ['mail:', 'campaign:', 'campaign-letter:'].map(
    (prefix) => {
      const rows = measurable.filter((c) => c.label.startsWith(prefix));
      return {
        scene: prefix,
        calls: rows.length,
        input: rows.reduce((n, c) => n + c.usage.prompt_tokens, 0),
        output: rows.reduce((n, c) => n + c.usage.completion_tokens, 0),
      };
    },
  );
  const report = {
    seed: evaluationSeed,
    model: config.model,
    local: true,
    weightTraining: false,
    calls: calls.length,
    missingUsage: calls.length - measurable.length,
    tokens: { input, output: outputTokens, total: input + outputTokens },
    totalsByScene,
    apiFeeRMB: 0,
    note: 'Counts backend-reported tokens for every inference, including classification, review and rejected attempts. Electricity/dev Codex tokens excluded.',
    mail: {
      attempted: mail.length,
      accepted: mail.filter((x) => x.accepted).length,
      narration: mail.filter((x) => x.narration).length,
      unsupported: mail.filter((x) => x.unsupported).length,
      failures: mail.filter((x) => !x.accepted),
      limitation:
        'Rule checks and model self-review are not independent human semantic acceptance.',
    },
    campaign: {
      attempted: decisions.length,
      accepted: decisions.filter((x) => x.accepted).length,
      deterministicReplay: true,
      actors: campaign.actors.map((a) => ({
        profile: a.id,
        floor: a.floor,
        hp: a.hp,
        water: a.water,
        food: a.food,
        status: a.status,
        lift: a.lift,
        ward: a.ward,
        storage: a.storage,
      })),
      limitation:
        '6-floor campaign-v1 experimental rules, 8 decisions per actor; not production survival/9, no trained strategic weights.',
    },
  };
  await save('language-report.json', report);
  console.log(
    JSON.stringify({
      phase: 'language-completed',
      ...report.tokens,
      calls: calls.length,
      missingUsage: report.missingUsage,
    }),
  );
} finally {
  if (previousURL === undefined) delete process.env.F9_MAIL_LLM_URL;
  else process.env.F9_MAIL_LLM_URL = previousURL;
  await new Promise((done) => adapter.close(done));
  await new Promise((done) => proxy.close(done));
}
