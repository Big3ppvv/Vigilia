/*
 * Todo el texto del juego vive aquí: quién es Amparo, quién la vela, qué viene
 * a por ella, qué dice Remedios en su puesto y cómo acaba la noche.
 * Si quieres que el juego hable con tu voz, este es el archivo que hay que reescribir.
 */

export const WORLD = {
  deceased: 'Amparo',
  place: 'Atrio de la ermita del Carmen',
  night: 'Noche de Difuntos',
  tagline: 'Dieciocho rondas hasta el alba.',
  intro: 'Amparo murió el día de Todos los Santos, a los ochenta y ocho años. Alguien tiene que velarla hasta que amanezca, porque esta noche la Santa Compaña hace la ronda.',
  loop: 'La Noche de Difuntos se repite hasta que alguien la vela entera.'
};

/* Cada hora tiene nombre propio; cada hora son tres rondas. */
export const HOURS = [
  {name: 'Medianoche', mood: 'Noche de Difuntos'},
  {name: 'La una', mood: 'Se oyen pasos en el camino'},
  {name: 'Las dos', mood: 'Sube la marea'},
  {name: 'Las tres', mood: 'La hora de las ánimas'},
  {name: 'Las cuatro', mood: 'Lo más oscuro de la noche'},
  {name: 'Las cinco', mood: 'Viene la Guía'},
  {name: 'Las seis', mood: 'Amanece'}
];

/*
 * Quién vela. stats se suma a las estadísticas base; weapons son las armas con
 * las que puede empezar (se elige una); unlock, cómo se desbloquea.
 */
export const CHARACTERS = {
  lucia: {
    name: 'Lucía', role: 'La nieta', age: '34 años', color: '#e0806b',
    blurb: 'Diez años sin volver al pueblo. Llegó en el último autobús, con la maleta y una culpa que no le cabe en ella.',
    perk: 'Recuerda un 20 % más (más experiencia) · +5 % de velocidad',
    stats: {speed: 5}, special: {xp: 0.2},
    weapons: ['chispas', 'honda', 'navaja'],
    victory: 'Lucía apagó el cirio con dos dedos, como le había enseñado ella. Esta vez no se fue en el primer autobús.',
    defeat: 'Lucía despertó con la cabeza apoyada en el ataúd y el móvil sin batería. No recordaba el final de la noche. Eso fue lo peor.'
  },
  julian: {
    name: 'Julián', role: 'El sepulturero', age: '79 años', color: '#c2a36b',
    blurb: 'Esta tarde cavó la fosa de Amparo y no dejó que nadie le ayudara. La sacó a bailar en las fiestas del cincuenta y cuatro.',
    perk: '+8 de vida · +2 de armadura · +2 cuerpo a cuerpo · −8 % de velocidad',
    stats: {maxHp: 8, armor: 2, melee: 2, speed: -8},
    weapons: ['pala', 'escopeta', 'forcado'],
    victory: 'Julián se sentó en el murete y encendió un cigarro. «Ya puedes regañarme», dijo. Nadie le regañó, y aun así lo apagó a la mitad.',
    defeat: 'Julián despertó en la silla, con el cigarro apagado entre los dedos. «Mañana otra vez», dijo. Y era verdad.'
  },
  matilde: {
    name: 'Matilde', role: 'La rezadora', age: '81 años', color: '#b9a3d9',
    blurb: 'Ha rezado en todos los velatorios del pueblo desde 1961. Amparo le hacía trampas al tute. Es el primero en el que le tiembla la voz.',
    perk: '+3 de regeneración · +2 elemental · −4 de vida',
    stats: {regen: 3, elemental: 2, maxHp: -4},
    weapons: ['rosario', 'agua', 'campanilla'],
    victory: 'Matilde terminó el último misterio. Luego, por primera vez en sesenta años de velatorios, se quedó callada.',
    defeat: 'Matilde despertó con el rosario enredado en los dedos y la boca seca de rezar. Juró que la noche siguiente no se dormiría.'
  },
  tono: {
    name: 'Toño', role: 'El gaiteiro', age: '58 años', color: '#7fb5a0',
    blurb: 'Tocó la alborada en la boda de Amparo y en el bautizo de sus hijos. Ha traído la gaita «por si acaso». Nadie le ha preguntado por si acaso qué.',
    perk: '+12 % de velocidad de ataque · −5 % de daño',
    stats: {attackSpeed: 12, damage: -5},
    weapons: ['gaita', 'pandeireta', 'foguetes'],
    unlock: {round: 6, text: 'Llega a la ronda 6 con cualquiera.'},
    victory: 'Toño tocó la alborada mientras salía el sol. Desafinó en la misma nota que en la boda. Nadie se rió, pero todos sonrieron.',
    defeat: 'Toño despertó abrazado a la gaita, con el fuelle vacío. «Se me fue el aire», dijo. Hablaba de otra cosa.'
  },
  sabela: {
    name: 'Sabela', role: 'La pescantina', age: '46 años', color: '#6fa7d6',
    blurb: 'Vende pescado en la plaza desde los quince. Amparo le compraba sardinas los viernes y le regateaba hasta el último céntimo, por deporte.',
    perk: '+8 de cosecha · +10 de suerte · todo cuesta un 10 % menos · −3 de vida',
    stats: {harvest: 8, luck: 10, maxHp: -3}, special: {discount: 0.1},
    weapons: ['remo', 'arpon', 'vieiras'],
    unlock: {round: 12, text: 'Llega a la ronda 12 con cualquiera.'},
    victory: 'Sabela contó la cera que le había sobrado y se la dejó a Remedios. «Por las sardinas que me debía Amparo», dijo. No le debía ninguna.',
    defeat: 'Sabela despertó con olor a mar en el pelo. Juró que había regateado con la Compaña. Y que había perdido.'
  },
  anselmo: {
    name: 'Don Anselmo', role: 'El párroco', age: '72 años', color: '#d8c27a',
    blurb: 'Lleva cuarenta años de cura en la parroquia y treinta perdiendo al tute con Amparo. Dice que no cree en la Compaña. Ha venido igual.',
    perk: 'Empieza con un cruceiro · lo que construye hiere un 25 % más · +3 de ingenio · −6 % de velocidad',
    stats: {engineering: 3, elemental: 1, speed: -6}, special: {structure: 0.25}, items: ['cruceiro'],
    weapons: ['botafumeiro', 'cirio', 'campanilla'],
    unlock: {wins: 1, text: 'Vela una noche entera hasta el alba.'},
    victory: 'Don Anselmo dijo la misa de difuntos con la voz rota. En el sermón contó que Amparo hacía trampas al tute. La iglesia entera se rió.',
    defeat: 'Don Anselmo despertó en la sacristía con la estola del revés. No dijo nada a nadie. Pero esa noche dejó la luz encendida.'
  }
};

