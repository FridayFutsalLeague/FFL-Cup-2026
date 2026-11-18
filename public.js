import { APPS_SCRIPT_URL } from './config.js';
import { PLAYER_HISTORY } from './player-history.js';
import { HIGHLIGHTS_DATA } from './highlights-data.js';

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


function highlightPlayerCard(x,subtitle=''){
  return `<button class="highlight-player-card player-click" data-team="${esc(x.team)}" data-player="${esc(x.player)}" type="button">
    <img src="${photoPath(x.team,x.player)}" alt="${esc(x.displayName||x.player)}">
    <span class="highlight-player-copy">
      <span class="highlight-player-name">${esc(x.displayName||x.player)}</span>
      ${subtitle?`<span class="highlight-player-sub">${esc(subtitle)}</span>`:''}
    </span>
  </button>`;
}
function tournamentCard(x){
  const fallback=photoPath(x.team,x.player);
  return `<button class="tot-special-card player-click ${esc(x.slot||'')}" data-team="${esc(x.team)}" data-player="${esc(x.player)}" type="button" aria-label="View ${esc(x.displayName||x.player)} profile">
    <img src="${esc(x.card||fallback)}" alt="${esc(x.displayName||x.player)} Team of the Tournament card" onerror="this.onerror=null;this.src='${fallback}'">
  </button>`;
}
function benchHeadshot(x,extra=''){
  return `<button class="bench-player player-click ${extra}" data-team="${esc(x.team)}" data-player="${esc(x.player)}" type="button">
    <img src="${photoPath(x.team,x.player)}" alt="${esc(x.displayName||x.player)}">
    <span><strong>${esc(x.displayName||x.player)}</strong><small>${esc(x.team)}</small></span>
  </button>`;
}
function roadToChampions(){
  const wolves='Wolves';
  const matches=(state.matches||[])
    .filter(finalMatch)
    .map(resolvedMatch)
    .filter(m=>m.home===wolves||m.away===wolves);
  return matches.map((m,i)=>{
    const hs=n(m.homeScore),as=n(m.awayScore);
    const wolvesHome=m.home===wolves;
    const wolvesScore=wolvesHome?hs:as;
    const oppScore=wolvesHome?as:hs;
    const opponent=wolvesHome?m.away:m.home;
    const isFinal=stage(m)==='final';
    const hasPens=isFinal&&wolvesScore===oppScore&&n(m.homePens)!=null&&n(m.awayPens)!=null;
    const wolvesPens=wolvesHome?n(m.homePens):n(m.awayPens);
    const oppPens=wolvesHome?n(m.awayPens):n(m.homePens);
    const result=hasPens?`Won ${wolvesPens}–${oppPens} on pens`:(wolvesScore>oppScore?'Win':'Draw');
    const stageLabel=stage(m)==='group'?'Group Stage':(stage(m)==='semi'?'Semi Final':'Grand Final');
    return `<article class="road-match ${isFinal?'road-final':''}">
      <div class="road-node">${isFinal?'🏆':i+1}</div>
      <div class="road-stage">${stageLabel}</div>
      <div class="road-opponent">${teamBadge(opponent,'road-badge')}<span>vs ${esc(opponent)}</span></div>
      <div class="road-score">${wolvesScore}–${oppScore}</div>
      <div class="road-result">${esc(result)}</div>
    </article>`;
  }).join('');
}
function wolvesTournamentRecord(){
  const wolves='Wolves';
  const matches=(state.matches||[]).filter(finalMatch).map(resolvedMatch).filter(m=>m.home===wolves||m.away===wolves);
  const record={played:matches.length,wins:0,draws:0,losses:0,gf:0,ga:0,shootoutWins:0};
  matches.forEach(m=>{
    const hs=n(m.homeScore),as=n(m.awayScore),home=m.home===wolves;
    const gf=home?hs:as,ga=home?as:hs;
    record.gf+=Number(gf||0);record.ga+=Number(ga||0);
    if(gf>ga)record.wins++;
    else if(gf<ga)record.losses++;
    else {
      record.draws++;
      const wp=home?n(m.homePens):n(m.awayPens),op=home?n(m.awayPens):n(m.homePens);
      if(wp!=null&&op!=null&&wp>op)record.shootoutWins++;
    }
  });
  return record;
}
function contributionRows(key){
  return totals().filter(x=>x.team==='Wolves'&&Number(x[key]||0)>0).sort((a,b)=>Number(b[key]||0)-Number(a[key]||0)||a.player.localeCompare(b.player));
}
function contributionDonut(title,key,label){
  const rows=contributionRows(key), total=rows.reduce((s,x)=>s+Number(x[key]||0),0);
  const palette=['#f5c84c','#3dd6b4','#6ea8fe','#ff8a65','#c084fc','#94a3b8','#f472b6'];
  let running=0;
  const gradient=rows.length?rows.map((x,i)=>{
    const start=(running/total)*360;
    running+=Number(x[key]||0);
    const end=(running/total)*360;
    return `${palette[i%palette.length]} ${start.toFixed(2)}deg ${end.toFixed(2)}deg`;
  }).join(','):'#253147 0deg 360deg';
  const legend=rows.map((x,i)=>`<button class="contribution-row player-click" data-team="Wolves" data-player="${esc(x.player)}" type="button">
    <span class="contribution-swatch" style="background:${palette[i%palette.length]}"></span>
    <span class="contribution-name">${esc(x.player)}</span>
    <strong>${x[key]}</strong>
  </button>`).join('');
  return `<article class="contribution-card">
    <div class="section-kicker">Wolves ${esc(label)}</div>
    <h3>${esc(title)}</h3>
    <div class="contribution-body">
      <div class="donut-chart" style="background:conic-gradient(${gradient})">
        <div class="donut-hole"><strong>${total}</strong><span>${esc(label)}</span></div>
      </div>
      <div class="contribution-legend">${legend||'<div class="small muted">No stats recorded.</div>'}</div>
    </div>
  </article>`;
}
function roadMetric(label,value,accent=''){
  return `<div class="road-metric ${accent}"><strong>${value}</strong><span>${esc(label)}</span></div>`;
}
function renderRoadToChampions(){
  const r=wolvesTournamentRecord();
  return `<section class="overview-section road-section">
    <div class="overview-heading road-heading">
      <div><div class="section-kicker">Undefeated from start to finish</div><h2>Road to Champions</h2></div>
      <div class="road-summary"><span>${r.played} Matches</span><span>${r.gf} Goals</span><span>Undefeated</span></div>
    </div>
    <div class="road-record-grid">
      ${roadMetric('Wins',r.wins,'win')}
      ${roadMetric('Draws',r.draws)}
      ${roadMetric('Losses',r.losses)}
      ${roadMetric('Goals Scored',r.gf,'gold')}
      ${roadMetric('Goals Conceded',r.ga)}
    </div>
    <div class="road-card card">
      <div class="road-track">${roadToChampions()}</div>
      <div class="road-finish">
        <div class="road-finish-mark">🏆</div>
        <div><div class="section-kicker">The finish line</div><strong>2026 FFL Cup Champions</strong><span>Wolves complete an unbeaten run${r.shootoutWins?' with a penalty-shootout victory in the Grand Final':''}.</span></div>
      </div>
    </div>
    <div class="contribution-grid">
      ${contributionDonut('Who scored the goals?','goals','Goals')}
      ${contributionDonut('Who created them?','assists','Assists')}
    </div>
  </section>`;
}
function renderOverview(){
  const c=HIGHLIGHTS_DATA.champion;
  const awards=HIGHLIGHTS_DATA.awards.map(a=>`
    <article class="award-card">
      <div class="section-kicker">${esc(a.award)}</div>
      ${highlightPlayerCard(a,a.stat)}
    </article>`).join('');
  const starters=HIGHLIGHTS_DATA.teamOfTournament.starters.map(tournamentCard).join('');
  const bench=HIGHLIGHTS_DATA.teamOfTournament.bench.map(x=>benchHeadshot(x)).join('');
  const hm=HIGHLIGHTS_DATA.teamOfTournament.honorableMention;
  $('#overview').innerHTML=`
    <section class="champion-card premium-champion">
      <div class="champion-copy">
        <div class="champion-ribbon">5th Anniversary Champions</div>
        <div class="section-kicker">2026 FFL Cup Recap</div>
        <h2>${esc(c.title)}</h2>
        <div class="champion-team">${teamBadge(c.team,'champion-badge')}<span>${esc(c.team)}</span></div>
        <div class="champion-statline">${esc(c.statline)}</div>
        <p>${esc(c.description)}</p>
      </div>
      <div class="champion-visual" style="background-image:linear-gradient(180deg,rgba(4,7,12,.08),rgba(4,7,12,.55)),url('${esc(c.heroImage||'')}')">
        <div class="champion-photo-label"><span>🏆</span> Tournament Champions</div>
      </div>
    </section>
    <section class="overview-section">
      <div class="overview-heading"><div><div class="section-kicker">Individual honours</div><h2>Tournament Awards</h2></div></div>
      <div class="awards-grid">${awards}</div>
    </section>
    <section class="overview-section">
      <div class="overview-heading"><div><div class="section-kicker">Best of the Cup</div><h2>Team of the Tournament</h2></div></div>
      <div class="tot-card card">
        <div class="tot-label">Starting Five</div>
        <div class="futsal-court" aria-label="Team of the Tournament starting five">
          <div class="court-halfway"></div>
          <div class="court-circle"></div>
          <div class="court-box court-box-top"></div>
          <div class="court-box court-box-bottom"></div>
          ${starters}
        </div>
        <div class="bench-panel">
          <div>
            <div class="tot-label bench-label">Bench</div>
            <div class="bench-headshots">${bench}</div>
          </div>
          <div class="honourable-mention compact-honour"><span>Honourable Mention</span>${benchHeadshot(hm,'honour-player')}</div>
        </div>
      </div>
    </section>
    ${renderRoadToChampions()}`;
}
function highlightVideoId(matchId){return String(HIGHLIGHTS_DATA.videos?.[matchId]||'').trim();}
function highlightPenaltyLine(m,r,hs,as){
  if(!(finalMatch(m)&&hs===as&&n(m.homePens)!=null&&n(m.awayPens)!=null))return '';
  const hp=n(m.homePens),ap=n(m.awayPens),winner=hp>ap?r.home:r.away;
  const wp=Math.max(hp,ap),lp=Math.min(hp,ap);
  return `<div class="highlight-pens">${esc(winner)} win ${wp}–${lp} on penalties</div>`;
}
function highlightThumb(m,r,vid,extra=''){
  return vid
    ? `<div class="highlight-thumb ${extra}"><img src="https://img.youtube.com/vi/${encodeURIComponent(vid)}/maxresdefault.jpg" onerror="this.onerror=null;this.src='https://img.youtube.com/vi/${encodeURIComponent(vid)}/hqdefault.jpg'" alt="${esc(r.home)} vs ${esc(r.away)} highlights thumbnail" loading="lazy"><span class="video-play-mark">▶</span></div>`
    : `<div class="highlight-thumb ${extra}"><div class="highlight-placeholder"><span>▶</span><strong>Highlights coming soon</strong></div></div>`;
}
function highlightWatchButton(m,r,vid,label='Watch Highlights'){
  return vid
    ? `<button class="watch-highlight-btn" data-video-id="${esc(vid)}" data-video-title="${esc(r.home+' vs '+r.away)}" type="button">▶ ${esc(label)}</button>`
    : `<button class="watch-highlight-btn disabled" type="button" disabled>Highlights Coming Soon</button>`;
}
function highlightCard(m,variant='group'){
  const r=resolvedMatch(m), done=finalMatch(m), hs=n(m.homeScore), as=n(m.awayScore), vid=highlightVideoId(m.matchId);
  const pens=highlightPenaltyLine(m,r,hs,as);
  const groupLabel=m.group==='A'?'Group 1':(m.group==='B'?'Group 2':`Group ${esc(m.group)}`);
  const stageLabel=stage(m)==='group'?groupLabel:(stage(m)==='semi'?'Semi Final':'Grand Final');
  return `<article class="highlight-match-card ${variant==='semi'?'semi-highlight-card':''}">
    ${highlightThumb(m,r,vid)}
    <div class="highlight-match-content">
      <div class="highlight-match-head"><span class="stage-pill">${stageLabel}</span><span class="small muted">${fmtTime(m.time)}</span></div>
      <div class="highlight-scoreline">
        <div>${teamBadge(r.home)}<strong>${esc(r.home)}</strong></div>
        <span class="highlight-score">${done?`${hs}–${as}`:'vs'}</span>
        <div>${teamBadge(r.away)}<strong>${esc(r.away)}</strong></div>
      </div>
      ${pens}
      ${highlightWatchButton(m,r,vid)}
    </div>
  </article>`;
}
function grandFinalHighlight(m){
  if(!m)return '';
  const r=resolvedMatch(m),hs=n(m.homeScore),as=n(m.awayScore),vid=highlightVideoId(m.matchId);
  const pens=highlightPenaltyLine(m,r,hs,as);
  return `<article class="featured-final-card">
    <div class="featured-final-media">${highlightThumb(m,r,vid,'featured-thumb')}</div>
    <div class="featured-final-copy">
      <div class="champion-ribbon">2026 Grand Final</div>
      <div class="section-kicker">The championship match</div>
      <h2>${esc(r.home)} <span>${hs}–${as}</span> ${esc(r.away)}</h2>
      ${pens}
      <p>Relive the decisive moments from the match that crowned the 2026 FFL Cup champions.</p>
      <div class="featured-final-teams">
        <span>${teamBadge(r.home,'featured-team-badge')}${esc(r.home)}</span>
        <b>VS</b>
        <span>${teamBadge(r.away,'featured-team-badge')}${esc(r.away)}</span>
      </div>
      ${highlightWatchButton(m,r,vid,'Watch Grand Final Highlights')}
    </div>
  </article>`;
}
function renderHighlights(){
  const group=(state.matches||[]).filter(m=>stage(m)==='group');
  const group1=group.filter(m=>m.group==='A');
  const group2=group.filter(m=>m.group==='B');
  const semis=(state.matches||[]).filter(m=>stage(m)==='semi');
  const final=(state.matches||[]).find(m=>stage(m)==='final');
  const available=Object.values(HIGHLIGHTS_DATA.videos||{}).filter(v=>String(v||'').trim()).length;
  $('#highlights').innerHTML=`
    <section class="highlights-hero">
      <div>
        <div class="section-kicker">FFL Cup 2026 Video Hub</div>
        <h2>Relive Every Match</h2>
        <p>From the opening group games to the first penalty-shootout final in FFL Cup history.</p>
      </div>
      <div class="highlights-count"><strong>${available}</strong><span>of 15 videos live</span></div>
    </section>
    <section class="highlights-stage featured-final-section">
      ${grandFinalHighlight(final)}
    </section>
    <section class="highlights-stage">
      <div class="overview-heading"><div><div class="section-kicker">Final Four</div><h2>Semi Finals</h2></div><span class="pill">2 Matches</span></div>
      <div class="highlights-grid knockout">${semis.map(m=>highlightCard(m,'semi')).join('')}</div>
    </section>
    <section class="highlights-stage">
      <div class="overview-heading"><div><div class="section-kicker">The road to the knockouts</div><h2>Group Stage</h2></div><span class="pill">12 Matches</span></div>
      <div class="group-highlight-section">
        <div class="group-highlight-heading"><div><div class="section-kicker">Group Stage</div><h3>Group 1</h3></div><span class="pill">${group1.length} Matches</span></div>
        <div class="highlights-grid group-video-grid">${group1.map(m=>highlightCard(m,'group')).join('')}</div>
      </div>
      <div class="group-highlight-section">
        <div class="group-highlight-heading"><div><div class="section-kicker">Group Stage</div><h3>Group 2</h3></div><span class="pill">${group2.length} Matches</span></div>
        <div class="highlights-grid group-video-grid">${group2.map(m=>highlightCard(m,'group')).join('')}</div>
      </div>
    </section>`;
  document.querySelectorAll('.watch-highlight-btn[data-video-id]').forEach(btn=>btn.addEventListener('click',()=>openVideo(btn.dataset.videoId,btn.dataset.videoTitle)));
}
function openVideo(id,title){
  const modal=$('#videoModal'), frame=$('#highlightVideoFrame');
  frame.src=`https://www.youtube.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
  $('#videoModalTitle').textContent=title||'FFL Cup Highlights';
  modal.classList.remove('hidden'); document.body.classList.add('modal-open');
}
function closeVideo(){
  $('#videoModal').classList.add('hidden');
  $('#highlightVideoFrame').src='';
  document.body.classList.remove('modal-open');
}
$('.video-modal-close')?.addEventListener('click',closeVideo);
$('.video-modal-backdrop')?.addEventListener('click',closeVideo);

function render(){
  if(!state)return;
  const A=standings('A'),B=standings('B');
  const groupMatches=state.matches.filter(m=>stage(m)==='group'),completed=groupMatches.filter(finalMatch),upcoming=groupMatches.filter(m=>!finalMatch(m));
  const latest=[...completed].slice(-4).reverse(),next=upcoming.slice(0,4),all=totals();
  const goals=[...all].filter(x=>x.goals>0).sort((a,b)=>b.goals-a.goals||b.assists-a.assists||a.player.localeCompare(b.player)).slice(0,20);
  const assists=[...all].filter(x=>x.assists>0).sort((a,b)=>b.assists-a.assists||b.goals-a.goals||a.player.localeCompare(b.player)).slice(0,20);
  renderOverview();
  renderHighlights();
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
