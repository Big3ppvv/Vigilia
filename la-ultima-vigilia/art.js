/* Original pixel art for the cemetery beyond Arkham. All coordinates are CSS pixels. */
const PALETTE = {
  o:'#0b1115', n:'#141b23', d:'#202b31', s:'#3a454a', l:'#64716b',
  b:'#3c2d2b', B:'#604335', c:'#785238', C:'#a2784c', h:'#d0ad78',
  g:'#254b43', G:'#397265', t:'#59aa89', T:'#8ed1ac', w:'#d2d8b4',
  p:'#382b47', P:'#58415f', v:'#8b6689', r:'#773e3d', R:'#bd6950',
  y:'#bda563', Y:'#f2d48b', a:'#253443', A:'#425a6a', k:'#11131a',
  e:'#585c50', E:'#8f9580', q:'#bfc1a0', z:'#302b42', Z:'#665778'
};
const MAPS = {
  archivist:[
    '......oooooo.......',
    '.....obbbbbbo......',
    '.....obbbbbbo......',
    '...oobBBBBBboo.....',
    '..obBBBBBBBBbbo....',
    '...ooooooohooo.....',
    '.....ohhhoho.......',
    '.....ohhhoho.......',
    '......ohhho........',
    '.....obCChbo.......',
    '....obBCyBBbo......',
    '...obBBChCBbbo.....',
    '..obBBBChCBbbo.....',
    '..obBBbChCBbbho....',
    '..ohhbbChCBbho.....',
    '..ohoBbChCBbooo....',
    '..otoBbChCBboYo....',
    '.otToBbChCBboYo....',
    '.otToBbChCBbooo....',
    '..ooobBCBCBbo......',
    '.....oBboBBbo......',
    '.....oBboBBbo......',
    '....obbo.obbo......',
    '....oooo.oooo......'
  ],
  medium:[
    '......ooooo........',
    '.....opPPppo.......',
    '....opPvvPPpo......',
    '....opvoovPpo......',
    '....opohhoppo......',
    '....opohhoppo......',
    '.....ophhpppo......',
    '.....opCCppo.......',
    '....opPYYPPpo......',
    '...opPPyYPPPpo.....',
    '..opPPPyYPPPPpo....',
    '..opPPPyYPPPPpo....',
    '..ohPPPyYPPPpho....',
    '..otoPPyYPPpoho....',
    '.otTTopPPPPpo......',
    '..otoopPPPPpo......',
    '.....opPvPPpo......',
    '....opPPvPPPpo.....',
    '....opPPvPPPpo.....',
    '...opPPPvPPPPpo....',
    '...opPPPvPPPPpo....',
    '...oooooooooooo....'
  ],
  mariner:[
    '......ooooooo......',
    '.....oaAAAAAao.....',
    '.....oaAAAAAao.....',
    '....ooaAAAAAao.....',
    '....oAAAAAAAAo.....',
    '.....oooohhoo......',
    '.....ohhhohho......',
    '.....obbhhhho......',
    '......obbbbo.......',
    '.....oaChCAao......',
    '....oaAChCAAao.....',
    '...oaAAChCAAaaao...',
    '...oaAAChCAahhho...',
    '...oaAAChooossso...',
    '...ohAAChsssssso...',
    '...ooAAChoooooo....',
    '....oaAChCAAao.....',
    '....oaAChCAAao.....',
    '....oaAAAAAAao.....',
    '.....oAAoAAAo......',
    '.....oAAoAAAo......',
    '.....oAAoAAAo......',
    '....oooo.oooo......'
  ],
  cultist:[
    '.......ooo.........',
    '......opPpo........',
    '.....opPvPpo.......',
    '....opPvvvPpo......',
    '....opPoooPpo......',
    '...opPoTToPPpo.....',
    '...opPooooPPpo.....',
    '....opPooPPpo......',
    '....opPPPPppo......',
    '...opPPyYPPppo.....',
    '..opPPPyYPPPPpo....',
    '..opPPPyYPPPPpo....',
    '.opPPPPyYPPPPppo...',
    '.ohrPPPyYPPPPpho...',
    '..oropPyYPPPpoo....',
    '....opPyYPPPpo.....',
    '....opPyYPPPpo.....',
    '...opPPyYPPPPpo....',
    '...opPPyYPPPPpo....',
    '..opPPPyYPPPPppo...',
    '..opPPPPPPPPPPpo...',
    '..oooooooooooooo...'
  ],
  deepone:[
    '......o..o.........',
    '.....ogoogo........',
    '....ogGggGgo.......',
    '...ogGGttGGgo......',
    '..ogGTGGGTGgo......',
    '..ogGooGooGgo......',
    '..ogTYoGYoTgo......',
    '...ogtGgGtgo.......',
    '...ogGtGtGgo.......',
    '....ogGtGgo........',
    '..ooggGtgGgoo......',
    '.ogGggGtgGgGgo.....',
    '.ogGtGGtGGtGgo.....',
    '.ogGggGtGggGgo.....',
    '.oggoGtttGoggo.....',
    '.oggoGtttGoggo.....',
    '..oooGgGgGooo......',
    '....ogGoGgo........',
    '....ogGoGgo........',
    '...ogGooGggo.......',
    '..ogGGooGGggo......',
    '..oooo..ooooo......'
  ],
  bat:[
    '..o...............o..',
    '.opo.............opo.',
    'opPpo....o.o....opPpo',
    'opPvpo..opppo..opvPpo',
    'opPvvpoopPPPoopvvPPpo',
    '.opPvvvpYpYpvvvPPpo..',
    '..opPPvpppppvPPppo...',
    '...ooPPpppppPPoo.....',
    '.....ooPPPPPoo.......',
    '.......opPpo.........',
    '........opo..........'
  ],
  shoggoth:[
    '........oooooo..........',
    '......ooggggggoo........',
    '....oogGGgGGGgggoo......',
    '...ogGGGtGGGttGGggo.....',
    '..ogGtGGoooGGGoooGgo....',
    '.ogGtGGgoYoGGgoYogGgo...',
    '.ogGGGGGoooGGGoooGGgo...',
    'ogGGtGGGGGGtGGGtGGGggo..',
    'ogGtGGGoGGGGGGoGGGGGgo..',
    'ogGGGGgoooGooooGGGgGgo..',
    '.ogGGGgGoooGoGGGGgGggo..',
    '.ogGgGGGGGGGGGGggGGgo...',
    'oogggGggggggggGggggggoo.',
    'ogGgooogGgooogGgooGgGggo',
    '.ooo...ooo...ooo..ooooo.'
  ],
  ghoul:[
    '............oo..........',
    '...........oeEoo........',
    '........oooeEEEeo.......',
    '.......oeEEEEqEEeo......',
    '......oeEqqqEEYEEeo.....',
    '.....oeEEqqoEEoooEeo....',
    '....oeEEqqEoEroYoEeo....',
    '...oeEEqqqEoEooooEeeoo..',
    '..oeEEqqqEEooEqEqqqEEeo.',
    '..oeEEqqEEeeooEEqqqqqeo.',
    '.oeEEEqqEEeoo.ooEoqoqoo.',
    '.oeEEqqEEeoo....oEoEo...',
    'oeEEEqqEEeo......ooo....',
    'oeEEqqEEeEeo...........',
    'oeEEqEEeooEeo..........',
    '.oeEEeEeo.oEeo.........',
    '..oeEeeeo..oEeqo.......',
    '...oEEeeo..ooqqqo......',
    '...oeEeeo....oooo......',
    '..oeEEeeoo.............',
    '.oeEEqEEeeo............',
    '.oqqoqqoooo............',
    '..oo.oo................'
  ],
  nightgaunt:[
    '...........o....o...........',
    '..........ozo..ozo..........',
    '.o........ozzoozzo........o.',
    '.ozo......ozZzzZzo......ozo.',
    '.ozzo.....ozZkkZzo.....ozzo.',
    '.ozZzo....ozkkkkzo....ozZzo.',
    '.ozZZzoo..ozkkkkzo..oozZZzo.',
    '..ozZZzzoooZkzkZooozzZZzo..',
    '..ozZZZzzzzZkkZzzzzZZZzo..',
    '...ozZZZZzzZkkZzzZZZZzo...',
    '....ozZZZZzZkkZzZZZZzo....',
    '...oozzZZZzzZZzzZZZzzoo...',
    '..ozooozzzzzzzzzzzooozzo..',
    '..oo...oozzZkkZzzoo...oo..',
    '........ozZkkkZzo.........',
    '.......ozZkkkkZzzo........',
    '.......ozZkkkkkZzo........',
    '.......ozZzzzzZzzo........',
    '........ozZzozZzo.........',
    '........ozzo.ozzo.........',
    '.......ozzo...ozzo........',
    '......ozzo.....ozzo.......',
    '......ooo.......ooo.......',
    '.........ozzo.............',
    '..........ozzoo...........',
    '...........oooo...........'
  ],
  huntinghorror:[
    '...o.....................o......',
    '..oro...............o...oro.....',
    '..orRo.............oro.orRo.....',
    '..orRRro..........orRoorRo......',
    '...orRRRrooo....oorRRRrRro......',
    '...orRvrRRRrooorRRRvvRro.......',
    '....orRvvrRRrrrRRvvvRro........',
    '.....orRvvvrrrrRvvRro..........',
    '......ooorrrRrrrooo............',
    '......ooorrRRYRrrro............',
    '.....orRRrrRoooRrrro...........',
    '....orRvRrrRqoYoRrroo..........',
    '....orRvvRrrRoooRrRRro.........',
    '.....orRvvRrrRRRRRrrRro........',
    '......orRvvRrrrrrrRvvRro.......',
    '.......orRvvRRRRRvvvRro........',
    '.....ooorRvvvvvvvvRRro.........',
    '...oorRRrrRRRRRRRRroo..........',
    '..orRrrRrooooooooo.............',
    '..orRro........................',
    '...orRroo......................',
    '....oooo.......................'
  ],
  starspawn:[
    '...o......................o...',
    '..ogo...........oo.......ogo..',
    '..ogGo.........oggo.....ogGo..',
    '..ogGGoo....ooogGGgoo.ooGGgo..',
    '...ogGGGoo.ogGGttGGGooGGGgo...',
    '...ogGGtGGogGttttttGgGGGGgo...',
    '....ogGtGGogGtGGGGtGgGtGgo....',
    '.....ogGGGogGoYoYoGgGGGgo.....',
    '....oogGGGogGoooGoGgGGGgoo....',
    '...ogGGGGGogGtGGGtGgGGGGGgo...',
    '..ogGGtGGGogGtGtGtGgGGtGGGgo..',
    '..ogGtooooGogtGtGgoGoooootGgo.',
    '...oggo.ogGogtGtGgoGgo.oggo...',
    '....oo.ogGGogtGtGgoGGgo.oo....',
    '......ogGGGogtGtGgoGGGgo......',
    '.....ogGtGGGogGgGoGGGtGgo.....',
    '....ogGttGGGGoooGGGGttGgo.....',
    '....ogGttGGGtttttGGGttGgo.....',
    '...ogGtttGGtttttttGGtttGgo....',
    '...ogGtttGGtttGtttGGtttGgo....',
    '...ogGtttGGttGGGttGGtttGgo....',
    '....ogGtGGGttGGGttGGGtGgo.....',
    '....ogGooGGGGGGGGGGooGgo......',
    '.....oo..ogGGogGGgo..oo.......',
    '.........ogGgoGggo............',
    '........ogGGgoGGGgo...........',
    '.......ogGGGooGGGGgo..........',
    '.......ooooo..oooooo..........'
  ],
  boss:[
    '..............oo..............',
    '.........o...oggo...o.........',
    '........ogo.ogGGgo.ogo........',
    '.......ogGgoogGGGgooGgo.......',
    '......ogGGGGGGttGGGGGGgo......',
    '.....ogGGttGGttttGGttGGgo.....',
    '....ogGGtttGGttttGGtttGGgo....',
    '...ogGGttttttttttttttttGGgo...',
    '...ogGtGGoooGGGGGGoooGGtGgo...',
    '..ogGGtGgoRooGGGGooRogGtGGgo..',
    '..ogGGGGgoYYoGGGGoYYogGGGGgo..',
    '..ogGGtGGooooGGGGooooGGtGGgo..',
    '..ogGtGGGGGGGttGGGGGGGGtGgo..',
    '...ogGGGGGGGttttGGGGGGGGgo...',
    '...ogGGGGGgGttttGgGGGGGGgo...',
    '....ogGGggGGttttGGggGGGgo....',
    '...ogGGgoGGGttttGGGogGGGgo...',
    '..ogGGgoGgGGttttGGgGogGGGgo..',
    '..ogGgoGgGGGttttGGGgGogGGgo..',
    '.ogGgoGgGGGGttttGGGGgGogGGgo.',
    '.ogGgoGgGGGgttttgGGGgGogGGgo.',
    'ogGgoGgGGGgGgttgGgGGGgGogGGgo',
    'ogGgoGgGGgoGgttgGgoGGgGogGGgo',
    '.ogGgoGGGgoGgttgGgoGGGogGGgo.',
    '.ogGgoGGggoGgttgGgoggGogGGgo.',
    '..ogGooGgo.GgttgGg.ogGooGgo..',
    '..oggoogo..ogGGgo..oggoogo...',
    '...oo..o....oggo....o..oo....',
    '.............oo..............'
  ]
};

