import test from 'node:test';
import assert from 'node:assert/strict';
import { dialogueTokens } from './dialogue-text.ts';

test('proper nouns and quest terms are yellow candidates while ordinary dialogue stays plain', () => {
  const line = '里德先生让我去抒情剧院找菲利克斯，拿第一张参赛证。茶还是热的。';
  const tokens = dialogueTokens(line);
  assert.equal(tokens.map((token) => token.text).join(''), line);
  assert.deepEqual(tokens.filter((token) => token.important).map((token) => token.text), ['里德先生', '抒情剧院', '菲利克斯', '第一张参赛证']);
  assert.ok(tokens.some((token) => !token.important && token.text.includes('茶还是热的')));
});

test('token renderer chooses the longest match and leaves markup and regex characters literal', () => {
  assert.deepEqual(dialogueTokens('A+B <script> A', ['A', 'A+B']), [
    { text: 'A+B', important: true }, { text: ' <script> ', important: false }, { text: 'A', important: true },
  ]);
  assert.deepEqual(dialogueTokens('普通对白。', []), [{ text: '普通对白。', important: false }]);
  assert.deepEqual(dialogueTokens('', ['里德']), []);
});
