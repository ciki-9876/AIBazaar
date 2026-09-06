export type HeroId = 'duelist' | 'alchemist' | 'artificer';
export type Effect = 'damage'|'shield'|'heal'|'poison'|'burn'|'haste'|'freeze'|'slow'|'regen'|'charge';
export type Enchant = 'swift'|'fiery'|'toxic'|'guarded';
export type Item = {uid:string;id:string;tier:number;bonus:number;enchant?:Enchant};
export type Definition = {id:string;name:string;size:number;cost:number;cd:number;effect:Effect;power:number;icon:string;family:HeroId|'neutral';tag:string;note?:string;passive?:string;ammo?:number;minDay?:number};
const d=(id:string,name:string,size:number,cost:number,cd:number,effect:Effect,power:number,icon:string,family:Definition['family'],tag:string,extra:Partial<Definition>={}):Definition=>({id,name,size,cost,cd,effect,power,icon,family,tag,...extra});
export const ITEMS:Definition[]=[
 d('saber','锈月弯刀',2,4,3,'damage',22,'sword','duelist','武器'),
 d('needle','鸦羽飞针',1,3,2,'damage',9,'feather','duelist','武器'),
 d('pistol','黄昏手铳',1,4,2,'damage',31,'crosshair','duelist','武器',{ammo:5}),
 d('harpoon','鲸骨猎矛',3,7,6,'damage',74,'swords','duelist','武器',{note:'每次触发后，本场伤害 +12。',passive:'ramp'}),
 d('scope','独眼镜片',1,4,0,'damage',0,'eye','duelist','工具',{note:'相邻武器暴击率 +20%。',passive:'crit'}),
 d('bell','渡鸦风铃',1,4,5,'haste',2,'bell','duelist','工具',{note:'加速相邻物品，使冷却推进速度翻倍。'}),
 d('rapier','月蚀细剑',2,6,4,'damage',35,'sword','duelist','武器',{note:'场上仅有一件武器时，伤害翻倍。',passive:'solo'}),
 d('drum','赤潮战鼓',2,5,5,'charge',1.2,'drum','duelist','工具',{note:'使全部武器的当前冷却前进。'}),
 d('daggers','双生短刃',2,5,3.5,'damage',16,'swords','duelist','武器',{note:'每次触发攻击两次。',passive:'double'}),
 d('lantern','余烬灯',1,4,4,'burn',6,'flame','alchemist','炼金'),
 d('vial','苔毒试剂',1,3,4,'poison',5,'flask','alchemist','炼金'),
 d('greenhouse','玻璃温室',3,7,5,'poison',12,'sprout','alchemist','炼金',{note:'每次使用另一件炼金物品，本场毒素 +1。',passive:'chemistry'}),
 d('cauldron','夜沸坩埚',2,5,5,'burn',10,'cooking','alchemist','炼金',{note:'相邻毒物品触发时，额外施加 2 灼烧。',passive:'reaction'}),
 d('herb','活根草',1,3,5,'regen',3,'leaf','alchemist','炼金'),
 d('ice','无融之冰',1,4,6,'freeze',1.5,'snow','alchemist','炼金'),
 d('tonic','月露药剂',1,3,3,'heal',42,'potion','alchemist','炼金',{ammo:4}),
 d('hourglass','琥珀沙漏',2,5,5,'slow',2,'hourglass','alchemist','工具'),
 d('furnace','萤火熔炉',3,7,6,'burn',15,'flame','alchemist','炼金',{note:'每次施加灼烧时，获得 8 护盾。',passive:'fireguard'}),
 d('buckler','铜壳护符',1,3,4,'shield',28,'shield','artificer','机械'),
 d('core','发条心脏',2,5,4,'shield',34,'cpu','artificer','机械',{note:'另一件机械触发时，自身冷却前进 0.5 秒。',passive:'core'}),
 d('coil','雷鸣线圈',2,5,4,'damage',20,'zap','artificer','机械',{note:'额外造成当前护盾的 20% 伤害。',passive:'shieldstrike'}),
 d('wrench','走时扳手',1,4,0,'shield',0,'wrench','artificer','工具',{note:'相邻物品冷却减少 15%。',passive:'adjacent'}),
 d('drone','纸翼侍从',1,3,3,'shield',16,'bird','artificer','机械'),
 d('fortress','折叠堡垒',3,7,6,'shield',95,'castle','artificer','机械'),
 d('repair','缝补蜘蛛',1,4,4,'heal',23,'bot','artificer','机械',{note:'每次触发额外获得 10 护盾。',passive:'repair'}),
 d('turret','烟囱炮台',3,7,5,'damage',63,'tower','artificer','机械'),
 d('battery','星尘电池',1,4,5,'charge',1.5,'battery','artificer','机械',{note:'使相邻物品的当前冷却前进。',passive:'neighbors'}),
 d('purse','吞金钱袋',1,3,0,'shield',0,'coins','neutral','经济',{note:'每日开始额外获得 2 金。装备或存放均生效。',passive:'income'}),
 d('ledger','无字账簿',2,5,0,'damage',0,'book','neutral','经济',{note:'战斗开始时，相邻武器获得当前金币数的额外伤害（至多 40）。',passive:'wealth'}),
 d('tea','安神夜茶',1,3,5,'heal',24,'cup','neutral','食物'),
 d('pearl','晨星珍珠',1,4,6,'shield',35,'gem','neutral','遗物'),
 d('clock','倒行怀表',2,5,5,'haste',2,'clock','neutral','工具',{note:'加速相邻物品，使冷却推进速度翻倍。'}),
 d('mirror','裂隙魔镜',2,6,7,'freeze',2,'scan','neutral','遗物'),
 d('charm','狩夜符',1,4,0,'damage',0,'sparkles','neutral','遗物',{note:'所有武器伤害 +8（随品质成长）。',passive:'damage'}),
 d('moss','回声苔石',1,3,5,'regen',2,'flower','neutral','遗物'),
 d('crystal','结霜棱晶',1,4,5,'slow',1.8,'diamond','neutral','遗物'),
];
export const DEFS=Object.fromEntries(ITEMS.map(x=>[x.id,x])) as Record<string,Definition>;
export const HEROES=[
 {id:'duelist' as const,name:'鸦九',role:'逐月剑客',icon:'swords',color:'orange',title:'让每一次出手，都先于黎明。',description:'武器基础暴击率 +10%。从锈月弯刀与鸦羽飞针开始，擅长迅速击破对手。',hp:260,income:7,starter:['saber','needle','buckler']},
 {id:'alchemist' as const,name:'苔婆',role:'夜色炼金师',icon:'flask',color:'green',title:'毒与火，是漫长夜晚的朋友。',description:'毒与灼烧物品效力 +2。从苔毒试剂与余烬灯开始，擅长持续伤害。',hp:280,income:7,starter:['vial','lantern','herb']},
 {id:'artificer' as const,name:'拾壹',role:'失眠修械师',icon:'cpu',color:'blue',title:'把散落的废品，拼成一颗心。',description:'每场战斗开始获得 45 护盾。从发条心脏与雷鸣线圈开始，擅长机械联动。',hp:300,income:6,starter:['core','coil','drone']},
];
export const TIERS=['青铜','白银','黄金','晶钻'];
export const SCALE=[1,1.8,3.2,5.5];
export const ENCHANTS:Record<Enchant,{name:string;description:string}>={swift:{name:'疾风',description:'冷却减少 20%'},fiery:{name:'焚心',description:'每次触发额外施加 5 灼烧'},toxic:{name:'幽毒',description:'每次触发额外施加 4 毒'},guarded:{name:'守夜',description:'每次触发额外获得 25 护盾'}};
export const SKILLS=[
 {id:'edge',name:'磨刃',description:'所有武器伤害 +8。'},
 {id:'venom',name:'夜毒',description:'毒与灼烧效果 +3。'},
 {id:'shell',name:'坚壳',description:'护盾物品效力 +15。'},
 {id:'tempo',name:'快步',description:'所有物品冷却减少 8%。'},
 {id:'renew',name:'复苏',description:'战斗开始获得 5 再生。'},
 {id:'fortune',name:'财运',description:'日收入永久 +3 金。'},
 {id:'frenzy',name:'孤注',description:'武器暴击率 +12%。'},
 {id:'vital',name:'长生',description:'最大生命永久 +100。'},
];
export const HOURS=['初入集市','街角奇遇','午后交易','荒野悬赏','落日前夕','午夜对决'];
export function value(item:Item){return Math.round(DEFS[item.id].power*SCALE[item.tier]+item.bonus)}
export function price(item:Item){return Math.ceil(DEFS[item.id].cost*[1,1.8,3,5][item.tier])}
export function sellPrice(item:Item){return Math.max(1,Math.floor(price(item)/2))}
export function cooldown(item:Item){return DEFS[item.id].cd*(item.enchant==='swift'?.8:1)}
export function itemText(item:Item){const def=DEFS[item.id];const v=value(item);const effect:Record<Effect,string>={damage:`造成 ${v} 伤害`,shield:`获得 ${v} 护盾`,heal:`恢复 ${v} 生命`,poison:`施加 ${v} 毒`,burn:`施加 ${v} 灼烧`,haste:`加速相邻物品 ${def.power} 秒`,freeze:`冻结一个敌方物品 ${def.power} 秒`,slow:`减速两个敌方物品 ${def.power} 秒`,regen:`获得 ${v} 再生`,charge:`推进${def.passive==='neighbors'?'相邻物品':'所有武器'} ${def.power} 秒冷却`};return def.cd?`每 ${Number(cooldown(item).toFixed(1))} 秒${effect[def.effect]}。${def.ammo?`弹药 ${def.ammo}。`:''}`:def.note||''}