const sprites = new Map();
function makeCanvas(w,h) {
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w,h) : document.createElement('canvas');
  c.width=w; c.height=h; return c;
}
function sprite(type, hit=false) {
  const key=type+(hit?'_hit':'');
  if(sprites.has(key))return sprites.get(key);
  const rows=MAPS[type]||MAPS.archivist;
  const width=Math.max(...rows.map(r=>r.length));
  const c=makeCanvas(width,rows.length),g=c.getContext('2d');
  rows.forEach((row,y)=>{for(let x=0;x<row.length;x++)if(PALETTE[row[x]]){
    g.fillStyle=hit?'#e2f8dd':PALETTE[row[x]];g.fillRect(x,y,1,1);
  }});
  sprites.set(key,c); return c;
}

export function drawEntity(ctx,type,x,y,time=0,opts={}) {
  const character=type==='player'?(opts.character||'archivist'):type;
  const image=sprite(character,!!opts.hit);
  const scale=opts.scale||2;
  const flying=type==='bat'||type==='nightgaunt';
  const bob=flying?Math.sin(time*(type==='bat'?13:5)+x*.03)*4:type==='huntinghorror'?Math.sin(time*7+x*.03)*2:Math.sin(time*7+x*.03)*.8;
  ctx.save();
  ctx.imageSmoothingEnabled=false;
  if(opts.windup){
    const pulse=.55+Math.sin(time*19)*.2;
    ctx.strokeStyle=`rgba(207,113,105,${pulse})`;ctx.lineWidth=2;
    ctx.beginPath();ctx.ellipse(x,y+7,image.width*scale*.57,12*scale*.6,0,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='rgba(181,82,90,.1)';ctx.fill();
  }
  if(opts.charging){
    ctx.fillStyle='rgba(179,83,96,.19)';
    const trailing=opts.flip?1:-1;
    for(let i=1;i<=3;i++)ctx.fillRect(Math.round(x+trailing*i*9-8),Math.round(y-7+i*2),16-i*3,3);
  }
  ctx.fillStyle='rgba(1,5,10,.42)';ctx.beginPath();
  ctx.ellipse(x,y+image.height*scale*.36,image.width*scale*.32,4*scale*.6,0,0,Math.PI*2);ctx.fill();
  if(type==='boss'||type==='shoggoth'||type==='starspawn'){
    const glow=ctx.createRadialGradient(x,y,2,x,y,image.width*scale*.68);
    glow.addColorStop(0,type==='boss'?'rgba(68,140,111,.19)':type==='starspawn'?`rgba(95,168,127,${.11+Math.sin(time*2)*.025})`:'rgba(57,115,100,.09)');
    glow.addColorStop(1,'rgba(27,75,63,0)');
    ctx.fillStyle=glow;ctx.fillRect(x-image.width*scale,y-image.height*scale,image.width*scale*2,image.height*scale*2);
  }
  ctx.translate(Math.round(x),Math.round(y+bob));
  if(opts.flip)ctx.scale(-1,1);
  if(type==='bat')ctx.scale(1,Math.sin(time*16)>.2?.77:1);
  if(type==='nightgaunt')ctx.scale(.88+Math.sin(time*7)*.12,1);
  if(type==='huntinghorror'){ctx.rotate(Math.sin(time*7)*.055);ctx.scale(1+Math.sin(time*7)*.035,1);}
  if(type==='ghoul'){ctx.rotate(Math.sin(time*8)*.025);ctx.scale(1,1+Math.sin(time*8)*.025);}
  if(type==='starspawn')ctx.scale(1+Math.sin(time*2)*.012,1+Math.sin(time*2)*.012);
  ctx.drawImage(image,Math.round(-image.width*scale/2),Math.round(-image.height*scale/2),image.width*scale,image.height*scale);
  ctx.restore();
  if(type==='player'){
    const glow=ctx.createRadialGradient(x-12,y+10,1,x-12,y+10,30);
    glow.addColorStop(0,'rgba(117,201,159,.12)');glow.addColorStop(1,'rgba(90,178,143,0)');
    ctx.fillStyle=glow;ctx.fillRect(x-42,y-20,60,60);
  }
}

function hash(x,y,seed=1){let n=Math.imul(x^seed,374761393)+Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295;}
let ground;
function groundTile(){
  if(ground)return ground;
  ground=makeCanvas(256,256);const c=ground.getContext('2d');
  c.fillStyle='#172022';c.fillRect(0,0,256,256);
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){
    const n=hash(x,y,39);
    if(n<.15)c.fillStyle='#1b2527';else if(n<.27)c.fillStyle='#1c2827';else if(n<.33)c.fillStyle='#131d20';else continue;
    c.fillRect(x*2,y*2,2,2);
  }
  for(let i=0;i<25;i++){
    const x=Math.floor(hash(i,2)*126)*2,y=Math.floor(hash(i,3)*126)*2;
    c.fillStyle=i%3?'#26312c':'#303930';
    c.fillRect(x,y,2,4);c.fillRect(x-2,y+2,2,2);c.fillRect(x+2,y-2,2,4);
  }
  for(let i=0;i<8;i++){
    const x=hash(i,18)*245|0,y=hash(i,17)*245|0;
    c.fillStyle='#293133';c.fillRect(x,y,6,2);c.fillRect(x+2,y+2,5,2);
    c.fillStyle='#101a1c';c.fillRect(x,y+4,6,1);
  }
  return ground;
}

