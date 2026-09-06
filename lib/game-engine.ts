import { DEFS, ITEMS, HEROES, SKILLS, SCALE, value, price, sellPrice, cooldown } from './game-data.ts';
import type { Item, HeroId, Enchant } from './game-data.ts';

export type Fighter={name:string;hero:HeroId;hp:number;board:Item[];skills:string[];gold:number;attack:number;shieldBonus:number};
export type Battle={player:Fighter;enemy:Fighter;seed:number;night:boolean;difficulty:number};
export type Run={version:1;seed:number;serial:number;hero:HeroId;day:number;hour:number;gold:number;income:number;hp:number;level:number;xp:number;pendingLevel:number;prestige:number;wins:number;rescued:boolean;attack:number;shieldBonus:number;board:Item[];stash:Item[];shop:Item[];rerolls:number;merchant:string;phase:'shop'|'choice'|'combat'|'result'|'ended'|'enchant'|'skill';skills:string[];skillOffers:string[];battle:Battle|null;lastWin:boolean;log:string[];notice:string;endedReason:string};
export type Action={type:'buy';index:number}|{type:'reroll'|'leave'|'resolve'|'next'}|{type:'choose';kind:string}|{type:'fight';difficulty:number}|{type:'move';uid:string;to:'board'|'stash';index?:number}|{type:'sell';uid:string}|{type:'level';choice:string}|{type:'enchant';uid:string;enchant:Enchant}|{type:'skill';id:string};
export function random(r:{seed:number}){r.seed=(Math.imul(r.seed,1664525)+1013904223)>>>0;return r.seed/4294967296}
function pick<T>(r:{seed:number},a:T[]){return a[Math.floor(random(r)*a.length)]}
export function slots(items:Item[]){return items.reduce((sum,x)=>sum+DEFS[x.id].size,0)}
function item(r:Run,id:string,tier=0):Item{return{uid:`r${++r.serial}`,id,tier,bonus:0}}
function log(r:Run,text:string){r.notice=text;r.log=[text,...r.log].slice(0,12)}
function assert(test:unknown,message:string):asserts test{if(!test)throw Error(message)}
export function playerFor(r:Run):Fighter{return{name:HEROES.find(h=>h.id===r.hero)!.name,hero:r.hero,hp:r.hp,board:structuredClone(r.board),skills:[...r.skills],gold:r.gold,attack:r.attack,shieldBonus:r.shieldBonus}}
export function shopStock(r:Run){
 const owned=[...r.board,...r.stash];
 const pool=ITEMS.filter(d=>!owned.some(x=>x.id===d.id&&x.tier===3)&&(d.family===r.hero||d.family==='neutral')&&(r.merchant!=='weapons'||d.effect==='damage'||d.tag==='工具')&&(r.merchant!=='alchemy'||['poison','burn','heal','regen','freeze','slow'].includes(d.effect)));
 const available=pool.length?pool:ITEMS.filter(d=>d.family==='neutral'&&!owned.some(x=>x.id===d.id&&x.tier===3));
 r.shop=Array.from({length:4},()=>{const duplicate=owned.filter(x=>x.tier<3&&available.some(d=>d.id===x.id));const id=random(r)<.3&&duplicate.length?pick(r,duplicate).id:pick(r,available).id;const tier=Math.min(3,Math.max(0,Math.floor((r.day-1)/4))+(random(r)<.12&&r.day>2?1:0));return item(r,id,tier)});
}
export function newRun(hero:HeroId='duelist',seed=12345):Run{
 const h=HEROES.find(x=>x.id===hero)!;
 const r:Run={version:1,seed:seed>>>0,serial:0,hero,day:1,hour:0,gold:16,income:h.income,hp:h.hp,level:1,xp:0,pendingLevel:0,prestige:20,wins:0,rescued:false,attack:0,shieldBonus:0,board:[],stash:[],shop:[],rerolls:0,merchant:'curios',phase:'shop',skills:[],skillOffers:[],battle:null,lastWin:false,log:[],notice:'欢迎来到午夜集市。先购买异物，再继续旅程。',endedReason:''};
 r.board=h.starter.map(id=>item(r,id));shopStock(r);return r;
}
export function xpNeeded(r:Run){return 4+r.level*2}
function gainXP(r:Run,n:number){r.xp+=n;while(r.xp>=xpNeeded(r)){r.xp-=xpNeeded(r);r.level++;r.hp+=45;r.pendingLevel++}}
function advance(r:Run){r.hour++;r.phase='choice';r.shop=[];gainXP(r,1)}
export function dailyGold(r:Run){return r.income+Math.min(5,Math.floor(r.gold/10))+[...r.board,...r.stash].filter(x=>x.id==='purse').reduce((n,x)=>n+Math.round(2*SCALE[x.tier]),0)}
export function enemyFor(r:Run,difficulty=1,night=true):Fighter{
 const local={seed:(r.seed+r.day*7919+difficulty*997)>>>0};const hero=pick(local,HEROES);
 const builds:Record<HeroId,string[][]>={duelist:[['saber','needle','bell','scope','daggers','charm','buckler'],['rapier','scope','clock','ledger','buckler','tea','charm']],alchemist:[['vial','lantern','cauldron','greenhouse','herb','ice'],['furnace','lantern','buckler','vial','herb','ice','moss','tea']],artificer:[['core','coil','drone','wrench','battery','repair','buckler','tea'],['fortress','turret','drone','repair','wrench','buckler']]};
 const ids=pick(local,builds[hero.id]);const capacity=Math.min(10,(night?4:3)+Math.floor(r.day*.9)+(difficulty-1));const board:Item[]=[];
 for(const id of ids){if(slots(board)+DEFS[id].size>capacity)continue;board.push({uid:'e'+board.length,id,tier:Math.min(3,Math.max(0,Math.floor((r.day-1)/4)+(difficulty===2&&r.day>3?1:0))),bonus:Math.floor((r.day-1)*1.4)})}
 if(!board.some(x=>['damage','poison','burn'].includes(DEFS[x.id].effect))){board.splice(0,board.length,{uid:'e0',id:'saber',tier:Math.min(3,Math.floor((r.day-1)/4)),bonus:r.day*2})}
 const names=night?['无名旅人','渡口守夜人','旧日拾荒客','远方来客','沉默收藏家']:['灯蛾群','墓园看守','失控巨像'];
 return{name:night?pick(local,names):names[difficulty],hero:hero.id,hp:Math.round((170+r.day*47+r.day*r.day*3)*(night?1:[.62,.9,1.22][difficulty])),board,skills:r.day>5?[pick(local,SKILLS.filter(s=>!['fortune','vital'].includes(s.id))).id]:[],gold:r.day*4,attack:Math.floor(r.day*1.5),shieldBonus:Math.floor(r.day*1.5)};
}
export function act(old:Run,action:Action):Run{
 const r:Run=structuredClone(old);r.notice='';
 if(action.type==='resolve'){assert(r.phase==='combat'&&r.battle,'当前没有待结算的战斗。');const result=simulate(r.battle);r.lastWin=result.winner==='player';r.phase='result';if(r.battle.night){if(r.lastWin){r.wins++;r.gold+=4;log(r,`午夜胜利！第 ${r.wins} 枚胜印，获得 4 金。`)}else{r.prestige-=r.day;log(r,`午夜败北，损失 ${r.day} 声望。`);if(r.prestige<=0&&!r.rescued){r.rescued=true;r.prestige=1;r.hp+=100;r.gold+=10;log(r,'绝境重生：声望保留 1，生命 +100，获得 10 金。下一次归零则旅程结束。')}}}else{if(r.lastWin){const gold=[4,7,11][r.battle.difficulty];r.gold+=gold;gainXP(r,[2,3,5][r.battle.difficulty]);log(r,`悬赏完成：获得 ${gold} 金与 ${[2,3,5][r.battle.difficulty]} 经验。`)}else log(r,'悬赏失败。声望不受影响，继续寻找机会。')}return r}
 if(action.type==='next'){assert(r.phase==='result','尚未结算战斗。');assert(r.pendingLevel===0,'请先选择升级奖励。');if(r.wins>=10||r.prestige<=0){r.phase='ended';r.endedReason=r.wins>=10?'十印归来':'长夜未尽';return r}if(r.battle?.night){const earned=dailyGold(r);r.day++;r.hour=0;r.gold+=earned;r.phase='choice';gainXP(r,2);log(r,`第 ${r.day} 天，收到 ${earned} 金（收入、利息与经济物品）。`)}else advance(r);r.battle=null;return r}
 assert(!['combat','ended'].includes(r.phase),'此时无法调整行囊。');
 if(action.type==='level'){assert(r.pendingLevel>0,'没有待领取的升级奖励。');assert(['power','vitality','income'].includes(action.choice),'无效奖励。');r.pendingLevel--;if(action.choice==='power'){r.attack+=6;r.shieldBonus+=8;log(r,'武器伤害 +6，护盾物品效力 +8。')}if(action.choice==='vitality'){r.hp+=75;log(r,'最大生命永久 +75。')}if(action.choice==='income'){r.income+=2;log(r,'每日收入永久 +2 金。')}return r}
 if(action.type==='move'||action.type==='sell'){
  assert(r.phase!=='result','结算后再整理行囊。');const source=r.board.some(x=>x.uid===action.uid)?r.board:r.stash;const at=source.findIndex(x=>x.uid===action.uid);assert(at>=0,'找不到这件异物。');const x=source[at];
  if(action.type==='sell'){source.splice(at,1);r.gold+=sellPrice(x);log(r,`售出${DEFS[x.id].name}，获得 ${sellPrice(x)} 金。`);return r}
  const target=r[action.to];assert(target,'无效位置。');assert(target===source||slots(target)+DEFS[x.id].size<=10,'空间不足：请先腾出格位。');source.splice(at,1);target.splice(Math.min(target.length,Math.max(0,action.index??target.length)),0,x);log(r,`已调整${DEFS[x.id].name}的位置。`);return r;
 }
 assert(r.pendingLevel===0,'请先选择升级奖励。');
 if(action.type==='buy'){
  assert(r.phase==='shop','只有在商店中才能购买。');const offer=r.shop[action.index];assert(offer,'这件异物已售出。');assert(r.gold>=price(offer),'金币不足。');const existing=[...r.board,...r.stash].find(x=>x.id===offer.id);
  if(existing){assert(existing.tier<3,'该异物已经达到晶钻品质。');existing.tier=Math.min(3,Math.max(existing.tier+1,offer.tier));log(r,`${DEFS[offer.id].name}品质提升！`)}else{const target=slots(r.board)+DEFS[offer.id].size<=10?r.board:r.stash;assert(slots(target)+DEFS[offer.id].size<=10,'战斗区与仓库均无足够空间。');target.push(offer);log(r,`获得${DEFS[offer.id].name}${target===r.stash?'，已放入仓库':''}。`)}r.gold-=price(offer);r.shop.splice(action.index,1);return r;
 }
 if(action.type==='reroll'){assert(r.phase==='shop','只能刷新当前商店。');const cost=2+r.rerolls;assert(r.gold>=cost,'金币不足。');r.gold-=cost;r.rerolls++;shopStock(r);log(r,`商店已刷新，花费 ${cost} 金。`);return r}
 if(action.type==='leave'){assert(['shop','enchant','skill'].includes(r.phase),'当前不在商店或事件中。');advance(r);log(r,'前往下一个时辰。');return r}
 if(action.type==='fight'){
  assert(r.phase==='choice'&&(r.hour===3||r.hour===5),'现在不是战斗时辰。');assert([0,1,2].includes(action.difficulty),'无效的悬赏难度。');assert(r.board.length>0,'至少装备一件异物再出发。');const night=r.hour===5;r.battle={player:playerFor(r),enemy:enemyFor(r,action.difficulty,night),seed:r.seed,night,difficulty:action.difficulty};r.phase='combat';return r;
 }
 if(action.type==='enchant'){assert(r.phase==='enchant','当前没有附魔事件。');const target=[...r.board,...r.stash].find(x=>x.uid===action.uid);assert(target&&DEFS[target.id].cd>0,'请选择有冷却的异物。');assert(['swift','fiery','toxic','guarded'].includes(action.enchant),'未知附魔。');assert(r.gold>=6,'附魔需要 6 金。');r.gold-=6;target.enchant=action.enchant;advance(r);log(r,`${DEFS[target.id].name}获得附魔。`);return r}
 if(action.type==='skill'){assert(r.phase==='skill'&&r.skillOffers.includes(action.id),'无法获得此技能。');assert(r.gold>=4,'学习技能需要 4 金。');r.gold-=4;r.skills.push(action.id);if(action.id==='fortune')r.income+=3;if(action.id==='vital')r.hp+=100;advance(r);log(r,`领悟技能：${SKILLS.find(x=>x.id===action.id)!.name}。`);return r}
 if(action.type==='choose'){
  assert(r.phase==='choice'&&r.hour<5,'现在无法选择这条道路。');assert(r.hour!==3||action.kind==='rest','悬赏时辰只能战斗或休息。');
  if(['curios','weapons','alchemy'].includes(action.kind)){r.merchant=action.kind;r.rerolls=0;r.phase='shop';shopStock(r);log(r,'走进商店。购买与整理不消耗时辰。')}
  else if(action.kind==='train'){gainXP(r,3);advance(r);log(r,'向流浪学者求教，获得 3 额外经验。')}
  else if(action.kind==='work'){r.gold+=5;advance(r);log(r,'为街坊修整摊位，获得 5 金。')}
  else if(action.kind==='rest'){r.hp+=30;advance(r);log(r,'在月下休憩，最大生命永久 +30。')}
  else if(action.kind==='invest'){assert(r.gold>=5,'投资需要 5 金。');r.gold-=5;r.income+=2;advance(r);log(r,'买下一个摊位，每日收入 +2 金。')}
  else if(action.kind==='enchant'){r.phase='enchant';log(r,'挑选一件有冷却的异物进行附魔。')}
  else if(action.kind==='skill'){r.phase='skill';const available=SKILLS.filter(x=>!r.skills.includes(x.id));r.skillOffers=[];while(r.skillOffers.length<3&&available.length){const n=Math.floor(random(r)*available.length);r.skillOffers.push(available.splice(n,1)[0].id)}log(r,'从秘闻中领悟一种能力。')}
  else throw Error('未知道路。');return r;
 }
 throw Error('无效操作。');
}

