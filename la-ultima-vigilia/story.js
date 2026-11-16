/*
 * Todo el texto del juego vive aquí: quién es Amparo, quién la vela,
 * qué se recuerda de ella y qué viene a por ella.
 * Si quieres que el juego hable con tu voz, este es el archivo que hay que reescribir.
 */

export const WORLD = {
  deceased: 'Amparo',
  place: 'Camposanto del Carmen',
  night: 'Noche de Difuntos',
  tagline: 'Que no se apague la vela.',
  intro: 'Amparo murió el día de Todos los Santos, a los ochenta y ocho años. Según la costumbre, alguien tiene que velarla hasta que amanezca para que la Santa Compaña no se la lleve.',
  loop: 'La Noche de Difuntos se repite hasta que alguien la vela entera.'
};

/* Cada hora tiene nombre propio. La campana da tantos golpes como marca la hora. */
export const HOURS = [
  {name: 'Medianoche', mood: 'Noche de Difuntos'},
  {name: 'La una', mood: 'Se oyen pasos en el camino'},
  {name: 'Las dos', mood: 'Sube la marea'},
  {name: 'Las tres', mood: 'La hora de las ánimas'},
  {name: 'Las cuatro', mood: 'Lo más oscuro de la noche'},
  {name: 'Las cinco', mood: 'Viene la Guía'},
  {name: 'Las seis', mood: 'Amanece'}
];

export const CHARACTERS = {
  lucia: {
    name: 'Lucía',
    role: 'La nieta',
    age: '34 años',
    blurb: 'Diez años sin volver al pueblo. Llegó en el último autobús, con la maleta y una culpa que no le cabe en ella.',
    perk: 'Recuerda un 25 % más · Su luz llega más lejos: la linterna del móvil',
    weapon: 'chispas',
    start: {chispas: 1},
    hp: 100, speed: 128, light: 1.22, memory: 1.25, armor: 0,
    victory: 'Lucía apagó el cirio con dos dedos, como le había enseñado ella. Esta vez no se fue en el primer autobús.',
    defeat: 'Lucía despertó con la cabeza apoyada en el ataúd y el móvil sin batería. No recordaba el final de la noche. Eso fue lo peor.'
  },
  julian: {
    name: 'Julián',
    role: 'El sepulturero',
    age: '79 años',
    blurb: 'Esta tarde cavó la fosa de Amparo y no dejó que nadie le ayudara. La sacó a bailar en las fiestas del cincuenta y cuatro.',
    perk: 'Escopeta cargada con sal gruesa · Más aguante, menos prisa',
    weapon: 'sal',
    start: {sal: 1},
    hp: 125, speed: 112, light: 1, memory: 1, armor: 0.1,
    victory: 'Julián se sentó en el murete y encendió un cigarro. «Ya puedes regañarme», dijo. Nadie le regañó, y aun así lo apagó a la mitad.',
    defeat: 'Julián despertó en la silla, con el cigarro apagado entre los dedos. «Mañana otra vez», dijo. Y era verdad.'
  },
  matilde: {
    name: 'Matilde',
    role: 'La rezadora',
    age: '81 años',
    blurb: 'Ha rezado en todos los velatorios del pueblo desde 1961. Amparo le hacía trampas al tute. Es el primero en el que le tiembla la voz.',
    perk: 'Empieza con el rosario de nácar · Reza más rápido de lo que anda',
    weapon: 'chispas',
    start: {chispas: 1, rosario: 1},
    hp: 90, speed: 116, light: 1, memory: 1, armor: 0,
    victory: 'Matilde terminó el último misterio. Luego, por primera vez en sesenta años de velatorios, se quedó callada.',
    defeat: 'Matilde despertó con el rosario enredado en los dedos y la boca seca de rezar. Juró que la noche siguiente no se dormiría.'
  }
};

/*
 * Los recuerdos son las mejoras. Cada uno es una cosa concreta de Amparo.
 * kind: 'arma' dispara o golpea por su cuenta; 'recuerdo' cambia cómo velas.
 * fragment se usa para escribir el amanecer con los recuerdos que más elegiste.
 */
