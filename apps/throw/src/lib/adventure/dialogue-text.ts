/**
 * Dialogue emphasis is authored, not guessed (ADR-0060): the writer marks the
 * names, places and quest terms that matter in a line with 【】, e.g.
 * 「去【抒情剧院】找【菲利克斯】。」 The brackets never reach the screen.
 * An unmatched bracket stays literal, and nothing is ever parsed as HTML.
 */
export const MARK_OPEN = '【';
export const MARK_CLOSE = '】';
/** More than this many marks in one line and nothing stands out any more. */
export const MAX_MARKS_PER_LINE = 3;

export type DialogueToken = { text: string; important: boolean };

export function dialogueTokens(text: string): DialogueToken[] {
  const tokens: DialogueToken[] = [];
  let plain = '';
  for (let index = 0; index < text.length; ) {
    const open = text.indexOf(MARK_OPEN, index);
    const close = open < 0 ? -1 : text.indexOf(MARK_CLOSE, open + 1);
    const nested = close < 0 ? -1 : text.indexOf(MARK_OPEN, open + 1);
    if (open < 0 || close < 0 || close === open + 1 || (nested >= 0 && nested < close)) {
      plain += text.slice(index, open < 0 || close < 0 ? text.length : open + 1);
      index = open < 0 || close < 0 ? text.length : open + 1;
      continue;
    }
    plain += text.slice(index, open);
    if (plain) tokens.push({ text: plain, important: false });
    plain = '';
    tokens.push({ text: text.slice(open + 1, close), important: true });
    index = close + 1;
  }
  if (plain) tokens.push({ text: plain, important: false });
  return tokens;
}

/** The line as it reads on screen, without emphasis marks. */
export const plainText = (text: string) => dialogueTokens(text).map((token) => token.text).join('');
