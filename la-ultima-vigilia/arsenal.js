/*
 * Las armas: lo que hay a mano en una aldea gallega la Noche de Difuntos.
 * Cada una tiene cuatro niveles (I-IV); dos iguales del mismo nivel se juntan
 * en una del siguiente. Los números van por nivel: [I, II, III, IV].
 *
 * kind: de qué estadística bebe por defecto (melee, ranged, elemental).
 * act: cómo ataca. thrust (estocada), sweep (barrido en arco), spin (vuelta
 * completa), shot, spread, bounce, ricochet, boomerang, rocket, wave, puddle,
 * orbit, pulse, flame, censer.
 * scale: qué estadísticas suman al daño y en qué proporción.
 */

export const TIER_NAMES = ['I', 'II', 'III', 'IV'];
export const TIER_LABEL = ['Común', 'Poco común', 'Rara', 'Legendaria'];

export const WEAPONS = [
  {id: 'hoz', name: 'Hoz', classes: ['labranza'], kind: 'melee', act: 'sweep', tone: 'iron',
    dmg: [7, 11, 17, 26], cd: [0.95, 0.9, 0.84, 0.78], range: 64, arc: 1.7, scale: {melee: 1}, crit: 0.05, critMul: 2, knock: 150,
    line: 'Con ella segaba la hierba de la sepultura de Ramón. Todos los sábados.'},
  {id: 'pala', name: 'Pala de sepulturero', classes: ['labranza'], kind: 'melee', act: 'thrust', tone: 'iron',
    dmg: [13, 20, 30, 46], cd: [1.55, 1.45, 1.35, 1.25], range: 74, width: 22, scale: {melee: 1.4}, crit: 0.03, critMul: 2, knock: 330,
    line: 'Julián cavó la fosa esta tarde y no dejó que nadie le ayudara.'},
  {id: 'mayal', name: 'Mayal', classes: ['labranza'], kind: 'melee', act: 'spin', tone: 'iron',
    dmg: [9, 14, 21, 32], cd: [1.9, 1.75, 1.6, 1.45], range: 86, scale: {melee: 1, armor: 0.6}, crit: 0.03, critMul: 2, knock: 260,
    line: 'Para mallar el centeno en la era. Se oía desde la iglesia.'},
  {id: 'forcado', name: 'Forcado', classes: ['labranza', 'caza'], kind: 'melee', act: 'thrust', tone: 'iron',
    dmg: [7, 11, 16, 24], cd: [1.15, 1.1, 1.04, 0.98], range: 124, width: 14, scale: {melee: 0.8, range: 0.04}, crit: 0.05, critMul: 2, knock: 170,
    line: 'Tres púas y el mango gastado justo donde se agarra.'},
  {id: 'navaja', name: 'Navaja de afilador', classes: ['caza'], kind: 'melee', act: 'thrust', tone: 'iron',
    dmg: [4, 6, 9, 14], cd: [0.56, 0.51, 0.46, 0.42], range: 52, width: 12, scale: {melee: 0.8}, crit: 0.18, critMul: 2.5, knock: 50,
    line: 'Se la cambió a un afilador de Ourense por un cesto de castañas.'},
  {id: 'remo', name: 'Remo', classes: ['marinero'], kind: 'melee', act: 'sweep', tone: 'sea',
    dmg: [9, 14, 21, 32], cd: [1.3, 1.22, 1.14, 1.05], range: 80, arc: 2.3, scale: {melee: 1, maxHp: 0.08}, crit: 0.03, critMul: 2, knock: 340,
    line: 'De la dorna de su padre. Lo guardaba detrás de la puerta.'},
  {id: 'tea', name: 'Tea', classes: ['fuego'], kind: 'melee', act: 'sweep', tone: 'ember',
    dmg: [5, 8, 12, 18], cd: [0.85, 0.8, 0.75, 0.7], range: 60, arc: 1.5, scale: {melee: 0.6, elemental: 0.6}, crit: 0.04, critMul: 2, knock: 90,
    burn: [2, 3, 4, 6], line: 'Una tea de pino para bajar al pueblo cuando no había luna.'},
  {id: 'botafumeiro', name: 'Botafumeiro', classes: ['sagrado', 'fuego'], kind: 'elemental', act: 'censer', tone: 'sacred',
    dmg: [6, 10, 15, 23], cd: [0.7, 0.66, 0.62, 0.58], range: 96, scale: {elemental: 0.9}, crit: 0.03, critMul: 2, knock: 160,
    burn: [1, 2, 3, 4], line: 'Uno pequeño, de la ermita. El grande está en Santiago y no cabía.'},

  {id: 'chispas', name: 'Chispas del mechero', classes: ['fuego'], kind: 'ranged', act: 'shot', tone: 'ember',
    dmg: [5, 8, 12, 18], cd: [0.72, 0.66, 0.6, 0.54], range: 270, speed: 540, count: [1, 1, 2, 2], scale: {ranged: 0.5, elemental: 0.5}, crit: 0.05, critMul: 2, knock: 60,
    burnChance: 0.2, burn: [1, 2, 2, 3], line: 'Encendía el cirio con un solo fósforo. La segunda cerilla es para los que dudan.'},
  {id: 'escopeta', name: 'Escopeta de sal', classes: ['caza'], kind: 'ranged', act: 'spread', tone: 'salt',
    dmg: [3, 5, 7, 11], cd: [1.35, 1.28, 1.2, 1.1], range: 210, speed: 580, count: [4, 5, 6, 7], spreadA: 0.55, scale: {ranged: 0.45}, crit: 0.03, critMul: 2, knock: 170,
    line: 'Cargada con sal gorda del economato. Lo mejor contra lo que no tiene cuerpo.'},
  {id: 'honda', name: 'Honda', classes: ['caza'], kind: 'ranged', act: 'bounce', tone: 'iron',
    dmg: [8, 12, 18, 27], cd: [1.15, 1.1, 1.04, 0.98], range: 300, speed: 500, bounces: [1, 1, 2, 3], scale: {ranged: 1}, crit: 0.06, critMul: 2, knock: 90,
    line: 'Con ella espantaba a los cuervos del maizal. Nunca les dio a propósito.'},
  {id: 'arpon', name: 'Arpón', classes: ['marinero'], kind: 'ranged', act: 'shot', tone: 'sea',
    dmg: [14, 22, 34, 52], cd: [1.85, 1.75, 1.65, 1.5], range: 340, speed: 450, pierce: [2, 3, 4, 6], scale: {ranged: 1.2}, crit: 0.05, critMul: 2.2, knock: 220,
    line: 'El del hijo de los Lema. El mar se lo devolvió a ella, no a él.'},
  {id: 'vieiras', name: 'Conchas de vieira', classes: ['marinero', 'sagrado'], kind: 'ranged', act: 'ricochet', tone: 'sacred',
    dmg: [6, 9, 14, 21], cd: [1, 0.95, 0.9, 0.85], range: 250, speed: 470, bounces: [2, 3, 4, 5], scale: {ranged: 0.6, elemental: 0.4}, crit: 0.04, critMul: 2, knock: 70,
    line: 'Las de los peregrinos que paraban en su puerta a pedir agua.'},
  {id: 'pandeireta', name: 'Pandeireta', classes: ['romeria'], kind: 'ranged', act: 'boomerang', tone: 'music',
    dmg: [7, 11, 16, 24], cd: [1.3, 1.22, 1.14, 1.05], range: 225, speed: 430, scale: {ranged: 0.8}, crit: 0.04, critMul: 2, knock: 110,
    line: 'Las pandereteiras de la romería tocaban hasta que les sangraban los dedos.'},
  {id: 'foguetes', name: 'Foguetes', classes: ['romeria', 'fuego'], kind: 'ranged', act: 'rocket', tone: 'ember',
    dmg: [11, 17, 26, 40], cd: [1.8, 1.7, 1.6, 1.45], range: 330, speed: 400, blast: [54, 60, 68, 78], scale: {ranged: 0.5, elemental: 0.7}, crit: 0.03, critMul: 2, knock: 200,
    line: 'En la fiesta del Carmen se tiraban hasta que se acababan los cuartos.'},
  {id: 'gaita', name: 'Gaita', classes: ['romeria'], kind: 'elemental', act: 'wave', tone: 'music',
    dmg: [6, 9, 14, 21], cd: [1.55, 1.45, 1.35, 1.25], range: 215, speed: 300, arc: 1.1, slow: 0.45, scale: {elemental: 0.8}, crit: 0.03, critMul: 2, knock: 120,
    line: 'Toño tocó la alborada en su boda. Desafinó a propósito, para que se riera.'},
  {id: 'agua', name: 'Agua bendita', classes: ['sagrado'], kind: 'elemental', act: 'puddle', tone: 'salt',
    dmg: [3, 5, 8, 12], cd: [2.3, 2.15, 2, 1.85], range: 270, speed: 380, blast: [44, 50, 56, 64], life: 2.6, tick: 0.4, slow: 0.3, scale: {elemental: 0.6}, crit: 0.02, critMul: 2, knock: 0,
    line: 'De la pila de la ermita, en una botella de gaseosa.'},
  {id: 'rosario', name: 'Rosario de nácar', classes: ['sagrado'], kind: 'elemental', act: 'orbit', tone: 'sacred',
    dmg: [6, 9, 13, 19], cd: [0.45, 0.42, 0.39, 0.36], range: 74, count: [2, 3, 4, 5], scale: {elemental: 0.8}, crit: 0.04, critMul: 2, knock: 140,
    line: 'Le faltaba una cuenta. Nunca quiso cambiarlo.'},
  {id: 'campanilla', name: 'Campanilla', classes: ['sagrado', 'romeria'], kind: 'elemental', act: 'pulse', tone: 'sacred',
    dmg: [8, 13, 20, 30], cd: [2.4, 2.2, 2, 1.8], range: 84, grow: [0, 10, 22, 36], scale: {elemental: 1}, crit: 0.03, critMul: 2, knock: 280,
    line: 'La de la sacristía. Un martes cualquiera tocó a fiesta.'},
  {id: 'cirio', name: 'Cirio pascual', classes: ['sagrado', 'fuego'], kind: 'elemental', act: 'flame', tone: 'ember',
    dmg: [2, 3, 5, 7], cd: [0.14, 0.14, 0.13, 0.12], range: 104, grow: [0, 6, 13, 22], arc: 0.55, scale: {elemental: 0.45}, crit: 0.02, critMul: 2, knock: 20,
    burn: [1, 1, 2, 3], line: 'El cirio grande, el de Pascua. Lo cogió prestado de la ermita y no lo devolvió.'}
];
export const WEAPON = Object.fromEntries(WEAPONS.map(w => [w.id, w]));

