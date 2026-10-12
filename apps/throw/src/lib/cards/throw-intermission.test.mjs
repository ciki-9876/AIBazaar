import test from 'node:test';
import assert from 'node:assert/strict';
import { createThrowDuel, stepThrowDuelInPlace, launchThrow, useSleight, arrangeThrow, duelRoundTick, battlePhase, drawInterval, TICK_MS } from './throw-duel.ts';
const reserve = {performer:'juno',style:'quick',items:[],presence:350};
const advance = (state, count) => {for(let i=0;i<count;i++) stepThrowDuelInPlace(state);};
function replacement(side, elapsed = 1300) {
  const state = createThrowDuel(398, [], 'quick', null, null, undefined, {}, {performers:{player:'eli',enemy:'rosie'},[side===0?'playerReserve':'enemyReserve']:reserve});
  state.tick=elapsed;
  state.fighters[side].hp=0;
  state.fighters[1-side].hp=250;
  state.fighters[1-side].poison=2;
  state.fighters[1-side].burn=3;
  state.fighters[1-side].shield=20;
  state.fighters[1-side].slowUntil=elapsed+40;
  state.fighters[1-side].nextSleight=elapsed+200;
  advance(state,1);
  return state;
}
test('either team replacement announces exactly five seconds, protects both sides and preserves real remaining timers', () => {
  for (const side of [0,1]) {
    const state=replacement(side), victim=state.fighters[1-side];
    const retained=structuredClone({hp:victim.hp,shield:victim.shield,burn:victim.burn,poison:victim.poison,hand:victim.hand,drawClock:victim.drawClock});
    const slowRemaining=victim.slowUntil-state.tick, sleightRemaining=victim.nextSleight-state.tick;
    const eventCount=state.events.length;
    for(const seat of [0,1]) {
      assert.equal(launchThrow(state,seat,[state.fighters[seat].hand[0].uid]),state);
      assert.equal(useSleight(state,seat),state);
      assert.equal(arrangeThrow(state,seat,'rank'),state);
    }
    advance(state,99);
    assert.ok(state.intermission);
    assert.deepEqual({hp:victim.hp,shield:victim.shield,burn:victim.burn,poison:victim.poison,hand:victim.hand,drawClock:victim.drawClock},retained);
    assert.equal(state.events.length,eventCount);
    assert.equal(victim.slowUntil-state.tick,slowRemaining);
    assert.equal(victim.nextSleight-state.tick,sleightRemaining);
    advance(state,1);
    assert.equal(state.intermission,null);
    assert.equal(state.round,2);
    assert.equal(duelRoundTick(state),0);
    assert.equal(battlePhase(duelRoundTick(state)),'opening');
    assert.equal(drawInterval(victim.items,duelRoundTick(state)),6000/TICK_MS);
    advance(state,19);
    assert.equal(victim.burn,retained.burn,'status clock also waits for a full new second');
    advance(state,1);
    assert.equal(victim.poison,retained.poison,'first poison tick damages but only second decays');
    assert.ok(victim.hp<retained.hp);
  }
});
test('intermission and stage reset replay identically through serialization; final knockout has no extra break', () => {
  const state=replacement(0,640), restored=JSON.parse(JSON.stringify(state));
  advance(state,100);advance(restored,100);
  assert.deepEqual(state,restored);
  assert.equal(battlePhase(duelRoundTick(state)),'opening');
  state.fighters[0].hp=0;advance(state,1);
  assert.equal(state.status,'ended');assert.equal(state.winner,1);assert.equal(state.intermission,null);
});
test('a simultaneous last knockout credits the unspent team member and shows the real survivor without another bout', () => {
  const state=createThrowDuel(90,[],'quick',null,null,undefined,{}, {playerReserve:reserve});
  state.fighters[0].hp=0;state.fighters[1].hp=0;
  advance(state,1);
  assert.equal(state.status,'ended');assert.equal(state.winner,0);assert.equal(state.intermission,null);
  assert.equal(state.fighters[0].hp,350);assert.equal(state.activeSeats[0],1);
  assert.equal(state.reserves[0],null);assert.equal(state.round,1);
});