export const MEMORIES = [
  {id: 'chispas', kind: 'arma', name: 'Chispas del cirio',
    effect: 'Lanza chispas a lo más cercano. Cada nivel: una chispa más y +15 % de daño.',
    line: 'Encendía el cirio con un solo fósforo. Decía que la segunda cerilla es para los que dudan.',
    fragment: 'la cerilla que nunca le falló'},
  {id: 'sal', kind: 'arma', name: 'Sal gruesa',
    effect: 'Un abanico de sal que hiere y aparta. Cada nivel: un grano más y +20 % de daño.',
    line: 'Si se le caía la sal, echaba un pellizco por encima del hombro. Por si acaso.',
    fragment: 'la sal por encima del hombro'},
  {id: 'rosario', kind: 'arma', name: 'El rosario de nácar',
    effect: 'Cuentas que giran a tu alrededor y golpean. Cada nivel: una cuenta más y más daño.',
    line: 'Le faltaba una cuenta. Nunca quiso cambiarlo.',
    fragment: 'el rosario al que le faltaba una cuenta'},
  {id: 'campana', kind: 'arma', name: 'La campana del Carmen',
    effect: 'Cada pocos segundos, un tañido hiere y aparta lo que te rodea. Cada nivel: más alcance y más a menudo.',
    line: 'Un martes cualquiera tocó a fiesta. Dijo que los martes también se lo merecían.',
    fragment: 'la campana tocando a fiesta un martes'},
  {id: 'farol', kind: 'arma', name: 'El farol del faro',
    effect: 'Tu luz quema: lo que entra en ella arde despacio. Cada nivel: luz más amplia y más calor.',
    line: 'Su padre fue el último farero. Ella le subía la cena: ciento diecisiete escalones.',
    fragment: 'los ciento diecisiete escalones del faro'},
  {id: 'polillas', kind: 'arma', name: 'Las polillas del armario',
    effect: 'Polillas que buscan a las criaturas y las muerden. Cada nivel: una polilla más.',
    line: 'Guardó el vestido de novia con naftalina. Se lo comieron igual. «Tendrían hambre», dijo.',
    fragment: 'el vestido de novia que se comieron las polillas'},
  {id: 'pan', kind: 'recuerdo', name: 'El pan de los jueves',
    effect: 'Recuperas 0,5 de vida por segundo por nivel.',
    line: 'Los jueves olía a pan todo el pueblo. Nadie necesitaba calendario.',
    fragment: 'el olor a pan de los jueves'},
  {id: 'radio', kind: 'recuerdo', name: 'La radio de la cocina',
    effect: 'Atacas un 10 % más rápido por nivel.',
    line: 'Siempre la misma emisora: coplas, el parte del tiempo y las esquelas del domingo.',
    fragment: 'la radio de la cocina, bajita'},
  {id: 'caldo', kind: 'recuerdo', name: 'El caldo de los disgustos',
    effect: '+20 de vida máxima por nivel. Al elegirlo, te cura 30.',
    line: 'Para un resfriado, caldo. Para un desengaño, caldo. Para un entierro, caldo.',
    fragment: 'el caldo para todos los disgustos'},
  {id: 'gafas', kind: 'recuerdo', name: 'Las gafas en la cabeza',
    effect: 'Atraes la luz desde un 35 % más lejos por nivel.',
    line: 'Se pasaba media mañana buscándolas. Las llevaba puestas en la cabeza.',
    fragment: 'las gafas que buscaba llevándolas puestas'},
  {id: 'mecedora', kind: 'recuerdo', name: 'La mecedora',
    effect: 'Esquivas un 15 % más a menudo y te mueves un 5 % más rápido por nivel.',
    line: 'Se mecía para pensar. Decía que pensar quieta da sueño.',
    fragment: 'el crujido de la mecedora'},
  {id: 'fotos', kind: 'recuerdo', name: 'El álbum de fotos',
    effect: 'Recuerdas un 15 % más con cada luz por nivel.',
    line: 'En sus fotos nadie mira a cámara. Decía que así la gente se parece más a sí misma.',
    fragment: 'las fotos en las que nadie mira a cámara'},
  {id: 'risa', kind: 'recuerdo', name: 'Su risa',
    effect: '+7 % de probabilidad por nivel de un golpe certero que hace el doble de daño.',
    line: 'Se reía con todo el cuerpo, como si le hicieran cosquillas por dentro.',
    fragment: 'su risa, que le sacudía los hombros'},
  {id: 'manos', kind: 'recuerdo', name: 'Sus manos frías',
    effect: 'Recibes un 8 % menos de daño por nivel.',
    line: '«Manos frías, corazón caliente», decía. Y te las ponía en la nuca.',
    fragment: 'las manos frías en la nuca'}
];

/* Si ya lo recuerdas todo, la noche aún ofrece esto. */
export const FALLBACK_CHOICES = [
  {id: 'cafe', kind: 'consuelo', name: 'Un café del termo',
    effect: 'Recuperas 35 de vida.',
    line: 'En los velatorios siempre hay un termo de café. Y alguien que pregunta si está recién hecho.'},
  {id: 'silencio', kind: 'consuelo', name: 'Un rato en silencio',
    effect: 'Tu esquiva se recarga al instante.',
    line: 'Hay cosas que no hace falta decir en voz alta.'}
];