/* Las habilidades de cada cual (tecla R). */
export const ABILITIES = {
  lucia: {name: 'Lumbre', description: 'Un fogonazo del móvil: aturde y hiere a lo que te rodea.'},
  julian: {name: 'Cerco de sal', description: 'Un círculo de sal que frena y hiere durante unos segundos.'},
  matilde: {name: 'Responso', description: 'Recupera un tercio de la vida y aparta a lo que se acerca.'},
  tono: {name: 'Alborada', description: 'Seis segundos de música: atacas y te mueves mucho más deprisa.'},
  sabela: {name: 'Rede', description: 'Lanza una red delante: lo que atrapa se queda quieto un rato.'},
  anselmo: {name: 'Exorcismo', description: 'Acaba con lo que está casi deshecho en toda la pantalla y hiere al resto.'}
};

export const CREATURES = {
  anima: {name: 'Ánima en pena', tag: 'Desde la primera ronda',
    lore: 'Almas que se perdieron por el camino. No quieren hacerte daño: quieren tu calor, y eso duele igual.'},
  hermano: {name: 'Hermano de la Compaña', tag: 'Caminan en fila',
    lore: 'Van en procesión, con un cirio en la mano y la capucha calada. Si cuentas las velas, siempre sobra una.'},
  urco: {name: 'El Urco', tag: 'Embiste',
    lore: 'Un perro negro que sube del mar arrastrando cadenas. Antes de saltar se queda quieto y gruñe: ese es el momento de apartarse.'},
  curuxa: {name: 'La curuxa', tag: 'Vuela y cae en picado',
    lore: 'La lechuza que canta en el tejado de quien se va a morir. Esta semana cantó tres noches en el de Amparo.'},
  planidera: {name: 'Plañidera', tag: 'Llora a distancia',
    lore: 'Las contrataban para llorar en los entierros. Algunas no supieron parar. Sus lágrimas queman: no te quedes quieto.'},
  ahogado: {name: 'Ahogado', tag: 'Lento y duro',
    lore: 'El mar devuelve lo que se lleva, aunque tarde. Vienen chorreando a ver a quién velan esta vez.'},
  trasno: {name: 'El trasno', tag: 'Roba la cera',
    lore: 'Un duende de cocina que esconde las cosas para reírse. Esta noche se come la cera del suelo. Si lo atrapas, la suelta toda.'},
  lavandeira: {name: 'Lavandeira', tag: 'Llama a las ánimas',
    lore: 'Lavan sudarios en el río a medianoche y piden ayuda para escurrirlos. Mientras lavan, las ánimas acuden. No les des la mano.'},
  espantajo: {name: 'El espantajo', tag: 'Enorme',
    lore: 'Lo hizo Ramón, el marido de Amparo, con su chaqueta de los domingos. Cuarenta años vigilando el maizal. Esta noche ha bajado al atrio.'},
  nubeiro: {name: 'Nubeiro', tag: 'Llama al rayo',
    lore: 'Trae las tormentas que tumban el maíz. Señala el suelo antes de que caiga el rayo: si ves el círculo, sal de él.'},
  lobishome: {name: 'Lobishome', tag: 'Embiste dos veces',
    lore: 'El séptimo hijo varón que nadie bautizó con el nombre de Bieito. Los viernes se le alarga la sombra.'},
  guia: {name: 'La Guía', tag: 'La última ronda',
    lore: 'Quien encabeza la Compaña lleva la cruz hasta que otro la coja. Carmela Souto la lleva desde 1963. Esta noche viene a por Amparo.'}
};