export type CombatItem=Item&{progress:number;cd:number;frozen:number;slowed:number;hasted:number;ammo:number;power:number;uses:number};
export type Combatant={name:string;hero:HeroId;maxHP:number;hp:number;shield:number;poison:number;burn:number;regen:number;board:CombatItem[];skills:string[];attack:number;shieldBonus:number;crit:number};
export type Frame={time:number;player:Combatant;enemy:Combatant;events:string[];fired:string[];sand:number};
export type CombatResult={frames:Frame[];winner:'player'|'enemy'|'draw';duration:number;playerDamage:number;enemyDamage:number};
function combatant(f:Fighter):Combatant{
 const board=f.board.map((x,i)=>{let cd=cooldown(x);for(const j of [i-1,i+1]){if(f.board[j]?.id==='wrench')cd*=.85}if(f.skills.includes('tempo'))cd*=.92;let power=value(x);if(DEFS[x.id].effect==='damage'){power+=f.attack+(f.skills.includes('edge')?8:0)+f.board.filter(y=>y.id==='charm').reduce((n,y)=>n+Math.round(8*SCALE[y.tier]),0);for(const j of [i-1,i+1]){if(f.board[j]?.id==='ledger')power+=Math.min(40,f.gold)}}if(['poison','burn'].includes(DEFS[x.id].effect))power+=(f.hero==='alchemist'?2:0)+(f.skills.includes('venom')?3:0);if(DEFS[x.id].effect==='shield')power+=f.shieldBonus+(f.skills.includes('shell')?15:0);return {...x,progress:0,cd:Math.max(.5,cd),power,ammo:DEFS[x.id].ammo??-1,frozen:0,slowed:0,hasted:0,uses:0}});
 return{name:f.name,hero:f.hero,maxHP:f.hp,hp:f.hp,shield:f.hero==='artificer'?45:0,poison:0,burn:0,regen:f.skills.includes('renew')?5:0,board,skills:f.skills,attack:f.attack,shieldBonus:f.shieldBonus,crit:.05+(f.hero==='duelist'?.1:0)+(f.skills.includes('frenzy')?.12:0)};
}
export function simulate(battle:Battle):CombatResult{
 const p=combatant(battle.player),e=combatant(battle.enemy),rng={seed:battle.seed};const frames:Frame[]=[];let events:string[]=[],fired:string[]=[],pDamage=0,eDamage=0;
 const take=(target:Combatant,amount:number,bypass=false)=>{amount=Math.max(0,Math.round(amount));const blocked=bypass?0:Math.min(target.shield,amount);target.shield-=blocked;target.hp=Math.max(0,target.hp-(amount-blocked));if(target===e)pDamage+=amount;else eDamage+=amount};
 const trigger=(own:Combatant,other:Combatant,x:CombatItem,i:number)=>{
  const def=DEFS[x.id];x.uses++;if(x.ammo>0)x.ammo--;fired.push(x.uid);const neighbors=[own.board[i-1],own.board[i+1]].filter(Boolean);let power=x.power;
  const crit=own.crit+neighbors.filter(y=>y.id==='scope').length*.2;const critical=def.effect==='damage'&&random(rng)<crit;if(critical)power*=2;
  if(def.passive==='solo'&&own.board.filter(y=>DEFS[y.id].tag==='武器').length===1)power*=2;
  if(def.passive==='shieldstrike')power+=Math.round(own.shield*.2);
  if(def.effect==='damage'){take(other,power);if(def.passive==='double')take(other,power);events.push(`${own.name} · ${def.name}${critical?' 暴击':''} → ${Math.round(power)*(def.passive==='double'?2:1)} 伤害`)}
  if(def.effect==='shield'){own.shield+=power;events.push(`${own.name} · ${def.name} → +${power} 护盾`)}
  if(def.effect==='heal'){own.hp=Math.min(own.maxHP,own.hp+power);events.push(`${own.name} · ${def.name} → 恢复 ${power}`)}
  if(def.effect==='poison'){other.poison+=power;events.push(`${own.name} · ${def.name} → ${power} 毒`);neighbors.filter(y=>y.id==='cauldron').forEach(()=>other.burn+=2)}
  if(def.effect==='burn'){other.burn+=power;events.push(`${own.name} · ${def.name} → ${power} 灼烧`);own.board.filter(y=>y.id==='furnace').forEach(()=>own.shield+=8)}
  if(def.effect==='regen'){own.regen+=power;events.push(`${own.name} · ${def.name} → +${power} 再生`)}
  if(def.effect==='haste'){neighbors.forEach(y=>y.hasted=Math.min(8,y.hasted+def.power));events.push(`${own.name} · ${def.name} → 相邻物品加速`)}
  if(def.effect==='charge'){(def.passive==='neighbors'?neighbors:own.board.filter(y=>DEFS[y.id].tag==='武器')).forEach(y=>y.progress=Math.min(y.cd,y.progress+def.power));events.push(`${own.name} · ${def.name} → 冷却充能`)}
  if(def.effect==='freeze'||def.effect==='slow'){const targets=other.board.filter(y=>DEFS[y.id].cd>0&&y.ammo!==0);for(let j=0;j<(def.effect==='freeze'?1:2)&&targets.length;j++){const at=Math.floor(random(rng)*targets.length);const y=targets.splice(at,1)[0];if(def.effect==='freeze')y.frozen=Math.min(5,y.frozen+def.power);else y.slowed=Math.min(8,y.slowed+def.power)}events.push(`${own.name} · ${def.name} → ${def.effect==='freeze'?'冻结':'减速'}`)}
  if(def.passive==='ramp')x.power+=12;
  if(def.passive==='repair')own.shield+=10;
  if(def.tag==='炼金')own.board.filter(y=>y.id==='greenhouse'&&y!==x).forEach(y=>y.power++);
  if(def.tag==='机械')own.board.filter(y=>y.id==='core'&&y!==x).forEach(y=>y.progress=Math.min(y.cd,y.progress+.5));
  if(x.enchant==='fiery')other.burn+=5;if(x.enchant==='toxic')other.poison+=4;if(x.enchant==='guarded')own.shield+=25;
 };
 const snapshot=(time:number,sand:number)=>{frames.push({time,player:structuredClone(p),enemy:structuredClone(e),events,fired,sand});events=[];fired=[]};snapshot(0,0);
 let tick=0;
 for(tick=1;tick<=900&&p.hp>0&&e.hp>0;tick++){
  const time=tick/10;
  // Both timers advance before either side activates; tie priority alternates by tick.
  for(const own of [p,e])for(const x of own.board){const frozen=x.frozen>0;const speed=(x.hasted>0?2:1)*(x.slowed>0?.5:1);x.frozen=Math.max(0,x.frozen-.1);x.hasted=Math.max(0,x.hasted-.1);x.slowed=Math.max(0,x.slowed-.1);if(!frozen&&x.ammo!==0&&DEFS[x.id].cd>0)x.progress+=.1*speed}
  for(const own of tick%2?[p,e]:[e,p]){const other=own===p?e:p;for(let i=0;i<own.board.length;i++){const x=own.board[i];if(p.hp<=0||e.hp<=0)break;if(DEFS[x.id].cd>0&&x.frozen<=0&&x.ammo!==0&&x.progress+1e-8>=x.cd){x.progress=Math.max(0,x.progress-x.cd);trigger(own,other,x,i)}}}
  if(p.hp>0&&e.hp>0&&tick%10===0){for(const own of [p,e]){if(own.poison)take(own,own.poison,true);if(own.burn){take(own,own.burn);own.burn=Math.max(0,own.burn-1)}if(own.hp>0)own.hp=Math.min(own.maxHP,own.hp+own.regen)}}
  const sand=time>=30?Math.floor((time-30)*2+4):0;if(p.hp>0&&e.hp>0&&sand&&tick%10===0){take(p,sand,true);take(e,sand,true);events.push(`沙暴 → 双方 ${sand} 穿透伤害`)}
  if(tick%2===0||p.hp<=0||e.hp<=0||tick===900)snapshot(time,sand);
 }
 const winner=p.hp<=0&&e.hp<=0?'draw':e.hp<=0?'player':p.hp<=0?'enemy':p.hp/p.maxHP>e.hp/e.maxHP?'player':p.hp/p.maxHP<e.hp/e.maxHP?'enemy':'draw';
 return{frames,winner,duration:frames.at(-1)!.time,playerDamage:pDamage,enemyDamage:eDamage};
}
export function validSave(v:unknown):v is Run{
 if(!v||typeof v!=='object')return false;const r=v as Run;
 const validItem=(x:Item)=>x&&typeof x.uid==='string'&&!!DEFS[x.id]&&Number.isInteger(x.tier)&&x.tier>=0&&x.tier<=3&&Number.isFinite(x.bonus)&&(!x.enchant||['swift','fiery','toxic','guarded'].includes(x.enchant));
 const validItems=(a:unknown):a is Item[]=>Array.isArray(a)&&a.length<=10&&a.every(validItem)&&slots(a)<=10;
 if(r.version!==1||!HEROES.some(h=>h.id===r.hero)||!['shop','choice','combat','result','ended','enchant','skill'].includes(r.phase))return false;
 if(!['seed','serial','day','hour','gold','income','hp','level','xp','pendingLevel','prestige','wins','attack','shieldBonus','rerolls'].every(k=>Number.isFinite(r[k as keyof Run])))return false;
 if(!Number.isInteger(r.day)||r.day<1||r.day>50||!Number.isInteger(r.hour)||r.hour<0||r.hour>5||r.hp<=0||r.gold<0||r.level<1||r.wins<0||r.wins>10)return false;
 if(!validItems(r.board)||!validItems(r.stash)||!Array.isArray(r.shop)||r.shop.length>4||!r.shop.every(validItem))return false;
 if(new Set([...r.board,...r.stash].map(x=>x.uid)).size!==r.board.length+r.stash.length)return false;
 if(!Array.isArray(r.skills)||!r.skills.every(id=>SKILLS.some(s=>s.id===id))||!Array.isArray(r.skillOffers)||!Array.isArray(r.log))return false;
 if(['combat','result'].includes(r.phase)){if(!r.battle||!Number.isFinite(r.battle.seed))return false;for(const f of [r.battle.player,r.battle.enemy]){if(!f||!validItems(f.board)||!Number.isFinite(f.hp)||f.hp<=0||!Array.isArray(f.skills)||!Number.isFinite(f.attack)||!Number.isFinite(f.shieldBonus)||!Number.isFinite(f.gold))return false}}
 return true;
}
