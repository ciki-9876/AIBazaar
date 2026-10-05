import {
  chooseAction,
  validatePolicy,
  type TinyPolicy,
} from '../src/lib/survival-ai/tiny-policy.ts';
import { validateDecisionRequest } from '../src/lib/survival-ai/request-validation.ts';

let model: TinyPolicy | null = null;
// Browser adapter: model inference is outside the render/main thread.
self.onmessage = (event: MessageEvent) => {
  try {
    const message = event.data;
    if (message?.type === 'load') {
      validatePolicy(message.model);
      model = message.model;
      self.postMessage({ type: 'ready', modelVersion: model!.version });
    } else if (message?.type === 'decide') {
      if (!model) throw new Error('Load model first');
      validateDecisionRequest(message.request);
      const start = performance.now();
      const reply = chooseAction(model, message.request);
      self.postMessage({
        type: 'decision',
        reply,
        inferenceMs: performance.now() - start,
      });
    } else throw new Error('Unsupported worker message');
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'Decision failed',
    });
  }
};