function grave(c,x,y,variant){
  const s=2;
  c.save();c.translate(Math.round(x),Math.round(y));c.scale(s,s);
  c.fillStyle='#0f191b';c.fillRect(-11,8,24,7);
  c.fillStyle='#222d2f';c.fillRect(-9,7,19,6);
  c.fillStyle='#354143';c.fillRect(-7,-11,15,20);
  c.fillStyle='#455052';c.fillRect(-6,-14,12,3);c.fillRect(-4,-16,8,2);
  c.fillStyle='#56605e';c.fillRect(-6,-12,2,18);c.fillRect(-4,-14,8,2);
  c.fillStyle='#242f33';c.fillRect(7,-10,2,19);c.fillRect(-5,9,14,2);
  c.fillStyle='#253336';
  if(variant>.45){c.fillRect(-1,-10,2,12);c.fillRect(-4,-7,8,2);}
  else{c.fillRect(-3,-8,7,1);c.fillRect(-4,-5,9,1);c.fillRect(-3,-2,7,1);c.fillRect(-2,1,5,1);}
  c.fillStyle='#3d5143';c.fillRect(-6,5,3,4);c.fillRect(-7,7,4,2);c.fillRect(5,6,2,3);
  c.fillStyle='#19272a';c.fillRect(3,-11,1,5);c.fillRect(2,-6,1,4);
  c.restore();
}
function cross(c,x,y){
  c.save();c.translate(Math.round(x),Math.round(y));c.scale(2,2);
  c.fillStyle='#101a1b';c.fillRect(-9,8,20,5);
  c.fillStyle='#303e3d';c.fillRect(-3,-20,7,29);c.fillRect(-11,-13,23,7);
  c.fillStyle='#495650';c.fillRect(-2,-20,2,27);c.fillRect(-11,-13,22,2);
  c.fillStyle='#25312f';c.fillRect(4,-12,7,5);c.fillRect(1,-5,2,14);
  c.fillStyle='#38503e';c.fillRect(-4,5,8,5);c.fillRect(-6,8,12,2);
  c.restore();
}
function tree(c,x,y,variant){
  c.save();c.translate(Math.round(x),Math.round(y));
  c.fillStyle='rgba(7,13,16,.25)';c.beginPath();c.ellipse(0,5,39,14,0,0,Math.PI*2);c.fill();
  const branches=[
    [[-7,8],[-4,-18],[-8,-45],[-4,-72],[-11,-94]],
    [[-2,-18],[13,-40],[22,-52],[20,-72]],
    [[-6,-42],[-26,-55],[-35,-73],[-50,-81]],
    [[-4,-65],[10,-82],[22,-90]],
    [[14,-40],[31,-41],[43,-55],[53,-60]],
    [[-27,-56],[-42,-56],[-56,-65]],
    [[-8,-45],[-15,-60],[-13,-76]],
    [[21,-52],[34,-64],[34,-81]],
    [[-8,-85],[-23,-97],[-25,-112]],
    [[9,-82],[8,-98]]
  ];
  c.scale(variant>.5?-1:1,1);
  branches.forEach((pts,i)=>{
    const sw=i===0?11:i<3?7:4;
    c.strokeStyle='#111a1d';c.lineWidth=sw;c.lineJoin='miter';c.beginPath();
    pts.forEach(([a,b],j)=>j?c.lineTo(a,b):c.moveTo(a,b));c.stroke();
    c.strokeStyle=i===0?'#354039':'#28332f';c.lineWidth=Math.max(2,sw-5);c.stroke();
  });
  c.fillStyle='#111c1d';c.fillRect(-14,0,23,11);c.fillRect(-21,7,36,4);
  c.fillStyle='#344037';c.fillRect(-7,-22,3,25);c.fillRect(-11,2,3,7);
  c.restore();
}
function rock(c,x,y){
  c.fillStyle='#111c1e';c.fillRect(x-11,y+4,24,5);
  c.fillStyle='#303b3c';c.fillRect(x-10,y-4,21,8);c.fillRect(x-6,y-8,13,4);
  c.fillStyle='#45504b';c.fillRect(x-6,y-8,11,3);c.fillRect(x-10,y-4,5,3);
  c.fillStyle='#22352e';c.fillRect(x+3,y,7,4);
}
function candle(c,x,y,time,seed){
  const pulse=.8+Math.sin(time*5+seed)*.2;
  const g=c.createRadialGradient(x,y,1,x,y,25*pulse);
  g.addColorStop(0,'rgba(206,153,68,.14)');g.addColorStop(1,'rgba(206,153,68,0)');
  c.fillStyle=g;c.fillRect(x-30,y-30,60,60);
  c.fillStyle='#5c5c46';c.fillRect(x-2,y-2,4,9);c.fillStyle='#b7b493';c.fillRect(x-2,y-2,2,7);
  c.fillStyle='#be8b4c';c.fillRect(x-2,y-7,4,4);c.fillStyle='#f2d39a';c.fillRect(x,y-9-(pulse>1?2:0),2,5);
}

