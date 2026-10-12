import test from 'node:test';
import assert from 'node:assert/strict';
import { dialogueTokens, plainText, MAX_MARKS_PER_LINE } from './dialogue-text.ts';
import { DIALOGUES } from './magician-world.ts';

test('authored 【】 marks become yellow terms and never reach the screen', () => {
  const line = '【里德先生】让我去【抒情剧院】找【菲利克斯】。茶还是热的。';
  const tokens = dialogueTokens(line);
  assert.deepEqual(tokens.filter((token) => token.important).map((token) => token.text), ['里德先生', '抒情剧院', '菲利克斯']);
  assert.equal(plainText(line), '里德先生让我去抒情剧院找菲利克斯。茶还是热的。');
});

test('unmarked text stays plain; stray, empty or nested brackets stay literal; markup is never HTML', () => {
  assert.deepEqual(dialogueTokens('普通对白。'), [{ text: '普通对白。', important: false }]);
  assert.deepEqual(dialogueTokens(''), []);
  assert.equal(plainText('只有半个【括号'), '只有半个【括号');
  assert.equal(plainText('空的【】'), '空的【】');
  assert.deepEqual(dialogueTokens('<b>【A+B】</b>'), [
    { text: '<b>', important: false }, { text: 'A+B', important: true }, { text: '</b>', important: false },
  ]);
  assert.deepEqual(dialogueTokens('【外【内】'), [{ text: '【外', important: false }, { text: '内', important: true }]);
});

test('every authored dialogue line keeps its marks balanced and sparse', () => {
  for (const [id, dialogue] of Object.entries(DIALOGUES))
    for (const line of dialogue.lines) {
      const marks = dialogueTokens(line.text).filter((token) => token.important).length;
      assert.ok(marks <= MAX_MARKS_PER_LINE, `${id}: ${line.text}`);
      assert.ok(!/[【】]/.test(plainText(line.text)), `${id}: unbalanced mark in ${line.text}`);
    }
});
