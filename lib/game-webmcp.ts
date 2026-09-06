import type { Run, Action } from './game-engine';
type Context={registerTool:(tool:{name:string;title:string;description:string;inputSchema:object;annotations:{readOnlyHint:boolean};execute:(input:unknown)=>unknown},options:{signal:AbortSignal})=>void|Promise<void>};
export function registerGameTools(getRun:()=>Run,dispatch:(action:Action)=>Run){
 const context=(document as Document&{modelContext?:Context}).modelContext;if(!context)return;
 const lifecycle=new AbortController();
 const summary=()=>{const r=getRun();return{day:r.day,hour:r.hour,phase:r.phase,gold:r.gold,wins:r.wins,prestige:r.prestige,board:r.board,stash:r.stash,shop:r.shop,notice:r.notice}};
 const tools=[{name:'f9_read_run',title:'查看 f9 冒险',description:'Read the current visible game state and available shop offers.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>summary()},
 {name:'f9_buy_item',title:'购买 f9 异物',description:'Buy one item from the current shop using in-game gold. Duplicates upgrade the owned item. Does not spend real money.',inputSchema:{type:'object',properties:{index:{type:'integer',minimum:0,maximum:3}},required:['index'],additionalProperties:false},annotations:{readOnlyHint:false},execute:(input:unknown)=>{const i=(input as {index?:unknown})?.index;if(!Number.isInteger(i)||Number(i)<0||Number(i)>3)throw Error('index must be an integer from 0 to 3');dispatch({type:'buy',index:Number(i)});return summary()}}];
 for(const tool of tools){try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{})}catch{/* Optional browser capability. */}}
 return()=>lifecycle.abort();
}
