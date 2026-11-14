import { EldritchGame } from './game.js';
import { drawPortrait, drawEntity } from './art.js';
const $=id=>document.getElementById(id);
const icon=name=>`<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
const fmtTime=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;
const characters={archivist:{name:'Silas Whitmore',weapon:'Proyectil arcano',hint:'+25% de experiencia · Conocimiento prohibido',icon:'bolt'},medium:{name:'Agnes Blackwood',weapon:'Sello de los Antiguos',hint:'Comienza con un sello protector orbital',icon:'eye'},mariner:{name:'Elias Marsh',weapon:'Escopeta del puerto',hint:'Dispersión de proyectiles · 120 de vitalidad',icon:'sword'}};
const upgradeIcons={bolt:'bolt',orbit:'spark',haste:'clock',vitality:'heart',magnet:'spark',tome:'book',nova:'eye',lantern:'spark'};
const upgradeNames={bolt:'Susurro del vacío',orbit:'Sello de los Antiguos',haste:'Pacto de la penumbra',vitality:'Sangre de otro mundo',magnet:'Llamada de las estrellas',tome:'Página del Necronomicón',nova:'Ojo de Yog-Sothoth',lantern:'Luz de la última vigilia'};
let selected='archivist',currentView='play',game,choices=[],toastTimer,helpPaused=false;
const readStorage=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
const writeStorage=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}};
let records=readStorage('vigilia-records-v1',[]);if(!Array.isArray(records))records=[];
let muted=readStorage('vigilia-muted',true)!==false;
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3200)}
function selectCharacter(id){
  if(game&&game.state!=='ready'&&game.state!=='ended')return;
  selected=id;if(game)game.character=id;
  document.querySelectorAll('.character-card').forEach(el=>{const on=el.dataset.character===id;el.classList.toggle('selected',on);el.setAttribute('aria-pressed',String(on))});
  const c=characters[id];$('weaponName').textContent=c.weapon;$('weaponHint').textContent=c.hint;
  document.querySelector('.item-slot.selected').innerHTML=`${icon(c.icon)}<span id="weaponTier">I</span>`;
}
function updateStats(s){
  $('timer').textContent=fmtTime(s.time);$('kills').textContent=s.kills.toLocaleString('es');
  $('hpValue').textContent=`${Math.ceil(s.hp)} / ${s.maxHp}`;$('hpBar').style.width=`${Math.max(0,s.hp/s.maxHp*100)}%`;
  $('sanityValue').textContent=`${Math.floor(s.sanity)}%`;$('sanityBar').style.width=`${s.sanity}%`;
  $('xpBar').style.width=`${Math.min(100,s.xp/s.xpNext*100)}%`;
  $('levelLabel').innerHTML=`NIVEL ${s.level} <b>·</b> CONOCIMIENTO PROHIBIDO`;
  const waves=['LA CALMA ANTES DEL ABISMO','SUSURROS ENTRE LAS LÁPIDAS','EL VELO COMIENZA A CEDER','LAS ESTRELLAS OBSERVAN','EL ABISMO SE DESPIERTA'];
  $('waveLabel').textContent=s.bossAlive?'EL QUE AGUARDA HA DESPERTADO':s.sanity<60?'FRENESÍ · EL PODER TIENE UN PRECIO':waves[Math.min(4,Math.floor(s.time/100))];
  $('weaponTier').textContent=['I','II','III','IV','V','VI','VII','VIII','IX'][Math.min(8,s.weaponLevel-1)]||'I';
  const cd=Math.ceil(s.abilityCooldown);$('abilityButton').disabled=cd>0;$('abilityButton').querySelector('kbd').textContent=cd?`${cd} s`:'ESPACIO';
  const acquired=Object.entries(s.upgrades||{}).filter(([k,v])=>v>0&&k!=='bolt').slice(0,3);
  document.querySelectorAll('.loadout .item-slot:not(.selected)').forEach((slot,i)=>{const item=acquired[i];slot.classList.toggle('empty',!item);slot.innerHTML=item?`${icon(upgradeIcons[item[0]])}<span>${item[1]}</span>`:'<span>+</span>';slot.title=item?`${upgradeNames[item[0]]} · Nivel ${item[1]}`:'Las reliquias se obtienen al subir de nivel'});
}
function updateState(state){
  $('startOverlay').classList.toggle('hidden',state!=='ready');$('pauseOverlay').classList.toggle('hidden',state!=='paused');
  $('upgradeOverlay').classList.toggle('hidden',state!=='upgrade');$('endOverlay').classList.toggle('hidden',state!=='ended');
  $('abilityButton').classList.toggle('hidden',state!=='running');$('pauseButton').disabled=state!=='running'&&state!=='paused';
  $('pauseButton').setAttribute('aria-label',state==='paused'?'Continuar partida':'Pausar partida');
  document.body.classList.toggle('playing',['running','paused','upgrade'].includes(state));
  document.querySelectorAll('.character-card').forEach(el=>el.disabled=['running','paused','upgrade'].includes(state));
}
function levelUp(data){
  choices=data.choices;$('upgradeLevel').textContent=data.level;
  const wrap=$('upgradeChoices');wrap.replaceChildren();
  choices.forEach((c,i)=>{const btn=document.createElement('button');btn.className='upgrade-card';btn.innerHTML=`${icon(upgradeIcons[c.id]||'spark')}<kbd>${i+1}</kbd><span>${c.rarity}</span><h3></h3><p></p>`;btn.querySelector('h3').textContent=c.name;btn.querySelector('p').textContent=c.description;btn.addEventListener('click',()=>game.chooseUpgrade(c.id));wrap.append(btn)});
  requestAnimationFrame(()=>wrap.querySelector('button')?.focus({preventScroll:true}));
}
function endRun(result){
  $('endEyebrow').textContent=result.victory?'LAS PRIMERAS LUCES DE ARKHAM':'EL ABISMO RECUERDA';
  $('endTitle').textContent=result.victory?'El amanecer aún existe.':'La noche te reclama.';
  $('endDescription').textContent=result.victory?'Contra toda razón, has sobrevivido. Los Antiguos volverán a dormir.':'Hasta la luz más obstinada acaba por apagarse.';
  $('endStats').innerHTML=`<div><b>${fmtTime(result.time)}</b><span>TIEMPO</span></div><div><b>${result.kills}</b><span>DESTERRADOS</span></div><div><b>${result.level}</b><span>NIVEL</span></div>`;
  records.unshift({...result,character:selected,date:new Date().toISOString()});records=records.slice(0,20);writeStorage('vigilia-records-v1',records);
  requestAnimationFrame(()=>$('retryButton').focus({preventScroll:true}));
}
game=new EldritchGame($('gameCanvas'),{onStats:updateStats,onState:updateState,onLevelUp:levelUp,onEnd:endRun});
game.setMuted(muted);updateState('ready');selectCharacter(selected);
function start(){showView('play');game.start(selected)}
function returnToReady(){game.reset();game.setState('ready');game.emitStats();selectCharacter(selected)}
$('startButton').addEventListener('click',start);$('retryButton').addEventListener('click',start);
$('returnButton').addEventListener('click',returnToReady);$('abandonButton').addEventListener('click',returnToReady);
$('resumeButton').addEventListener('click',()=>game.resume());$('pauseButton').addEventListener('click',()=>game.state==='paused'?game.resume():game.pause());
$('abilityButton').addEventListener('click',()=>game.activateAbility());
document.querySelectorAll('.character-card').forEach(el=>el.addEventListener('click',()=>selectCharacter(el.dataset.character)));
function renderRecords(){
  const best=records.reduce((a,r)=>Math.max(a,r.time),0),kills=records.reduce((a,r)=>a+r.kills,0);
  $('recordSummary').innerHTML=`<div><b>${records.length}</b><span>VIGILIAS REGISTRADAS</span></div><div><b>${fmtTime(best)}</b><span>MEJOR TIEMPO</span></div><div><b>${kills}</b><span>CRIATURAS DESTERRADAS</span></div>`;
  const list=$('recordList');list.replaceChildren();
  if(!records.length){list.innerHTML=`<div class="empty-records">${icon('book')}<p>El archivo aún está en blanco.</p><span>Tu primera vigilia está a punto de escribirse.</span></div>`;return}
  records.forEach((r,i)=>{const row=document.createElement('div');row.className='record-row';const name=document.createElement('strong');name.textContent=characters[r.character]?.name||'Investigador';row.append(name);const date=new Date(r.date);const parts=[date.toLocaleDateString('es-AR',{day:'numeric',month:'short'}),fmtTime(r.time),`${r.kills} desterrados`,`Nivel ${r.level}`,r.victory?'Sobrevivió':'Reclamado por el abismo'];parts.forEach(t=>{const span=document.createElement('span');span.textContent=t;row.append(span)});list.append(row)});
}
function showView(view){
  if(game?.state==='running'&&view!=='play')game.pause();currentView=view;
  ['play','grimoire','records'].forEach(v=>$(v+'View').classList.toggle('hidden',v!==view));
  document.querySelectorAll('[data-view]').forEach(btn=>{const active=btn.dataset.view===view;btn.classList.toggle('active',active);if(active)btn.setAttribute('aria-current','page');else btn.removeAttribute('aria-current')});
  if(view==='records')renderRecords();if(view==='play')requestAnimationFrame(()=>game?.resize());
}
document.querySelectorAll('[data-view]').forEach(el=>el.addEventListener('click',()=>showView(el.dataset.view)));
document.querySelectorAll('.back-to-play').forEach(el=>el.addEventListener('click',()=>showView('play')));
document.querySelector('.brand').addEventListener('click',e=>{e.preventDefault();showView('play')});
const grimoire=[
 {type:'cultist',label:'LOS FIELES DEL SUEÑO',title:'El culto sin rostro',description:'Sus túnicas ocultan rostros que ya no son humanos. Avanzan sin descanso, atraídos por la luz de tu linterna.'},
 {type:'deepone',label:'DESDE LAS PROFUNDIDADES',title:'Los profundos',description:'Llegaron con la marea de Innsmouth. Bajo sus escamas late una voluntad más antigua que el hombre.'},
 {type:'shoggoth',label:'UNA FORMA IMPOSIBLE',title:'Prole del abismo',description:'Masas de carne y ojos que se arrastran entre las tumbas. Su resistencia crece a medida que el velo se debilita.'},
 {type:'ghoul',label:'BAJO CADA TUMBA',title:'Devorador de tumbas',description:'Los gules han dejado de alimentarse de los muertos. Te persiguen desde el inicio de la vigilia, encorvados y veloces entre las lápidas.'},
 {type:'nightgaunt',label:'DESDE 01:00 · ALADO',title:'Descarnado nocturno',description:'Sin rostro ni voz, desciende después del primer minuto. Se desplaza de lado a lado mientras se acerca: no pierdas de vista sus alas.'},
 {type:'huntinghorror',label:'DESDE 02:15 · EMBESTIDA',title:'Horror cazador',description:'Una serpiente alada nacida de la oscuridad. Cuando se detiene y marca su ataque, esquiva: su embestida seguirá la dirección anunciada.'},
 {type:'starspawn',label:'DESDE 04:00 · RESISTENTE',title:'Engendro estelar',description:'Un descendiente de los que duermen en R’lyeh. Lento, enorme y difícil de abatir, avanza tras cuatro minutos de vigilia. Mantén la distancia.'},
 {icon:'bolt',label:'ARMA ARCANA',title:'Susurro del vacío',description:'Un fragmento de luz robado a las estrellas. Cada revelación aumenta su daño y añade un proyectil a tus ataques.'},
 {icon:'book',label:'EL LIBRO PROHIBIDO',title:'Necronomicón',description:'El saber del árabe loco acelera tu aprendizaje. Recoge los fragmentos verdes para subir de nivel y elegir una mejora.'},
 {icon:'eye',label:'EL PRECIO DE SABER',title:'La cordura se quiebra',description:'Por debajo del 60% de cordura, infliges un 25% más de daño y recibes un 20% más. La verdad siempre exige algo a cambio.'}
];
for(const item of grimoire){const card=document.createElement('article');card.className='grimoire-card';card.innerHTML=`<div class="specimen">${item.icon?icon(item.icon):'<canvas width="120" height="80"></canvas>'}</div><span>${item.label}</span><h3>${item.title}</h3><p>${item.description}</p>`;if(item.type){const canvas=card.querySelector('canvas');drawEntity(canvas.getContext('2d'),item.type,60,40,0,{scale:2.8})}$('grimoireGrid').append(card)}
document.querySelectorAll('[data-portrait]').forEach(canvas=>drawPortrait(canvas.getContext('2d'),canvas.dataset.portrait,canvas.width,canvas.height));
function updateAudio(){const el=$('audioToggle');el.classList.toggle('sound-on',!muted);el.querySelector('span').textContent=muted?'Sonido desactivado':'Sonido activado';el.setAttribute('aria-pressed',String(!muted));$('headerAudio').setAttribute('aria-label',muted?'Activar sonido':'Desactivar sonido');$('headerAudio').style.color=muted?'':'#cfb474';$('headerAudio').setAttribute('aria-pressed',String(!muted))}
function toggleAudio(){muted=!muted;game.setMuted(muted);if(!muted)game.initAudio();writeStorage('vigilia-muted',muted);updateAudio();toast(muted?'Sonido desactivado':'Sonido activado')}
$('audioToggle').addEventListener('click',toggleAudio);$('headerAudio').addEventListener('click',toggleAudio);updateAudio();
$('fullscreenButton').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if($('gameFrame').requestFullscreen)await $('gameFrame').requestFullscreen();else toast('Este navegador no permite pantalla completa.')}catch{toast('La pantalla completa no está disponible en este navegador.')}});
function openHelp(){if($('controlsDialog').open)return;helpPaused=game.state==='running';if(helpPaused)game.pause();$('controlsDialog').showModal()}
$('controlsButton').addEventListener('click',openHelp);$('mobileControls').addEventListener('click',openHelp);
document.querySelectorAll('.dialog-close').forEach(el=>el.addEventListener('click',()=>$('controlsDialog').close()));
$('controlsDialog').addEventListener('close',()=>{if(helpPaused&&game.state==='paused'&&currentView==='play')game.resume();helpPaused=false});
$('controlsDialog').addEventListener('click',e=>{if(e.target===$('controlsDialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close()}});
window.addEventListener('keydown',e=>{if(e.key==='?'&&!$('controlsDialog').open){e.preventDefault();openHelp()}if(game.state==='upgrade'&&!$('controlsDialog').open&&['Digit1','Digit2','Digit3'].includes(e.code)){e.preventDefault();const choice=choices[Number(e.code.at(-1))-1];if(choice)game.chooseUpgrade(choice.id)}});