/* Los difuntos con nombre: el de cada hora, al final de su tercera ronda. */
export const ELITES = {
  peto: {name: 'El ánima del peto', epitaph: 'Cien años esperando una limosna que nadie echa.'},
  urco: {name: 'El Urco viejo', epitaph: 'Ya subía del mar cuando Julián era un chaval.'},
  lema: {name: 'El hijo de los Lema', epitaph: 'Se lo llevó el mar en el setenta y dos. Esta noche lo devuelve.'},
  curuxa: {name: 'La curuxa del tejado', epitaph: 'Cantó tres noches en el tejado de Amparo.'},
  sobra: {name: 'El que sobra', epitaph: 'Si cuentas las velas de la Compaña, siempre sobra una. Es la suya.'}
};

export const BOSS = {
  name: 'La Guía',
  title: 'Carmela Souto lleva la cruz desde 1963',
  arrive: 'Viene a por Amparo',
  rage: '—¡Que alguien coja la cruz! ¡Que alguien la coja ya!',
  freed: '—¿Ya amanece? Decidle a mi madre que ya voy.'
};

/* La voz de Amparo. Aparece poco, en cursiva, y nunca se explica. */
export const AMPARO = {
  name: 'Amparo',
  lines: [
    '—Abrígate, que de noche refresca.',
    '—¿Has comido algo? Hay caldo.',
    '—No corras tanto, que te vas a caer.',
    '—Tú no te preocupes por mí.',
    '—Si me buscas, estoy en la mecedora.',
    '—Esa puerta, que se cierra sola.',
    '—Y no le compres nada a Remedios, que te engaña.'
  ],
  lowHp: '—Duérmete un poco, que ya velo yo.',
  revive: '—Arriba, que todavía no es de día.',
  dawn: '—Y apaga la luz al salir.'
};

