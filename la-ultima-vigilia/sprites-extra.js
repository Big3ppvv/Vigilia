/*
 * Más pixel art, con la misma paleta de sprites.js: las armas que rodean a
 * quien vela, las criaturas y personas nuevas, el puesto de Remedios y los
 * iconos de los objetos. Las armas miran a la derecha; se giran al apuntar.
 */

/* Colores que se suman a la paleta. */
export const EXTRA_PALETTE = {
  '8': '#86b85a', '0': '#2a3d22', '+': '#b8432f', '=': '#3b5f8a', '-': '#d8d0e8', '*': '#f7f3ea',
  '#': '#8a5a2a', '%': '#5c3a1c', '&': '#c27a3a', '@': '#a7c7e7', '~': '#6f8fb0', '^': '#e05b4b'
};
export const EXTRA_EMISSIVE = ['^'];

export const WEAPON_SPRITES = {
  hoz: [
    '........SSS...',
    '.........sSS..',
    '...........sS.',
    '............S.',
    'oeeeeeooo..sS.',
    'oEEEEEooosSS..',
    '.........SS...'
  ],
  pala: [
    '..............SSS.',
    'oeeeeeeeeeeeoSSSSS',
    'oEEEEEEEEEEEoSSsSS',
    '..............SSS.'
  ],
  mayal: [
    '..........eee.',
    'oeeeeo.s.eEEEe',
    'oEEEEo..seEEEe',
    '..........eee.'
  ],
  forcado: [
    '...............SSSS',
    'oeeeeeeeeeeeeeS....',
    'oEEEEEEEEEEEEESSSSS',
    '...............S...',
    '...............SSSS'
  ],
  navaja: [
    '.......sss..',
    'oEEEEossSSSs',
    'oeeeeo......'
  ],
  remo: [
    '..............eeee.',
    'oeeeeeeeeeeeeeEEEEe',
    'oEEEEEEEEEEEEEeeeee',
    '..............EEEE.'
  ],
  tea: [
    '.........yY.',
    '.........YyY',
    'oeeeeeeeEyy.',
    'oEEEEEEEe...'
  ],
  botafumeiro: [
    '...o....',
    '...M....',
    '...O....',
    '..MMMM..',
    '.MOMMOM.',
    '.MMyyMM.',
    '..MMMM..',
    '...MM...'
  ],
  chispas: [
    '..y....',
    '.yYy...',
    '..y....',
    'ossso..',
    'oSSSo..',
    'oMMMo..',
    'oMOMo..',
    'oMMMo..',
    'ooooo..'
  ],
  escopeta: [
    '..........ssssssss',
    'oeeeeeeSSSSSSSSSSS',
    'oEEEEo.o..........',
    '.oEo..............'
  ],
  honda: [
    '.......ee',
    '......e..',
    'oeeeeee..',
    '......e..',
    '.......ee'
  ],
  arpon: [
    '...................S..',
    'oeeeeeeeeeeeeeeeeSSSSS',
    '...................S..'
  ],
  vieiras: [
    '.qqqqqqq.',
    'qQqQqQqQq',
    'qQqQqQqQq',
    '.qQqQqQq.',
    '..qQqQq..',
    '...qqq...',
    '...QQQ...'
  ],
  pandeireta: [
    '...oooo...',
    '.oM.qq.Mo.',
    '.o.qqqq.o.',
    'oMqqqqqqMo',
    'o.qqqqqq.o',
    'oMqqqqqqMo',
    '.o.qqqq.o.',
    '.oM.qq.Mo.',
    '...oooo...'
  ],
  foguetes: [
    '.........rrrrR.',
    'oeeeeeeeerrrrRr',
    '.........rrrrR.'
  ],
  gaita: [
    '..e...e.......',
    '..e...e.......',
    '..e...e.......',
    '.rrrrrrr......',
    'rRrRrRrRr.....',
    'rrrrrrrrrMMM..',
    '.rRrRrRr..eeeE',
    '..rrrrr.......'
  ],
  agua: [
    '..oo..',
    '..qq..',
    '.oZZo.',
    'oZzZZo',
    'oZZzZo',
    'oZZZzo',
    'oZZZZo',
    '.oooo.'
  ],
  rosario: [
    '...qqq...',
    '..q...q..',
    '.q.....q.',
    '.q.....q.',
    '..q...q..',
    '...qMq...',
    '....M....',
    '...MMM...',
    '....M....'
  ],
  campanilla: [
    '...ee...',
    '...ee...',
    '..oMMo..',
    '.oMMMMo.',
    '.oMMOMo.',
    'oMMMMOMo',
    'oooooooo',
    '...oo...'
  ],
  cirio: [
    '..y...',
    '.yYy..',
    '..y...',
    '..o...',
    '.oqqo.',
    '.oqQo.',
    '.oqQo.',
    '.oqQo.',
    '.oqQo.',
    'oMMMMo'
  ]
};
/* Las que no apuntan: se quedan derechas y se mecen. */
export const UPRIGHT = new Set(['botafumeiro', 'chispas', 'agua', 'campanilla', 'cirio', 'pandeireta', 'vieiras', 'rosario', 'gaita']);

