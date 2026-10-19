import { APPS_SCRIPT_URL } from './config.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
let state = null;

const TEAM_BADGES = Object.fromEntries(['Wolves','Dragons','Bears','Lions','Cobras','Eagles'].map(t => [t, `assets/teams/${t.toLowerCase()}.webp`]));
const PHOTO_OVERRIDES = {
  'Wolves::Anthony': 'assets/players/wolves/anthony.webp',
  'Eagles::Simon': 'assets/players/eagles/simon.webp'
};

const slug = (s) => String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const teamBadge = (team, extra='') => TEAM_BADGES[team] ? `<img class="team-badge ${extra}" src="${TEAM_BADGES[team]}" alt="${team} badge">` : '';
const photoPath = (team,player) => PHOTO_OVERRIDES[`${team}::${player}`] || `assets/players/${slug(team)}/${slug(player)}.webp`;

$$('.nav button').forEach(btn => btn.addEventListener('click', () => {
  $$('.nav button').forEach(x => x.classList.remove('active'));
  btn.classList.add('active');
  $$('.tab').forEach(x => x.classList.add('hidden'));
  $('#' + btn.dataset.tab).classList.remove('hidden');
  window.scrollTo({top:0,behavior:'smooth'});
}));

function isConfigured(){ return APPS_SCRIPT_URL && !APPS_SCRIPT_URL.includes('PASTE_YOUR'); }
function loadData(){
  if(!isConfigured()){ showConnection('The Apps Script URL still needs to be added in config.js.'); return; }
  const cb='__ffl_'+Date.now()+'_'+Math.floor(Math.random()*100000), script=document.createElement('script');
  let finished=false;
  const cleanup=()=>{try{delete window[cb]}catch{};script.remove()};
  const timeout=setTimeout(()=>{if(finished)return;finished=true;cleanup();showConnection('Could not reach the tournament data. Check the Apps Script deployment URL.');},10000);
  window[cb]=(data)=>{if(finished)return;finished=true;clearTimeout(timeout);cleanup();state=data;hideConnection();render();$('#lastUpdated').textContent='Updated '+new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit',second:'2-digit',hour12:true}).toLowerCase();};
  script.onerror=()=>{if(finished)return;finished=true;clearTimeout(timeout);cleanup();showConnection('Could not load tournament data. Check the Apps Script deployment.');};
  const join=APPS_SCRIPT_URL.includes('?')?'&':'?';
  script.src=APPS_SCRIPT_URL+join+'api=data&callback='+encodeURIComponent(cb)+'&_='+Date.now();
  document.body.appendChild(script);
}
function showConnection(msg){const n=$('#connection');n.textContent=msg;n.classList.remove('hidden')}
function hideConnection(){$('#connection').classList.add('hidden')}
function finalMatch(m){return String(m.status).toLowerCase()==='final'}
function stage(m){return String(m.stage||'').toLowerCase()}
function n(v){return v===''||v==null?null:Number(v)}

function standings(group){
  const names=state.groups[group]||[];
  const rows=Object.fromEntries(names.map(team=>[team,{team,P:0,W:0,D:0,L:0,GF:0,GA:0,GD:0,Pts:0}]));
  state.matches.filter(m=>stage(m)==='group'&&m.group===group&&finalMatch(m)).forEach(m=>{
    const hs=n(m.homeScore),as=n(m.awayScore);if(hs==null||as==null||!rows[m.home]||!rows[m.away])return;
    const h=rows[m.home],a=rows[m.away];h.P++;a.P++;h.GF+=hs;h.GA+=as;a.GF+=as;a.GA+=hs;
    if(hs>as){h.W++;a.L++;h.Pts+=3}else if(as>hs){a.W++;h.L++;a.Pts+=3}else{h.D++;a.D++;h.Pts++;a.Pts++}
  });
  Object.values(rows).forEach(r=>r.GD=r.GF-r.GA);
  return Object.values(rows).sort((a,b)=>b.Pts-a.Pts||b.GD-a.GD||b.GF-a.GF||a.team.localeCompare(b.team));
}
function winner(m){
  if(!m||!finalMatch(m))return null;
  const r=resolvedMatch(m),hs=n(m.homeScore),as=n(m.awayScore);if(hs==null||as==null)return null;
  if(hs>as)return r.home;if(as>hs)return r.away;
  const hp=n(m.homePens),ap=n(m.awayPens);if(hp==null||ap==null)return null;
  if(hp>ap)return r.home;if(ap>hp)return r.away;return null;
}
function resolvedTeam(label){
  const A=standings('A'),B=standings('B');
  if(label==='A1')return A[0]?.team||label;if(label==='A2')return A[1]?.team||label;
  if(label==='B1')return B[0]?.team||label;if(label==='B2')return B[1]?.team||label;
  if(label==='SF1 Winner')return winner(state.matches.find(m=>m.matchId==='sf1'))||label;
  if(label==='SF2 Winner')return winner(state.matches.find(m=>m.matchId==='sf2'))||label;
  return label;
}
function resolvedMatch(m){return {...m,home:resolvedTeam(m.home),away:resolvedTeam(m.away)}}
function teamInline(team,extra=''){return `<span class="team-inline">${teamBadge(team,extra)}<strong>${team}</strong></span>`}
function table(rows){
  return `<div class="table-wrap"><table class="table"><thead><tr><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr></thead><tbody>${rows.map((r,i)=>`<tr class="${i<2?'qualify':''}"><td><span class="team-inline">${teamBadge(r.team,'small-badge')}<strong>${i+1}. ${r.team}</strong></span></td><td>${r.P}</td><td>${r.W}</td><td>${r.D}</td><td>${r.L}</td><td>${r.GF}</td><td>${r.GA}</td><td>${r.GD>0?'+':''}${r.GD}</td><td><strong>${r.Pts}</strong></td></tr>`).join('')}</tbody></table></div>`;
}
function fmtTime(t){
  if(!t)return '';
  const [h,m]=String(t).split(':').map(Number),d=new Date();d.setHours(h,m||0,0,0);
  return d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit',hour12:true}).toLowerCase();
}
function fixture(m){
  const r=resolvedMatch(m),done=finalMatch(m),hs=n(m.homeScore),as=n(m.awayScore);
  const pens=done&&hs===as&&n(m.homePens)!=null&&n(m.awayPens)!=null?`<span class="pens">Pens ${m.homePens}–${m.awayPens}</span>`:'';
  const label=stage(m)==='group'?'Group '+m.group:(stage(m)==='semi'?'Semi-final':'Grand Final');
  return `<div class="fixture"><div>${teamInline(r.home)}<div class="small muted fixture-meta">${fmtTime(m.time)} · Court ${m.court}</div></div><div class="score">${done?`${hs}–${as}`:'vs'}${pens}</div><div class="away">${teamInline(r.away)}<div class="small muted fixture-meta ${stage(m)==='final'?'final-tag':''}">${done?'FINAL':label}</div></div></div>`;
}
function totals(){
  const out={};
  Object.entries(state.teams||{}).forEach(([team,players])=>players.forEach(player=>out[team+'::'+player]={team,player,goals:0,assists:0}));
  (state.matchStats||[]).forEach(s=>{const k=s.team+'::'+s.player;if(!out[k])out[k]={team:s.team,player:s.player,goals:0,assists:0};out[k].goals+=Number(s.goals||0);out[k].assists+=Number(s.assists||0)});
  return Object.values(out);
}
function statList(arr,key){
  if(!arr.length)return `<div class="empty-state">No stats recorded yet.</div>`;
  return arr.map((x,i)=>`<div class="statrow"><div class="player-stat"><span class="rank">${i+1}</span><img class="player-thumb" src="${photoPath(x.team,x.player)}" alt="${x.player}" loading="lazy"><div class="player-stat-copy"><div class="player-stat-name">${x.player}</div><div class="player-stat-team">${teamBadge(x.team,'small-badge')} ${x.team}</div></div></div><span class="stat-number">${x[key]}</span></div>`).join('');
}
function teamCard(team,group){
  const players=state.teams?.[team]||[];
  return `<article class="card team-card"><div class="team-card-head">${teamBadge(team)}<div><div class="team-card-title">${team}</div><div class="group-chip">Group ${group}</div></div></div><div class="roster-grid">${players.map(p=>`<div class="player-card"><img class="player-photo" src="${photoPath(team,p)}" alt="${p}" loading="lazy"><div class="player-name">${p}</div></div>`).join('')}</div></article>`;
}
function renderTeams(){
  const sections=['A','B'].map(g=>`<div class="team-section"><div class="team-section-heading"><div><div class="section-kicker">Tournament squads</div><h2>Group ${g}</h2></div><span class="pill">${(state.groups[g]||[]).length} teams</span></div><div class="teams-grid">${(state.groups[g]||[]).map(t=>teamCard(t,g)).join('')}</div></div>`).join('');
  $('#teams').innerHTML=sections;
}
function render(){
  if(!state)return;
  const A=standings('A'),B=standings('B');
  const groupMatches=state.matches.filter(m=>stage(m)==='group'),completed=groupMatches.filter(finalMatch),upcoming=groupMatches.filter(m=>!finalMatch(m));
  const latest=[...completed].slice(-4).reverse(),next=upcoming.slice(0,4),all=totals();
  const goals=[...all].filter(x=>x.goals>0).sort((a,b)=>b.goals-a.goals||b.assists-a.assists||a.player.localeCompare(b.player)).slice(0,20);
  const assists=[...all].filter(x=>x.assists>0).sort((a,b)=>b.assists-a.assists||b.goals-a.goals||a.player.localeCompare(b.player)).slice(0,20);
  $('#overview').innerHTML=`<div class="grid"><div class="card"><div class="section-title"><div><div class="section-kicker">Tournament pulse</div><h2>Latest Results</h2></div><span class="pill">${completed.length}/12 group games</span></div>${latest.length?latest.map(fixture).join(''):'<div class="empty-state">No results yet.</div>'}</div><div class="card"><div class="section-kicker">Coming up</div><h2>Next Matches</h2>${next.length?next.map(fixture).join(''):'<div class="empty-state">Group stage complete.</div>'}</div></div><div class="grid" style="margin-top:16px"><div class="card"><div class="section-kicker">Standings</div><h3>Group A</h3>${table(A)}</div><div class="card"><div class="section-kicker">Standings</div><h3>Group B</h3>${table(B)}</div></div><div class="grid" style="margin-top:16px"><div class="card"><div class="section-kicker">Golden Boot</div><h2>Top 5 Goals</h2>${statList(goals.slice(0,5),'goals')}</div><div class="card"><div class="section-kicker">Creators</div><h2>Top 5 Assists</h2>${statList(assists.slice(0,5),'assists')}</div></div>`;
  renderTeams();
  $('#groups').innerHTML=`<div class="grid"><div class="card"><div class="section-kicker">Group stage</div><h2>Group A</h2>${table(A)}</div><div class="card"><div class="section-kicker">Group stage</div><h2>Group B</h2>${table(B)}</div></div>`;
  $('#fixtures').innerHTML=`<div class="card"><div class="section-kicker">Full schedule</div><h2>Fixtures & Results</h2>${groupMatches.map(fixture).join('')}</div>`;
  $('#stats').innerHTML=`<div class="grid"><div class="card"><div class="section-kicker">Golden Boot race</div><h2>Goals</h2>${statList(goals,'goals')}</div><div class="card"><div class="section-kicker">Playmakers</div><h2>Assists</h2>${statList(assists,'assists')}</div></div>`;
  const finals=state.matches.filter(m=>stage(m)!=='group');
  $('#finals').innerHTML=`<div class="card final-hero"><div class="section-kicker">Knockout stage</div><h2>Road to the Cup</h2>${finals.map(fixture).join('')}<p class="small muted">Semi-finals: A1 vs B2 and B1 vs A2. Tied knockout matches go straight to penalties.</p></div>`;
}

loadData();
setInterval(loadData,15000);