export function drawSigil(c,x,y,r,time=0,alpha=.5){
  c.save();c.translate(x,y);c.globalAlpha=alpha;
  c.strokeStyle='#52735e';c.lineWidth=1;c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.stroke();
  c.beginPath();c.arc(0,0,r*.86,0,Math.PI*2);c.stroke();
  c.strokeStyle='#436b58';c.beginPath();
  for(let i=0;i<6;i++){const a=i*Math.PI/3-Math.PI/2;const b=(i+2)*Math.PI/3-Math.PI/2;c.moveTo(Math.cos(a)*r*.75,Math.sin(a)*r*.75);c.lineTo(Math.cos(b)*r*.75,Math.sin(b)*r*.75);}c.stroke();
  c.beginPath();c.ellipse(0,0,r*.3,r*.15,0,0,Math.PI*2);c.stroke();
  c.fillStyle='#648d6a';c.fillRect(-2,-r*.11,4,r*.22);
  for(let i=0;i<12;i++){const a=i*Math.PI/6;c.save();c.rotate(a);c.fillStyle=i%2?'#426a54':'#607556';c.fillRect(-1,-r+4,2,5);c.restore();}
  c.restore();
}

export function drawWorld(c,cameraX,cameraY,w,h,time=0){
  c.save();c.imageSmoothingEnabled=false;
  const tile=groundTile(),tileSize=256;
  const startX=Math.floor(cameraX/tileSize),startY=Math.floor(cameraY/tileSize);
  for(let y=startY;y<=(cameraY+h)/tileSize;y++)for(let x=startX;x<=(cameraX+w)/tileSize;x++)c.drawImage(tile,Math.floor(x*tileSize-cameraX),Math.floor(y*tileSize-cameraY));

  // Weathered processional paths run between the graves.
  const pathStep=768;
  for(let i=Math.floor((cameraX-30)/pathStep);i<=(cameraX+w+30)/pathStep;i++){
    const xx=Math.round(i*pathStep-cameraX);c.fillStyle='rgba(65,68,57,.12)';c.fillRect(xx-23,0,46,h);
    for(let y=Math.floor(cameraY/30)*30;y<cameraY+h;y+=30){c.strokeStyle='rgba(81,85,72,.17)';c.strokeRect(xx-20+(Math.floor(y/30)%2)*2,Math.floor(y-cameraY),36,26);}
  }
  for(let j=Math.floor((cameraY-30)/pathStep);j<=(cameraY+h+30)/pathStep;j++){
    const yy=Math.round(j*pathStep-cameraY);c.fillStyle='rgba(65,68,57,.10)';c.fillRect(0,yy-23,w,46);
    for(let x=Math.floor(cameraX/34)*34;x<cameraX+w;x+=34){c.strokeStyle='rgba(81,85,72,.14)';c.strokeRect(Math.floor(x-cameraX),yy-19,30,34);}
  }

  const cell=176;
  const objects=[];
  for(let gy=Math.floor((cameraY-130)/cell);gy<=(cameraY+h+130)/cell;gy++)for(let gx=Math.floor((cameraX-100)/cell);gx<=(cameraX+w+100)/cell;gx++){
    const px=gx*cell+hash(gx,gy,25)*95+42;
    const py=gy*cell+hash(gx,gy,88)*95+42;
    const variation=hash(gx,gy,73);
    const sx=Math.round(px-cameraX),sy=Math.round(py-cameraY);
    if(Math.abs(px)<82&&Math.abs(py)<82)continue;
    objects.push({sx,sy,variation,gx,gy});
  }
  objects.sort((a,b)=>a.sy-b.sy);
  objects.forEach(({sx,sy,variation,gx,gy})=>{
    if(variation<.18)tree(c,sx,sy,hash(gx,gy,9));
    else if(variation<.50){grave(c,sx,sy,variation);if(variation<.30)candle(c,sx+19,sy+10,time,gx+gy);}
    else if(variation<.64)cross(c,sx,sy);
    else if(variation<.77)rock(c,sx,sy);
    else if(variation<.83){drawSigil(c,sx,sy,33,time,.28);candle(c,sx-25,sy-20,time,gy);candle(c,sx+26,sy+16,time,gx);}
    else if(variation>.94){candle(c,sx,sy,time,gx);candle(c,sx+12,sy+7,time,gy);}
  });
  // The summoning seal is the only landmark that greets every investigator.
  if(Math.abs(cameraX+w/2)<w&&Math.abs(cameraY+h/2)<h){
    drawSigil(c,-cameraX,-cameraY,73,time,.29);
    for(let i=0;i<5;i++){const a=i*Math.PI*.4-.5;candle(c,Math.cos(a)*81-cameraX,Math.sin(a)*81-cameraY,time,i);}
  }
  c.restore();
}

export function drawPortrait(c,type,width,height){
  c.save();c.clearRect(0,0,width,height);
  c.fillStyle='#141e21';c.fillRect(0,0,width,height);
  const g=c.createRadialGradient(width*.5,height*.6,0,width*.5,height*.6,width*.65);
  g.addColorStop(0,type==='medium'?'#343242':type==='mariner'?'#253c43':'#323c34');g.addColorStop(1,'#131b1d');
  c.fillStyle=g;c.fillRect(0,0,width,height);
  drawSigil(c,width*.5,height*.52,Math.min(width,height)*.42,0,.38);
  for(let i=0;i<32;i++){c.fillStyle=i%3?'#344039':'#6d7254';c.globalAlpha=.5;c.fillRect(hash(i,15)*width|0,hash(i,16)*height|0,1,1);}
  c.globalAlpha=1;drawEntity(c,type,width*.5,height*.56,0,{scale:Math.max(2,Math.min(width/26,height/28))});
  c.restore();
}
