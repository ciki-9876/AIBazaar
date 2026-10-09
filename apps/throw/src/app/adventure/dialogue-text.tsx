import { dialogueTokens } from '../../lib/adventure/dialogue-text';

export function DialogueText({ text }: { text: string }) {
  return dialogueTokens(text).map((token, index) => token.important
    ? <mark className="rg-key-term" key={index}>{token.text}</mark>
    : token.text);
}