/* Clases: llevar varias armas de la misma clase da un premio. Índice = cuántas (2 a 6). */
export const CLASSES = {
  labranza: {name: 'Labranza', bonus: [null, null, {armor: 1, melee: 1}, {armor: 2, melee: 2}, {armor: 3, melee: 3}, {armor: 4, melee: 4}, {armor: 5, melee: 5}]},
  caza: {name: 'Caza', bonus: [null, null, {crit: 3}, {crit: 6}, {crit: 9}, {crit: 12}, {crit: 15}]},
  fuego: {name: 'Fuego', bonus: [null, null, {damage: 4}, {damage: 8}, {damage: 12}, {damage: 16}, {damage: 20}]},
  sagrado: {name: 'Sagrado', bonus: [null, null, {elemental: 1, regen: 1}, {elemental: 2, regen: 2}, {elemental: 3, regen: 3}, {elemental: 4, regen: 4}, {elemental: 5, regen: 5}]},
  marinero: {name: 'Mar', bonus: [null, null, {range: 15, harvest: 2}, {range: 30, harvest: 4}, {range: 45, harvest: 6}, {range: 60, harvest: 8}, {range: 75, harvest: 10}]},
  romeria: {name: 'Romería', bonus: [null, null, {attackSpeed: 4, speed: 2}, {attackSpeed: 8, speed: 4}, {attackSpeed: 12, speed: 6}, {attackSpeed: 16, speed: 8}, {attackSpeed: 20, speed: 10}]}
};

/* Valor por nivel: las listas se leen en la posición del nivel; los números sueltos valen para todos. */
export const tierValue = (v, tier) => Array.isArray(v) ? v[Math.min(v.length - 1, tier)] : v;

/* Lo que se cuenta del arma en la tienda: «12 (+100 % cuerpo a cuerpo) · cada 0,9 s». */
export const SCALE_NAMES = {melee: 'cuerpo a cuerpo', ranged: 'a distancia', elemental: 'elemental', armor: 'armadura', maxHp: 'vida máxima', range: 'alcance', engineering: 'ingenio', speed: 'velocidad', luck: 'suerte'};