/* Remedios, la curandera, y su puesto entre ronda y ronda. */
export const SHOPKEEPER = {
  name: 'Remedios',
  role: 'La curandera',
  title: 'El puesto de Remedios',
  greet: [
    '—Pasa, pasa. Que la Compaña también descansa.',
    '—¿Otra vez tú? Bien. Eso es que sigues viva.',
    '—Tengo de todo. Lo que no tengo, no hace falta.',
    '—Para el mal de ojo, para el frío y para lo otro.',
    '—Amparo me compraba ruda todas las semanas. Nunca supe para qué.',
    '—No toques sin comprar, que se gasta.'
  ],
  buy: ['—Buena elección. O no. Ya se verá.', '—Eso le gustaba a ella.', '—Te lo envuelvo en papel de periódico.', '—Que te aproveche.'],
  reroll: ['—A ver qué sale ahora…', '—Remuevo el cesto.', '—Más te vale que esta vez te guste.'],
  sell: ['—Te lo cojo, pero pierdo dinero.', '—Esto ya lo tengo visto.'],
  combine: ['—Dos en una. Como los matrimonios de antes.', '—Así pesa más y pega más.'],
  poor: ['—Sin cera no hay remedio, filliña.', '—Fiado no. Que te conozco.'],
  leave: ['—Vete con Dios. Y vuelve.', '—Cuidado con el Urco, que muerde.', '—Si ves a Carmela, dile que me debe una vela.'],
  hour: ['', '—A la una ya andan por el camino.', '—Sube la marea. Ponte algo en los pies.', '—Las tres. Hoy no se reza: se aguanta.', '—Lo más oscuro, filliña. Ya queda menos.', '—Ya viene Carmela con la cruz. Llévate algo bueno.']
};

/*
 * Lo que dice cada uno durante la noche.
 * hourN suena al dar la campana (cada tres rondas). first_* la primera vez que
 * ven a cada criatura. round_end al acabar una ronda difícil.
 */
