import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc, runTransaction, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { firebaseConfig, TOURNAMENT_ID } from "./firebase-config.js";
import { SEED } from "./seed-data.js";

export const configured = !firebaseConfig.apiKey.startsWith("PASTE_");
export let db=null, auth=null, tournamentRef=null;
if(configured){
  const app=initializeApp(firebaseConfig);
  db=getFirestore(app); auth=getAuth(app);
  tournamentRef=doc(db,"tournaments",TOURNAMENT_ID);
}
export { SEED, signInWithEmailAndPassword, signOut, onAuthStateChanged, setDoc, runTransaction, serverTimestamp };
export function blankMatch(m){return {...m,status:"upcoming",homeScore:null,awayScore:null,homePens:null,awayPens:null,stats:{}}}
export function seedState(){return {...SEED,matches:SEED.matches.map(blankMatch),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}}
export function listenState(cb){if(!configured){cb(seedState());return()=>{}}return onSnapshot(tournamentRef,s=>cb(s.exists()?s.data():null))}
export function standings(state,group){
  const names=state.groups[group], rows=Object.fromEntries(names.map(n=>[n,{team:n,P:0,W:0,D:0,L:0,GF:0,GA:0,GD:0,Pts:0}]));
  for(const m of state.matches.filter(x=>x.stage==="group"&&x.group===group&&x.status==="final")){
    if(m.homeScore==null||m.awayScore==null)continue; const h=rows[m.home],a=rows[m.away]; if(!h||!a)continue;
    h.P++;a.P++;h.GF+=Number(m.homeScore);h.GA+=Number(m.awayScore);a.GF+=Number(m.awayScore);a.GA+=Number(m.homeScore);
    if(m.homeScore>m.awayScore){h.W++;a.L++;h.Pts+=3}else if(m.homeScore<m.awayScore){a.W++;h.L++;a.Pts+=3}else{h.D++;a.D++;h.Pts++;a.Pts++}
  }
  Object.values(rows).forEach(r=>r.GD=r.GF-r.GA);
  return Object.values(rows).sort((a,b)=>b.Pts-a.Pts||b.GD-a.GD||b.GF-a.GF||a.team.localeCompare(b.team));
}
export function winner(state,m){
  if(!m||m.status!=="final")return null; const r=resolvedMatch(state,m),h=Number(m.homeScore),a=Number(m.awayScore);
  if(h>a)return r.home;if(a>h)return r.away;if(m.homePens!=null&&m.awayPens!=null){if(Number(m.homePens)>Number(m.awayPens))return r.home;if(Number(m.awayPens)>Number(m.homePens))return r.away}return null;
}
export function resolvedMatch(state,m){
  const A=standings(state,"A"),B=standings(state,"B"),r={...m};
  const resolve=x=>{if(x==="A1")return A[0]?.team||x;if(x==="A2")return A[1]?.team||x;if(x==="B1")return B[0]?.team||x;if(x==="B2")return B[1]?.team||x;if(x==="SF1 Winner")return winner(state,state.matches.find(v=>v.id==="sf1"))||x;if(x==="SF2 Winner")return winner(state,state.matches.find(v=>v.id==="sf2"))||x;return x};
  r.home=resolve(r.home);r.away=resolve(r.away);return r;
}
export function playerTotals(state){
  const map={};for(const [team,players] of Object.entries(state.teams))for(const p of players)map[`${team}::${p}`]={player:p,team,goals:0,assists:0};
  for(const m of state.matches){if(m.status!=="final"||!m.stats)continue;for(const [k,v] of Object.entries(m.stats)){if(!map[k])continue;map[k].goals+=Number(v.goals||0);map[k].assists+=Number(v.assists||0)}}return Object.values(map)
}
export function teamPlayers(state,team){return state.teams[team]||[]}
export function fmtTime(t){const [h,m]=t.split(":").map(Number),d=new Date();d.setHours(h,m,0,0);return d.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}
