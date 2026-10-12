import test from 'node:test';
import assert from 'node:assert/strict';
import { validPreparedThrowLoadout, initialReserveLoadout, freeTeamPool, validTeamAllocation } from './throw-team.ts';
import { createThrowDuel } from './throw-duel.ts';
const front = {style:'quick',layout:[{id:'quick',start:3}],relic:'relay',book:{'0-14':'gold'}};
const back = {style:'guard',layout:[{id:'ward',start:5}],relic:'bastion',book:{'2-7':'edge'}};
const pool = {items:['quick','ward'],relics:['relay','bastion'],variants:['0-14:gold','2-7:edge']};

test('team allocation forbids borrowed/unowned or duplicate pieces and retains independent books and positions', () => {
  assert.equal(validTeamAllocation(front, back, pool), true);
  for (const changed of [{...back,layout:front.layout}, {...back,relic:'relay'}, {...back,book:front.book}, {...back,layout:[{id:'mend',start:0}]}])
    assert.equal(validTeamAllocation(front, changed, pool), false);
  const before = structuredClone(front);
  const duel = createThrowDuel(345, ['quick'], 'quick', 'relay', null, front.layout, {player:front.book},
    {performers:{player:'eli'},playerReserve:{performer:'juno',style:back.style,items:['ward'],layout:back.layout,relic:back.relic,book:back.book}});
  assert.deepEqual(duel.fighters[0].layout, front.layout);
  assert.deepEqual(duel.reserves[0].layout, back.layout);
  assert.deepEqual(duel.reserves[0].book, back.book);
  assert.deepEqual(front, before);
});
test('old single-box saves remain valid; optional member settings round-trip and malformed nested settings are rejected', () => {
  assert.equal(validPreparedThrowLoadout(front), true);
  const saved = {...front,members:{juno:back}};
  assert.equal(validPreparedThrowLoadout(JSON.parse(JSON.stringify(saved))), true);
  for (const members of [{eli:back},{unknown:back},{juno:{...back,book:null}},{juno:{...back,layout:[{id:'ward',start:10}]}},null])
    assert.equal(validPreparedThrowLoadout({...front,members}), false);
});
test('initial backup uses only free owned pieces, never an extra automatic preset, without changing the shared pool', () => {
  const before = structuredClone(pool);
  const reserve = initialReserveLoadout(front,{...back,layout:[...back.layout,...front.layout],relic:'relay',book:{...front.book,...back.book}},pool);
  assert.deepEqual(reserve, {...back,relic:null});
  assert.deepEqual(freeTeamPool(pool, front),{items:['ward'],relics:['bastion'],variants:['2-7:edge']});
  assert.deepEqual(pool, before);
});