export const EXTRA_SPRITES = {
  tono: [
    '....oooooo......',
    '...okkkkkko.....',
    '..okkkkkkkko....',
    '....ohhhhho.....',
    '...ohhohhoho....',
    '...ohhhhhhho....',
    '...ohWWWWWho....',
    '....oWWWWWo.....',
    '...owwwwwwwo....',
    '..o0w00000w0o...',
    '..o00000000rro..',
    '..o0w0000rRrRr..',
    '..o00000rrrrrro.',
    '..o0w0000rRrRo..',
    '..o000000orro...',
    '..oww000wwo.....',
    '...odddddo......',
    '...oddoddo......',
    '...oddoddo......',
    '...oddoddo......',
    '..okkko.okko....',
    '..ooooo.oooo....'
  ],
  sabela: [
    '.....oooooo.....',
    '....o======o....',
    '...o=======o....',
    '...o=nhhhhn=o...',
    '...onhhohhohno..',
    '...onhhhhhhhno..',
    '....ohhRRhhho...',
    '.....ohhhhho....',
    '....o+++++++o...',
    '...o++qqqqq++o..',
    '..ohh+qqqqq+hho.',
    '..oho+qqQqq+oho.',
    '..oo.+qqqqq+.oo.',
    '.....+qqqqq+....',
    '....o+++++++o...',
    '....o+++++++o...',
    '....o+++++++o...',
    '....oo+++++oo...',
    '.....ohho.ohho..',
    '.....ohho.ohho..',
    '....okkko.okkko.',
    '....ooooo.ooooo.'
  ],
  anselmo: [
    '.....oooooo.....',
    '....okkkkkko....',
    '...okkkkkkkko...',
    '...ohhhhhhhho...',
    '...ohhohhohho...',
    '...ohhhhhhhho...',
    '...oSShhhhSSo...',
    '....ohhhhhho....',
    '....o**kk**o....',
    '...okkkMMkkko...',
    '..okkkkMMkkkko..',
    '..okkkkMMkkkhho.',
    '..okkkkMMkkkoo..',
    '..okkkkMMkkkko..',
    '..okkkkkkkkkko..',
    '..okkkkkkkkkko..',
    '..okkkkkkkkkko..',
    '..okkkkkkkkkko..',
    '...okkkkkkkko...',
    '....okko.okko...',
    '....okko.okko...',
    '...ooooo.ooooo..'
  ],
  remedios: [
    '......oooo......',
    '....oo0000oo....',
    '...o00000000o...',
    '..o0000000000o..',
    '..o00hhhhhh00o..',
    '..o0hhohhohh0o..',
    '..o0hhhhhhhh0o..',
    '..o0HhhRRhhH0o..',
    '...o0hhhhhh0o...',
    '..o000000000vo..',
    '.o0000000000vvo.',
    'o0000000000vvvvo',
    'ohh00000000vqvvo',
    'o0000000000vvvvo',
    '.o00000000000oo.',
    '.o00000000000o..',
    '.o0#0#0#0#0#0o..',
    '.o00000000000o..',
    '..o000000000o...',
    '...okko.okko....',
    '..ookkooookkoo..'
  ],
  trasno: [
    '....oo.....',
    '...o^^o....',
    '..o^^^^o...',
    '.o^^^^^^o..',
    '.ooooooooo.',
    '.o888888o..',
    'o88V88V88o.',
    'o88888888o.',
    '.o88ii88o..',
    '..o8888o...',
    '.o0#00#0o..',
    'o80#00#08o.',
    '..o0000o...',
    '..o8o.o8o..',
    '..ooo.ooo..'
  ],
  lavandeira: [
    '.....oooo.....',
    '....o----o....',
    '...o------o...',
    '...o-ZiiZ-o...',
    '...o-iiii-o...',
    '...o------o...',
    '....o----o....',
    '...o------o...',
    '..o--------o..',
    '.o-*-------*o.',
    'o-**---------o',
    'o-*@@@@@@@@*-o',
    'o-*@~@~@~@@*-o',
    '.o*@@@@@@@@*o.',
    '.o----------o.',
    '..o--------o..',
    '..o-.-.--.-o..',
    '...o.o..o.o...'
  ],
  nubeiro: [
    '.....oooooo.....',
    '...ooaaaaaaoo...',
    '..oaaAaaaaAaao..',
    '.oaaAAaaaaaAaao.',
    '.oaaVVaaaaVVaao.',
    'oaaaaaaaaaaaaaao',
    'oaaAaaaiiaaaAaao',
    '.oaaaaaaaaaaaao.',
    '..ooaaaaaaaaoo..',
    '....oAAaaAAo....',
    '...oAAAaaAAAo...',
    '..oAA.oaao.AAo..',
    '..oo..oaao..oo..',
    '......oVVo......',
    '.......VV.......',
    '......VV........',
    '.....VV.........'
  ],
  lobishome: [
    '..oo.......oo.....',
    '..oKo.....oKo.....',
    '..oKKoooooKKo.....',
    '..oKKKKKKKKKo.....',
    '.oKKXKKKKXKKo.....',
    '.oKKKKKKKKKKKo....',
    '.oKKKKKKKKSSSSo...',
    '..oKKKKKKKSSSSo...',
    '...oKKKKKKKoo.....',
    '..oKKKbbbbKKKo....',
    '.oKKKbbbbbbKKKo...',
    'oKKo.bbbbbb.oKKo..',
    'oSo..bbbbbb..oSo..',
    '.....oBBBBo.......',
    '.....oKKKKo.......',
    '....oKKooKKo......',
    '....oKKo.oKKo.....',
    '...oKKo...oKKo....',
    '...oSSo...oSSo....',
    '...oooo...oooo....'
  ],
  espantallo: [
    '....oooo....',
    '...oeeeeo...',
    '..oeEEEEeo..',
    'ooooQQQQoooo',
    '...oQXQXo...',
    '...oQQQQo...',
    'xoodddddddoox',
    'xxdddddddddxx',
    '.xoddKdKddox.',
    '...oddddo...',
    '...odMddo...',
    '...oddddo...',
    '....oxxo....',
    '.....Eo.....',
    '.....E......',
    '....oEEo....'
  ],
  colmena: [
    '...oooooo...',
    '..o######o..',
    '.o#%%%%%%#o.',
    '.o########o.',
    '.o#%%%%%%#o.',
    '.o###oo###o.',
    '.o#%oiio%#o.',
    '.o###oo###o.',
    '.o#%%%%%%#o.',
    '.o########o.',
    '..oooooooo..'
  ],
  ofrenda: [
    '...oo.oo...',
    '..oMMoMMo..',
    '.oqrqMqyqo.',
    'oqrRqqqyYqo',
    'o#########o',
    'o#%#%#%#%#o',
    'o#########o',
    '.o#%#%#%#o.',
    '..ooooooo..'
  ]
};

