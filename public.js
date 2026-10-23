import { APPS_SCRIPT_URL } from './config.js';
import { PLAYER_HISTORY } from './player-history.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
let state = null;

const TEAM_BADGES = Object.fromEntries(['Wolves','Dragons','Bears','Lions','Cobras','Eagles'].map(t => [t, `assets/teams/${t.toLowerCase()}.webp`]));
const PHOTO_OVERRIDES = {
  'Wolves::Anthony': 'assets/players/wolves/anthony.webp',
  'Eagles::Simon': 'assets/players/eagles/simon.webp'
};

const slug = (s) => String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const teamBadge = (team, extra='') => TEAM_BADGES[team] ? `<img class="team-badge ${extra}" src="${TEAM_BADGES[team]}" alt="${esc(team)} badge">` : '';
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
function teamInline(team,extra=''){return `<span class="team-inline">${teamBadge(team,extra)}<strong>${esc(team)}</strong></span>`}
function table(rows){
  return `<div class="table-wrap"><table class="table"><thead><tr><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr></thead><tbody>${rows.map((r,i)=>`<tr class="${i<2?'qualify':''}"><td><span class="team-inline">${teamBadge(r.team,'small-badge')}<strong>${i+1}. ${esc(r.team)}</strong></span></td><td>${r.P}</td><td>${r.W}</td><td>${r.D}</td><td>${r.L}</td><td>${r.GF}</td><td>${r.GA}</td><td>${r.GD>0?'+':''}${r.GD}</td><td><strong>${r.Pts}</strong></td></tr>`).join('')}</tbody></table></div>`;
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
function playerButton(team,player,inner,cls=''){
  return `<button class="player-click ${cls}" data-team="${esc(team)}" data-player="${esc(player)}" type="button" aria-label="View ${esc(player)} Cup stats">${inner}</button>`;
}
function statList(arr,key){
  if(!arr.length)return `<div class="empty-state">No stats recorded yet.</div>`;
  return arr.map((x,i)=>`<div class="statrow">${playerButton(x.team,x.player,`<span class="player-stat"><span class="rank">${i+1}</span><img class="player-thumb" src="${photoPath(x.team,x.player)}" alt="${esc(x.player)}" loading="lazy"><span class="player-stat-copy"><span class="player-stat-name">${esc(x.player)}</span><span class="player-stat-team">${teamBadge(x.team,'small-badge')} ${esc(x.team)}</span></span></span>`,'stat-player-button')}<span class="stat-number">${x[key]}</span></div>`).join('');
}
function teamCard(team,group){
  const players=state.teams?.[team]||[];
  return `<article class="card team-card"><div class="team-card-head">${teamBadge(team)}<div><div class="team-card-title">${esc(team)}</div><div class="group-chip">Group ${group}</div></div></div><div class="roster-grid">${players.map(p=>playerButton(team,p,`<img class="player-photo" src="${photoPath(team,p)}" alt="${esc(p)}" loading="lazy"><span class="player-name">${esc(p)}</span>`,'player-card')).join('')}</div></article>`;
}
function renderTeams(){
  const sections=['A','B'].map(g=>`<div class="team-section"><div class="team-section-heading"><div><div class="section-kicker">Tournament squads</div><h2>Group ${g}</h2></div><span class="pill">${(state.groups[g]||[]).length} teams</span></div><div class="teams-grid">${(state.groups[g]||[]).map(t=>teamCard(t,g)).join('')}</div></div>`).join('');
  $('#teams').innerHTML=sections;
}
function renderCompetitionInfo(){
  const rows=[...(state.competitionInfo||[])].filter(x=>String(x.details||'').trim()).sort((a,b)=>Number(a.displayOrder||999)-Number(b.displayOrder||999));
  if(!rows.length){
    $('#info').innerHTML=`<div class="card"><div class="section-kicker">Tournament guide</div><h2>Competition Info</h2><div class="empty-state">Competition information is ready in the backend Sheet. Fill in the <strong>Details</strong> column, then deploy the small Apps Script update included with this package.</div></div>`;
    return;
  }
  const sections={};
  rows.forEach(r=>{const section=String(r.section||'Other');(sections[section] ||= []).push(r)});
  $('#info').innerHTML=`<div class="info-grid">${Object.entries(sections).map(([section,items])=>`<div class="card info-card"><div class="section-kicker">Competition info</div><h2>${esc(section)}</h2>${items.map(item=>`<div class="info-row"><div class="info-label">${esc(item.item)}</div><div class="info-detail">${esc(item.details)}</div></div>`).join('')}</div>`).join('')}</div>`;
}

function livePlayerStats(team,player){
  const stat=totals().find(x=>x.team===team&&x.player===player)||{goals:0,assists:0};
  const matches=(state.matches||[]).filter(finalMatch).map(resolvedMatch).filter(m=>m.home===team||m.away===team).length;
  return {matches,goals:stat.goals,assists:stat.assists,involvements:stat.goals+stat.assists};
}
function metric(label,value,accent=''){
  return `<div class="profile-metric ${accent}"><span class="profile-metric-value">${value}</span><span class="profile-metric-label">${label}</span></div>`;
}
function rate(v){return Number(v||0).toFixed(2)}
function historyTable(history){
  if(!history?.length)return `<div class="profile-debut">Cup debut in 2026</div>`;
  return `<div class="profile-history"><div class="profile-history-head"><span>Year</span><span>MP</span><span>G</span><span>A</span><span>Finish</span></div>${history.map(y=>`<div class="profile-history-row"><strong>${y.year}</strong><span>${y.matches}</span><span>${y.goals}</span><span>${y.assists}</span><span>${y.champion?'🏆 Champions':(y.runnerUp?'🥈 Runners-up':'—')}</span></div>`).join('')}</div>`;
}
function openPlayer(team,player){
  const key=`${team}::${player}`;
  const h=PLAYER_HISTORY[key]||{cupApps:0,champions:0,runnerUps:0,matches:0,wins:0,draws:0,losses:0,goals:0,assists:0,goalsPerMatch:0,assistsPerMatch:0,involvementPerMatch:0,history:[]};
  const live=livePlayerStats(team,player);
  const honors=[];
  if(h.champions)honors.push(`🏆 ${h.champions}× FFL Cup Champion${h.champions>1?'s':''}`);
  if(h.runnerUps)honors.push(`🥈 ${h.runnerUps}× Runner-up${h.runnerUps>1?'s':''}`);
  const modal=$('#playerModal');
  $('#playerModalBody').innerHTML=`
    <div class="profile-hero">
      <div class="profile-photo-wrap"><img class="profile-photo" src="${photoPath(team,player)}" alt="${esc(player)}"></div>
      <div class="profile-identity">
        <div class="profile-team">${teamBadge(team)} <span>${esc(team)}</span></div>
        <h2 id="playerModalTitle">${esc(player)}</h2>
        <div class="profile-subtitle">FFL Cup Player Profile</div>
        ${honors.length?`<div class="profile-honors">${honors.map(x=>`<span>${x}</span>`).join('')}</div>`:''}
      </div>
    </div>
    <section class="profile-section">
      <div class="profile-section-heading"><div><div class="section-kicker">Career record</div><h3>All-Time FFL Cup</h3></div><span class="pill">Through 2025</span></div>
      <div class="profile-metrics">
        ${metric('Cup Apps',h.cupApps)}${metric('Matches',h.matches)}${metric('Wins',h.wins)}${metric('Goals',h.goals,'gold')}${metric('Assists',h.assists,'gold')}${metric('G / Match',rate(h.goalsPerMatch))}${metric('A / Match',rate(h.assistsPerMatch))}${metric('G+A / Match',rate(h.involvementPerMatch))}
      </div>
    </section>
    <section class="profile-section profile-live-section">
      <div class="profile-section-heading"><div><div class="section-kicker">This tournament</div><h3>2026 Live</h3></div><span class="live-pill">LIVE</span></div>
      <div class="profile-metrics compact">
        ${metric('Matches',live.matches)}${metric('Goals',live.goals,'gold')}${metric('Assists',live.assists,'gold')}${metric('G+A',live.involvements)}
      </div>
    </section>
    <section class="profile-section">
      <div class="section-kicker">Cup history</div><h3>Year by Year</h3>
      ${historyTable(h.history)}
    </section>`;
  modal.classList.remove('hidden');
  document.body.classList.add('modal-open');
}
function closePlayer(){
  $('#playerModal').classList.add('hidden');
  document.body.classList.remove('modal-open');
}
function wirePlayerLinks(){
  $$('.player-click').forEach(btn=>btn.addEventListener('click',()=>openPlayer(btn.dataset.team,btn.dataset.player)));
}
$('.player-modal-close').addEventListener('click',closePlayer);
$('.player-modal-backdrop').addEventListener('click',closePlayer);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closePlayer()});

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
  const court1Matches=groupMatches.filter(m=>Number(m.court)===1);
  const court2Matches=groupMatches.filter(m=>Number(m.court)===2);
  $('#fixtures').innerHTML=`<div class="grid"><div class="card"><div class="section-kicker">Full schedule</div><h2>Court 1</h2>${court1Matches.map(fixture).join('')}</div><div class="card"><div class="section-kicker">Full schedule</div><h2>Court 2</h2>${court2Matches.map(fixture).join('')}</div></div>`;
  $('#stats').innerHTML=`<div class="grid"><div class="card"><div class="section-kicker">Golden Boot race</div><h2>Goals</h2>${statList(goals,'goals')}</div><div class="card"><div class="section-kicker">Playmakers</div><h2>Assists</h2>${statList(assists,'assists')}</div></div>`;
  const semiFinals=state.matches.filter(m=>stage(m)==='semi');
  const grandFinal=state.matches.filter(m=>stage(m)==='final');
  $('#finals').innerHTML=`<div class="finals-page"><div class="card final-hero finals-intro"><div class="section-kicker">Knockout stage</div><h2>Road to the Cup</h2><p class="small muted finals-note">Semi-finals: A1 vs B2 and B1 vs A2. Tied knockout matches go straight to penalties.</p></div><section class="card final-stage-card semi-stage"><div class="final-stage-heading"><div><div class="section-kicker">Final Four</div><h2>Semi Finals</h2></div><span class="stage-pill">2 Matches</span></div><div class="final-stage-matches">${semiFinals.map(fixture).join('')||'<div class="empty-state">Semi finals not available yet.</div>'}</div></section><section class="card final-stage-card grand-final-stage"><div class="final-stage-heading"><div><div class="section-kicker">Championship Match</div><h2>Grand Final</h2></div><span class="stage-pill gold-pill">The Cup</span></div><div class="final-stage-matches">${grandFinal.map(fixture).join('')||'<div class="empty-state">Grand Final not available yet.</div>'}</div></section></div>`;
  renderCompetitionInfo();
  wirePlayerLinks();
}