export const BARKS = {
  lucia: {
    start: ['Vale. Tú y yo, abuela. Hasta que amanezca.', 'Me explicaste mil veces cómo se hacía esto. Nunca te escuché.', 'Decías que en el pueblo ya no quedaba nadie para velar a nadie. Pues aquí estoy.'],
    hour1: 'La una. Doce por ciento de batería y cinco horas de noche. Las cuentas no salen.',
    hour2: 'Las dos. A esta hora tú llevabas un rato dormida. Siempre a las diez, con la radio puesta.',
    hour3: 'Las tres. La hora de las ánimas, decías. Yo me reía. Ya no me río.',
    hour4: 'Las cuatro. Cuatro por ciento. Te estarías riendo de mí, ¿verdad?',
    hour5: 'Las cinco. Ya casi. Aguanta. Aguanto.',
    first_hermano: 'No. No, no, no. Me lo contabas para que no saliera de noche. Era verdad.',
    first_anima: 'Son… velas. Van solas. Pobrecillas.',
    first_urco: 'Un perro negro con cadenas. Claro que sí. Por qué no.',
    first_curuxa: 'La lechuza. Me dijiste por teléfono que cantaba en tu tejado. No te hice caso.',
    first_ahogado: 'Vienen del mar. Están empapados. Vienen… a verte.',
    first_planidera: '¿Quién llora así? Nadie llora así por nadie.',
    first_espantajo: 'Esa chaqueta… es la del abuelo Ramón.',
    first_trasno: '¡Eh! ¡Eso es mío! ¿Me está robando la cera un duende?',
    first_lavandeira: 'Lavan en el pilón. A estas horas. Abuela, ¿esto también me lo contaste?',
    first_nubeiro: 'Tormenta en noviembre. Y el cielo despejado. Genial.',
    first_lobishome: 'Eso es un lobo. Con pantalones. Vale.',
    lowHp: ['No me puedo dormir. No me puedo dormir.', 'Aguanta, Lucía. Aguanta.', 'Abuela, échame una mano, anda.'],
    boss: '¿Carmela? La abuela me habló de una Carmela que se perdió en el monte.',
    stopped: 'El reloj se ha parado. Claro que se ha parado.',
    freed: 'Vete a casa, Carmela. Ya está.',
    dawn: 'Está amaneciendo. Mira, abuela. Mira qué luz.'
  },
  julian: {
    start: ['Bueno, Amparo. La fosa ya está hecha. Ahora, esto.', 'Cincuenta años diciéndome que dejara el tabaco. Y mírate.', 'He enterrado a medio pueblo. Velar es otra cosa.'],
    hour1: 'La una. A esta hora, en las fiestas del cincuenta y cuatro, todavía bailábamos.',
    hour2: 'Las dos. Ramón bailaba mejor. Eso no te lo discuto.',
    hour3: 'Las tres. A esta hora se murió mi padre. Y el tuyo. Mala hora, las tres.',
    hour4: 'Las cuatro. Me duelen las rodillas. No se lo digas a nadie.',
    hour5: 'Las cinco. Ya huele a mar de madrugada. Queda poco, mujer.',
    first_hermano: 'La Compaña. Sabía que vendríais. A esta no os la lleváis.',
    first_anima: 'Ánimas. No muerden. Pero no les des la espalda.',
    first_urco: 'El Urco. Ese perro ya rondaba por aquí cuando yo era un chaval.',
    first_curuxa: 'La curuxa. Siempre llega tarde. Ya está muerta, pájaro.',
    first_ahogado: 'A ese lo conozco. El hijo de los Lema, el del setenta y dos.',
    first_planidera: 'Las de llorar. En mis tiempos se les pagaba con una gallina.',
    first_espantajo: 'El espantajo de Ramón, con su chaqueta de los domingos. Hay que tener cara.',
    first_trasno: 'Un trasno. Mi abuela les dejaba un plato de leche. Yo les dejo esto.',
    first_lavandeira: 'Las lavandeiras. No les ayudes a escurrir, que te parten los brazos.',
    first_nubeiro: 'El nubeiro. Ya decía yo que me dolía la rodilla.',
    first_lobishome: 'El séptimo de los Barreiro. Ya decían que no lo habían bautizado bien.',
    lowHp: ['Todavía no, rediós.', 'No me vas a ver caer, Amparo.', 'Estas rodillas…'],
    boss: 'Carmela. Tres días te buscamos en el monte. Tres días.',
    stopped: 'Se ha parado el reloj de la torre. Ese reloj no se paró ni en la guerra.',
    freed: 'Descansa, Carmela. Ya la llevo yo.',
    dawn: 'Ya clarea. Ya te puedes ir tranquila, mujer.'
  },
  matilde: {
    start: ['Se tenía que morir el día de Todos los Santos. Para fastidiar. Así era ella.', 'Sesenta años rezando en velatorios. Nunca me había temblado la voz.', 'Dios te salve, María… y a ti, Amparo, que buena falta te hace.'],
    hour1: 'La una. Amparo hacía trampas al tute. Que Dios la perdone, porque yo no.',
    hour2: 'Las dos. A estas horas ya nos habíamos bebido el anís de la viuda de Couto.',
    hour3: 'Las tres. Ánimas benditas, dejadla en paz, que bastante tuvo.',
    hour4: 'Las cuatro. Se me duermen los pies. Rezo más deprisa.',
    hour5: 'Las cinco. El último misterio, Amparo. Aguanta tú, que yo aguanto.',
    first_hermano: '¡La Santa Compaña! Pues a esta no os la lleváis, que me debe una partida.',
    first_anima: 'Ánimas del purgatorio. Rezad conmigo, criaturas, que se os pasa el frío.',
    first_urco: '¡Fuera, chucho! ¡Fuera de aquí!',
    first_curuxa: 'La curuxa cantó en tu tejado y yo te dije que no era nada. Mentí.',
    first_ahogado: 'Los del mar. Siempre vienen a mirar. Que se sequen primero.',
    first_planidera: '¡Aficionadas! Así no se llora a nadie.',
    first_espantajo: 'Ramón, hijo, ¿tú también? Si no te gustaban las visitas.',
    first_trasno: '¡Trasno del demonio! ¡Suelta eso, que no es tuyo!',
    first_lavandeira: 'Lavando en domingo. Y en difuntos. Qué falta de respeto.',
    first_nubeiro: 'Santa Bárbara bendita, que en el cielo estás escrita…',
    first_lobishome: 'Ese no lo bautizó don Anselmo. Se nota.',
    lowHp: ['Virgen del Carmen, échame una mano.', 'A mis años, esto.', 'No te me duermas, Matilde.'],
    boss: '¿Carmela? ¡Carmela Souto! ¡Te debo cinco pesetas desde el sesenta y tres!',
    stopped: 'Se ha parado el reloj. Pues yo no me paro.',
    freed: 'Toma, Carmela. Tus cinco pesetas. Ve con Dios.',
    dawn: 'Amanece. Gloria al Padre… y a ti, terca, que lo has conseguido.'
  },
  tono: {
    start: ['Afinada y con el fuelle lleno. Tú tranquila, Amparo, que de aquí no pasa nadie.', 'La última vez que toqué para ti te reíste de mí. Hoy ríete también.', 'Una muiñeira para velar. No sé si se puede. Se va a poder.'],
    hour1: 'La una. En tu boda a esta hora ya me habían invitado a tres orujos.',
    hour2: 'Las dos. Se me empiezan a dormir los dedos. Mala señal.',
    hour3: 'Las tres. Si toco más fuerte, ¿se van? Vamos a probar.',
    hour4: 'Las cuatro. Ni en la romería de San Andrés toqué tanto.',
    hour5: 'Las cinco. La alborada se toca al amanecer. Ya casi.',
    first_hermano: 'Una procesión sin música. Eso no puede ser.',
    first_anima: 'Mira cómo bailan. Algo de oído tienen.',
    first_urco: 'Ese perro no tiene oído. Se le nota en la cara.',
    first_trasno: 'Un trasno. Me desafinaba la gaita de chaval. Ahora entiendo.',
    first_lavandeira: 'Lavandeiras. Les canto una y a ver si se van.',
    first_lobishome: 'A ese lo vi bailar en la verbena. Ya entonces daba miedo.',
    lowHp: ['Me falta el aire…', 'Una nota más. Solo una.', 'Que no se me rompa el fuelle.'],
    boss: 'Carmela Souto. Bailaba la jota como nadie. Qué pena de cruz.',
    stopped: 'El reloj parado. Pues yo sigo con el compás.',
    freed: 'Vete bailando, Carmela.',
    dawn: 'Amanece. Ahora sí: la alborada.'
  },
  sabela: {
    start: ['Muy bien, Amparo. Tú y yo, como los viernes. Pero hoy no regateo.', 'Si la Compaña viene a llevarse algo, que pague.', 'Llevo levantándome a las cuatro desde los quince. Una noche más no me mata.'],
    hour1: 'La una. A esta hora salen los barcos. Los de verdad.',
    hour2: 'Las dos. Sube la marea, y con ella vienen todos los del mar.',
    hour3: 'Las tres. A esta hora se oyen cosas en la lonja que no se cuentan.',
    hour4: 'Las cuatro. Ahora llegarían las cajas de sardina. Hoy llegan otras cosas.',
    hour5: 'Las cinco. Ya huele a puerto. Un poco más.',
    first_ahogado: 'Ese es el de la Paca, el del setenta y nueve. Le debo un saludo.',
    first_urco: 'Este perro me robó un congrio en el ochenta y ocho. Lo reconozco.',
    first_trasno: '¡A mí no me roba nadie la mercancía!',
    first_curuxa: 'Las gaviotas al menos avisan. Esto no.',
    first_nubeiro: 'Temporal. Lo que faltaba.',
    lowHp: ['No me hundo. Yo no me hundo.', 'Agua al cuello, Sabela. Agua al cuello.', 'Esto lo cobro. Lo cobro todo.'],
    boss: 'Carmela Souto. Le vendí besugo para su última Nochebuena.',
    stopped: 'Ni las mareas paran. Este reloj sí. Mal asunto.',
    freed: 'Vete, Carmela. La cuenta queda saldada.',
    dawn: 'Amanece. Mira, Amparo: hoy no hay mercado. Hoy te despido.'
  },
  anselmo: {
    start: ['Requiem aeternam… Bueno, Amparo. Yo no creo en esto. Pero aquí estoy.', 'Cuarenta años de cura y es mi primera Compaña. Habrá que improvisar.', 'Me debes tres partidas de tute. Aguanta, que me las cobro.'],
    hour1: 'La una. A esta hora yo debería estar preparando el sermón.',
    hour2: 'Las dos. El obispado no tiene un protocolo para esto. Lo he buscado.',
    hour3: 'Las tres. La hora nona de la noche. Ahora entiendo por qué.',
    hour4: 'Las cuatro. Señor, si existes, que sea pronto.',
    hour5: 'Las cinco. La Guía. Carmela. La bauticé yo… no, la bautizó don Ramiro. Da igual.',
    first_hermano: 'La Compaña. Y yo diciendo en las homilías que eran cuentos de vieja.',
    first_anima: 'Almas del purgatorio. Os diría una misa, si os quedarais quietas.',
    first_lavandeira: 'Lavando en domingo. Ya hablaremos en confesión.',
    first_lobishome: 'Bieito. Te llamas Bieito. Ya está. ¿No? ¿Nada?',
    first_nubeiro: 'Santa Bárbara, no te olvides de este pobre cura.',
    lowHp: ['Ego te absolvo… a mí mismo, por si acaso.', 'Dios aprieta, pero esto ya es ahogar.', 'Aguanta, Anselmo. Que mañana hay misa.'],
    boss: 'Carmela Souto. Te enterramos sin cuerpo en el sesenta y tres. Dios mío.',
    stopped: 'El reloj de mi torre. Parado. Esto no es la voluntad de nadie.',
    freed: 'Descansa en paz, Carmela. Esta vez de verdad.',
    dawn: 'Amanece. Te debía una misa, Amparo. Te diré tres.'
  }
};

