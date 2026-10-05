import {
  playerCommand,
  stepEncounter,
  applyEncounterReply,
} from './encounter.ts';
import type {
  Encounter,
  Intent,
  EncounterRequest,
  EncounterReply,
} from './encounter.ts';
import {
  startMail,
  commitMail,
  markMailFailed,
  confirmMailOffer,
  departMail,
  returnMail,
} from './mail.ts';
import type { MailReply } from './mail.ts';
import type { Point } from '../survival-room.ts';

export type MailAction =
  | { type: 'send'; text: string; offer: number }
  | { type: 'reply'; reply: MailReply }
  | { type: 'failed'; id: string; reason: string }
  | { type: 'confirm'; id: string; accept: boolean }
  | { type: 'depart' }
  | { type: 'command'; intent: Intent | { type: 'help' } }
  | { type: 'step'; input: Point }
  | { type: 'decision'; request: EncounterRequest; reply: EncounterReply };

/** Inputs and model outputs enter the same pure transition, at explicitly recorded simulation ticks. */
export function applyMailAction(
  s: Encounter,
  action: MailAction,
): { state: Encounter; reason: string } {
  if (action.type === 'send') return startMail(s, action.text, action.offer);
  if (action.type === 'reply') return commitMail(s, action.reply);
  if (action.type === 'failed')
    return {
      state: markMailFailed(s, action.id, action.reason),
      reason: action.reason,
    };
  if (action.type === 'confirm')
    return {
      state: confirmMailOffer(s, action.id, action.accept),
      reason: 'confirmation',
    };
  if (action.type === 'depart')
    return { state: departMail(s), reason: 'departure' };
  if (action.type === 'decision')
    return applyEncounterReply(s, action.request, action.reply);
  if (s.mail?.stage !== 'field' || s.actors[0].status !== 'active')
    return { state: s, reason: 'not-in-field' };
  if (action.type === 'command')
    return { state: playerCommand(s, action.intent), reason: 'command' };
  return { state: returnMail(stepEncounter(s, action.input)), reason: 'tick' };
}
export type MailRecording = {
  schema: 'f9-mail-replay-v1';
  initial: Encounter;
  entries: { tick: number; action: MailAction; receipt: string }[];
};
export const recordMail = (s: Encounter): MailRecording => ({
  schema: 'f9-mail-replay-v1',
  initial: structuredClone(s),
  entries: [],
});
export function replayMail(r: MailRecording): Encounter {
  if (r.schema !== 'f9-mail-replay-v1')
    throw new Error('Unsupported mail replay');
  let s = structuredClone(r.initial);
  for (const e of r.entries) {
    if (e.tick !== s.tick) throw new Error('Mail replay tick mismatch');
    const result = applyMailAction(s, e.action);
    if (result.reason !== e.receipt)
      throw new Error('Mail replay receipt mismatch');
    s = result.state;
  }
  return s;
}