loadData();
setInterval(loadData,15000);


// PWA install handling
let fflDeferredInstallPrompt = null;
const fflInstallBtn = document.getElementById('installAppBtn');
const fflInstallHelp = document.getElementById('installHelp');
function fflIsStandalone(){return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;}
function fflShowInstallHelp(html){if(!fflInstallHelp)return;fflInstallHelp.innerHTML=html+'<br><button type="button" id="closeInstallHelp">Close</button>';fflInstallHelp.classList.remove('hidden');document.getElementById('closeInstallHelp')?.addEventListener('click',()=>fflInstallHelp.classList.add('hidden'));}
window.addEventListener('beforeinstallprompt',(e)=>{e.preventDefault();fflDeferredInstallPrompt=e;if(fflInstallBtn&&!fflIsStandalone())fflInstallBtn.classList.remove('hidden');});
window.addEventListener('appinstalled',()=>{fflDeferredInstallPrompt=null;if(fflInstallBtn)fflInstallBtn.classList.add('hidden');if(fflInstallHelp)fflInstallHelp.classList.add('hidden');});
if(fflInstallBtn){
  if(fflIsStandalone()) fflInstallBtn.classList.add('hidden');
  fflInstallBtn.addEventListener('click',async()=>{
    if(fflDeferredInstallPrompt){fflDeferredInstallPrompt.prompt();await fflDeferredInstallPrompt.userChoice;fflDeferredInstallPrompt=null;return;}
    const ua=navigator.userAgent||'';
    if(/iPhone|iPad|iPod/i.test(ua)){fflShowInstallHelp('<strong>Install on iPhone/iPad:</strong> open this page in Safari, tap <strong>Share</strong>, then choose <strong>Add to Home Screen</strong>.');}
    else if(/Android/i.test(ua)){fflShowInstallHelp('<strong>Install on Android:</strong> open the browser menu (⋮) and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.');}
    else{fflShowInstallHelp('<strong>Install this app:</strong> use your browser menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.');}
  });
}
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));}
