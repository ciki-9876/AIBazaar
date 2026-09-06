import test from 'node:test';
import assert from 'node:assert/strict';
import { newRun,act,slots,playerFor,enemyFor,simulate,validSave,dailyGold } from './game-engine.ts';
import { DEFS,price } from './game-data.ts';
const item=(id,uid=id,tier=0)=>({id,uid,tier,bonus:0});
const fighter=(board,extra={})=>({name:'试验旅人',hero:'duelist',hp:1000,board,skills:[],gold:0,attack:0,shieldBonus:0,...extra});
const battle=(p,e)=>({player:p,enemy:e,seed:123,night:true,difficulty:1});
test('purchases spend exact gold, upgrade once and preserve source state',()=>{
 const r=newRun('duelist',7);r.shop=[item('saber','offer')];const gold=r.gold;
 const n=act(r,{type:'buy',index:0});assert.equal(n.gold,gold-price(r.shop[0]));assert.equal(n.board[0].tier,1);assert.equal(n.board.length,r.board.length);assert.equal(r.board[0].tier,0);assert.throws(()=>act(n,{type:'buy',index:0}));assert.equal(n.shop.length,0);
});
test('full boards overflow to stash; full stash refuses without spending',()=>{
 const r=newRun();r.board=Array.from({length:10},(_,i)=>item('needle','b'+i));r.stash=Array.from({length:9},(_,i)=>item('purse','s'+i));r.shop=[item('vial','offer')];r.gold=99;
 const n=act(r,{type:'buy',index:0});assert.equal(slots(n.stash),10);n.shop=[item('tea','offer2')];assert.throws(()=>act(n,{type:'buy',index:0}),/空间/);assert.equal(n.gold,96);
});
test('reordering maintains inventory identity and cross-zone capacity',()=>{
 let r=newRun();const uid=r.board[0].uid;r=act(r,{type:'move',uid,to:'board',index:2});assert.equal(r.board[2].uid,uid);r=act(r,{type:'move',uid,to:'stash'});assert.equal(r.stash[0].uid,uid);assert.equal(r.board.length,2);r=act(r,{type:'move',uid,to:'board',index:0});assert.equal(r.board[0].uid,uid);assert.ok(validSave(r));
});
test('poison bypasses shield and burn is absorbed by shield',()=>{
 const enemy=fighter([],{hero:'artificer'});
 const poison=simulate(battle(fighter([item('vial')]),enemy));const burn=simulate(battle(fighter([item('lantern')]),enemy));
 const p=poison.frames.find(f=>f.time===5).enemy;const b=burn.frames.find(f=>f.time===5).enemy;
 assert.ok(p.hp<1000);assert.equal(p.shield,45);assert.equal(b.hp,1000);assert.ok(b.shield<45);
});
test('adjacency changes cooldown and shield feeds the coil',()=>{
 const r=simulate(battle(fighter([item('wrench'),item('saber'),item('tea'),item('needle')]),fighter([])));
 assert.equal(r.frames[0].player.board[1].cd,2.55);assert.equal(r.frames[0].player.board[3].cd,2);
 const a=simulate(battle(fighter([item('coil')],{hero:'alchemist'}),fighter([])));
 const b=simulate(battle(fighter([item('coil')],{hero:'artificer'}),fighter([])));
 assert.ok(b.frames.find(f=>f.time===4).enemy.hp<a.frames.find(f=>f.time===4).enemy.hp);
});
test('freeze stops timers and finite ammo exhausts',()=>{
 const frozen=simulate(battle(fighter([item('ice')]),fighter([item('harpoon')])));
 assert.ok(frozen.frames.some(f=>f.enemy.board[0].frozen>0));
 const r=simulate(battle(fighter([item('pistol')]),fighter([])));
 assert.equal(r.frames.at(-1).player.board[0].ammo,0);assert.equal(r.frames.at(-1).player.board[0].uses,5);
});
test('simulation is deterministic and sandstorm ends passive stalemates',()=>{
 const b=battle(fighter([item('purse')]),fighter([item('purse','other')]));const a=simulate(b);assert.deepEqual(a,simulate(b));assert.ok(a.duration<90);assert.ok(a.frames.some(f=>f.sand>0));assert.equal(a.winner,'draw');
});
test('victory rewards cannot be claimed twice, only night counts as wins',()=>{
 let r=newRun();r.phase='choice';r.hour=5;r=act(r,{type:'fight',difficulty:1});r.battle.enemy.hp=1;r.battle.enemy.board=[];r=act(r,{type:'resolve'});assert.equal(r.wins,1);assert.throws(()=>act(r,{type:'resolve'}));
 r=newRun();r.phase='choice';r.hour=3;r=act(r,{type:'fight',difficulty:0});r.battle.enemy.hp=1;r.battle.enemy.board=[];r=act(r,{type:'resolve'});assert.equal(r.wins,0);assert.equal(r.prestige,20);assert.equal(r.gold,20);
});
test('ten night wins produce ending; last-chance rescue occurs exactly once',()=>{
 let r=newRun();r.wins=9;r.phase='choice';r.hour=5;r=act(r,{type:'fight',difficulty:1});r.battle.enemy.hp=1;r.battle.enemy.board=[];r=act(r,{type:'resolve'});r=act(r,{type:'next'});assert.equal(r.phase,'ended');assert.equal(r.wins,10);
 r=newRun();r.prestige=1;r.phase='choice';r.hour=5;r=act(r,{type:'fight',difficulty:1});r.battle.player.hp=1;r.battle.player.board=[];r=act(r,{type:'resolve'});assert.equal(r.prestige,1);assert.equal(r.rescued,true);r=act(r,{type:'next'});r.hour=5;r=act(r,{type:'fight',difficulty:1});r.battle.player.hp=1;r.battle.player.board=[];r=act(r,{type:'resolve'});r=act(r,{type:'next'});assert.equal(r.phase,'ended');assert.ok(r.prestige<=0);
});
test('interest is capped, stashed income items pay, and day transition pays once',()=>{
 let r=newRun();r.gold=120;r.stash=[item('purse','stash')];assert.equal(dailyGold(r),r.income+7);r.phase='result';r.battle=battle(playerFor(r),enemyFor(r));const expected=r.gold+dailyGold(r);r=act(r,{type:'next'});assert.equal(r.gold,expected);assert.equal(r.day,2);assert.throws(()=>act(r,{type:'next'}));
});
test('saved battles resume reproducibly, malformed saves rejected',()=>{
 let r=newRun();r.phase='choice';r.hour=5;r=act(r,{type:'fight',difficulty:1});const restored=JSON.parse(JSON.stringify(r));assert.ok(validSave(restored));assert.deepEqual(simulate(r.battle),simulate(restored.battle));restored.board[0].id='unknown';assert.equal(validSave(restored),false);assert.equal(validSave({}),false);assert.equal(validSave(null),false);
});
test('all three hero item pools generate bounded valid boards across seeds and days',()=>{
 for(const hero of ['duelist','alchemist','artificer'])for(let seed=0;seed<12;seed++){const r=newRun(hero,seed);for(let day=1;day<=15;day++){r.day=day;for(let n=0;n<3;n++){const enemy=enemyFor(r,n);assert.ok(slots(enemy.board)<=10);assert.ok(enemy.board.every(x=>DEFS[x.id]));const result=simulate(battle(playerFor(r),enemy));assert.ok(result.frames.every(f=>Number.isFinite(f.player.hp)&&Number.isFinite(f.enemy.hp)&&f.player.shield>=0&&f.enemy.shield>=0));assert.ok(result.duration<=90)}}}
});
test('enchantment charges once and modifies battle effect; skills and levels persist',()=>{
 let r=newRun();r.phase='enchant';const uid=r.board[0].uid;r=act(r,{type:'enchant',uid,enchant:'swift'});assert.equal(r.gold,10);assert.equal(r.board[0].enchant,'swift');assert.equal(r.hour,1);assert.throws(()=>act(r,{type:'enchant',uid,enchant:'swift'}));r.pendingLevel=1;r=act(r,{type:'level',choice:'income'});assert.equal(r.income,9);assert.equal(r.pendingLevel,0);assert.throws(()=>act(r,{type:'level',choice:'income'}));
});