export const EXTRA_FRAMES = {
  tono: {
    walk1: [[19, '...oddoddo......'], [20, '..okkko.oddo....'], [21, '..ooooo.okkko...']],
    walk2: [[19, '...oddoddo......'], [20, '...oddo.okkko...'], [21, '..okkko.ooooo...']],
    blink: [[4, '...ohhhhhhho....']]
  },
  sabela: {
    walk1: [[19, '....ohho..ohho..'], [20, '...okkko..okkko.'], [21, '...ooooo..ooooo.']],
    walk2: [[18, '.....ohho.ohho..'], [20, '.....okkko.okkko'], [21, '.....ooooo.ooooo']],
    blink: [[4, '...onhhhhhhhno..']]
  },
  anselmo: {
    walk1: [[19, '...okko..okko...'], [20, '...okko...okko..'], [21, '..ooooo...ooooo.']],
    walk2: [[19, '....okko.okko...'], [20, '...okko.okko....'], [21, '..ooooo.ooooo...']],
    blink: [[4, '...ohhhhhhhho...']]
  },
  remedios: {blink: [[5, '..o0hhhhhhhh0o..']]},
  trasno: {
    step1: [[13, '..o8o..o8o.'], [14, '..ooo..ooo.']],
    step2: [[13, '...o8oo8o..'], [14, '...oooooo..']]
  },
  lavandeira: {step1: [[16, '..o.-.--.-.o..'], [17, '...o.o..o.o...']], step2: [[16, '..o-.-..-.-o..'], [17, '..o.o.oo.o.o..']]},
  nubeiro: {flick: [[13, '......o..o......'], [14, '................'], [15, '................'], [16, '................']]},
  lobishome: {
    run1: [[15, '....oKKooKKo......'], [16, '...oKKo...oKKo....'], [17, '..oKKo.....oKKo...'], [18, '..oSSo.....oSSo...'], [19, '..oooo.....oooo...']],
    run2: [[15, '.....oKKoKKo......'], [16, '.....oKKKKo.......'], [17, '.....oKKKKo.......'], [18, '.....oSSSSo.......'], [19, '.....oooooo.......']]
  }
};