export const CREATURES = {
  anima: {name: 'Ánima en pena', tag: 'Desde medianoche',
    lore: 'Almas que se perdieron por el camino. No quieren hacerte daño: quieren tu calor, y eso duele igual.'},
  hermano: {name: 'Hermano de la Compaña', tag: 'Caminan en fila',
    lore: 'Van en procesión, con un cirio en la mano y la capucha calada. Si cuentas las velas, siempre sobra una.'},
  urco: {name: 'El Urco', tag: 'Desde la una · Embiste',
    lore: 'Un perro negro que sube del mar arrastrando cadenas. Antes de saltar se queda quieto y gruñe: ese es el momento de apartarse.'},
  curuxa: {name: 'La curuxa', tag: 'Desde la una y media · Vuela',
    lore: 'La lechuza que canta en el tejado de quien se va a morir. Esta semana cantó tres noches en el de Amparo.'},
  ahogado: {name: 'Ahogado', tag: 'Desde las dos · Lento',
    lore: 'El mar devuelve lo que se lleva, aunque tarde. Vienen chorreando a ver a quién velan esta vez.'},
  planidera: {name: 'Plañidera', tag: 'Desde las dos y media · A distancia',
    lore: 'Las contrataban para llorar en los entierros. Algunas no supieron parar. Sus lágrimas queman: no te quedes quieto.'},
  espantajo: {name: 'El espantajo', tag: 'Desde las cuatro · Enorme',
    lore: 'Lo hizo Ramón, el marido de Amparo, con su chaqueta de los domingos. Cuarenta años vigilando el maizal. Esta noche ha bajado al camposanto.'},
  guia: {name: 'La Guía', tag: 'A las cinco',
    lore: 'Quien encabeza la Compaña lleva la cruz hasta que otro la coja. Carmela Souto la lleva desde 1963. Esta noche viene a por Amparo.'}
};

export const BOSS = {
  name: 'La Guía',
  title: 'Carmela Souto lleva la cruz desde 1963',
  arrive: 'Viene a por Amparo',
  reach: '—Ven, Amparo, que se hace tarde.',
  rage: '—¡Que alguien coja la cruz! ¡Que alguien la coja ya!',
  freed: '—¿Ya amanece? Decidle a mi madre que ya voy.',
  took: 'Carmela posó la mano sobre el ataúd. La Compaña siguió su camino con una luz más.'
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
    '—Esa puerta, que se cierra sola.'
  ],
  lowHp: '—Duérmete un poco, que ya velo yo.',
  dawn: '—Y apaga la luz al salir.'
};

/*
 * Lo que dice cada uno durante la noche.
 * hourN suena al dar la campana. first_* la primera vez que ven a cada criatura.
 * memory_* al elegir ese recuerdo (no todos los recuerdos tienen frase para todos).
 */