/* Lo que dicen los letreros de la noche. */
export const VIGIL_TEXT = {
  roundStart: 'Ronda',
  roundClear: ['Ronda superada', 'La Compaña se retira un momento'],
  levelUp: '¡Recuerdas algo!',
  horde: ['¡Vienen todas!', 'Una ronda de ánimas te rodea'],
  eliteGone: ['Se marchó con su recordatorio', 'Los difuntos con nombre no esperan'],
  crate: 'Una ofrenda',
  stopped: ['05:59', 'El reloj de la torre se ha parado'],
  dawnBreaks: ['La luz se abre paso', 'La Guía se debilita'],
  revive: ['La medalla del Carmen', 'Te levanta con media vida']
};

/* Lo que se lee al acabar. {quien}, {difunta}, {hora} y {ronda} se rellenan solos. */
export const ENDINGS = {
  dawnTitle: 'Amanece.',
  dawn: '{difunta} se fue con la primera luz, tranquila. La Compaña siguió su camino con una vela menos.',
  firstDawn: '{quien} ha visto amanecer. Carmela Souto, por fin, volvió a casa.',
  laterDawn: 'Carmela Souto volvió a casa.',
  outTitle: 'La vela se apagó a las {hora}.',
  out: 'Ronda {ronda} de dieciocho. La Compaña pasó por delante del velatorio con una luz más.',
  recordDawn: 'Amaneció'
};

