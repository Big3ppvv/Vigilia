import { drawWorld, drawEntity } from './art.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const distance = (a, b) => Math.hypot(a.x-b.x, a.y-b.y);
const MAX_ENEMIES = 300;
const ENEMY_TYPES = {
  cultist: {unlock:0,weight:55,hp:22,speed:36,radius:13,damage:9,value:1},
  bat: {unlock:0,weight:18,hp:14,speed:63,radius:11,damage:7,value:1},
  ghoul: {unlock:0,weight:27,hp:18,speed:48,radius:12,damage:8,value:1},
  deepone: {unlock:35,weight:32,hp:43,speed:43,radius:16,damage:13,value:2},
  nightgaunt: {unlock:60,weight:18,hp:30,speed:51,radius:15,damage:10,value:2},
  shoggoth: {unlock:105,weight:14,hp:100,speed:25,radius:23,damage:18,value:4},
  huntinghorror: {unlock:135,weight:14,hp:70,speed:39,radius:18,damage:15,value:3},
  starspawn: {unlock:240,weight:9,hp:175,speed:23,radius:25,damage:20,value:6},
  boss: {unlock:540,weight:0,hp:1800,speed:30,radius:42,damage:27,value:50}
};
const UPGRADES = [
  {id:'bolt',name:'Susurro del vacío',description:'+25% de daño y un proyectil arcano adicional.',icon:'✦',rarity:'ARCANO'},
  {id:'orbit',name:'Sello de los Antiguos',description:'Un sello protector gira a tu alrededor y daña a las criaturas.',icon:'◈',rarity:'OCULTO'},
  {id:'haste',name:'Pacto de la penumbra',description:'Atacas un 15% más rápido y te mueves un 10% más rápido.',icon:'ϟ',rarity:'ARCANO'},
  {id:'vitality',name:'Sangre de otro mundo',description:'+25 de vida máxima. Recupera 35 puntos de vida.',icon:'♥',rarity:'PROHIBIDO'},
  {id:'magnet',name:'Llamada de las estrellas',description:'+50% de alcance para recoger fragmentos de conocimiento.',icon:'✧',rarity:'OCULTO'},
  {id:'tome',name:'Página del Necronomicón',description:'Obtienes un 25% más de experiencia de cada fragmento.',icon:'▤',rarity:'PROHIBIDO'},
  {id:'nova',name:'Ojo de Yog-Sothoth',description:'Una explosión cósmica periódica golpea a los enemigos cercanos.',icon:'◉',rarity:'PROHIBIDO'},
  {id:'lantern',name:'Luz de la última vigilia',description:'Regenera 1 punto de vida por segundo. La luz aún resiste.',icon:'♜',rarity:'OCULTO'}
];

export class EldritchGame {
  constructor(canvas, hooks={}) {
    this.canvas=canvas;
    this.ctx=canvas.getContext('2d', {alpha:false});
    this.hooks=hooks;
    this.state='ready';
    this.keys=new Set();
    this.muted=false;
    this.pointer=null;
    this.width=900;this.height=500;
    this.displayClock=0;
    this.lastFrame=0;
    this.lastStats=0;
    this.audio=null;
    this.lastSound=0;
    this.handlers=[];
    this.character='archivist';
    this.reset();
    this.resize();
    this.bindInput();
    this.resizeObserver=new ResizeObserver(()=>this.resize());
    this.resizeObserver.observe(canvas);
    this.frame=this.frame.bind(this);
    this.raf=requestAnimationFrame(this.frame);
    this.emitStats();
  }

  reset() {
    this.time=0;this.kills=0;this.level=1;this.xp=0;this.xpNext=7;
    this.player={x:0,y:0,hp:100,maxHp:100,invincible:0,face:1,speed:124};
    this.enemies=[];this.projectiles=[];this.gems=[];this.particles=[];this.numbers=[];this.rings=[];
    this.upgrades={bolt:0,orbit:0,haste:0,vitality:0,magnet:0,tome:0,nova:0,lantern:0};
    this.shotTimer=0.25;this.spawnTimer=0;this.novaTimer=5;this.healTimer=0;
    this.dashCooldown=0;this.dashTime=0;this.dashVector={x:1,y:0};
    this.lastMove={x:1,y:0};this.bossSpawned=false;this.bossKilled=false;this.shake=0;this.wasFrenzied=false;
    this.choices=[];this.keys.clear();this.pointer=null;
  }