export const BARKS = {
  lucia: {
    start: [
      'Vale. Tú y yo, abuela. Hasta que amanezca.',
      'Me explicaste mil veces cómo se hacía esto. Nunca te escuché.',
      'Decías que en el pueblo ya no quedaba nadie para velar a nadie. Pues aquí estoy.'
    ],
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
    lowHp: ['No me puedo dormir. No me puedo dormir.', 'Aguanta, Lucía. Aguanta.', 'Abuela, échame una mano, anda.'],
    boss: '¿Carmela? La abuela me habló de una Carmela que se perdió en el monte.',
    stopped: 'El reloj se ha parado. Claro que se ha parado.',
    freed: 'Vete a casa, Carmela. Ya está.',
    dawn: 'Está amaneciendo. Mira, abuela. Mira qué luz.',
    memory_rosario: 'Fui yo. Me tragué yo la cuenta. Nunca te lo dije.',
    memory_pan: 'Los jueves olía a pan hasta en el autobús.',
    memory_fotos: 'En todas salgo de espaldas. Ahora entiendo por qué.',
    memory_radio: 'Todavía me sé la sintonía del parte.',
    memory_gafas: 'Llevo tus gafas en el bolso. No sé por qué las cogí.',
    memory_farol: 'Nunca subí al faro contigo. Siempre había algo más importante.'
  },
  julian: {
    start: [
      'Bueno, Amparo. La fosa ya está hecha. Ahora, esto.',
      'Cincuenta años diciéndome que dejara el tabaco. Y mírate.',
      'He enterrado a medio pueblo. Velar es otra cosa.'
    ],
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
    lowHp: ['Todavía no, rediós.', 'No me vas a ver caer, Amparo.', 'Estas rodillas…'],
    boss: 'Carmela. Tres días te buscamos en el monte. Tres días.',
    stopped: 'Se ha parado el reloj de la torre. Ese reloj no se paró ni en la guerra.',
    freed: 'Descansa, Carmela. Ya la llevo yo.',
    dawn: 'Ya clarea. Ya te puedes ir tranquila, mujer.',
    memory_pan: 'Los jueves me guardaba una barra. Hasta el último jueves.',
    memory_risa: 'Esa risa. Le sacudía los hombros.',
    memory_manos: 'Manos frías, corazón caliente. Me las ponía en la nuca para fastidiarme.',
    memory_mecedora: 'La mecedora se la arreglé yo. Tres veces.',
    memory_caldo: 'Cuando lo de mi Pilar me trajo caldo. Sin decir nada. Solo caldo.',
    memory_sal: 'Sal del economato. Lo mejor contra lo que no tiene cuerpo.'
  },
  matilde: {
    start: [
      'Se tenía que morir el día de Todos los Santos. Para fastidiar. Así era ella.',
      'Sesenta años rezando en velatorios. Nunca me había temblado la voz.',
      'Dios te salve, María… y a ti, Amparo, que buena falta te hace.'
    ],
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
    lowHp: ['Virgen del Carmen, échame una mano.', 'A mis años, esto.', 'No te me duermas, Matilde.'],
    boss: '¿Carmela? ¡Carmela Souto! ¡Te debo cinco pesetas desde el sesenta y tres!',
    stopped: 'Se ha parado el reloj. Pues yo no me paro.',
    freed: 'Toma, Carmela. Tus cinco pesetas. Ve con Dios.',
    dawn: 'Amanece. Gloria al Padre… y a ti, terca, que lo has conseguido.',
    memory_rosario: 'Ese rosario se lo regalé yo. Y la cuenta no se la tragó nadie: la perdió jugando al tute.',
    memory_radio: 'La copla esa la cantaba fatal. Fatal. Pero entera.',
    memory_fotos: 'En todas sale con los ojos cerrados. Decía que era para rezar.',
    memory_risa: 'Se reía en misa. En misa, Amparo.',
    memory_gafas: 'Las gafas en la cabeza. Mil veces te lo dije: mírate en el espejo.',
    memory_campana: 'La del martes fue ella. El cura todavía no lo sabe.'
  }
};

export const ABILITIES = {
  lucia: {id: 'lumbre', name: 'Lumbre', description: 'Aparta a las criaturas con una ráfaga de fuego y atrae la luz cercana.'},
  julian: {id: 'cerco', name: 'Cerco de sal', description: 'Aparta a las criaturas y deja un cerco que las frena y las hiere durante unos segundos.'},
  matilde: {id: 'responso', name: 'Responso', description: 'Recupera vida, aparta a las criaturas y retrasa a la Guía si está cerca.'}
};

export const RITES = {
  labels: {oeste: 'Farol de la cancela', norte: 'Farol del cruceiro', este: 'Farol del mar'},
  mapTitle: 'El velatorio', mapCount: 'Faroles', pointer: 'Farol',
  introduction: {title: 'Tres faroles contra la noche', sub: 'Detente junto a un farol para encenderlo. Alza tu luz con E.'},
  completed: 'Su luz te protege; tu habilidad vuelve antes.',
  allLit: {title: 'El camino sigue encendido', sub: 'Tres luces acompañan la vigilia de Amparo.'}
};

export const HELP = [
  ['Moverte', 'WASD o las flechas. En el móvil, arrastra el dedo sobre la pantalla.'],
  ['Atacar', 'Es automático: tus armas buscan solas lo que tengas más cerca.'],
  ['Esquivar', 'Espacio. Durante el salto nada te toca. Tiene unos segundos de recarga.'],
  ['Alzar la luz', 'E o el botón de tu habilidad. Cada persona vela de otra manera: Lumbre, Cerco de sal o Responso. Aparta amenazas y disipa proyectiles cercanos; después necesita recargarse.'],
  ['Los tres faroles', 'Son opcionales. Detente 3,6 segundos junto a uno para encenderlo. Si te hieren, se interrumpe; al alejarte, el progreso se pierde despacio. Cada farol cura, devuelve luz para recordar, frena a las criaturas cercanas y reduce la recarga de tu habilidad.'],
  ['El mapa', 'El mapa del camposanto señala tu posición, el ataúd de Amparo, los faroles y la Guía. Las flechas del borde te ayudan a encontrar lo que queda fuera de la vista.'],
  ['Recordar', 'Recoge la luz que dejan las criaturas. Cada recuerdo de Amparo es una mejora: elige uno de tres.'],
  ['La luz', 'Si estás herido, tu luz se encoge. Junto al ataúd de Amparo te recuperas.'],
  ['Las cinco', 'Llega la Guía y va directa al ataúd. No dejes que se la lleve.'],
  ['Pausa', 'P o Esc.']
];