export const HELP = [
  ['Moverte', 'WASD o las flechas. En el móvil, arrastra el dedo sobre la pantalla. Con mando, la palanca izquierda.'],
  ['Atacar', 'Es automático: tus armas rodean a quien vela y cada una busca sola lo que tenga a su alcance.'],
  ['Esquivar', 'Espacio. Un salto rápido durante el que nada te toca.'],
  ['Habilidad', 'R. Cada persona tiene la suya: Lumbre, Cerco de sal, Responso, Alborada, Rede o Exorcismo.'],
  ['Las rondas', 'La noche son dieciocho rondas, tres por hora. Aguanta hasta que acabe la cuenta atrás.'],
  ['La cera', 'La Compaña deja caer la cera de sus velas. Sirve para recordar (subir de nivel) y para pagar a Remedios. La que no recojas se funde: en la ronda siguiente, cada gota vale más.'],
  ['Recordar', 'Al subir de nivel ganas +1 de vida. Al acabar la ronda eliges un recuerdo de Amparo por cada nivel: cada uno mejora una estadística.'],
  ['El puesto de Remedios', 'Entre ronda y ronda: compra armas y objetos, vuelve a tirar, guarda con el candado lo que quieras para la próxima vez y vende armas.'],
  ['Juntar armas', 'Dos armas iguales del mismo nivel se juntan en una del siguiente. Hasta seis armas a la vez.'],
  ['Clases', 'Varias armas de la misma clase (Labranza, Caza, Fuego, Sagrado, Mar, Romería) dan un premio.'],
  ['Ofrendas', 'A veces una criatura deja una cesta de ofrenda: al acabar la ronda la abres y decides si te quedas lo que trae.'],
  ['Difuntos con nombre', 'Al final de cada hora viene uno. Si lo vences antes de que acabe la ronda, deja una ofrenda rara.'],
  ['La Guía', 'En la última ronda viene Carmela Souto con la cruz. Hasta que no la liberes, no amanece.'],
  ['Pausa', 'P o Esc. Desde la pausa ves tus estadísticas.']
];