  resize() {
    const rect=this.canvas.getBoundingClientRect();
    this.width=Math.max(1,rect.width||900);this.height=Math.max(1,rect.height||500);
    const dpr=Math.min(window.devicePixelRatio||1,2);
    this.canvas.width=Math.round(this.width*dpr);this.canvas.height=Math.round(this.height*dpr);
    this.ctx.setTransform(dpr,0,0,dpr,0,0);
    this.ctx.imageSmoothingEnabled=false;
  }

  listen(target,type,fn,options) {
    target.addEventListener(type,fn,options);
    this.handlers.push(()=>target.removeEventListener(type,fn,options));
  }

  bindInput() {
    const codes=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Escape','KeyP'];
    this.listen(window,'keydown',e=>{
      if (/INPUT|TEXTAREA|SELECT/.test(e.target?.tagName)||e.target?.isContentEditable||document.querySelector('dialog[open]')) return;
      if(this.canvas.getClientRects&&this.canvas.getClientRects().length===0)return;
      if (!codes.includes(e.code)) return;
      if(this.state==='running'||this.state==='paused')e.preventDefault();
      if(e.repeat&&['Escape','KeyP','Space'].includes(e.code))return;
      if(e.code==='Escape'||e.code==='KeyP'){
        if(this.state==='running')this.pause();else if(this.state==='paused')this.resume();
      } else if(e.code==='Space'){
        if(this.state==='running')this.activateAbility();
      }else this.keys.add(e.code);
    });
    this.listen(window,'keyup',e=>this.keys.delete(e.code));
    this.listen(window,'blur',()=>{this.keys.clear();this.pointer=null;if(this.state==='running')this.pause();});
    this.listen(document,'visibilitychange',()=>{if(document.hidden&&this.state==='running')this.pause();});
    const position=e=>{const r=this.canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
    this.listen(this.canvas,'pointerdown',e=>{
      if(this.state!=='running'||e.button>0)return;
      e.preventDefault();
      const pos=position(e);this.pointer={id:e.pointerId,start:pos,current:pos};
      this.canvas.setPointerCapture?.(e.pointerId);
      this.canvas.focus?.({preventScroll:true});
    });
    this.listen(this.canvas,'pointermove',e=>{if(this.pointer?.id===e.pointerId)this.pointer.current=position(e);});
    const end=e=>{if(this.pointer?.id===e.pointerId)this.pointer=null;};
    this.listen(this.canvas,'pointerup',end);this.listen(this.canvas,'pointercancel',end);
    this.canvas.style.touchAction='none';
  }

  start(character='archivist') {
    this.character=['archivist','medium','mariner'].includes(character)?character:'archivist';
    this.reset();
    if(this.character==='medium')this.upgrades.orbit=1;
    if(this.character==='mariner'){this.player.maxHp=120;this.player.hp=120;this.player.speed=115;}
    if(this.character==='archivist')this.upgrades.tome=1;
    for(let i=0;i<11;i++){
      const e=this.spawn();
      const angle=i*TAU/11+0.3,range=Math.min(this.width,this.height)*0.46+Math.random()*85;
      e.x=this.player.x+Math.cos(angle)*range;e.y=this.player.y+Math.sin(angle)*range;
    }
    this.setState('running');
    this.initAudio();
    this.emitStats();
    this.canvas.focus?.({preventScroll:true});
    return this.getSnapshot();
  }

  pause() {if(this.state!=='running')return;this.keys.clear();this.pointer=null;this.setState('paused');}
  resume() {if(this.state!=='paused')return;this.keys.clear();this.pointer=null;this.setState('running');this.canvas.focus?.({preventScroll:true});}
  setState(state) {this.state=state;this.hooks.onState?.(state);}
  setMuted(value) {this.muted=!!value;}
  destroy() {cancelAnimationFrame(this.raf);this.handlers.forEach(fn=>fn());this.resizeObserver.disconnect();this.audio?.close();}

  initAudio() {
    if(this.audio){this.audio.resume?.().catch(()=>{});return;}
    try {const AudioContext=window.AudioContext||window.webkitAudioContext;if(AudioContext)this.audio=new AudioContext();}catch{}
  }

  sound(type) {
    if(this.muted||!this.audio||this.audio.state!=='running')return;
    const now=this.audio.currentTime;
    if(type==='shot'&&now-this.lastSound<0.14)return;
    this.lastSound=now;
    try {
      const osc=this.audio.createOscillator(),gain=this.audio.createGain();
      osc.type=type==='hurt'?'sawtooth':'sine';
      const freq=type==='shot'?420:type==='level'?720:type==='dash'?230:90;
      osc.frequency.setValueAtTime(freq,now);osc.frequency.exponentialRampToValueAtTime(freq*0.35,now+0.14);
      gain.gain.setValueAtTime(type==='shot'?0.025:0.045,now);gain.gain.exponentialRampToValueAtTime(0.001,now+0.18);
      osc.connect(gain);gain.connect(this.audio.destination);osc.start(now);osc.stop(now+0.2);
    }catch{}
  }

  activateAbility() {
    if(this.state!=='running'||this.dashCooldown>0)return false;
    const move=this.movement();const magnitude=Math.hypot(move.x,move.y);
    this.dashVector=magnitude>0.05?{x:move.x/magnitude,y:move.y/magnitude}:{...this.lastMove};
    this.dashTime=0.28;this.dashCooldown=6;this.player.invincible=Math.max(this.player.invincible,0.65);
    this.rings.push({x:this.player.x,y:this.player.y,r:10,max:85,life:0.4,total:0.4,color:'#9be4cf'});
    this.sound('dash');this.emitStats();return true;
  }

  movement() {
    let x=(this.keys.has('KeyD')||this.keys.has('ArrowRight')?1:0)-(this.keys.has('KeyA')||this.keys.has('ArrowLeft')?1:0);
    let y=(this.keys.has('KeyS')||this.keys.has('ArrowDown')?1:0)-(this.keys.has('KeyW')||this.keys.has('ArrowUp')?1:0);
    if(this.pointer){
      const dx=this.pointer.current.x-this.pointer.start.x,dy=this.pointer.current.y-this.pointer.start.y;
      const len=Math.hypot(dx,dy);
      if(len>6){x=dx/Math.max(42,len);y=dy/Math.max(42,len);}
    }
    const len=Math.hypot(x,y);return len>1?{x:x/len,y:y/len}:{x,y};
  }

  frame(timestamp) {
    const dt=Math.min(0.04,Math.max(0,(timestamp-this.lastFrame)/1000));this.lastFrame=timestamp;
    this.displayClock+=dt;
    if(this.state==='running')this.update(dt);
    this.render(dt);
    this.raf=requestAnimationFrame(this.frame);
  }

  update(dt) {
    this.time+=dt;
    if(this.time>=600){this.end(true);return;}
    const p=this.player,u=this.upgrades;
    if(this.frenzied&&!this.wasFrenzied){
      this.wasFrenzied=true;this.number(p.x,p.y-46,'EL VELO SE ROMPE','#c6abd3');
      this.rings.push({x:p.x,y:p.y,r:10,max:240,life:1.2,total:1.2,color:'#b391c8'});this.sound('dash');
    }
    p.invincible=Math.max(0,p.invincible-dt);this.dashCooldown=Math.max(0,this.dashCooldown-dt);this.shake=Math.max(0,this.shake-dt*15);
    const move=this.movement();
    if(Math.hypot(move.x,move.y)>0.05){this.lastMove={...move};if(move.x!==0)p.face=move.x<0?-1:1;}
    const speed=p.speed*(1+u.haste*0.1);
    if(this.dashTime>0){this.dashTime-=dt;p.x+=this.dashVector.x*speed*4.4*dt;p.y+=this.dashVector.y*speed*4.4*dt;
      this.particles.push({x:p.x,y:p.y,vx:0,vy:0,life:0.24,total:0.24,size:13,color:'#a9d5c6'});
    }else{p.x+=move.x*speed*dt;p.y+=move.y*speed*dt;}
    if(u.lantern)p.hp=Math.min(p.maxHp,p.hp+u.lantern*dt);
    this.spawnTimer-=dt;
    if(this.spawnTimer<=0){
      const wave=Math.floor(this.time/30);
      const count=1+Math.floor(wave/3);
      for(let i=0;i<count;i++)if(!this.spawn())break;
      this.spawnTimer=Math.max(0.14,0.72-wave*0.044);
    }
    if(this.time>=540&&!this.bossSpawned&&this.spawn('boss')){this.rings.push({x:p.x,y:p.y,r:30,max:480,life:1.3,total:1.3,color:'#a46b93'});}
    this.shotTimer-=dt;
    if(this.shotTimer<=0){this.fire();this.shotTimer=(this.character==='mariner'?1.05:0.7)*Math.pow(0.85,u.haste);}
    if(u.nova){this.novaTimer-=dt;if(this.novaTimer<=0){this.nova();this.novaTimer=Math.max(2.5,7-u.nova*0.65);}}
    for(const e of this.enemies){
      if(e.hp<=0)continue;
      e.hit=Math.max(0,e.hit-dt);e.orbitHit=Math.max(0,e.orbitHit-dt);
      const dx=p.x-e.x,dy=p.y-e.y,len=Math.hypot(dx,dy)||1;
      const slow=e.hit>0?0.35:1;
      this.moveEnemy(e,dx,dy,len,dt,slow);
      if(e.knock>0){e.x-=dx/len*e.knock*dt;e.y-=dy/len*e.knock*dt;e.knock=Math.max(0,e.knock-dt*650);}
      if(len<e.radius+12&&p.invincible<=0&&e.hp>0){
        const received=Math.round(e.damage*(this.frenzied?1.2:1));
        p.hp=Math.max(0,p.hp-received);p.invincible=0.9;this.shake=5;this.sound('hurt');
        this.number(p.x,p.y-20,'−'+received,'#ed9e9a');
        if(p.hp<=0){this.end(false);return;}
      }
    }
    this.orbitHits(dt);
    for(const bullet of this.projectiles){
      bullet.x+=bullet.vx*dt;bullet.y+=bullet.vy*dt;bullet.life-=dt;
      for(const e of this.enemies){
        if(e.hp<=0||bullet.hit.has(e.id))continue;
        if(Math.hypot(e.x-bullet.x,e.y-bullet.y)<e.radius+bullet.radius){
          bullet.hit.add(e.id);this.hurt(e,bullet.damage);bullet.pierce--;
          if(bullet.pierce<=0){bullet.life=0;break;}
        }
      }
    }
    this.projectiles=this.projectiles.filter(b=>b.life>0);
    this.enemies=this.enemies.filter(e=>e.hp>0&&distance(e,p)<Math.max(this.width,this.height)+550);
    const pickupRadius=64*(1+u.magnet*0.5);
    for(const gem of this.gems){
      const dx=p.x-gem.x,dy=p.y-gem.y,d=Math.hypot(dx,dy);
      if(d<pickupRadius)gem.magnet=true;
      if(gem.magnet){const s=Math.max(175,420-d);gem.x+=dx/(d||1)*s*dt;gem.y+=dy/(d||1)*s*dt;}
      if(d<16){gem.collected=true;if(gem.heal){p.hp=Math.min(p.maxHp,p.hp+25);this.number(p.x,p.y-28,'+25','#c6e4a2');}else this.xp+=gem.value*(1+u.tome*0.25);}
    }
    this.gems=this.gems.filter(g=>!g.collected&&distance(g,p)<2000);
    if(this.gems.length>480)this.gems.splice(0,this.gems.length-480);
    for(const part of this.particles){part.life-=dt;part.x+=part.vx*dt;part.y+=part.vy*dt;}
    this.particles=this.particles.filter(q=>q.life>0).slice(-320);
    for(const n of this.numbers){n.life-=dt;n.y-=22*dt;}
    this.numbers=this.numbers.filter(n=>n.life>0).slice(-60);
    for(const r of this.rings){r.life-=dt;r.r+=r.max/r.total*dt;}
    this.rings=this.rings.filter(r=>r.life>0);
    if(this.xp>=this.xpNext)this.levelUp();
    this.lastStats+=dt;if(this.lastStats>=0.1){this.lastStats=0;this.emitStats();}
  }

  moveEnemy(e,dx,dy,len,dt,slow) {
    let forward=e.speed,strafe=0;
    if(e.type==='bat')strafe=Math.sin(this.time*5+e.seed)*24;
    if(e.type==='ghoul'&&len<150&&Math.sin(this.time*2.2+e.seed)>0.72)forward*=1.7;
    if(e.type==='nightgaunt'){
      strafe=Math.sin(this.time*2.4+e.seed)*50;
      if(len<160)forward*=0.65;
    }
    if(e.type==='huntinghorror'){
      if(e.chargePhase==='windup'){
        e.phaseTime-=dt;
        if(e.phaseTime<=0){e.chargePhase='charge';e.phaseTime=0.6;}
        return;
      }
      if(e.chargePhase==='charge'){
        e.x+=Math.cos(e.chargeAngle)*e.speed*4.6*dt*slow;
        e.y+=Math.sin(e.chargeAngle)*e.speed*4.6*dt*slow;
        e.phaseTime-=dt;
        if(e.phaseTime<=0){e.chargePhase='hunt';e.chargeCooldown=3.4;}
        return;
      }
      e.chargeCooldown=Math.max(0,e.chargeCooldown-dt);
      if(e.chargeCooldown===0&&len<260&&len>55){
        // Lock the direction before the dash, leaving time to sidestep the red line.
        e.chargePhase='windup';e.phaseTime=0.85;e.chargeAngle=Math.atan2(dy,dx);
        return;
      }
      strafe=Math.sin(this.time*3+e.seed)*18;
    }
    e.x+=(dx/len*forward+dy/len*strafe)*dt*slow;
    e.y+=(dy/len*forward-dx/len*strafe)*dt*slow;
  }

  spawn(force) {
    if(force&&!ENEMY_TYPES[force])return null;
    const isBoss=force==='boss';
    // Regular enemies leave one slot for the final encounter.
    if(isBoss){
      if(this.enemies.some(e=>e.type==='boss'&&e.hp>0))return null;
      if(this.enemies.length>=MAX_ENEMIES)return null;
    }else if(this.enemies.length>=MAX_ENEMIES-(this.bossSpawned?0:1))return null;
    const angle=Math.random()*TAU;
    // Spawn beyond the viewport, including on narrow mobile screens.
    const radius=Math.min((this.width/2+55)/Math.max(0.001,Math.abs(Math.cos(angle))),(this.height/2+55)/Math.max(0.001,Math.abs(Math.sin(angle))));
    let type=force;
    if(!type){
      const pool=Object.entries(ENEMY_TYPES).filter(([,data])=>data.weight>0&&this.time>=data.unlock);
      let roll=Math.random()*pool.reduce((sum,[,data])=>sum+data.weight,0);
      type=pool[pool.length-1][0];
      for(const [id,data]of pool){roll-=data.weight;if(roll<0){type=id;break;}}
    }
    const data=ENEMY_TYPES[type],factor=1+this.time/320;
    this.enemyCounter=(this.enemyCounter||0)+1;
    const enemy={id:this.enemyCounter,type,x:this.player.x+Math.cos(angle)*radius,y:this.player.y+Math.sin(angle)*radius,
      hp:data.hp*factor,maxHp:data.hp*factor,speed:data.speed*(1+this.time/1100),radius:data.radius,damage:data.damage,value:data.value,
      hit:0,orbitHit:0,knock:0,seed:Math.random()*10,chargePhase:'hunt',phaseTime:0,chargeCooldown:2+Math.random()*2,chargeAngle:0};
    this.enemies.push(enemy);
    if(isBoss)this.bossSpawned=true;
    return enemy;
  }

  nearest() {
    let nearest=null,best=Math.max(180,Math.min(this.width,this.height)*0.52);
    for(const e of this.enemies){const d=distance(e,this.player);if(d<best&&e.hp>0){best=d;nearest=e;}}
    return nearest;
  }

  fire() {
    const target=this.nearest();if(!target)return;
    const p=this.player,u=this.upgrades;
    const aim=Math.atan2(target.y-p.y,target.x-p.x);
    const shotgun=this.character==='mariner';
    const count=Math.min(7,(shotgun?3:1)+u.bolt);
    const damage=(shotgun?15:25)*(1+u.bolt*0.25);
    for(let i=0;i<count;i++){
      const angle=aim+(i-(count-1)/2)*(shotgun?0.16:0.105);
      this.projectiles.push({x:p.x,y:p.y-4,vx:Math.cos(angle)*350,vy:Math.sin(angle)*350,angle,life:shotgun?0.92:1.8,
        radius:shotgun?4:6,damage,pierce:shotgun?1:2,hit:new Set(),color:shotgun?'#e0ba75':'#a7e5ce'});
    }
    if(this.projectiles.length>120)this.projectiles.splice(0,this.projectiles.length-120);
    this.sound('shot');
  }

  orbitHits() {
    const count=this.upgrades.orbit;if(!count)return;
    for(let i=0;i<Math.min(count,5);i++){
      const angle=this.time*1.9+i*TAU/Math.min(count,5),r=65+count*3;
      const x=this.player.x+Math.cos(angle)*r,y=this.player.y+Math.sin(angle)*r;
      for(const e of this.enemies)if(e.hp>0&&e.orbitHit<=0&&Math.hypot(e.x-x,e.y-y)<e.radius+15){this.hurt(e,16+count*6);e.orbitHit=0.5;}
    }
  }

  nova() {
    const radius=130+this.upgrades.nova*20;
    this.rings.push({x:this.player.x,y:this.player.y,r:10,max:radius,life:0.6,total:0.6,color:'#c5b5e3'});
    for(const e of this.enemies)if(distance(e,this.player)<radius)this.hurt(e,42+this.upgrades.nova*18);
    this.sound('dash');
  }

  hurt(e,damage) {
    if(e.hp<=0)return;
    const critical=Math.random()<0.12;const dealt=Math.round(damage*(this.frenzied?1.25:1)*(critical?1.65:1));
    e.hp-=dealt;e.hit=0.12;e.knock=e.type==='boss'?15:85;
    this.number(e.x,e.y-e.radius-8,dealt,critical?'#e8d4a2':'#c9e2cf');
    for(let i=0;i<3;i++)this.particles.push({x:e.x,y:e.y,vx:(Math.random()-0.5)*85,vy:(Math.random()-0.5)*85,life:0.3,total:0.3,size:2+Math.random()*2,color:'#799e91'});
    if(e.hp<=0){
      this.kills++;
      this.gems.push({x:e.x,y:e.y,value:e.value,magnet:false,heal:false});
      if(Math.random()<0.035)this.gems.push({x:e.x+10,y:e.y-6,heal:true,value:0,magnet:false});
      if(e.type==='boss'){this.bossKilled=true;this.player.hp=Math.min(this.player.maxHp,this.player.hp+50);this.rings.push({x:e.x,y:e.y,r:20,max:220,life:1,total:1,color:'#e4d6ab'});}
    }
  }

  number(x,y,text,color) {this.numbers.push({x,y,text:String(text),color,life:0.7});}

  levelUp() {
    this.xp-=this.xpNext;this.level++;this.xpNext=Math.floor(7+this.level*4.2+this.level*this.level*0.15);
    this.player.hp=Math.min(this.player.maxHp,this.player.hp+5);
    this.keys.clear();this.pointer=null;
    const pool=[...UPGRADES].sort(()=>Math.random()-0.5);
    this.choices=pool.slice(0,3).map(choice=>({...choice,level:this.upgrades[choice.id]+1}));
    this.setState('upgrade');this.sound('level');this.emitStats();
    this.hooks.onLevelUp?.({level:this.level,choices:this.choices});
  }

  chooseUpgrade(id) {
    if(this.state!=='upgrade'||!this.choices.some(c=>c.id===id))return false;
    this.upgrades[id]++;
    if(id==='vitality'){this.player.maxHp+=25;this.player.hp=Math.min(this.player.maxHp,this.player.hp+35);}
    if(id==='nova')this.novaTimer=1;
    this.choices=[];this.setState('running');
    this.rings.push({x:this.player.x,y:this.player.y,r:15,max:110,life:0.65,total:0.65,color:'#a7d6b0'});
    this.emitStats();this.canvas.focus?.({preventScroll:true});return true;
  }

  end(victory) {
    if(this.state==='ended')return;
    this.setState('ended');this.keys.clear();this.pointer=null;this.emitStats();
    this.hooks.onEnd?.({victory,time:this.time,kills:this.kills,level:this.level});
  }

  get sanity() {return Math.max(30,100-this.time/600*70);}
  get frenzied() {return this.sanity<60;}

  getSnapshot() {
    return {state:this.state,time:this.time,kills:this.kills,level:this.level,xp:this.xp,xpNext:this.xpNext,
      hp:this.player.hp,maxHp:this.player.maxHp,sanity:this.sanity,sanityFrenzy:this.frenzied,abilityCooldown:this.dashCooldown,
      weaponLevel:1+this.upgrades.bolt,character:this.character,upgrades:{...this.upgrades},bossAlive:this.bossSpawned&&!this.bossKilled};
  }
  emitStats() {this.hooks.onStats?.(this.getSnapshot());}

  render(dt) {
    const ctx=this.ctx,w=this.width,h=this.height,p=this.player;
    const ambient=this.displayClock;
    const camX=p.x-w/2,camY=p.y-h/2;
    ctx.save();
    if(this.shake>0)ctx.translate((Math.random()-0.5)*this.shake,(Math.random()-0.5)*this.shake);
    drawWorld(ctx,camX,camY,w,h,ambient);
    if(this.state==='ready'){
      // An inhabited scene before the first expedition.
      const enemies=[['ghoul',-.29,.27],['deepone',.38,-.18],['nightgaunt',.32,.28],['cultist',-.43,-.02],['huntinghorror',.41,.05],['starspawn',-.36,-.3],['bat',.1,-.39]];
      for(const [type,x,y]of enemies)drawEntity(ctx,type,w/2+x*w,h/2+y*h+Math.sin(ambient+x*10)*3,ambient,{scale:2,flip:x>0});
      this.drawPlayerLight(ctx,w/2,h/2,ambient);
      drawEntity(ctx,'player',w/2,h/2,ambient,{scale:2,character:this.character});
      ctx.restore();return;
    }
    for(const gem of this.gems){
      const x=Math.round(gem.x-camX),y=Math.round(gem.y-camY);
      if(x<-15||x>w+15||y<-15||y>h+15)continue;
      ctx.fillStyle=gem.heal?'#977665':'#284838';ctx.fillRect(x-6,y-6,12,12);
      ctx.fillStyle=gem.heal?'#cd8f85':gem.value>2?'#b0b998':'#90c29a';
      if(gem.heal){ctx.fillRect(x-2,y-5,4,10);ctx.fillRect(x-5,y-2,10,4);}
      else{ctx.beginPath();ctx.moveTo(x,y-5);ctx.lineTo(x+4,y);ctx.lineTo(x,y+5);ctx.lineTo(x-4,y);ctx.closePath();ctx.fill();ctx.fillStyle='#d4e6c0';ctx.fillRect(x-1,y-3,2,3);}
    }
    this.drawPlayerLight(ctx,w/2,h/2,ambient);
    const sorted=[...this.enemies,{...p,type:'player'}].sort((a,b)=>a.y-b.y);
    for(const e of sorted){
      const x=Math.round(e.x-camX),y=Math.round(e.y-camY);
      if(x<-100||x>w+100||y<-100||y>h+100)continue;
      if(e.type==='player'){
        ctx.globalAlpha=p.invincible>0&&Math.floor(ambient*18)%2?0.45:1;
        drawEntity(ctx,'player',x,y,ambient,{scale:2,flip:p.face<0,character:this.character,hit:p.invincible>0});
        ctx.globalAlpha=1;
      }else{
        if(e.chargePhase==='windup'){
          ctx.save();ctx.strokeStyle='#d19380';ctx.globalAlpha=0.38+Math.sin(ambient*14)*0.13;
          ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.beginPath();ctx.moveTo(x,y);
          ctx.lineTo(x+Math.cos(e.chargeAngle)*e.speed*4.6*0.6,y+Math.sin(e.chargeAngle)*e.speed*4.6*0.6);ctx.stroke();ctx.restore();
        }
        drawEntity(ctx,e.type,x,y,ambient+e.seed,{scale:e.type==='boss'?3:2,flip:p.x<e.x,hit:e.hit>0,windup:e.chargePhase==='windup',charging:e.chargePhase==='charge'});
        if(e.type==='boss'||e.hp<e.maxHp){
          const bw=e.type==='boss'?80:28;
          ctx.fillStyle='#15221d';ctx.fillRect(x-bw/2,y-e.radius-17,bw,4);
          ctx.fillStyle=e.type==='boss'?'#b082a3':'#8ca27a';ctx.fillRect(x-bw/2,y-e.radius-17,bw*Math.max(0,e.hp/e.maxHp),3);
        }
      }
    }
    if(this.upgrades.orbit){
      const count=Math.min(this.upgrades.orbit,5),r=65+this.upgrades.orbit*3;
      ctx.strokeStyle='#9cbaa325';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(w/2,h/2,r,r,0,0,TAU);ctx.stroke();
      for(let i=0;i<count;i++){
        const a=this.time*1.9+i*TAU/count,x=w/2+Math.cos(a)*r,y=h/2+Math.sin(a)*r;
        ctx.fillStyle='#6f9b8a66';ctx.fillRect(x-10,y-10,20,20);
        ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.strokeStyle='#d0d7aa';ctx.lineWidth=2;ctx.strokeRect(-5,-5,10,10);ctx.fillStyle='#b4dec8';ctx.fillRect(-2,-2,4,4);ctx.restore();
      }
    }
    for(const b of this.projectiles){
      const x=b.x-camX,y=b.y-camY;
      ctx.strokeStyle=b.color+'66';ctx.lineWidth=b.radius*1.4;ctx.beginPath();ctx.moveTo(x-Math.cos(b.angle)*16,y-Math.sin(b.angle)*16);ctx.lineTo(x,y);ctx.stroke();
      ctx.fillStyle=b.color;ctx.fillRect(Math.round(x-b.radius/2),Math.round(y-b.radius/2),b.radius,b.radius);
      ctx.fillStyle='#eff5cf';ctx.fillRect(Math.round(x-1),Math.round(y-1),2,2);
    }
    for(const r of this.rings){
      ctx.globalAlpha=Math.max(0,r.life/r.total);ctx.strokeStyle=r.color;ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(r.x-camX,r.y-camY,r.r,0,TAU);ctx.stroke();
      ctx.globalAlpha=0.05*r.life/r.total;ctx.fillStyle=r.color;ctx.fill();ctx.globalAlpha=1;
    }
    for(const part of this.particles){
      ctx.globalAlpha=part.life/part.total;ctx.fillStyle=part.color;
      ctx.fillRect(Math.round(part.x-camX-part.size/2),Math.round(part.y-camY-part.size/2),part.size,part.size);
    }ctx.globalAlpha=1;
    ctx.textAlign='center';ctx.font='bold 12px monospace';
    for(const n of this.numbers){ctx.globalAlpha=Math.min(1,n.life*3);ctx.fillStyle='#07100b';ctx.fillText(n.text,n.x-camX+1,n.y-camY+1);ctx.fillStyle=n.color;ctx.fillText(n.text,n.x-camX,n.y-camY);}ctx.globalAlpha=1;
    this.drawVignette(ctx,w,h);
    if(this.pointer){
      ctx.strokeStyle='#c7d4bc44';ctx.fillStyle='#9cbfa318';ctx.lineWidth=1;
      ctx.beginPath();ctx.arc(this.pointer.start.x,this.pointer.start.y,42,0,TAU);ctx.fill();ctx.stroke();
      const move=this.movement();ctx.fillStyle='#c4d7bf66';ctx.beginPath();ctx.arc(this.pointer.start.x+move.x*32,this.pointer.start.y+move.y*32,14,0,TAU);ctx.fill();
    }
    ctx.restore();
  }

  drawPlayerLight(ctx,x,y,time) {
    const pulse=1+Math.sin(time*2)*0.035;
    const light=ctx.createRadialGradient(x,y,8,x,y,105*pulse);
    light.addColorStop(0,'#d5d79712');light.addColorStop(0.5,'#adbf8710');light.addColorStop(1,'#9bbb7700');
    ctx.fillStyle=light;ctx.fillRect(x-110,y-110,220,220);
    ctx.strokeStyle='#9dac6720';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(x,y+13,22,9,0,0,TAU);ctx.stroke();
  }
  drawVignette(ctx,w,h) {
    const gradient=ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*0.15,w/2,h/2,Math.hypot(w,h)*0.55);
    gradient.addColorStop(0,'#02080900');gradient.addColorStop(0.65,this.frenzied?'#44203f18':'#02080910');gradient.addColorStop(1,this.frenzied?'#301830b0':'#020809b0');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,w,h);
  }
}