/* Iconos de 12×12 para los objetos y los recuerdos. */
export const EXTRA_ICONS = {
  hoz: WEAPON_SPRITES.hoz,
  honda: WEAPON_SPRITES.honda,
  morcilla: [
    '............',
    '..oooooo....',
    '.o++++++oo..',
    'o+^+++^+++o.',
    'o++++++++++o',
    '.o+++^+++++o',
    '..oo++++++o.',
    '....ooooo...'
  ],
  tabaco: [
    '............',
    '.oooooooooo.',
    '.o========o.',
    '.o=******=o.',
    '.o=*rrrr*=o.',
    '.o=******=o.',
    '.o========o.',
    '.oooooooooo.'
  ],
  cuchara: [
    '.........oo.',
    '........oeeo',
    '.......oeEeo',
    '......oeeeo.',
    '.....oeoo...',
    '....oeo.....',
    '...oeo......',
    '..oeo.......',
    '.oeo........',
    '.oo.........'
  ],
  piedras: [
    '............',
    '....oooo....',
    '...oSSSso...',
    '...oSssSo...',
    '....oooo....',
    '.oooo..ooo..',
    'oSSsSoosSSo.',
    'oSsSSooSsSo.',
    '.oooo..ooo..'
  ],
  vela: [
    '.....y......',
    '....yYy.....',
    '.....y......',
    '....oqo.....',
    '...oqqqo....',
    '...oqQqo....',
    '...oqQqo....',
    '..ooqQqoo...',
    '.o+++++++o..',
    '..ooooooo...'
  ],
  reloj: [
    '.....oo.....',
    '....oMMo....',
    '...oooooo...',
    '..oM****Mo..',
    '.oM*o***Mo..',
    '.oM*o***Mo..',
    '.oM*ooo*Mo..',
    '..oM****Mo..',
    '...oooooo...'
  ],
  padron: [
    '.....0......',
    '....00......',
    '...o88o.....',
    '..o8888o....',
    '..o8v88o....',
    '..o88v8o....',
    '...o888o....',
    '....o88o....',
    '.....o8o....',
    '......o.....'
  ],
  herramientas: [
    '..oo....oo..',
    '.oSSo..oSSo.',
    '..oSSooSSo..',
    '...oSSSSo...',
    '....oeeo....',
    '...oeeeeo...',
    '..oeeooeeo..',
    '.oeeo..oeeo.',
    '.ooo....ooo.'
  ],
  zuecos: [
    '............',
    '.....oooo...',
    '....o####o..',
    '...o#%%%%#o.',
    '..o########o',
    '.o#########o',
    'o##########o',
    'o%%%%%%%%%%o',
    '.oooooooooo.'
  ],
  ajos: [
    '.....oo.....',
    '.....oo.....',
    '....o**o....',
    '...o*-*-o...',
    '..o**-***o..',
    '..o*-***-o..',
    '...o*-**o...',
    '..o**o**o...',
    '.o*-**-*o...',
    '..oooooo....'
  ],
  ruda: [
    '.....8......',
    '...8.8.8....',
    '..8888888...',
    '.8.88888.8..',
    '..8888888...',
    '...88888....',
    '.....0......',
    '.....0......',
    '...ooooo....',
    '...o+++o....'
  ],
  herradura: [
    '..oooooooo..',
    '.oSSSSSSSSo.',
    'oSSo....oSSo',
    'oSo......oSo',
    'oSo......oSo',
    'oSSo....oSSo',
    '.oSo....oSo.',
    '.ooo....ooo.'
  ],
  cesta: [
    '...oooooo...',
    '..o......o..',
    '.o........o.',
    'oooooooooooo',
    'o#%#%#%#%#%o',
    'o%#%#%#%#%#o',
    '.o#%#%#%#%o.',
    '..oooooooo..'
  ],
  castanas: [
    '............',
    '...oo..oo...',
    '..o##oo##o..',
    '.o#%##o%##o.',
    '.o####o###o.',
    '.oqqqqoqqqo.',
    '..oooo.ooo..',
    '....oo......',
    '...o##o.....',
    '...oqqo.....',
    '....oo......'
  ],
  orujo: [
    '....oo......',
    '....oo......',
    '...o--o.....',
    '...o--o.....',
    '..o----o....',
    '.o------o...',
    '.o-@@@@-o...',
    '.o-@@@@-o...',
    '.o------o...',
    '..oooooo....'
  ],
  bufanda: [
    '............',
    '.oooooooooo.',
    'o+=+=+=+=+=o',
    'o=+=+=+=+=+o',
    '.ooooooo+=o.',
    '.......o=+o.',
    '.......o+=o.',
    '.......oo.o.'
  ],
  mantelo: [
    '.....oo.....',
    '....okko....',
    '...okkkko...',
    '..okkKkkko..',
    '.okkkkKkkko.',
    'okkKkkkkKkko',
    'okkkkkkkkkko',
    '.o.o.o.o.o..'
  ],
  paraguas: [
    '.....o......',
    '...ooooo....',
    '..okkkkko...',
    '.okKkKkKko..',
    'okkkkkkkkko.',
    'o.o.oeo.o.o.',
    '.....e......',
    '.....e......',
    '...o.e......',
    '....oo......'
  ],
  iman: [
    '..ooo..ooo..',
    '.o^^o..o==o.',
    '.o^^o..o==o.',
    '.o^^o..o==o.',
    '.o^^oooo==o.',
    '.o^^^^====o.',
    '..o^^^===o..',
    '...oooooo...'
  ],
  figa: [
    '....oo......',
    '...oKKo.....',
    '..oKKKKo....',
    '..oKgKKo....',
    '..oKKKKKo...',
    '.oKKKKKKo...',
    '.oKKgKKo....',
    '..oKKKo.....',
    '...ooo......'
  ],
  caravaca: [
    '.....oo.....',
    '....oMMo....',
    '..ooMMMMoo..',
    '..oMMMMMMo..',
    '....oMMo....',
    '.ooooMMoooo.',
    '.oMMMMMMMMo.',
    '.ooooMMoooo.',
    '....oMMo....',
    '....oMMo....',
    '....oooo....'
  ],
  aguaMayo: [
    '....oooo....',
    '....o**o....',
    '...o@@@@o...',
    '..o@~@@@@o..',
    '..o@@@@@@o..',
    '..o@@8@@@o..',
    '..o@888@@o..',
    '..o@@@@@@o..',
    '...oooooo...'
  ],
  tarta: [
    '............',
    '...oooooo...',
    '.oo******oo.',
    'o*****+****o',
    'o***+++++**o',
    'o*****+****o',
    'o&&&&&&&&&&o',
    'o&&&&&&&&&&o',
    '.oooooooooo.'
  ],
  tetilla: [
    '.....oo.....',
    '....oQQo....',
    '...oQQQQo...',
    '..oQQQQQQo..',
    '.oQQQQQQQQo.',
    '.oQQQQQQQQo.',
    'oQQQQQQQQQQo',
    'oQQQQQQQQQQo',
    '.oooooooooo.'
  ],
  lacon: [
    '.......ooo..',
    '......o*o*o.',
    '...oooo***o.',
    '..o++++oo...',
    '.o+^++^++o..',
    'o+++++++++o.',
    'o8+++++++8o.',
    '.o888888880.',
    '..oooooooo..'
  ],
  empanada: [
    '............',
    '..oooooooo..',
    '.o&&&&&&&&o.',
    'o&#&#&#&#&&o',
    'o&&&&&&&&&&o',
    'o&#&#&#&#&&o',
    '.o&&&&&&&&o.',
    '..oooooooo..'
  ],
  bota: [
    '.....oo.....',
    '....o%%o....',
    '...o####o...',
    '..o######o..',
    '.o###%####o.',
    '.o########o.',
    '..o######o..',
    '...oooooo...'
  ],
  pano: [
    'oooooooooooo',
    'o**********o',
    'o*^*******^o',
    'o**********o',
    'o****^^****o',
    'o****^^****o',
    'o**********o',
    'o^********^o',
    'oooooooooooo'
  ],
  coroza: [
    '.....oo.....',
    '....oxxo....',
    '...oxmxxo...',
    '..oxxxmxxo..',
    '.oxmxxxxmxo.',
    'oxxxxmxxxxxo',
    'oxmxxxxxmxxo',
    'o.o.o.o.o.o.'
  ],
  escapulario: [
    '..oo....oo..',
    '..o.o..o.o..',
    '...o.oo.o...',
    '....o..o....',
    '...oooooo...',
    '...o+MM+o...',
    '...o+MM+o...',
    '...o++++o...',
    '...oooooo...'
  ],
  hucha: [
    '...oooo.....',
    '..o&&&&oo...',
    '.o&&oo&&&o..',
    'o&&&&&&&&&o.',
    'o&o&&&&&&&&o',
    'o&&&&&&&&&o.',
    '.o&&&&&&&o..',
    '..o&o.o&o...',
    '..ooo.ooo...'
  ],
  gato: [
    '.o......o...',
    '.oKo..oKo...',
    '.oKKooKKo...',
    '.oKVKKVKo...',
    '.oKKKKKKo...',
    '..oKKKKo...o',
    '.oKKKKKKo.oK',
    'oKKKKKKKKoK.',
    'oKKKKKKKKKo.',
    '.oooooooo...'
  ],
  toxo: [
    '...o..o.....',
    '..oVo.Vo.o..',
    '.o0o0o0oVo..',
    '..o0o0o0o...',
    '.oVo0o0oo...',
    '..o.o0o.....',
    '.....0......',
    '.....0......',
    '....000.....'
  ],
  cerillas: [
    '............',
    '.^.^.^......',
    '.o.o.o......',
    '.o.o.o......',
    'oooooooooo..',
    'o+++++++++o.',
    'o+*****++++o',
    'o+++++++++o.',
    'oooooooooo..'
  ],
  tizon: [
    '.........yY.',
    '........yYy.',
    '.......yy...',
    '......%^....',
    '.....%%.....',
    '....%%......',
    '...%%.......',
    '..%%........',
    '.%%.........',
    '.o..........'
  ],
  libreta: [
    '.oooooooooo.',
    'o=o*******o.',
    'o=o*kk*kk*o.',
    'o=o*******o.',
    'o=o*kkk*k*o.',
    'o=o*******o.',
    'o=o*kk*kkko.',
    'o=o*******o.',
    '.oooooooooo.'
  ],
  baraja: [
    '..oooooo....',
    '.o******o...',
    '.o*^****oooo',
    '.o**^^*o***o',
    '.o*^***o*=*o',
    '.o******o*=o',
    '..oooooo.*=o',
    '........oooo'
  ],
  espantallo: [
    '....ooo.....',
    '...oeeeo....',
    '..ooQQQoo...',
    '...oQXQo....',
    'xooddddddoox',
    'xxdddddddddx',
    '..oddMddo...',
    '...odddo....',
    '....oEo.....',
    '....oEo.....'
  ],
  colmena: [
    '...oooooo...',
    '..o######o..',
    '.o#%%%%%%#o.',
    '.o###oo###o.',
    '.o#%oiio%#o.',
    '.o###oo###o.',
    '.o#%%%%%%#o.',
    '..oooooooo..'
  ],
  capote: [
    '...oo..oo...',
    '..o==oo==o..',
    '.o========o.',
    'o==o=====o=o',
    'o=o======o=o',
    'o=o=*====o=o',
    'o=o======o=o',
    '.oo======oo.',
    '...oooooo...'
  ],
  pedra: [
    '.....oo.....',
    '....oSSo....',
    '...oSssSo...',
    '..oSSsSSSo..',
    '..oSsSSsSo..',
    '.oSSSsSSSSo.',
    '.oSsSSSsSSo.',
    '..oSSSSSSo..',
    '...oooooo...'
  ],
  ollo: [
    '...oooooo...',
    '..o&&&&&&o..',
    '.o&#####&&o.',
    'o&#&&&&&#&&o',
    'o&#&%%%&#&&o',
    'o&#&&&&&#&&o',
    '.o&#####&&o.',
    '..o&&&&&&o..',
    '...oooooo...'
  ],
  corno: [
    '........oo..',
    '.......oKo..',
    '......oKKo..',
    '.....oKKo...',
    '....oKKo....',
    '...oKKKo....',
    '..oKKKo.....',
    '.oMKKo......',
    '.oMMo.......',
    '..oo........'
  ],
  caracola: [
    '......oo....',
    '....oo**o...',
    '...o*&&&*o..',
    '..o*&**&&*o.',
    '.o*&*&&*&*o.',
    '.o*&**&&&*o.',
    '..o*&&&**o..',
    '...oo***o...',
    '.....ooo....'
  ],
  cruceiro: [
    '....oooo....',
    '....oSSo....',
    '.ooooSSoooo.',
    '.oSSSSSSSSo.',
    '.ooooSSoooo.',
    '....oSSo....',
    '....oSSo....',
    '...oSSSSo...',
    '..oSSSSSSo..',
    '..oooooooo..'
  ],
  rosa: [
    '.....o......',
    '.....=......',
    '....o=o.....',
    '..oo*=*oo...',
    'o==**^**==o.',
    '..oo*=*oo...',
    '....o=o.....',
    '.....=......',
    '.....o......'
  ],
  queimada: [
    '..z.z..z....',
    '.zLz.zLz.z..',
    '..z.zLz.zLz.',
    'oooooooooooo',
    'o&&&&&&&&&&o',
    '.o&#&#&#&#o.',
    '..o&&&&&&o..',
    '...oooooo...'
  ],
  medalla: [
    '...o....o...',
    '...=o..o=...',
    '....=oo=....',
    '...oMMMMo...',
    '..oMOOOOMo..',
    '..oMO*MOMo..',
    '..oMOOOOMo..',
    '...oMMMMo...',
    '....oooo....'
  ],
  relicario: [
    '.....oo.....',
    '....o..o....',
    '...oMMMMo...',
    '..oMOOOOMo..',
    '..oMO+%OMo..',
    '..oMO%+OMo..',
    '..oMOOOOMo..',
    '...oMMMMo...',
    '....oooo....'
  ],
  zamarra: [
    '..oo....oo..',
    '.o**o..o**o.',
    'o****oo****o',
    'o*Q**##**Q*o',
    'o****##****o',
    'o*Q**##**Q*o',
    'o****##****o',
    '.o***##***o.',
    '..oooooooo..'
  ],
  bretema: [
    '....oooo....',
    '....o%%o....',
    '...o----o...',
    '..o-@-@--o..',
    '..o--@-@-o..',
    '..o-@--@-o..',
    '..o--@---o..',
    '..o------o..',
    '...oooooo...'
  ],
  agulla: [
    '...oooooo...',
    '..oM****Mo..',
    '.oM**^***Mo.',
    '.oM**^***Mo.',
    '.oM*****=Mo.',
    '.oM****=*Mo.',
    '..oM****Mo..',
    '...oooooo...'
  ],
  sacho: [
    '.......oooo.',
    '......oSSSSo',
    '.....oeSSSo.',
    '....oeooo...',
    '...oeo......',
    '..oeo.......',
    '.oeo........',
    'oeo.........',
    'oo..........'
  ],
  ciprianillo: [
    '.oooooooooo.',
    'o%o#######o.',
    'o%o#^###^#o.',
    'o%o##^#^##o.',
    'o%o###^###o.',
    'o%o##^#^##o.',
    'o%o#^###^#o.',
    'o%o#######o.',
    '.oooooooooo.'
  ],
  tesoro: [
    '...oooooo...',
    '..o######o..',
    '.o#%%%%%%#o.',
    'oooooooooooo',
    'o#MVMMMVMM#o',
    'o#MMMVMMMM#o',
    'o##########o',
    'o#%%%%%%%%#o',
    '.oooooooooo.'
  ],
  anillo: [
    '....oooo....',
    '...oMVVMo...',
    '..oMOooOMo..',
    '.oMo....oMo.',
    '.oMo....oMo.',
    '.oMo....oMo.',
    '..oMOooOMo..',
    '...oMMMMo...',
    '....oooo....'
  ],
  conxuro: [
    '....z..z....',
    '...zLzzLz...',
    '..zLLzzLLz..',
    '...zzLLzz...',
    '..oooooooo..',
    '.o&&&&&&&&o.',
    '.o&^&&&&^&o.',
    '..o&&&&&&o..',
    '...oooooo...'
  ],
  vestido: [
    '....oooo....',
    '...o****o...',
    '...o*oo*o...',
    '..o******o..',
    '..o*o**o*o..',
    '.o********o.',
    '.o**o**o**o.',
    'o****o*****o',
    'o*o******o*o',
    'oooooooooooo'
  ],
  dorna: [
    '.....o......',
    '.....o*.....',
    '.....o**....',
    '.....o***...',
    '.....o****..',
    'oooooooooooo',
    'o#%#%#%#%#%o',
    '.o########o.',
    '..oooooooo..'
  ],
  faro: [
    '.....VV.....',
    '....oVVo....',
    '...oooooo...',
    '....o**o....',
    '....o+*o....',
    '...o**+*o...',
    '...o+***o...',
    '..o**+***o..',
    '..o+****+o..',
    '.oooooooooo.'
  ],
  fotos: [
    'oooooooooooo',
    'oqqqqqqqqqqo',
    'oqKKKKKKKKqo',
    'oqKhKKKKhKqo',
    'oqKgKKKKgKqo',
    'oqKKKKKKKKqo',
    'oqqqqqqqqqqo',
    'oooooooooooo'
  ]
};
