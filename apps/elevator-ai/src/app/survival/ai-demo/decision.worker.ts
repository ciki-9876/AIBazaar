import checkpoint from '../../../lib/survival-ai/encounter-model.json';
import type { EncounterModel } from '../../../lib/survival-ai/encounter-policy';
import {
  chooseEncounter,
  rankEncounter,
  validateEncounterModel,
  validateEncounterRequest,
} from '../../../lib/survival-ai/encounter-policy';
const loaded: unknown = checkpoint;
validateEncounterModel(loaded);
const model: EncounterModel = loaded;
self.postMessage({ type: 'ready', version: model.version });
self.onmessage = (event: MessageEvent) => {
  try {
    validateEncounterRequest(event.data);
    const start = performance.now(),
      reply = chooseEncounter(model, event.data);
    self.postMessage({
      type: 'decision',
      reply,
      milliseconds: performance.now() - start,
      top: rankEncounter(model, event.data)
        .slice(0, 3)
        .map((row) => ({ label: row.candidate.label, score: row.score })),
    });
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'Decision failed',
    });
  }
};
