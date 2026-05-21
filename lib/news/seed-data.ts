import type { NewsCategoryKey } from "./categories";

/**
 * Lote semilla de noticias SEO — solo contenido meta/analítico verificable
 * (formato del torneo, sedes oficiales FIFA, grupos confirmados tras el
 * sorteo del 5 de diciembre de 2025, previa del partido inaugural y guía
 * del producto). Toda la información concreta — fechas, sedes, grupos,
 * cuotas — ha sido cotejada con fuentes oficiales (FIFA.com, Wikipedia,
 * RotoWire para cuotas, fuentes de prensa).
 *
 * Las noticias dependientes de datos volátiles (convocatorias,
 * alineaciones, lesiones de última hora) NO se siembran aquí — se
 * redactan caso a caso desde una sesión, tras investigar fuentes
 * actualizadas, y se publican desde el admin.
 */

export type SeedArticle = {
  slug: string;
  title: string;
  seoTitle?: string;
  excerpt: string;
  body: string;
  category: NewsCategoryKey;
  tags: string[];
  relatedTeamCodes: string[];
  /** Días atrás respecto a hoy. 0 = hoy, 1 = ayer, etc. */
  daysAgo: number;
};

export const SEED_NEWS: SeedArticle[] = [
  // ─────────────────────────── CONVOCATORIAS (verificadas mayo 2026) ───────────────────────────
  {
    slug: "convocatoria-bosnia-herzegovina-mundial-2026-dzeko",
    title:
      "Convocatoria de Bosnia y Herzegovina: Edin Džeko, capitán a los 40, lidera la primera lista del Mundial 2026",
    seoTitle: "Convocatoria Bosnia Mundial 2026 · Lista de Sergej Barbarez",
    excerpt:
      "Bosnia y Herzegovina fue la primera selección europea en publicar su lista de 26 para el Mundial 2026. Edin Džeko, a sus 40 años, vuelve como capitán bajo la dirección de Sergej Barbarez.",
    category: "convocatoria",
    tags: ["Bosnia", "Edin Džeko", "Sergej Barbarez", "Mundial 2026"],
    relatedTeamCodes: ["BIH"],
    daysAgo: 8,
    body: `**Bosnia y Herzegovina** se adelantó a todas las federaciones europeas y, el **11 de mayo de 2026**, se convirtió en la **primera selección de la UEFA en confirmar su lista de 26 jugadores** para el Mundial 2026. El seleccionador **Sergej Barbarez** apostó por un grupo que combina experiencia y juventud, con un veterano absoluto al frente: **Edin Džeko**, capitán a sus **40 años**.

## Džeko, capitán y bandera

El delantero del **Schalke 04** disputará su primer Mundial. Bosnia clasificó por primera vez en su historia a Brasil 2014, donde quedó eliminada en fase de grupos; ahora, doce años después, regresa al máximo escenario con Džeko aún liderando el ataque. Es el máximo goleador histórico de la selección y, con 40 años, llega como referente generacional.

## El núcleo del equipo

Más allá de Džeko, la lista de Barbarez se sostiene sobre tres pilares:

- **Defensa**: **Sead Kolašinac** (con experiencia europea), **Amar Dedić** (Benfica) y **Nikola Katić** marcan la línea atrás. El portero titular será **Nikola Vasilj** (Hamburgo).
- **Centro del campo**: doble pivote con **Benjamin Tahirović** (Ajax) y **Armin Gigović** (Spartak Moscú). **Amir Hadžiahmetović** (Beşiktaş) aporta visión.
- **Ataque**: con Džeko acompañado por **Ermedin Demirović** (VfB Stuttgart) y **Haris Tabaković** (Borussia Mönchengladbach). El joven **Samed Baždar** (Jagiellonia) entra como refresco.

Puedes ver la plantilla completa con dorsales y posiciones en la [ficha de Bosnia y Herzegovina](/equipos/BIH).

## El Grupo B y el calendario

Bosnia comparte el **Grupo B** con tres rivales que no permiten dormirse: **Canadá** (anfitriona), **Catar** (con la mano de Julen Lopetegui en el banquillo) y **Suiza** (un clásico de las eliminatorias europeas). El **debut está fijado para el 12 de junio en Toronto**, frente al anfitrión canadiense.

Mira la [composición completa del Grupo B](/grupos) y el [calendario del torneo](/calendario) para no perderte ningún partido.

## Lo que está en juego

Bosnia llega como cuarto cabeza de bombo 2 más alto, lo que la convierte en una candidata real al segundo puesto del grupo y a colarse entre los **8 mejores terceros** que pasan a dieciseisavos en este nuevo formato a 48 selecciones. Para una federación que volvió a clasificar a un Mundial **12 años después de su único antecedente**, el listón no es ganar — es competir hasta el último partido de grupos.

Si quieres predecir cuánto le da Bosnia para llegar a octavos en tu quiniela, [crea tu cuenta gratis](/login?next=%2Fonboarding) y arma tu bracket antes del 11 de junio.`,
  },
  {
    slug: "convocatoria-suecia-mundial-2026-potter-isak-gyokeres",
    title:
      "Convocatoria de Suecia para el Mundial 2026: Isak y Gyökeres lideran la lista de Graham Potter",
    seoTitle: "Convocatoria Suecia Mundial 2026 · Lista de Graham Potter",
    excerpt:
      "Bajo la dirección del inglés Graham Potter, Suecia presentó su lista de 26 para el Mundial 2026 con Alexander Isak y Viktor Gyökeres como punta de lanza. Ausencias polémicas: Hugo Larsson y Roony Bardghji.",
    category: "convocatoria",
    tags: ["Suecia", "Alexander Isak", "Viktor Gyökeres", "Graham Potter"],
    relatedTeamCodes: ["SWE"],
    daysAgo: 7,
    body: `**Suecia** entregó el **12 de mayo de 2026** su lista de 26 jugadores para el Mundial 2026. Su seleccionador, el inglés **Graham Potter** — fichado por la Federación Sueca tras su experiencia en Brighton, Chelsea y West Ham —, optó por un grupo encabezado por **Alexander Isak** (Liverpool) y **Viktor Gyökeres** (Arsenal), dos de los delanteros más en forma de Europa.

## La pareja goleadora del momento

Pocos equipos del Mundial llevan dos '9' del nivel actual de Suecia:

- **Alexander Isak**, recién traspasado al Liverpool, viene de una temporada explosiva en la Premier League. A los 26 años, llega al Mundial en su techo físico y de confianza.
- **Viktor Gyökeres**, fichaje del Arsenal el verano pasado, fue máximo goleador del Sporting CP antes de dar el salto a Inglaterra. Letal de espaldas, perfil más físico que Isak.

La duda de Potter: jugarán juntos o se alternarán. En las clasificatorias el inglés probó el dos-puntas con buenos resultados. Es probable que repita en el Mundial.

## El núcleo del equipo

Suecia apuesta por un esquema con piezas conocidas:

- **Portería**: **Viktor Johansson** (Birmingham) como titular.
- **Defensa**: **Victor Lindelöf** (Manchester United) y **Isak Hien** (Atalanta) son los referentes. **Gabriel Gudmundsson** (Leeds) en banda izquierda.
- **Mediocampo**: **Lucas Bergvall** (Tottenham, 20 años) es el joven a seguir. **Mattias Svanberg** (Wolfsburg) y **Hjalmar Ekdal** completan el centro.
- **Banda**: **Anthony Elanga** (Newcastle) por la derecha. **Yasin Ayari** (Brighton) como recambio.

La plantilla completa con dorsales está en la [ficha de Suecia](/equipos/SWE).

## Las ausencias polémicas

Potter dejó fuera a dos nombres que parte de la prensa daba por seguros:

- **Hugo Larsson** (Eintracht Frankfurt): el joven mediocentro era favorito a titular, pero quedó descartado en la última semana.
- **Roony Bardghji** (Barcelona): el extremo de 19 años no entró pese a sus primeros minutos con el primer equipo culé.

Algunas crónicas en Suecia calificaron las decisiones como conservadoras — *cobarde*, llegó a leerse en un editorial — y echaron en falta apuestas más jóvenes.

## El Grupo F y el debut

Suecia integra el **Grupo F** junto a **Países Bajos** (cabeza de serie), **Japón** y **Túnez**. El **debut será el 14 de junio frente a Túnez** en el **Estadio BBVA de Monterrey**.

Mira la [composición del Grupo F](/grupos) y el [calendario del torneo](/calendario) para los horarios completos.

## Lo que está en juego

Suecia **no jugaba un Mundial desde 2018**, donde llegó a cuartos. La era post-Ibrahimović se cerró sin remplazo durante años; ahora, con Isak y Gyökeres en su mejor versión y con Potter como técnico, los suecos llegan con la lectura colectiva de "ahora o nunca". Su gran reto: superar a **Países Bajos** por el primer puesto del grupo, o exprimir al máximo el cruce con **Japón** para asegurar mínimo el tercer puesto y el pase como mejor tercero.

Si quieres predecir hasta dónde llega Suecia, [crea tu quiniela gratis](/login?next=%2Fonboarding) y arma tu bracket antes del 11 de junio.`,
  },
  {
    slug: "convocatoria-austria-mundial-2026-rangnick-alaba",
    title:
      "Convocatoria de Austria: Rangnick devuelve a Alaba y Arnautović al Mundial 28 años después",
    seoTitle: "Convocatoria Austria Mundial 2026 · Lista de Ralf Rangnick",
    excerpt:
      "Austria vuelve a un Mundial 28 años después con David Alaba como capitán, Marko Arnautović como referencia ofensiva y Ralf Rangnick al mando. Comparte grupo con Argentina.",
    category: "convocatoria",
    tags: ["Austria", "Ralf Rangnick", "David Alaba", "Marko Arnautović"],
    relatedTeamCodes: ["AUT"],
    daysAgo: 6,
    body: `**Austria** vuelve a un Mundial **28 años después** de Francia 1998 y lo hace de la mejor forma posible: con **Ralf Rangnick** dirigiendo, **David Alaba** como capitán y un grupo de jugadores en activo en cinco de las grandes ligas europeas. La lista oficial de 26 se hizo pública entre el 17 y el 18 de mayo de 2026.

## Rangnick, la pieza clave

El nombre del seleccionador es probablemente la mejor noticia para los aficionados austríacos. **Ralf Rangnick** — padre intelectual del *gegenpressing* moderno y ex técnico de RB Leipzig, Manchester United y otros — firmó por Austria en 2022 y desde entonces ha transformado por completo a *Das Team*. Su sello: presión alta, salida limpia desde atrás y verticalidad inmediata. El resultado: una **Eurocopa 2024 con paso a octavos como líder de grupo** por delante de Francia y Países Bajos.

## El espinazo del equipo

La lista de Rangnick combina experiencia veterana con jugadores en activo en clubes top:

- **Portería**: **Alexander Schlager** (LASK) como titular.
- **Defensa**: el capitán **David Alaba** (Real Madrid, 33 años) y **Kevin Danso** (Tottenham). Stefan Posch y Phillipp Mwene completan la línea.
- **Mediocampo**: el corazón del equipo. **Marcel Sabitzer** (Borussia Dortmund), **Konrad Laimer** (Bayern Múnich), **Nicolas Seiwald** (RB Leipzig) y el regreso del experimentado **Xaver Schlager** dan presión y volumen. **Christoph Baumgartner** (RB Leipzig) y el joven **Paul Wanner** (Cesión a Heidenheim/Real Madrid) son las cartas creativas.
- **Ataque**: **Marko Arnautović** (Estrella Roja Belgrado, 37 años) sigue siendo el referente del área. **Michael Gregoritsch** (Friburgo) y **Saša Kalajdžić** (Hoffenheim) completan el tridente de '9'.

Mira la lista completa con dorsales en la [ficha de Austria](/equipos/AUT).

## El Grupo J y el cruce con Argentina

Austria está en el **Grupo J** junto a **Argentina** (vigente campeona), **Argelia** y **Jordania**. El sorteo no fue benévolo: pelear el segundo puesto del grupo es realista, pero requiere puntuar ante una potencia que defiende título.

El **debut es el miércoles 17 de junio frente a Jordania**. Después llega Argentina y, para cerrar la fase, Argelia. Mira la [composición del Grupo J](/grupos) y el [calendario del torneo](/calendario).

## Lo que está en juego

Para una federación que **lleva 28 años fuera de un Mundial**, el mero hecho de clasificar ya fue éxito. Pero con Rangnick al mando, la generación 1990-1995 (Alaba, Arnautović, Sabitzer) en su última oportunidad y los jóvenes como Laimer y Wanner asomando, **Austria llega para competir**. El objetivo realista: pasar como segunda y, en dieciseisavos, jugar libre de presión contra un rival potente.

Si quieres predecir hasta dónde llega Austria en tu quiniela, [crea tu cuenta gratis](/login?next=%2Fonboarding) y compite con tus amigos.`,
  },
  {
    slug: "convocatoria-francia-mundial-2026-deschamps-mbappe",
    title:
      "Convocatoria de Francia: Mbappé al frente, Dembélé como Balón de Oro y la ausencia de Camavinga",
    seoTitle: "Convocatoria Francia Mundial 2026 · Lista de Didier Deschamps",
    excerpt:
      "Didier Deschamps presentó la lista oficial de 26 para el Mundial 2026 sin prelista de 55. Mbappé sigue como capitán, Dembélé como Balón de Oro vigente y Eduardo Camavinga es la gran ausencia.",
    category: "convocatoria",
    tags: ["Francia", "Mbappé", "Dembélé", "Deschamps", "Camavinga"],
    relatedTeamCodes: ["FRA"],
    daysAgo: 5,
    body: `**Francia** anunció el **14 de mayo de 2026** la lista oficial de 26 jugadores para el Mundial 2026. **Didier Deschamps** rompió con la tradición — no hubo prelista de 55 — y publicó directamente a los 26 elegidos. **Kylian Mbappé** sigue como capitán y **Ousmane Dembélé** llega como **Balón de Oro vigente**. La gran ausencia: **Eduardo Camavinga**.

## Mbappé sigue siendo el eje

A sus **27 años**, Mbappé vive su mejor momento futbolístico tras una primera temporada completa en el Real Madrid coronada con título de Liga. Llega al Mundial como capitán, referencia ofensiva absoluta y favorito a la **Bota de Oro 2026** según las casas de apuestas.

## Dembélé, el Balón de Oro

**Ousmane Dembélé** llega al Mundial **como Balón de Oro en activo**, premio que conquistó tras una temporada brillante con el PSG. Para Francia, tener a un Balón de Oro en activo es un argumento más para entrar al torneo entre las cuatro favoritas — junto con Argentina, España y Brasil.

## El núcleo del equipo

La lista mezcla campeones de Qatar 2022 con apuestas jóvenes:

- **Portería**: **Mike Maignan** (Milan), **Brice Samba** (Rennes/Lens) y **Robin Risser** (Estrasburgo). Maignan parte como #1 a pesar de llevar el dorsal 16 — Samba es la sorpresa.
- **Defensa**: **William Saliba** (Arsenal), **Dayot Upamecano** (Bayern), **Ibrahima Konaté** (Liverpool) y **Jules Koundé** (Barcelona) forman el cuerpo central más sólido del torneo. Lucas Hernández y Théo Hernandez en banda izquierda; Malo Gusto en la derecha.
- **Mediocampo**: **Aurélien Tchouaméni** (Real Madrid) como mediocentro defensivo, **Adrien Rabiot** (AC Milan), **Warren Zaïre-Emery** (PSG) y un veteranísimo **N'Golo Kanté** (Fenerbahçe). **Manu Koné** (Roma) es la apuesta de equilibrio.
- **Ataque**: además de Mbappé y Dembélé, Deschamps lleva a **Michael Olise** (Bayern), **Désiré Doué** (PSG), **Bradley Barcola** (PSG), **Rayan Cherki** (Manchester City) y **Marcus Thuram** (Inter). Jean-Philippe Mateta cierra el lote como '9' de área.

Mira la lista completa con dorsales en la [ficha de Francia](/equipos/FRA).

## La gran ausencia: Camavinga

**Eduardo Camavinga** se queda fuera del Mundial pese a ser titular asiduo del Real Madrid en otras temporadas. Deschamps explicó la decisión en rueda de prensa: *"sale de una temporada difícil en la que ha jugado menos y ha tenido lesiones"*. Es la sorpresa negativa de la lista. Su sitio lo ocupa **Manu Koné**, perfil más posicional que técnico.

## El Grupo I y el cruce con Haaland

Francia cayó en uno de los grupos más mediáticos del torneo: el **Grupo I** junto a **Senegal**, **Irak** y, sobre todo, **Noruega** — es decir, **Erling Haaland**. El cruce Mbappé vs Haaland en fase de grupos es el plato fuerte del primer fin de semana del Mundial.

Mira la [composición del Grupo I](/grupos) y el [calendario del torneo](/calendario).

## Lo que está en juego

Francia tiene **dos cuentas pendientes**: la **final perdida de Qatar 2022** y los **cuartos de Euro 2024**. Con la plantilla más profunda del torneo en ataque y la línea defensiva más cualificada, parten como una de las cuatro favoritas al título. El reto histórico: lograr lo que solo Italia (1934-38) y Brasil (1958-62) han conseguido — *no*, defender un título no, eso lo intenta Argentina —, sino **levantar el segundo Mundial en tres ediciones** tras 2018.

Para predecir si Francia llega a la final del MetLife, [crea tu quiniela gratis](/login?next=%2Fonboarding).`,
  },
  {
    slug: "convocatoria-nueva-zelanda-mundial-2026-chris-wood-bazeley",
    title:
      "Convocatoria de Nueva Zelanda: Chris Wood y Tommy Smith repiten Mundial 16 años después",
    seoTitle: "Convocatoria Nueva Zelanda Mundial 2026 · Lista de Darren Bazeley",
    excerpt:
      "Darren Bazeley presenta la lista de 26 de los All Whites para el Mundial 2026. Chris Wood y Tommy Smith se convierten en los primeros neozelandeses en disputar dos Mundiales.",
    category: "convocatoria",
    tags: ["Nueva Zelanda", "Chris Wood", "Darren Bazeley", "All Whites"],
    relatedTeamCodes: ["NZL"],
    daysAgo: 5,
    body: `**Nueva Zelanda** anunció el **14 de mayo de 2026** la convocatoria oficial de 26 jugadores para el Mundial 2026 desde Auckland. El seleccionador **Darren Bazeley** se saltó la prelista ampliada y fue directamente a la lista definitiva. La gran historia: **Chris Wood y Tommy Smith** se convierten en los **primeros neozelandeses de la historia en disputar dos Mundiales** — fueron parte de la generación de Sudáfrica 2010.

## Chris Wood, capitán y referencia

El delantero del **Nottingham Forest** llega como **capitán** y goleador absoluto de los *All Whites*. Pese a una temporada en la Premier League marcada por **lesiones recurrentes**, Wood sigue siendo la principal amenaza ofensiva del equipo. A sus 34 años, es muy probable que sea su último Mundial.

## Tommy Smith, el récord más curioso

El defensa **Tommy Smith** (36 años) llega al Mundial militando en un club de la **quinta división inglesa**. Es uno de los datos más llamativos del torneo: un seleccionado mundialista que juega en la National League South. Su valor en la selección es por experiencia y por liderazgo de vestuario — fue capitán de Nueva Zelanda durante años antes de pasar el brazalete a Wood.

## El núcleo del equipo

La plantilla mezcla jugadores en ligas competitivas:

- **Portería**: **Max Crocombe** (Burton Albion) parte como titular. Le acompañan **Alex Paulsen** (Bournemouth, joven a seguir) y **Michael Woud**.
- **Defensa**: **Michael Boxall** (Minnesota United, MLS), **Finn Surman** y **Tyler Bindon** (Reading). **Liberato Cacace** (Empoli) en banda izquierda.
- **Mediocampo**: **Joe Bell** (Auckland FC), **Marko Stamenić** (FCSB) y **Matthew Garbett** (NAC Breda). El veterano **Alex Rufer** (Wellington Phoenix) aporta jerarquía.
- **Ataque**: además de Wood, **Elijah Just** (Aarhus), **Ben Old** (Saint-Étienne), **Ben Waine** y **Kosta Barbarouses** (Auckland FC).

Mira la lista completa con dorsales en la [ficha de Nueva Zelanda](/equipos/NZL).

## El Grupo G: el sorteo más duro de la OFC

A Nueva Zelanda le tocó uno de los grupos más exigentes del bombo 4: el **Grupo G** junto a **Bélgica** (con De Bruyne, Lukaku y Courtois), **Egipto** (con Salah) e **Irán**. Tres rivales con plantillas europeas muy superiores al promedio de bombo 1-2.

Mira la [composición del Grupo G](/grupos) y el [calendario del torneo](/calendario).

## Lo que está en juego

Nueva Zelanda **no gana un partido en un Mundial desde 1982** (cuando ni siquiera era el formato actual de Copa). En **Sudáfrica 2010** firmaron uno de los hitos más curiosos de la historia: **fueron el único equipo invicto del torneo** (tres empates) pero quedaron eliminados en fase de grupos. La hazaña de los *All Whites* es ahora intentar **ganar su primer partido oficial** en un Mundial moderno.

Realismo: el grupo es muy exigente. Pero el formato a 48 abre la puerta a que un tercero con 3-4 puntos pase a dieciseisavos. Ese es el objetivo realista de Bazeley.

Para predecir si los *All Whites* dan la sorpresa, [crea tu quiniela gratis](/login?next=%2Fonboarding) y arma tu bracket antes del 11 de junio.`,
  },
  {
    slug: "convocatoria-belgica-mundial-2026-rudi-garcia-de-bruyne",
    title:
      "Convocatoria de Bélgica: Rudi García deja a Tielemans la capitanía y arma una lista con De Bruyne, Lukaku y Courtois",
    seoTitle: "Convocatoria Bélgica Mundial 2026 · Lista de Rudi García",
    excerpt:
      "Rudi García anunció la lista oficial de 26 de Bélgica para el Mundial 2026. Tielemans sustituye a De Bruyne como capitán y los *Diables Rouges* llegan con la última oportunidad de su generación dorada.",
    category: "convocatoria",
    tags: ["Bélgica", "Rudi García", "De Bruyne", "Lukaku", "Courtois", "Tielemans"],
    relatedTeamCodes: ["BEL"],
    daysAgo: 4,
    body: `**Bélgica** publicó el **15 de mayo de 2026** la lista de 26 jugadores para el Mundial 2026. El seleccionador francés **Rudi García** — que tomó las riendas de los *Diables Rouges* en enero de 2025 tras la salida de Domenico Tedesco — presentó una convocatoria con dos noticias: la **continuidad de la generación dorada** (Courtois, De Bruyne, Lukaku, Doku) y el **cambio de capitán**: **Youri Tielemans** toma el brazalete.

## El cambio de capitán

La gran noticia política de la convocatoria es que **Kevin De Bruyne deja de ser capitán** de Bélgica. El centrocampista del Nápoles, brazalete histórico tras la retirada de Eden Hazard, cede el liderazgo a **Youri Tielemans** (Aston Villa). Rudi García explicó la decisión como un movimiento técnico — Tielemans tiene más presencia vocal en vestuario — y De Bruyne lo asumió sin polémica.

## El núcleo dorado, una vez más

Bélgica llega a su **tercer Mundial consecutivo** con el núcleo de la generación que llegó a semifinales en Rusia 2018 todavía en activo:

- **Portería**: **Thibaut Courtois** (Real Madrid). El portero de los últimos diez años de la *Roja*. **Senne Lammens** (Manchester United) y **Mike Penders** (Estrasburgo) cierran el trío.
- **Defensa**: **Timothy Castagne** (Fulham), **Thomas Meunier**, **Koni De Winter** (Genoa) y **Joaquin Seys** (Brujas). La zona más débil del equipo según la prensa belga.
- **Mediocampo**: **Kevin De Bruyne** (Nápoles) sigue siendo el organizador. **Youri Tielemans** como capitán, **Amadou Onana** (Aston Villa) como motor, **Nicolas Raskin** (Rangers), **Hans Vanaken** (Brujas) y **Charles De Ketelaere** (Atalanta) completan la rotación.
- **Ataque**: **Romelu Lukaku** (Nápoles) como '9', **Jérémy Doku** (Manchester City), **Leandro Trossard** (Arsenal), **Dodi Lukébakio** (Benfica) y **Alexis Saelemaekers** (Milan). Cierran **Matias Fernández-Pardo** (Lille) y **Diego Moreira** (Estrasburgo) como las apuestas jóvenes.

Mira la lista completa con dorsales en la [ficha de Bélgica](/equipos/BEL).

## El Grupo G y el cruce con Salah

A Bélgica le tocó el **Grupo G** junto a **Egipto** (Mohamed Salah es el gran reclamo del cruce), **Irán** y **Nueva Zelanda**. El sorteo es razonablemente benévolo — Bélgica parte como favorita clara al primer puesto, pero el cruce con Egipto puede ser una piedra en el zapato si los *Faraones* mantienen el nivel mostrado en las eliminatorias.

Mira la [composición del Grupo G](/grupos) y el [calendario del torneo](/calendario).

## La última oportunidad de una generación

Bélgica llega al Mundial **probablemente la última con su generación dorada al completo**. Courtois (33), De Bruyne (35), Lukaku (33), Witsel (ausente esta vez por edad)… los nombres que llevaron a los *Diables* a semifinales en 2018 y cuartos en 2022 están en el final del ciclo. **2026 es su última bala**.

El reto: superar los **cuartos** de Qatar (perdieron en fase de grupos en 2022 pero la generación dorada llegó a cuartos en Brasil 2014 y semifinales en Rusia 2018). Si Bélgica vuelve a quedarse en cuartos, el ciclo se cerrará sin el premio mayor.

Para predecir si los *Diables Rouges* llegan por fin a una final, [crea tu quiniela gratis](/login?next=%2Fonboarding).`,
  },
  {
    slug: "convocatoria-japon-mundial-2026-moriyasu-kubo-mitoma-lesion",
    title:
      "Convocatoria de Japón para el Mundial 2026: Moriyasu pierde a Mitoma y Minamino por lesión",
    seoTitle: "Convocatoria Japón Mundial 2026 · Lista de Moriyasu sin Mitoma",
    excerpt:
      "Hajime Moriyasu publicó la lista de 26 de Japón para el Mundial 2026 con dos bajas dolorosas por lesión: Kaoru Mitoma y Takumi Minamino. Takefusa Kubo asume el liderazgo creativo.",
    category: "convocatoria",
    tags: ["Japón", "Kaoru Mitoma", "Takefusa Kubo", "Moriyasu", "Lesión"],
    relatedTeamCodes: ["JPN"],
    daysAgo: 4,
    body: `**Japón** publicó el **15 de mayo de 2026** su lista oficial de 26 jugadores para el Mundial 2026. El seleccionador **Hajime Moriyasu** — que repite Mundial tras Qatar 2022 — recibió el anuncio entre lágrimas: dos de sus estrellas, **Kaoru Mitoma** (Brighton) y **Takumi Minamino** (Mónaco), se quedan fuera por lesión. **Takefusa Kubo** (Real Sociedad) hereda el liderazgo creativo.

## Las dos bajas que duelen

La semana anterior al anuncio, **Mitoma sufrió una lesión muscular en el isquiotibial** durante el partido del Brighton contra el Wolves. El parte médico cerró cualquier posibilidad de llegar a tiempo al Mundial. **Minamino**, por su parte, arrastraba una lesión previa y no logró recuperarse.

Moriyasu, en su rueda de prensa, no pudo contener la emoción: *"Es un golpe enorme para nosotros, y la lesión de Kaoru es simplemente triste"*. La decisión también limita el plan táctico del seleccionador: Mitoma era la principal salida por banda izquierda y Minamino su comodín entre líneas.

## Kubo, el nuevo eje

Sin Mitoma, **Takefusa Kubo** (Real Sociedad) asume todo el peso creativo. El extremo de 24 años llega a su segundo Mundial — fue parte de la generación de Qatar — pero esta vez como referencia indiscutible. Su forma con la Real Sociedad ha sido sobresaliente y muchas crónicas asiáticas hablan de "una selección de Kubo".

## El núcleo del equipo

- **Portería**: **Zion Suzuki** (Parma) sigue como titular tras un buen año en la Serie A. **Keisuke Ōsako** (Hiroshima) y **Tomoki Hayakawa** completan.
- **Defensa**: **Takehiro Tomiyasu** (Arsenal) y **Ko Itakura** (Borussia Mönchengladbach) lideran la zaga. El veterano absoluto: **Yuto Nagatomo**, **39 años**, capitán de su quinta participación mundialista, lateral del FC Tokyo.
- **Mediocampo**: **Wataru Endo** (Liverpool) ancla el centro del campo. **Daichi Kamada** (Crystal Palace), **Ritsu Dōan** (Friburgo) y **Ao Tanaka** (Leeds) aportan creación y llegada.
- **Ataque**: además de Kubo, **Junya Itō** (Stade de Reims), **Ayase Ueda** (Feyenoord) y **Daizen Maeda** (Celtic). Kōki Ogawa y el joven Keisuke Gotō completan.

Mira la lista completa con dorsales en la [ficha de Japón](/equipos/JPN).

## El Grupo F y el calendario

Japón está en el **Grupo F** junto a **Países Bajos**, **Suecia** y **Túnez**. Quizá el grupo más equilibrado del Mundial: los neerlandeses parten como favoritos, pero los suecos (Isak + Gyökeres), los japoneses (Kubo) y los tunecinos (defensa férrea) son rivales con argumentos.

Mira la [composición del Grupo F](/grupos) y el [calendario del torneo](/calendario).

## Lo que está en juego

Japón **superó por primera vez en Qatar 2022** la fase de grupos como **líder** (ganó a Alemania y España), pero cayó en octavos contra Croacia en penaltis. Esta vez, el reto declarado por la federación japonesa es **llegar a cuartos** — algo que nunca ha hecho ninguna selección asiática (Corea del Sur 2002 fue semifinalista como anfitriona).

Para predecir si Japón rompe la barrera de octavos, [crea tu quiniela gratis](/login?next=%2Fonboarding) y compite con tus amigos.`,
  },
  {
    slug: "convocatoria-haiti-mundial-2026-migne-52-anos-despues",
    title:
      "Convocatoria de Haití para el Mundial 2026: Sébastien Migné convoca a una selección de la diáspora 52 años después",
    seoTitle: "Convocatoria Haití Mundial 2026 · Lista de Sébastien Migné",
    excerpt:
      "Haití vuelve a un Mundial 52 años después con una plantilla de 26 jugadores casi íntegramente formada fuera del país. Sébastien Migné apuesta por Wilson Isidor, Bellegarde y la veteranía de Johny Placide.",
    category: "convocatoria",
    tags: ["Haití", "Sébastien Migné", "Wilson Isidor", "Diáspora"],
    relatedTeamCodes: ["HAI"],
    daysAgo: 4,
    body: `**Haití** publicó el **15 de mayo de 2026** su lista de 26 jugadores para el Mundial 2026, su primera participación en una Copa del Mundo **desde Alemania 1974** — 52 años de ausencia. El seleccionador francés **Sébastien Migné** apostó por la continuidad: 22 de los 26 convocados son los que llevaron a *Les Grenadiers* a clasificar tras una eliminatoria épica en CONCACAF.

## Una selección de la diáspora

El dato más llamativo de la convocatoria de Migné: **solo un jugador milita en Haití**. Es **Woodensky Pierre** (Violette Athletic Club). Los otros 25 se formaron y juegan en clubes de Francia, Bélgica, Inglaterra, Portugal, Estados Unidos y Canadá. Es la lista más "diáspora" del Mundial — un retrato del fútbol haitiano contemporáneo, marcado por la inestabilidad política, la emigración y el papel decisivo de los entrenadores franceses como nexo con Europa.

## El capitán: Johny Placide

El portero **Johny Placide** (39 años) lleva el brazalete. Es el jugador con más partidos con la selección y un símbolo de continuidad — debutó en 2010, en plena reconstrucción del país tras el terremoto.

## El núcleo del equipo

- **Portería**: además de Placide, **Alexandre Pierre** y **Josué Duverger**. Trío experimentado.
- **Defensa**: **Ricardo Adé** (Avs Futebol SAD), **Hannes Delcroix** (Anderlecht), **Carlens Arcus** (Auxerre, con una destacada temporada en Ligue 1) y **Jean-Kévin Duverne** (Brest). La zaga combina ligas francesas con belga y portuguesa.
- **Mediocampo**: el corazón del equipo es **Jean-Ricner Bellegarde** (Wolverhampton, Premier League). Le acompañan **Danley Jean Jacques** y **Carl Sainté**.
- **Ataque**: **Wilson Isidor** (Sunderland) es la principal noticia ofensiva. **Derrick Etienne Jr.** (Columbus Crew), **Frantzdy Pierrot**, **Duckens Nazon** y **Ruben Providence** (Spezia) completan la zona.

Mira la lista completa con dorsales en la [ficha de Haití](/equipos/HAI).

## Wilson Isidor, la historia del Mundial

**Wilson Isidor** es la historia personal más interesante de la convocatoria. **Cambió su lealtad de Francia a Haití** en marzo de 2026, apenas dos meses antes del anuncio de la lista. Llegó tras una temporada en el **Sunderland** con **6 goles en la Premier League** y debutó con los *Grenadiers* marcando contra Islandia en su segundo partido. A sus 25 años, es la principal apuesta goleadora de Migné.

## El Grupo C: el sorteo más duro

A Haití le tocó probablemente el grupo más exigente del Mundial: el **Grupo C** junto a **Brasil**, **Marruecos** (semifinalista en Qatar 2022) y **Escocia**. Tres rivales con ranking superior y experiencia europea. El **debut será el 13 de junio en Boston frente a Escocia** — el partido más realista para puntuar.

Mira la [composición del Grupo C](/grupos) y el [calendario del torneo](/calendario).

## Lo que está en juego

Migné fue claro al presentar la lista: **el objetivo es meterse como mínimo en eliminatorias**. Para Haití, una victoria o un empate ya sería gesta. **En 1974, en su único Mundial, perdió los tres partidos** (frente a Italia, Polonia y Argentina). Esta vez, con jugadores formados en Europa y una generación más fuerte, la apuesta es competir.

El reto realista: ganar a Escocia el 13 de junio. Si lo logran, los ocho mejores terceros del formato a 48 son una vía concreta.

Para predecir si Haití da la sorpresa, [crea tu quiniela gratis](/login?next=%2Fonboarding) y arma tu bracket antes del 11 de junio.`,
  },
  {
    slug: "convocatoria-costa-marfil-mundial-2026-emerse-fae-kessie",
    title:
      "Convocatoria de Costa de Marfil: Emerse Faé lleva al campeón de África al Mundial 12 años después",
    seoTitle: "Convocatoria Costa de Marfil Mundial 2026 · Lista de Emerse Faé",
    excerpt:
      "Los Elefantes de Costa de Marfil vuelven al Mundial 12 años después como campeones de África. Emerse Faé convoca a Franck Kessié como capitán y a Nicolas Pépé, Amad Diallo y la sorpresa Ange-Yoan Bonny.",
    category: "convocatoria",
    tags: [
      "Costa de Marfil",
      "Emerse Faé",
      "Franck Kessié",
      "Nicolas Pépé",
      "AFCON 2023",
    ],
    relatedTeamCodes: ["CIV"],
    daysAgo: 4,
    body: `**Costa de Marfil** anunció el **15 de mayo de 2026** la lista de 26 jugadores para el Mundial 2026 — su **regreso al máximo escenario 12 años después** de Brasil 2014. El seleccionador **Emerse Faé**, héroe de la **Copa Africana de Naciones 2023** (que ganaron como anfitriones tras una eliminatoria de infarto), apostó por su núcleo de campeones del continente.

## Faé, el técnico de la AFCON

La historia de **Emerse Faé** es ya leyenda en Costa de Marfil. **Asumió la selección durante el AFCON 2023** tras la destitución de Jean-Louis Gasset en plena fase de grupos. Los *Elefantes*, eliminados sobre el papel, se rehicieron a su mando, ganaron el cruce de octavos por penaltis a Senegal y se proclamaron campeones del continente en la final ante Nigeria. Faé pasó de asistente a técnico campeón en menos de tres semanas y firmó su renovación como seleccionador para el Mundial.

## Kessié, capitán y referencia

El centrocampista **Franck Kessié** (Al-Ahli, antes Barça y Milan) sigue como **capitán**. A sus 29 años, es el jugador más influyente del equipo y el principal organizador. Su nivel en Arabia Saudí no ha hecho perder protagonismo a su rol con la selección.

## El núcleo del equipo

La plantilla mezcla campeones de África con apuestas europeas:

- **Portería**: **Yahia Fofana** (Angers), **Alban Lafont** (Nantes) y **Mohamed Koné**. Trío sólido con bagaje en Ligue 1.
- **Defensa**: **Wilfried Singo** (Mónaco), **Evan Ndicka** (Roma) y **Odilon Kossounou** (Atalanta) componen una de las zagas más físicas del Mundial. **Ghislain Konan** y **Emmanuel Agbadou** completan.
- **Mediocampo**: además de Kessié, **Seko Fofana** (Al-Nassr), **Jean Michaël Seri** (Galatasaray) y **Ibrahim Sangaré** (Nottingham Forest). El joven **Christ Inao Oulaï** llega como apuesta de futuro.
- **Ataque**: **Nicolas Pépé** (Villarreal) sigue siendo la principal referencia ofensiva por la derecha. **Amad Diallo** (Manchester United) por la izquierda — su gran salto del último año en la Premier. **Simon Adingra** (Brighton), **Elye Wahi** (Frankfurt) y **Evann Guessand** (Niza) completan el ataque.

Mira la lista completa con dorsales en la [ficha de Costa de Marfil](/equipos/CIV).

## La sorpresa: Ange-Yoan Bonny

El delantero del **Inter de Milán** decidió defender a Costa de Marfil **horas antes del cierre del plazo FIFA**. Bonny había representado a Francia en categorías inferiores y la federación francesa lo seguía con atención, pero el jugador eligió al país de origen de sus padres. Es la mayor noticia del último cierre de listas: un '9' joven con minutos en Champions que va al Mundial con los *Elefantes*.

## El Grupo E y el calendario

A Costa de Marfil le tocó el **Grupo E** junto a **Alemania**, **Curazao** (debut absoluto en un Mundial) y **Ecuador**. Un sorteo razonablemente bueno: Curazao es el rival más débil del bombo 3 y Ecuador, aunque competitivo, no está al nivel de los grandes sudamericanos.

Mira la [composición del Grupo E](/grupos) y el [calendario del torneo](/calendario).

## Lo que está en juego

Costa de Marfil **nunca ha pasado de la fase de grupos** en sus tres participaciones previas (2006, 2010, 2014) — y eso a pesar de tener generaciones brillantes con Drogba, Yaya Touré o Kalou. La generación actual, **campeona africana en activo**, tiene la oportunidad histórica de **romper la maldición de fase de grupos**. El objetivo no es ya estar — es pasar.

Para predecir hasta dónde llegan los *Elefantes*, [crea tu quiniela gratis](/login?next=%2Fonboarding).`,
  },
  {
    slug: "convocatoria-tunez-mundial-2026-lamouchi-khedira",
    title:
      "Convocatoria de Túnez: Sabri Lamouchi estrena ciclo en el Mundial 2026 con Rani Khedira como novedad",
    seoTitle: "Convocatoria Túnez Mundial 2026 · Lista de Sabri Lamouchi",
    excerpt:
      "Túnez disputa su séptimo Mundial — tercero consecutivo — con un nuevo seleccionador (Sabri Lamouchi) y una novedad llamativa: Rani Khedira, hermano del campeón mundial 2014, debutó hace meses con los *Águilas de Cartago*.",
    category: "convocatoria",
    tags: ["Túnez", "Sabri Lamouchi", "Rani Khedira", "Ellyes Skhiri"],
    relatedTeamCodes: ["TUN"],
    daysAgo: 4,
    body: `**Túnez** confirmó el **15 de mayo de 2026** su lista de 26 jugadores para el Mundial 2026 — su **séptima participación, tercera consecutiva**. El **nuevo seleccionador Sabri Lamouchi** (que asumió en enero, tras la destitución de Sami Trabelsi después de la eliminación en octavos del AFCON 2025) firmó una lista con peso de ligas europeas y una novedad llamativa: **Rani Khedira**.

## Lamouchi, ciclo nuevo

El nombramiento de **Sabri Lamouchi** en enero de 2026 fue casi una emergencia: Trabelsi salió tras la eliminación frente a Costa de Marfil en octavos de la Copa de África. Lamouchi, ex internacional francés con pasado en banquillos de Costa de Marfil y Stade Rennais, llegó con apenas cinco meses para preparar el Mundial. Su lista refleja el contexto: continuidad con el núcleo de Qatar 2022 más alguna incorporación.

## La novedad: Rani Khedira

El centrocampista del **Union Berlin** llegó a Túnez por una ruta curiosa. **Rani Khedira** es hermano de **Sami Khedira**, campeón del mundo con **Alemania en Brasil 2014**. Madre tunecina, padre alemán; Rani había rechazado durante años las llamadas tunecinas y prefirió jugar en categorías inferiores con Alemania. En **marzo de 2026 cambió de federación** ante FIFA y debutó con los *Águilas de Cartago* en un amistoso. Llega al Mundial con apenas tres meses de experiencia internacional con su nuevo equipo, pero su jerarquía en la Bundesliga lo coloca como pieza clave del centro del campo.

## El núcleo del equipo

- **Portería**: **Aymen Dahmen** (Sivasspor), **Sabri Ben Hessen** y **Mouhib Chamakh** componen el trío.
- **Defensa**: la zona más sólida de Túnez históricamente. **Montassar Talbi** (Lorient), **Dylan Bronn** (Saint-Étienne) y **Yan Valery** (Angers). **Ali Abdi** (Caen) en banda izquierda.
- **Mediocampo**: **Ellyes Skhiri** (Eintracht Frankfurt) es el cerebro, acompañado por **Rani Khedira** (Union Berlin) y el joven **Hannibal Mejbri** (Burnley, con pasado en el Manchester United). **Anis Ben Slimane** (Sheffield United) y **Elias Achouri** completan.
- **Ataque**: **Ismaël Gharbi** (Braga, ex PSG), **Hazem Mastouri** (cantera local) y **Elias Saad** (Lecce). **Sebastian Tounekti** (Hammarby) es la apuesta joven.

Mira la lista completa con dorsales en la [ficha de Túnez](/equipos/TUN).

## Las ausencias importantes

Lamouchi tomó dos decisiones polémicas:

- **Ferjani Sassi**, capitán histórico durante una década, queda fuera de la lista.
- **Yassine Meriah**, defensor titular en Qatar 2022, tampoco entra.

Ambas decisiones se interpretan como un mensaje de Lamouchi de cierre de ciclo con la generación de 2018-2022.

## El Grupo F y el debut

Túnez está en el **Grupo F** junto a **Países Bajos** (cabeza de serie), **Japón** y **Suecia**. Un sorteo exigente — los tres rivales son técnica y físicamente superiores en plantilla — pero también un grupo donde la **defensa férrea tunecina** puede dar problemas. Las clasificatorias africanas las cerraron **sin recibir gol en sus últimos cinco partidos**.

Mira la [composición del Grupo F](/grupos) y el [calendario del torneo](/calendario).

## Lo que está en juego

Túnez **nunca ha pasado la fase de grupos** en seis Mundiales previos (1978, 1998, 2002, 2006, 2018, 2022). Su mejor recuerdo: **vencer a Francia 1-0 en Qatar 2022** pese a quedar eliminados. Esta vez, con Lamouchi recién aterrizado, el objetivo realista es **competir hasta el último partido de grupos** y aprovechar el formato a 48 para entrar como mejor tercero.

Para predecir si Túnez rompe por fin la barrera de octavos, [crea tu quiniela gratis](/login?next=%2Fonboarding).`,
  },
  {
    slug: "convocatoria-brasil-mundial-2026-ancelotti-neymar",
    title:
      "Convocatoria de Brasil: Ancelotti incluye a Neymar y deja fuera a João Pedro del Chelsea",
    seoTitle: "Convocatoria Brasil Mundial 2026 · Lista de Carlo Ancelotti",
    excerpt:
      "Carlo Ancelotti, primer seleccionador europeo en la historia de Brasil, presentó la lista de 26 para el Mundial 2026. La gran sorpresa: vuelve Neymar y queda fuera João Pedro.",
    category: "convocatoria",
    tags: ["Brasil", "Ancelotti", "Neymar", "Vinicius", "Endrick"],
    relatedTeamCodes: ["BRA"],
    daysAgo: 1,
    body: `**Brasil** publicó el **18 de mayo de 2026** la lista de 26 jugadores para el Mundial 2026. El seleccionador **Carlo Ancelotti** — primer técnico europeo en dirigir a la *Canarinha* en un Mundial — confirmó la noticia más esperada: **Neymar Jr.** vuelve a una Copa del Mundo, su **cuarta** (2014, 2018, 2022, 2026). La sorpresa negativa: **João Pedro**, delantero del Chelsea, queda fuera.

## Ancelotti, el primer europeo

El italiano tomó las riendas de Brasil en mayo de 2025 tras dejar el Real Madrid. La CBF buscaba un nombre que combinara prestigio internacional, dominio de varios idiomas (seis de sus titulares juegan en Europa) y una idea de juego no ideologizada. Su sello: equipos que ganan títulos. En sus partidos al frente de Brasil, ha apostado por un 4-3-3 con Casemiro como ancla, Bruno Guimarães + Paquetá como interiores, y el tridente Vinicius–Endrick–Raphinha.

## Neymar vuelve

La inclusión de **Neymar Jr.** (Santos) era el suspense del último mes. Después de una grave lesión en octubre de 2023 y un calendario errático, Neymar había sido convocado solo dos veces por Ancelotti hasta abril, y su minutos eran de gestión más que de rendimiento. Pero los últimos partidos con Santos cambiaron la decisión del técnico: el '10' viajará al Mundial, probablemente como recurso desde el banquillo más que como titular fijo.

## El núcleo del equipo

La lista combina campeones de Qatar con apuestas jóvenes:

- **Portería**: **Alisson** (Liverpool) como titular, **Ederson** (Manchester City) y **Weverton** (Palmeiras).
- **Defensa**: **Marquinhos** (PSG) y **Gabriel Magalhães** (Arsenal) son la pareja central de referencia. **Bremer** (Juventus), **Léo Pereira** (Flamengo) y **Roger Ibañez** (Al-Ahli) completan. **Alex Sandro** y **Douglas Santos** en banda izquierda; **Danilo Luiz** y **Wesley** (Roma) en la derecha.
- **Mediocampo**: **Casemiro** (Manchester United) como '6', **Bruno Guimarães** (Newcastle) y **Lucas Paquetá** (West Ham) como interiores. **Fabinho** (Al-Ittihad) y **Danilo Santos** (Botafogo) completan la rotación.
- **Ataque**: **Vinicius Júnior** (Real Madrid), **Raphinha** (Barcelona), **Matheus Cunha** (Manchester United), **Gabriel Martinelli** (Arsenal), **Endrick** (Lyon, cedido del Real Madrid), **Igor Thiago** (Brentford), **Luiz Henrique** (Zenit) y **Rayan** (Bournemouth). Más, claro, **Neymar**.

Mira la lista completa con dorsales en la [ficha de Brasil](/equipos/BRA).

## La gran ausencia: João Pedro

**João Pedro** (Chelsea), delantero brasileño que Ancelotti había convocado en cinco listas previas, queda fuera por la inclusión de Neymar. Es la decisión más polémica de la convocatoria. Las casas inglesas tasan a João Pedro en **120 millones de euros** y suma 16 goles esta temporada en la Premier — pero Ancelotti ha priorizado experiencia mundialista.

## El Grupo C y el calendario

Brasil cayó en uno de los grupos más complicados del bombo 1: el **Grupo C** junto a **Marruecos** (semifinalista en Qatar 2022), **Escocia** y **Haití**. El **debut será el sábado 13 de junio frente a Marruecos** — un partido que arranca con la carga simbólica de no repetir el sufrimiento de Qatar contra rivales africanos.

Mira la [composición del Grupo C](/grupos) y el [calendario del torneo](/calendario).

## Lo que está en juego

Brasil **lleva 24 años sin levantar la Copa** (su último título es Corea-Japón 2002). Cinco eliminaciones consecutivas en cuartos o antes pesan en el ánimo de la afición. Con Ancelotti, **Vinicius en su techo** y una generación talentosa de cantera (Endrick, Estêvão, Rayan), llegan con la obligación de competir hasta semifinales como mínimo.

Para predecir si Brasil regresa a una final 24 años después, [crea tu quiniela gratis](/login?next=%2Fonboarding).`,
  },
  {
    slug: "convocatoria-escocia-mundial-2026-steve-clarke-craig-gordon",
    title:
      "Convocatoria de Escocia: vuelve a un Mundial 28 años después con Craig Gordon a los 43 y McTominay como bandera",
    seoTitle: "Convocatoria Escocia Mundial 2026 · Lista de Steve Clarke",
    excerpt:
      "Escocia regresa a un Mundial 28 años después de Francia 1998. Steve Clarke convoca a Craig Gordon, portero de 43 años, y se apoya en Scott McTominay, John McGinn y Andy Robertson.",
    category: "convocatoria",
    tags: [
      "Escocia",
      "Steve Clarke",
      "Scott McTominay",
      "John McGinn",
      "Craig Gordon",
      "Andy Robertson",
    ],
    relatedTeamCodes: ["SCO"],
    daysAgo: 1,
    body: `**Escocia** anunció el **19 de mayo de 2026** la lista oficial de 26 jugadores para el Mundial 2026 — su **regreso al máximo escenario 28 años después** de Francia 1998, la racha de ausencias mundialistas más larga de su historia moderna. El seleccionador es **Steve Clarke**, que dirige a la *Tartan Army* desde 2019 y arrastra el mérito de haber clasificado al equipo a dos Eurocopas seguidas (2020 y 2024) antes de cerrar el círculo con el Mundial.

## Craig Gordon, el portero histórico

La novedad más comentada de la convocatoria es **Craig Gordon** (Hearts), que con **43 años** disputará su primer y casi seguramente único Mundial. Es uno de los **jugadores más veteranos en pisar un Mundial** en toda la historia — solo por detrás de Essam El-Hadary, el portero egipcio que jugó Rusia 2018 a los 45, y prácticamente empatado con Faryd Mondragón (Colombia, 43 años en 2014).

Gordon llega como **tercer portero** detrás de **Angus Gunn** (Norwich City) y **Liam Kelly** (Motherwell). Clarke decidió premiar la trayectoria del histórico y, también, el síntoma de un equipo en el que los veteranos tiran del grupo.

## McTominay, McGinn y el núcleo Premier-Serie A

El equipo se sostiene sobre tres ejes principales:

- **Scott McTominay** (Napoli): probablemente el jugador escocés en mejor momento del mundo. Tras su traspaso del Manchester United al Nápoles en verano 2024, ha crecido hasta convertirse en mediocentro determinante de la *Squadra* campeona del Scudetto. Sus llegadas al área dan a Escocia un perfil de gol que llevaba años sin tener.
- **John McGinn** (Aston Villa): capitán emocional. Llega al Mundial en pleno tramo final de su Aston Villa, candidato a la **Europa League**. Su capacidad de romper líneas en transición es la base del 3-4-2-1 de Clarke.
- **Andy Robertson** (Liverpool): el lateral izquierdo más conocido del fútbol mundial sigue siendo el referente defensivo. Capitán histórico, lleva las cuentas mundialistas de una generación que llegó tarde a la cita.

## El núcleo del equipo

- **Portería**: Gunn titular; Liam Kelly como suplente; Craig Gordon como tercero (récord).
- **Defensa**: **Kieran Tierney** (Arsenal/Real Sociedad), **Andy Robertson** y **Anthony Ralston** (Celtic) en banda. Los centrales **Grant Hanley** (Norwich), **Jack Hendry** (Al-Ettifaq), **John Souttar** (Rangers), **Scott McKenna** (Las Palmas) y **Aaron Hickey** (Brentford). **Nathan Patterson** (Everton) como lateral derecho ofensivo.
- **Mediocampo**: McTominay y McGinn como ejes. **Billy Gilmour** (Brighton, ex Chelsea) aporta paso de balón; **Ryan Christie** (Bournemouth), **Lewis Ferguson** (Bologna, capitán del equipo italiano), **Kenny McLean** (Norwich) y el joven **Ben Gannon-Doak** (Bournemouth) completan la rotación.
- **Ataque**: **Lyndon Dykes** (QPR) como '9' físico, **Ché Adams** (Torino), **Lawrence Shankland** (Hearts, **20 goles** esta temporada en la Scottish Premiership), **George Hirst** (Ipswich) y **Ross Stewart** (Southampton, 11 goles este curso). El joven **Findlay Curtis** (Rangers, 19 años) viaja como sorpresa: hace seis meses jugaba en sub-21 y entra como apuesta de futuro.

Mira la lista completa con dorsales en la [ficha de Escocia](/equipos/SCO).

## El Grupo C y el calendario

A Escocia le tocó el **Grupo C** junto a **Brasil** (cabeza de serie), **Marruecos** (semifinalista en Qatar 2022) y **Haití**. Sorteo exigente: Brasil parte como favorita clara al primer puesto y Marruecos como segundo bombo de máximo nivel. El partido contra **Haití** se convierte en el "match-de-la-vida" del grupo — el más asequible y donde Escocia tiene que sumar sí o sí si quiere soñar con dieciseisavos.

- **Domingo 14 de junio** · Escocia vs **Haití** · debut en Boston (Gillette Stadium)
- **Viernes 19 de junio** · Escocia vs **Marruecos**
- **Miércoles 24 de junio** · Escocia vs **Brasil**

Mira la [composición del Grupo C](/grupos) y el [calendario del torneo](/calendario).

## Lo que está en juego

Escocia **nunca ha superado la fase de grupos** en sus ocho participaciones mundialistas previas (1954, 1958, 1974, 1978, 1982, 1986, 1990, 1998). Es la selección con **más participaciones sin pasar de la primera ronda** en toda la historia del torneo. Para Steve Clarke y esta generación — McTominay 29, McGinn 31, Robertson 32 — superar la barrera sería un acto fundacional para el fútbol escocés moderno.

El formato a 48 selecciones ayuda: los **ocho mejores terceros** pasan a dieciseisavos. Con cuatro puntos en tres partidos — ganar a Haití y sacar un empate ante Marruecos —, Escocia ya entraría como mejor tercero. Es la cuenta que Clarke lleva apuntada desde el sorteo.

Si quieres predecir hasta dónde llega la *Tartan Army*, [crea tu quiniela gratis](/login?next=%2Fonboarding) y arma tu bracket antes del 11 de junio.`,
  },
  {
    slug: "convocatoria-corea-sur-mundial-2026-hong-myung-bo-son",
    title:
      "Convocatoria de Corea del Sur: Hong Myung-bo apuesta por Son y un récord histórico con Jens Castrop",
    seoTitle: "Convocatoria Corea del Sur Mundial 2026 · Lista de Hong Myung-bo",
    excerpt:
      "Corea del Sur anuncia su lista para el Mundial 2026. Son Heung-min capitanea, Hong Myung-bo dirige desde el banquillo y Jens Castrop hace historia como primer jugador mixto-naturalizado convocado a un Mundial.",
    category: "convocatoria",
    tags: [
      "Corea del Sur",
      "Son Heung-min",
      "Hong Myung-bo",
      "Jens Castrop",
      "Kim Min-jae",
      "Lee Kang-in",
    ],
    relatedTeamCodes: ["KOR"],
    daysAgo: 4,
    body: `**Corea del Sur** publicó el **16 de mayo de 2026** la lista oficial de 26 jugadores para el Mundial 2026. El seleccionador es **Hong Myung-bo**, leyenda nacional reciclado en técnico que dirige a los *Taegeuk Warriors* desde julio de 2024 — y la convocatoria tiene **dos titulares**: **Son Heung-min** como capitán y referente absoluto, y **Jens Castrop** como el primer jugador de herencia mixta nacido fuera de Corea en una lista mundialista del país.

## Hong Myung-bo, del capitán de 2002 al técnico de 2026

La historia personal del seleccionador es ya parte del relato del equipo. **Hong Myung-bo fue capitán** de aquella Corea del Sur que llegó a **semifinales en 2002** como anfitriona — el mejor resultado mundialista en la historia del fútbol asiático. Tras un primer paso por el banquillo en 2013-14 (Brasil 2014), volvió a la selección en **julio de 2024** tras la destitución de Jürgen Klinsmann por la decepción de la Copa de Asia 2024. En menos de dos años ha encajado un equipo competitivo y llega al Mundial con la legitimidad que solo da haber estado en el césped en el partido más importante de tu país.

## Son Heung-min, capitán desde Los Ángeles

El delantero **Son Heung-min** (33 años) llega al Mundial 2026 como capitán y máxima estrella. La gran novedad respecto a Qatar 2022: ya **no juega en Tottenham**. En agosto de 2025 firmó por **Los Angeles FC (MLS)**, en uno de los traspasos asiáticos más relevantes del año, y desde allí ha mantenido un nivel sólido como '9' del equipo californiano.

Es muy probable que sea su **último Mundial** — a los 33, Son llega en gran momento físico pero con una transición de calendario MLS que el cuerpo técnico está vigilando: el campeonato estadounidense es más físico de lo que parece y el calendario de partidos no encaja bien con las ventanas FIFA.

## La historia de Jens Castrop: primer mixto-naturalizado coreano

La sorpresa de la lista — y probablemente la mejor noticia del análisis — es la inclusión de **Jens Castrop** (Borussia Mönchengladbach, Bundesliga). Nacido en **Düsseldorf en 2003** de padre alemán y madre coreana, Castrop **jugó en las categorías inferiores de Alemania** hasta sub-21. En **agosto de 2025**, FIFA aprobó su cambio de federación y debutó con Corea en los amistosos de septiembre.

La convocatoria mundialista lo convierte en el **primer jugador de herencia mixta nacido fuera de Corea** en aparecer en una lista coreana de Copa del Mundo. La KFA (Korea Football Association) lleva años abriendo la puerta a la diáspora como vía para ampliar el pool talento, y Castrop es el primer caso real con peso deportivo. Aporta versatilidad en el centro del campo (mediocentro defensivo o lateral derecho) que le faltaba al equipo.

## El núcleo del equipo

- **Portería**: **Kim Seung-gyu** (FC Tokyo), **Jo Hyeon-woo** (Ulsan) y **Song Bum-keun** (Jeonbuk).
- **Defensa**: **Kim Min-jae** (Bayern Múnich) es el líder absoluto. **Kim Tae-hyeon** (Kashima), **Cho Yu-min** (Al-Sharjah), **Seol Young-woo** (Estrella Roja) y los laterales **Lee Tae-seok** (Austria Viena) y **Kim Moon-hwan** (Daejeon). **Castrop** entra como recambio polivalente.
- **Mediocampo**: **Lee Kang-in** (PSG, vigente campeón de Champions) es la principal apuesta creativa. **Hwang In-beom** (Feyenoord), **Lee Jae-sung** (Mainz), **Paik Seung-ho** (Birmingham), **Bae Jun-ho** (Stoke City) y **Eom Ji-sung** (Swansea) dan rotación y energía. El joven **Lee Dong-gyeong** (Ulsan) sube de la generación local.
- **Ataque**: además de Son, **Hwang Hee-chan** (Wolverhampton), **Cho Gue-sung** (Midtjylland) y **Oh Hyeon-gyu** (Beşiktaş). **Yang Hyun-jun** (Celtic) por banda.

Mira la lista completa con dorsales en la [ficha de Corea del Sur](/equipos/KOR).

## El Grupo A y el calendario

A Corea del Sur le tocó el **Grupo A** junto a **México** (la anfitriona), **Sudáfrica** y **República Checa**. Los tres partidos coreanos se juegan en **suelo mexicano** — un dato logístico curioso que reduce viajes pero les obliga a competir todo el grupo en altitud o calor:

- **Jueves 11 de junio** · Corea vs **República Checa** · Estadio Akron, **Guadalajara**
- **Jueves 18 de junio** · Corea vs **México** · Estadio Akron, **Guadalajara**
- **Miércoles 24 de junio** · Corea vs **Sudáfrica** · Estadio BBVA, **Monterrey**

Mira la [composición del Grupo A](/grupos) y el [calendario del torneo](/calendario).

## Lo que está en juego

Corea del Sur tiene una vara de medir alta: las **semifinales de 2002** siguen siendo el techo. Desde entonces ha llegado a octavos en 2010 y 2022 (eliminada por Brasil en Catar). Para Hong Myung-bo, el objetivo realista es **pasar como segunda del grupo** y volver a octavos — la duda histórica está en si esta generación puede dar un paso más allá. Con Son en su despedida, Kim Min-jae en un nivel top y Lee Kang-in en plenitud, los argumentos están sobre la mesa.

Si quieres predecir hasta dónde llegan los *Taegeuk Warriors*, [crea tu quiniela gratis](/login?next=%2Fonboarding) y arma tu bracket antes del 11 de junio.`,
  },
  {
    slug: "convocatoria-portugal-mundial-2026-martinez-cristiano-ronaldo",
    title:
      "Convocatoria de Portugal: la sexta Copa de Cristiano Ronaldo y el homenaje a Diogo Jota",
    seoTitle: "Convocatoria Portugal Mundial 2026 · Lista de Roberto Martínez",
    excerpt:
      "Roberto Martínez confirma la lista de Portugal para el Mundial 2026. Cristiano Ronaldo iguala a Messi en seis Mundiales y la selección rinde tributo a Diogo Jota.",
    category: "convocatoria",
    tags: [
      "Portugal",
      "Cristiano Ronaldo",
      "Roberto Martínez",
      "Diogo Jota",
      "Bruno Fernandes",
    ],
    relatedTeamCodes: ["POR"],
    daysAgo: 1,
    body: `**Portugal** publicó el **19 de mayo de 2026** la lista oficial de 26 jugadores para el Mundial 2026, con dos titulares de la convocatoria: **Cristiano Ronaldo** disputará su **sexta Copa del Mundo** — récord absoluto que comparte con Lionel Messi — y la selección hace **homenaje formal a Diogo Jota**, fallecido en julio de 2025 en un accidente de tráfico en España. El seleccionador es el español **Roberto Martínez**, que dirige a *A Seleção* desde 2023.

## Cristiano Ronaldo, el sexto Mundial

A sus **41 años**, Cristiano Ronaldo (Al-Nassr) se incorpora a la lista como **capitán** y referente absoluto. Llega para empatar el récord de **participaciones en seis Mundiales** que ostentaba en solitario hasta este ciclo y que comparte ahora con **Messi**. Su trayectoria mundialista:

| Año | Edad | Resultado |
|-----|------|-----------|
| 2006 | 21 | Cuartos de final |
| 2010 | 25 | Octavos |
| 2014 | 29 | Fase de grupos |
| 2018 | 33 | Octavos |
| 2022 | 37 | Cuartos de final |
| 2026 | 41 | ¿Su despedida? |

Es casi seguro su último Mundial. Roberto Martínez ya lo gestiona con minutos medidos: en clasificación lo fue alternando con Gonçalo Ramos como '9', y en el Mundial probablemente repetirá ese patrón.

## El núcleo del equipo

La lista combina experiencia europea de élite con jugadores en activo en clubes top:

- **Portería**: **Diogo Costa** (Porto) sigue como titular. **José Sá** (Wolverhampton) y **Rui Silva** (Real Sociedad) completan.
- **Defensa**: **Rúben Dias** (Manchester City) lidera la zaga junto a **Gonçalo Inácio** (Sporting). **Diogo Dalot** (Manchester United) y **Nélson Semedo** (Wolves) en banda derecha; **Nuno Mendes** (PSG) y **João Cancelo** en la izquierda. **Tomás Araújo** y **Renato Veiga** completan la rotación central.
- **Mediocampo**: el corazón del equipo. **Bruno Fernandes** (Manchester United) como organizador, **Vitinha** (PSG) como faro técnico — vuelve a su mejor versión tras la Champions ganada con el PSG —, y **Bernardo Silva** (Manchester City) por dentro. **João Neves** (PSG), **Rúben Neves** (Al-Hilal), **Matheus Nunes** (Manchester City) y **Samú Costa** (Mallorca) dan profundidad de rotación. **Francisco Trincão** (Sporting) llega tras una temporada espectacular como ala-mediapunta.
- **Ataque**: además de Ronaldo, **Rafael Leão** (AC Milan), **Pedro Neto** (Chelsea), **João Félix** (Al-Nassr), **Gonçalo Ramos** (PSG), **Francisco Conceição** (Juventus) y **Gonçalo Guedes** (Real Sociedad).

Mira la lista completa con dorsales en la [ficha de Portugal](/equipos/POR).

## El homenaje a Diogo Jota

El 3 de julio de 2025, **Diogo Jota** falleció a los 28 años en un accidente de tráfico en Zamora (España), junto a su hermano **André Silva** — la Guardia Civil concluyó que el accidente se produjo por el reventón de un neumático mientras adelantaba. Jota había ganado con Portugal la **UEFA Nations League 2025** apenas un mes antes y sumaba 49 partidos como internacional.

Roberto Martínez presentó la convocatoria con el lema **"27 jugadores y uno más"** — Jota es incluido simbólicamente en la lista como ausencia perpetua. Es la primera vez en la historia reciente de Portugal que una convocatoria mundialista lleva un tributo de este tipo grabado en su estructura formal.

## El Grupo K y el calendario

A Portugal le tocó el **Grupo K** junto a **Colombia** (el rival fuerte), **RD Congo** y **Uzbekistán**. Sorteo razonablemente benévolo en bombo 2-3, pero **Colombia** es selección con candidatos a sorprender — vigente subcampeona de la Copa América 2024 y con James Rodríguez en activo.

Calendario de fase de grupos confirmado:
- **17 de junio**: Portugal vs RD Congo
- **23 de junio**: Portugal vs Uzbekistán
- **27 de junio**: Portugal vs Colombia

Mira la [composición del Grupo K](/grupos) y el [calendario del torneo](/calendario).

## Lo que está en juego

Portugal nunca ha **levantado la Copa del Mundo**. Su mejor resultado sigue siendo el **cuarto puesto de Inglaterra 1966** con Eusébio. Con Ronaldo en su último baile, una generación dorada todavía en activo (Bruno, Bernardo, Vitinha, Leão) y un sorteo no especialmente cruel, **2026 es probablemente su mejor oportunidad histórica para pasar de cuartos** — barrera que no han superado ni en 2006, 2014 ni 2022. La presión la lleva Martínez, técnico que ya estuvo cerca con Bélgica en 2018 y al que se le mide por el rendimiento en cruces decisivos.

Para predecir hasta dónde llega Portugal, [crea tu quiniela gratis](/login?next=%2Fonboarding) y arma tu bracket antes del 11 de junio.`,
  },
  {
    slug: "convocatoria-croacia-mundial-2026-modric-quinto-mundial",
    title:
      "Convocatoria de Croacia: Luka Modrić cierra su quinto Mundial a los 40 años",
    seoTitle: "Convocatoria Croacia Mundial 2026 · Lista de Zlatko Dalić",
    excerpt:
      "Zlatko Dalić presenta la lista de 26 de Croacia para el Mundial 2026 con Luka Modrić, a sus 40 años y tras una fractura facial reciente, encabezando su quinta Copa del Mundo.",
    category: "convocatoria",
    tags: ["Croacia", "Luka Modrić", "Dalić", "Gvardiol", "Mundial 2026"],
    relatedTeamCodes: ["CRO"],
    daysAgo: 1,
    body: `**Croacia** anunció el **18 de mayo de 2026** la lista de 26 jugadores para el Mundial 2026. El seleccionador **Zlatko Dalić** mantuvo el corazón de la generación dorada — con **Luka Modrić** a la cabeza — y abre paso a una nueva camada de jóvenes con galones europeos.

## Modrić, quinto Mundial

A sus **40 años**, **Luka Modrić** disputará su **quinta Copa del Mundo** — un récord solo comparable a las **seis** que pueden alcanzar Lionel Messi y Cristiano Ronaldo. Su trayectoria mundialista:

| Año | Edad | Resultado |
|-----|------|-----------|
| 2006 | 20 | Fase de grupos |
| 2014 | 28 | Fase de grupos |
| 2018 | 32 | **Subcampeón** (Balón de Oro del torneo) |
| 2022 | 36 | Tercer puesto |
| 2026 | 40 | ¿Su despedida? |

Modrić afronta el Mundial **tras una fractura facial reciente** sufrida en abril de 2026 en un partido con el Milan contra la Juventus. Tuvo que ser operado, pero se ha recuperado a tiempo y será titular indiscutible.

Para una selección de **3,8 millones de habitantes**, Modrić ha sido el arquitecto de un ciclo histórico: subcampeón en 2018, tercero en 2022, finalista de la Nations League 2023. Es el jugador croata más decorado de la historia.

## Gvardiol y la nueva generación

**Joško Gvardiol** (Manchester City) lidera el relevo generacional. A sus 24 años, es uno de los mejores defensas del mundo y consolida la zaga junto a **Marin Pongračić** (Fiorentina) y **Josip Šutalo** (Ajax).

Los nuevos nombres a vigilar:

- **Luka Vušković** (cesión desde el Tottenham al Hamburgo): defensa central de 19 años, una de las mayores promesas europeas.
- **Petar Sučić** (Inter de Milán): mediocentro de 22 años, hermano de **Luka Sučić** (Real Sociedad).
- **Martin Baturina** (Como): mediapunta de 23 años, herencia técnica de Modrić.

## El núcleo del equipo

- **Portería**: **Dominik Livaković** (Fenerbahçe), héroe de Qatar 2022 por la tanda de penales contra Japón, sigue como titular.
- **Defensa**: además de Gvardiol y Šutalo, **Josip Stanišić** (Bayern) y **Duje Ćaleta-Car** (Lyon).
- **Mediocampo**: Modrić con **Mateo Kovacic** (Manchester City) y los Sučić. **Nikola Vlašić** (Torino) y **Mario Pašalić** (Atalanta) aportan llegada al área.
- **Ataque**: **Ivan Perišić** (PSV, 37 años) sigue presente como extremo y referencia veterana. **Andrej Kramarić** (Hoffenheim) y **Petar Musa** (Dallas FC) como '9'. **Igor Matanović** (Eintracht Frankfurt) y **Marco Pašalić** (Orlando City) completan.

Mira la lista completa con dorsales en la [ficha de Croacia](/equipos/CRO).

## El Grupo L y el cruce con Inglaterra

Croacia está en el **Grupo L** junto a **Inglaterra** (cabeza de serie), **Ghana** y **Panamá**. El cruce **Croacia vs Inglaterra** repite el de **semifinales de Rusia 2018** (que Croacia ganó 2-1 con gol de Mario Mandžukić en la prórroga) y el de **octavos de Euro 2024** (que ganaron los ingleses).

Mira la [composición del Grupo L](/grupos) y el [calendario del torneo](/calendario).

## Lo que está en juego

Modrić y Perišić, los dos jugadores con más recorrido de la generación, están en su **última función mundialista**. Croacia llega como subcampeona de 2018 y tercera de 2022 — el escalón final, la final ganada, sigue pendiente. Si la generación dorada se va sin el premio, lo intentará el relevo (Gvardiol, Vušković, Sučić) en 2030.

Para predecir si Croacia da otro paso histórico, [crea tu quiniela gratis](/login?next=%2Fonboarding) y arma tu bracket antes del 11 de junio.`,
  },
  {
    slug: "convocatoria-cabo-verde-mundial-2026-bubista-historia",
    title:
      "Convocatoria de Cabo Verde: Bubista anuncia la lista del primer Mundial de los Tubarões Azuis",
    seoTitle: "Convocatoria Cabo Verde Mundial 2026 · Lista de Bubista",
    excerpt:
      "Cabo Verde — unos 500.000 habitantes, primer Mundial de su historia — presenta la lista de 26 de Pedro 'Bubista' Brito. Logan Costa, Dailon Livramento y el veterano Ryan Mendes lideran un grupo que debuta el 15 de junio frente a España.",
    category: "convocatoria",
    tags: [
      "Cabo Verde",
      "Bubista",
      "Logan Costa",
      "Dailon Livramento",
      "Ryan Mendes",
      "Mundial 2026",
    ],
    relatedTeamCodes: ["CPV"],
    daysAgo: 2,
    body: `**Cabo Verde** anunció el **19 de mayo de 2026** la lista de 26 jugadores para el Mundial 2026 — la **primera convocatoria mundialista en la historia** de los **Tubarões Azuis**. El seleccionador **Pedro "Bubista" Brito** mezcló veteranía con la nueva generación, apoyándose en futbolistas repartidos por una decena de ligas europeas, africanas y norteamericanas.

## Una historia inédita

Cabo Verde — archipiélago de **diez islas y unos 500.000 habitantes** frente a la costa de Senegal — se convierte en una de las federaciones con **menos población** que ha disputado nunca un Mundial. Su clasificación, sellada en la fase africana de la CAF, se celebró en las islas como el mayor hito deportivo nacional.

Bubista lleva al frente del banquillo desde 2020 y ha consolidado un proyecto que ya alcanzó **cuartos de final en la Copa África de Naciones 2024**. Aquel torneo dejó claro que el equipo competía contra cualquier rival continental.

## Logan Costa, líder de una defensa europea

El gran nombre de la convocatoria es **Logan Costa**, defensa central del **Villarreal** que llega al Mundial como referente de la línea atrás. Su solidez, combinada con la experiencia de **Roberto Lopes** (Shamrock Rovers) y **Steven Moreira** (Columbus Crew), forma el pilar sobre el que Bubista quiere construir el torneo.

## Dailon Livramento, la apuesta ofensiva

A sus **24 años**, **Dailon Livramento** (Casa Pia) llega como **gran referente ofensivo** tras una fase de clasificación con goles decisivos. Lo acompañan veteranos como **Ryan Mendes** (Iğdır FK, Turquía), capitán y máximo goleador histórico de la selección, y nombres más reconocibles para el público europeo como **Jovane Cabral** (Estrela Amadora) — formado en el Sporting CP — y **Garry Rodrigues** (Apollon Limassol).

## La lista completa por posiciones

- **Porteros (3)**: Josimar Dias (Chaves), Márcio da Rosa (Montana), Carlos Santos (San Diego FC).
- **Defensas (9)**: Steven Moreira (Columbus Crew), Wagner Pina (Trabzonspor), João Paulo Fernandes (FCSB), Sidny Lopes Cabral (Benfica), **Logan Costa (Villarreal)**, Roberto Lopes (Shamrock Rovers), Kelvin Pires (SJK Seinäjoki), Ianique Tavares (Torreense), Edilson Borges (Al-Bataeh).
- **Mediocampistas (6)**: Jamiro Monteiro (PEC Zwolle), Telmo Arcanjo (Vitória Guimarães), Yannick Semedo (Farense), Laros Duarte (Puskás Akadémia), Deroy Duarte (Ludogorets), Kevin Pina (Krasnodar).
- **Delanteros (8)**: **Ryan Mendes (Iğdır FK)**, Willy Semedo (Omonia Nicosia), **Garry Rodrigues (Apollon Limassol)**, **Jovane Cabral (Estrela Amadora)**, Nuno da Costa (Başakşehir), **Dailon Livramento (Casa Pia)**, Gilson Benchimol (Akron Togliatti), Hélio Varela (Maccabi Tel Aviv).

La diáspora caboverdiana se nota: **siete jugadores en el fútbol portugués**, tres en Turquía, dos en la MLS, y representación en ligas tan dispares como la finlandesa, la búlgara o la chipriota. Es un grupo que sintetiza lo que es la federación: talento disperso por medio mundo unido en torno a una bandera.

Mira la lista completa con dorsales en la [ficha de Cabo Verde](/equipos/CPV).

## El Grupo H y el cruce con España

Cabo Verde cayó en el **Grupo H** junto a **España** (cabeza de serie y una de las favoritas al título), **Uruguay** y **Arabia Saudí**. El sorteo no podía ser más exigente: dos pesos pesados europeo-sudamericano y un rival asiático con presupuesto top.

El **debut es el lunes 15 de junio contra España** en el **Mercedes-Benz Stadium de Atlanta**. Después llega **Uruguay** el 21 de junio en el Hard Rock Stadium de Miami y, para cerrar la fase, **Arabia Saudí** el 26 de junio en el NRG Stadium de Houston.

Mira la [composición del Grupo H](/grupos) y el [calendario del torneo](/calendario) para los horarios completos.

## Lo que está en juego

Para una federación con un solo recurso real — la pasión y el talento del archipiélago y su diáspora —, **clasificar ya fue la gesta**. El reto sobre el césped es vender cara la derrota contra España y Uruguay, y jugarse el tercer puesto del grupo con Arabia Saudí. Con un buen tercer partido, los **8 mejores terceros pasan a dieciseisavos**: ese es el horizonte realista para Bubista.

Cabo Verde llega al Mundial siendo el equipo más romántico del torneo. Da igual el resultado: lo que pase en estas tres semanas ya forma parte de la historia del país.

Si quieres predecir hasta dónde llega Cabo Verde en tu quiniela, [crea tu cuenta gratis](/login?next=%2Fonboarding) y arma tu bracket antes del 11 de junio.`,
  },
  {
    slug: "convocatoria-suiza-mundial-2026-yakin-xhaka-post-sommer",
    title:
      "Convocatoria de Suiza: Xhaka capitanea la era post-Sommer con Kobel bajo palos",
    seoTitle: "Convocatoria Suiza Mundial 2026 · Lista de Murat Yakin",
    excerpt:
      "Suiza presenta su lista de 26 para el Mundial 2026 con un cambio generacional: Sommer y Shaqiri ya retirados de la selección, Gregor Kobel como nuevo titular bajo palos y Granit Xhaka (Sunderland) liderando como capitán.",
    category: "convocatoria",
    tags: [
      "Suiza",
      "Murat Yakin",
      "Granit Xhaka",
      "Gregor Kobel",
      "Breel Embolo",
      "Mundial 2026",
    ],
    relatedTeamCodes: ["SUI"],
    daysAgo: 1,
    body: `**Suiza** entregó el **20 de mayo de 2026** la lista de 26 jugadores para el Mundial 2026. El seleccionador **Murat Yakin** firma una convocatoria de transición tras las **retiradas internacionales de Yann Sommer y Xherdan Shaqiri**: **Gregor Kobel** asume la portería titular y **Granit Xhaka**, ahora en el Sunderland, sigue como capitán.

## La era post-Sommer

La mayor novedad respecto a Catar 2022 no es un nombre que entra, sino dos que ya no están. **Yann Sommer**, portero titular durante más de una década, anunció su retirada internacional el verano pasado tras la Eurocopa 2024. **Xherdan Shaqiri** hizo lo propio poco después, cerrando un ciclo de **17 años** vistiendo la camiseta nacional. Ambos eran símbolos generacionales — su ausencia obliga a Yakin a reordenar piezas en el último corte.

El relevo bajo palos es claro: **Gregor Kobel** (Borussia Dortmund) llega al Mundial como **nuevo número 1**, con Yvon Mvogo (Lorient) y el joven Marvin Keller (Young Boys) como suplentes.

## Yakin, continuidad post-Euro 2024

Suiza llega al Mundial con la confianza de haber firmado **uno de los mejores torneos de su historia reciente**. En la Eurocopa 2024 eliminó a Italia en octavos (2-0) y cayó **en cuartos contra Inglaterra en la tanda de penaltis**, dejando una de las mejores impresiones del campeonato. Yakin, criticado antes del torneo, salió reforzado y renovó hasta este Mundial.

Es la **13ª participación de Suiza en una Copa del Mundo** y la **sexta consecutiva** (2006, 2010, 2014, 2018, 2022 y ahora 2026). En las tres últimas, los helvéticos cayeron en octavos — una barrera que la generación actual quiere romper.

## La lista completa por posiciones

- **Porteros (3)**: **Gregor Kobel (Borussia Dortmund)**, Yvon Mvogo (Lorient), Marvin Keller (Young Boys).
- **Defensas (8)**: **Manuel Akanji (Inter de Milán)**, Nico Elvedi (Borussia Mönchengladbach), Ricardo Rodríguez (Real Betis), Silvan Widmer (Maguncia), Miro Muheim (Hamburgo), Aurèle Amenda (Eintracht Frankfurt), Eray Cömert (Valencia), Luca Jaquez (Stuttgart).
- **Mediocampistas (10)**: **Granit Xhaka (Sunderland, capitán)**, Johan Manzambi (Friburgo), Remo Freuler (Bologna), Denis Zakaria (Mónaco), Ardon Jashari (AC Milan), Djibril Sow (Sevilla), Christian Fassnacht (Young Boys), Michel Aebischer (Pisa), Fabian Rieder (Augsburgo), Rubén Vargas (Sevilla).
- **Delanteros (5)**: **Breel Embolo (Rennes)**, Noah Okafor (Leeds United), Dan Ndoye (Nottingham Forest), Zeki Amdouni (Burnley), Cedric Itten (Fortuna Düsseldorf).

## Xhaka, capitán desde Sunderland

A sus **33 años** y con más de **130 internacionalidades**, **Granit Xhaka** llega al Mundial tras una temporada en la Championship con el **Sunderland** — un giro inesperado para un futbolista habituado a la Premier League y la Bundesliga. Sigue siendo el líder absoluto del vestuario y el cerebro del centro del campo suizo. Le acompañan dos nombres que comparten club: **Djibril Sow** y **Rubén Vargas** llegan desde el **Sevilla**, donde han firmado una buena temporada en LaLiga.

**Ricardo Rodríguez** (Betis) disputa su **cuarto Mundial**, una marca al alcance de muy pocos suizos. **Manuel Akanji**, ahora en el **Inter de Milán** tras dejar el Manchester City, lidera la defensa central junto al fiable Nico Elvedi.

## La nueva generación

Sin Sommer y Shaqiri, el grupo se rejuvenece. **Aurèle Amenda** (Eintracht Frankfurt) y **Luca Jaquez** (Stuttgart) entran como defensas de futuro. **Johan Manzambi** (Friburgo) y **Ardon Jashari** (AC Milan) son las apuestas en el centro del campo. **Noah Okafor** (Leeds United) y **Dan Ndoye** (Nottingham Forest), ambos titulares en la Premier League, refuerzan el ataque.

Mira la lista completa con dorsales en la [ficha de Suiza](/equipos/SUI).

## El Grupo B y el debut contra Catar

Suiza está en el **Grupo B** junto a **Canadá** (anfitriona), **Bosnia y Herzegovina** y **Catar** (con Julen Lopetegui en el banquillo). Es un grupo equilibrado en el que los suizos parten como segundo cabeza de serie y aspiran sin complejos al **primer puesto**.

El **debut es el sábado 13 de junio frente a Catar** en el **Levi's Stadium** de Santa Clara (California). Después llega **Bosnia** el 18 de junio en el SoFi Stadium de Los Ángeles y, para cerrar la fase, **Canadá** el 24 de junio en el BC Place de Vancouver.

Mira la [composición del Grupo B](/grupos) y el [calendario del torneo](/calendario).

## Lo que está en juego

Suiza arrastra una **maldición de octavos**: en Brasil 2014, Rusia 2018 y Catar 2022 cayó siempre en la primera ronda eliminatoria. Con la retirada de Sommer y Shaqiri, la generación de Xhaka, Embolo y Akanji está en su **última oportunidad real** de romper ese muro y meterse, como mínimo, en cuartos de un Mundial — algo que el país no ha conseguido desde **Suecia 1954**, cuando Suiza fue anfitriona.

Con un grupo asequible y un rendimiento europeo reciente sólido, en 2026 el objetivo es **realista**: superar los octavos. El primer test será el 13 de junio en California.

Para predecir hasta dónde llega Suiza, [crea tu quiniela gratis](/login?next=%2Fonboarding) y arma tu bracket antes del 11 de junio.`,
  },
  {
    slug: "convocatoria-alemania-mundial-2026-nagelsmann-neuer-regreso",
    title:
      "Convocatoria de Alemania: Manuel Neuer sale del retiro a los 40 y Nagelsmann firma una lista de Kimmich, Wirtz y Musiala",
    seoTitle: "Convocatoria Alemania Mundial 2026 · Lista de Julian Nagelsmann",
    excerpt:
      "Julian Nagelsmann anuncia la lista de 26 de Alemania para el Mundial 2026 con el regreso polémico de Manuel Neuer (40 años) tras su retirada internacional de 2024. Joshua Kimmich capitanea; Wirtz y Musiala lideran el ataque; ter Stegen y Gnabry, fuera por lesión.",
    category: "convocatoria",
    tags: [
      "Alemania",
      "Julian Nagelsmann",
      "Manuel Neuer",
      "Joshua Kimmich",
      "Florian Wirtz",
      "Jamal Musiala",
      "Mundial 2026",
    ],
    relatedTeamCodes: ["GER"],
    daysAgo: 0,
    body: `**Alemania** anunció el **21 de mayo de 2026** la lista oficial de 26 jugadores para el Mundial 2026. El seleccionador **Julian Nagelsmann** firma una convocatoria con dos titulares de la noticia: **Manuel Neuer**, de **40 años**, **sale de su retirada internacional** para volver a ser titular bajo palos casi dos años después; y **Joshua Kimmich** se mantiene como **capitán** de un grupo que se sostiene sobre **Florian Wirtz** y **Jamal Musiala** en ataque.

## Neuer, el regreso polémico

Manuel Neuer (Bayern Múnich) **anunció su retirada de la selección en 2024** tras la Eurocopa disputada en Alemania. Casi dos años después, Nagelsmann le llamó personalmente para ofrecerle volver al equipo y ser el **número uno** en el Mundial. La decisión se confirmó esta semana junto al resto de la lista, y ha **dividido a la prensa alemana**.

- **Lothar Matthäus** (Balón de Oro 1990, capitán campeón del mundo en Italia 1990) criticó la **falta de transparencia comunicativa** del DFB y la forma de gestionar la decisión frente a **Oliver Baumann**, el portero que llevaba siendo titular toda la clasificación.
- **Oliver Kahn** (ex portero y ex director deportivo del Bayern) calificó el regreso de "**aventurero**", citando dudas físicas a los 40 años y el riesgo de **erosionar la confianza del grupo**.

Nagelsmann llamó personalmente a **Oliver Baumann** (Hoffenheim) para explicarle que pasaba a ser **segundo portero**. Baumann aceptó el papel públicamente. El tercero será **Alexander Nübel** (VfB Stuttgart), recientemente convertido en uno de los porteros más sólidos de la Bundesliga.

## Las dos ausencias por lesión

La lista la marcan también dos nombres que faltan:

- **Marc-André ter Stegen** (Barcelona): la gran ausencia. Sufrió una **lesión en el isquiotibial izquierdo** el **31 de enero de 2026** en un partido contra Oviedo. La rehabilitación lo deja **fuera entre 7 y 8 meses**, sin opción de llegar al Mundial. Su ausencia es lo que **abrió la puerta del regreso de Neuer**: tras meses de incertidumbre con el barcelonista descartado, Nagelsmann acabó moviendo ficha.
- **Serge Gnabry** (Bayern Múnich): se **desgarró el aductor del muslo derecho** en el último entrenamiento previo al partido contra Stuttgart hace dos semanas. La lesión lo deja **fuera 2-4 meses** y se queda **sin Mundial**. Era una de las opciones ofensivas firmes de Nagelsmann.

## Kimmich, Wirtz y Musiala: el triángulo del equipo

El equipo se construye sobre tres ejes:

- **Joshua Kimmich** (Bayern Múnich), capitán a sus 31 años, es el organizador del centro del campo. Tras años de discusión sobre su mejor posición (lateral derecho vs mediocentro), Nagelsmann lo ha fijado **como '6' titular**.
- **Florian Wirtz** (Liverpool): fichado el verano pasado por los *reds* desde el Bayer Leverkusen, llega al Mundial en su techo creativo. A sus 22 años, es el **'10' titular** del equipo.
- **Jamal Musiala** (Bayern Múnich): el otro 22 años de la generación. Acompaña a Wirtz por el interior izquierdo, en posición flotante. Es el jugador con mayor capacidad de uno-contra-uno del torneo.

## El núcleo del equipo

- **Portería (3)**: Neuer (titular), Baumann, Nübel.
- **Defensa (7)**: **Antonio Rüdiger** (Real Madrid) lidera la zaga, acompañado por **Nico Schlotterbeck** (Borussia Dortmund), **Jonathan Tah** (Bayern Múnich), **Waldemar Anton** (Borussia Dortmund) y **Malick Thiaw** (Newcastle United). En los laterales, **David Raum** (RB Leipzig) por la izquierda y el joven **Nathaniel Brown** (Eintracht Frankfurt) por la derecha — su inclusión es una de las sorpresas (apenas tiene experiencia internacional y herencia familiar estadounidense).
- **Mediocampo (10)**: Kimmich, Wirtz y Musiala como ejes. **Leon Goretzka** (Bayern Múnich), **Aleksandar Pavlović** (Bayern Múnich, 21 años), **Angelo Stiller** (VfB Stuttgart) y **Felix Nmecha** (Borussia Dortmund) compiten por el segundo pivote. **Pascal Groß** (34 años, Borussia Dortmund) entra como veterano-novato — disputa su **primer Mundial a los 34 años**. **Nadiem Amiri** (Mainz 05) y el muy joven **Lennart Karl** (Bayern Múnich, 17 años, dos caps previos) completan el centro.
- **Ataque (6)**: **Kai Havertz** (Arsenal) como '9' titular o falso 9. **Leroy Sané** (Galatasaray) por la banda derecha. **Deniz Undav** (VfB Stuttgart), **Nick Woltemade** (Newcastle United, fichaje récord del verano pasado), **Maximilian Beier** (Borussia Dortmund) y **Jamie Leweling** (VfB Stuttgart) como rotaciones.

Mira la lista completa con dorsales en la [ficha de Alemania](/equipos/GER).

## Las sorpresas: Karl, Brown y el veterano Groß

Tres nombres han copado titulares por encima de los habituales:

- **Lennart Karl** (Bayern Múnich): a sus **17 años**, es el **convocado más joven** del Mundial alemán. Media punta de la cantera del Bayern, solo había vestido la camiseta de la selección absoluta en dos partidos amistosos. Su llamada es una **apuesta de futuro** y, también, una manera de premiar la temporada que está cuajando con Vincent Kompany.
- **Nathaniel Brown** (Eintracht Frankfurt): lateral derecho de 22 años con herencia familiar estadounidense que rechazó representar a Estados Unidos para apostar por Alemania. Entra como recambio de Joshua Kimmich en el lateral.
- **Pascal Groß** (Borussia Dortmund): a los **34 años**, primer Mundial. Lleva una década en Europa (Brighton durante años, Dortmund desde 2024) y nunca había aparecido en una lista mundialista. Nagelsmann lo eligió por la **inteligencia táctica** que aporta como pivote experimentado.

## El Grupo E y el calendario

A Alemania le tocó el **Grupo E** como cabeza de serie. Le acompañan **Curazao** (debut absoluto en un Mundial, una de las federaciones más pequeñas de la historia del torneo), **Costa de Marfil** (campeona de África 2024) y **Ecuador** (siempre incómoda en los Mundiales).

- **Domingo 14 de junio** · Alemania vs **Curazao** · debut
- **Sábado 20 de junio** · Alemania vs **Costa de Marfil**
- **Jueves 25 de junio** · Alemania vs **Ecuador**

Mira la [composición completa del Grupo E](/grupos) y el [calendario del torneo](/calendario) para los horarios y sedes.

## Lo que está en juego

Alemania llega con **cuatro Copas del Mundo** (1954, 1974, 1990, 2014) — la **tercera selección más laureada** de la historia tras Brasil (5) y empatada con Italia. Pero los últimos dos ciclos han sido un descalabro: **eliminada en fase de grupos en Rusia 2018 y Catar 2022**, dos fracasos consecutivos sin precedentes en la historia del *Nationalmannschaft*.

Nagelsmann llegó al banquillo en septiembre de 2023 con la misión de **enderezar el barco**. La Eurocopa 2024 en casa (cuartos de final, eliminada por España en la prórroga) dejó buenas sensaciones, pero el listón mundialista exige llegar mucho más lejos. Con Wirtz y Musiala en su techo, Kimmich como brújula y Neuer reciclado como talismán emocional, Alemania **se asume candidata a semifinales como mínimo** — cualquier eliminación temprana sería tercera consecutiva, y muy probablemente costaría el puesto al técnico.

Si quieres predecir hasta dónde llega Alemania en tu quiniela, [crea tu cuenta gratis](/login?next=%2Fonboarding) y arma tu bracket antes del 11 de junio.`,
  },

  // ─────────────────────────── ANÁLISIS / DESTACADAS ───────────────────────────
  {
    slug: "formato-mundial-2026-48-selecciones-12-grupos",
    title:
      "Mundial 2026 a 48 selecciones: cómo funciona el nuevo formato (12 grupos, R32 y 104 partidos)",
    seoTitle: "Formato Mundial 2026 · 48 selecciones, 12 grupos y dieciseisavos",
    excerpt:
      "Por primera vez en la historia, el Mundial pasa de 32 a 48 selecciones. Te explicamos los 12 grupos, los nuevos dieciseisavos y los 104 partidos, paso a paso.",
    category: "analisis",
    tags: ["Formato Mundial 2026", "48 selecciones", "R32", "Bracket"],
    relatedTeamCodes: [],
    daysAgo: 3,
    body: `El **Mundial 2026** es la primera edición de la historia con **48 selecciones**. La FIFA aprobó la expansión desde las 32 clásicas en 2017, y esta edición — organizada por Estados Unidos, México y Canadá — la estrena: reordena por completo la fase de grupos, añade una nueva ronda eliminatoria y eleva el número total de partidos de 64 a 104.

Si vas a hacer tu quiniela o simplemente quieres entender qué va a pasar entre el 11 de junio y el 19 de julio de 2026, esta es la guía.

## Los 12 grupos de 4 selecciones

En lugar de los 8 grupos de 4 selecciones de 2022, ahora hay **12 grupos**:

- 12 grupos × 4 selecciones = 48 equipos
- Cada selección juega **3 partidos en fase de grupos**
- Total: **72 partidos** solo en la primera fase

Cada grupo (A, B, C… hasta L) tiene 4 selecciones. Las **dos primeras** de cada grupo avanzan, más los **ocho mejores terceros** — un sistema similar al que ya empleó la Eurocopa 2016. Total que pasan a dieciseisavos: **32 selecciones**.

> Tras el sorteo del 5 de diciembre de 2025 en el Kennedy Center de Washington D.C., los grupos quedaron definidos. Mira nuestra página de [los 12 grupos del Mundial 2026](/grupos) para el detalle equipo a equipo.

## La nueva ronda: dieciseisavos (R32)

Por primera vez en un Mundial, los 32 clasificados juegan **dieciseisavos de final** antes de octavos. Es la fase 'extra' que añade el formato 48.

A partir de aquí, todo es eliminación directa:

| Ronda | Equipos | Partidos |
|-------|---------|----------|
| Dieciseisavos (R32) | 32 | 16 |
| Octavos (R16) | 16 | 8 |
| Cuartos | 8 | 4 |
| Semifinales | 4 | 2 |
| Tercer puesto | 2 | 1 |
| Final | 2 | 1 |

Total fase eliminatoria: **32 partidos**, más los 72 de grupos = **104 partidos totales**. Un 62,5% más que los 64 partidos de Qatar 2022.

## El calendario expandido

Los 104 partidos se reparten en **39 días** (del 11 de junio al 19 de julio de 2026). La final se juega el domingo 19 de julio en el **MetLife Stadium** de Nueva York–Nueva Jersey, casa de los New York Giants y Jets.

Algunos datos importantes:

- **3 países anfitriones**: Estados Unidos, Canadá y México.
- **16 sedes** repartidas entre los tres países: **11 en USA**, **3 en México** y **2 en Canadá**.
- **Reparto de partidos**: 78 partidos en Estados Unidos, y 13 partidos en cada uno de los otros dos anfitriones.
- El partido inaugural es el **jueves 11 de junio** y se juega en el **Estadio Ciudad de México** (Azteca), que se convierte así en el único estadio que acoge tres aperturas de Mundial (1970, 1986, 2026).
- Por primera vez en la historia del Mundial, **la final tendrá un show de medio tiempo** estilo Super Bowl, co-producido por Global Citizen.

## ¿Por qué este cambio?

La FIFA defiende la expansión por dos motivos:
1. **Inclusión geográfica**: más cupos para confederaciones que históricamente quedaban fuera. AFC, CAF y OFC ganan plazas, igual que CONCACAF como confederación anfitriona.
2. **Ingresos**: el ciclo comercial 2023-2026 de la FIFA proyecta unos **13.000 millones de dólares** de ingresos, revisado al alza desde los 11.000 millones iniciales — el más alto de la historia del organismo.

Las críticas: calendario más largo, riesgo de lesiones por el mayor número de partidos, y dilución del nivel competitivo en la fase de grupos al haber selecciones más débiles.

## Cómo jugar la quiniela del Mundial 2026

Si quieres hacer **tu quiniela del Mundial 2026 con amigos**, en nuestra app puedes:

- Predecir las posiciones de los 12 grupos
- Rellenar el **bracket FIFA completo** (dieciseisavos, octavos, cuartos, semis, final)
- Apostar por el **goleador del torneo** (Bota de Oro)
- Predecir los **marcadores partido a partido** y los goleadores

Todo gratis, hasta 5 quinielas privadas por usuario. [Empieza tu quiniela](/login?next=%2Fonboarding).`,
  },
  {
    slug: "sedes-estadios-mundial-2026-usa-canada-mexico",
    title:
      "Las 16 sedes del Mundial 2026: estadios, capacidad y partidos en USA, Canadá y México",
    seoTitle: "Sedes Mundial 2026 · 16 estadios en USA, Canadá y México",
    excerpt:
      "Guía completa de los 16 estadios del Mundial 2026: capacidad, ciudades, partidos que acogen y todo lo que debes saber de cada sede en USA, Canadá y México.",
    category: "destacada",
    tags: ["Sedes Mundial 2026", "Estadios", "USA", "Canadá", "México"],
    relatedTeamCodes: ["USA", "CAN", "MEX"],
    daysAgo: 4,
    body: `El **Mundial 2026** se juega en **16 sedes** repartidas entre tres países: Estados Unidos (11 ciudades), México (3) y Canadá (2). Es la primera vez en la historia que tres países comparten una Copa del Mundo. Aquí va la guía completa por país, con capacidades y partidos confirmados.

## Estados Unidos (11 sedes, 78 partidos)

Estados Unidos acoge **78 de los 104 partidos** del torneo, incluida la **final del 19 de julio en MetLife Stadium**.

### Los grandes recintos

- **MetLife Stadium (East Rutherford, NJ)** — 82.500 plazas. **Acoge la final**. Casa de NY Giants y Jets.
- **AT&T Stadium (Arlington, Texas)** — 94.000 plazas. Sede de una de las dos semifinales y, durante el torneo, el estadio con mayor capacidad de todo el Mundial.
- **Mercedes-Benz Stadium (Atlanta)** — 75.000 plazas. La otra semifinal se juega aquí.
- **Arrowhead Stadium (Kansas City)** — 73.000 plazas. Récord histórico de decibelios en deporte en vivo.
- **NRG Stadium (Houston)** — 72.000 plazas. Domo cubierto, climatización clave para el calor texano.

### Las otras seis

- **Levi's Stadium (Santa Clara, área de San Francisco)** — 71.000 plazas.
- **SoFi Stadium (Inglewood, área de Los Ángeles)** — 70.000 plazas. El estadio más moderno del torneo, con la espectacular pantalla oval Infinity Screen.
- **Lincoln Financial Field (Filadelfia)** — 69.000 plazas.
- **Lumen Field (Seattle)** — 69.000 plazas. Tradición soccer fuerte en EE. UU.
- **Gillette Stadium (Foxborough, área de Boston)** — 65.000 plazas. La sede más al norte del país.
- **Hard Rock Stadium (Miami Gardens)** — 65.000 plazas. Florida, con todo lo que implica el calor de junio.

> Mira nuestra [guía de sedes](/sedes) para detalle por estadio: cómo llegar, qué selecciones juegan en cada uno y el listado de partidos por recinto.

## México (3 sedes, 13 partidos)

México regresa como anfitriona **40 años después de 1986**. Sus tres sedes están en el centro y norte del país:

- **Estadio Azteca / Estadio Ciudad de México (CDMX)** — 83.000 plazas. **Acoge el partido inaugural del 11 de junio**. Durante la Copa, FIFA lo cita oficialmente como "Estadio Ciudad de México" por motivos contractuales de patrocinio. Tercera Copa del Mundo del recinto (1970, 1986, 2026): récord absoluto mundial.
- **Estadio Akron (Guadalajara)** — 48.000 plazas. Casa de las Chivas.
- **Estadio BBVA (Monterrey)** — 53.500 plazas. Casa de los Rayados.

La gran ventaja del Estadio Ciudad de México: la **altitud** (2.240 m sobre el nivel del mar), que penaliza físicamente a las selecciones no aclimatadas.

## Canadá (2 sedes, 13 partidos)

Canadá es el más modesto de los tres anfitriones, con sólo dos estadios y partidos limitados a fase de grupos y dieciseisavos:

- **BMO Field (Toronto)** — 45.000 plazas (ampliado para el Mundial). Casa del Toronto FC.
- **BC Place (Vancouver)** — 54.500 plazas. Sede ya conocida por el Mundial Femenino 2015.

## El show de medio tiempo

La final de **MetLife Stadium** será la primera en la historia del Mundial en tener **un show de medio tiempo** al estilo del Super Bowl. Lo co-produce Global Citizen y la FIFA ha confirmado un cartel encabezado por **Madonna**, **Shakira** y **BTS** para una actuación de 11 a 15 minutos.

## ¿Cuál es la mejor sede para ver un partido?

Tres recomendaciones según FIFA y la propia experiencia de cada estadio:

1. **MetLife Stadium**, por la final y el ambiente multicultural de Nueva York.
2. **Estadio Ciudad de México**, por la historia y el ambiente único.
3. **SoFi Stadium**, por ser el estadio más moderno y la mayor pantalla del mundo.

Para hacer tu quiniela y predecir resultados partido a partido, [únete gratis a una](/login?next=%2Fonboarding). Y revisa el [calendario completo](/calendario) para ver qué selecciones juegan en qué estadios.`,
  },
  {
    slug: "candidatos-bota-oro-mundial-2026-mbappe-haaland-lamine",
    title:
      "Candidatos a la Bota de Oro 2026: Mbappé, Kane, Messi, Haaland y Lamine Yamal",
    seoTitle: "Bota de Oro 2026 · Cuotas Mbappé, Kane, Messi y Haaland",
    excerpt:
      "Quién marcará más goles en el Mundial 2026. Repasamos a los favoritos a la Bota de Oro — Mbappé, Kane, Messi, Haaland y Lamine Yamal — con cuotas de mercado actualizadas.",
    category: "analisis",
    tags: [
      "Bota de Oro 2026",
      "Mbappé",
      "Harry Kane",
      "Haaland",
      "Lamine Yamal",
      "Messi",
    ],
    relatedTeamCodes: ["FRA", "ENG", "ARG", "NOR", "ESP"],
    daysAgo: 5,
    body: `La **Bota de Oro** — el premio al máximo goleador del Mundial — es probablemente la apuesta más jugosa de cualquier quiniela del torneo. En 2022 la ganó **Kylian Mbappé** con 8 goles; en 2018, **Harry Kane** con 6 goles; en 2014, **James Rodríguez** con 6 goles. Te dejamos los principales candidatos según las cuotas de mercado y el contexto deportivo a un mes del torneo.

> Cuotas en formato americano (+600 significa que apostando 100$ ganas 600$). Las cifras son una referencia agregada de RotoWire, FOX Sports y casas internacionales a 15 de mayo de 2026 y pueden moverse cada semana.

## 1. Kylian Mbappé (Francia) — favorito claro

**Cuota:** +600.

Mbappé llega al Mundial 2026 a los **27 años**, en el pico físico de su carrera y tras una temporada de récord en el Real Madrid. Ya conoce el formato Mundial — **12 goles entre 2018 (4) y 2022 (8)** — y Francia parte como una de las favoritas también al título (segunda cuota más corta a campeón, por detrás únicamente del país anfitrión de la zona favorita). Si Francia llega lejos, el patrón estadístico de Mbappé es marcar.

Francia juega el **Grupo I** junto a **Noruega**, **Senegal** e **Irak**. El primero es atractivo porque mete a Mbappé y a Haaland en un grupo, lo que reorganiza el head-to-head goleador desde la primera jornada.

## 2. Harry Kane (Inglaterra) — segundo en cuota

**Cuota:** +700.

Kane fue **Bota de Oro en 2018** con 6 goles, fue el máximo goleador del año pasado en la Bundesliga y llega como capitán de una Inglaterra que está en el **Grupo L** junto a **Croacia**, **Ghana** y **Panamá** — un sorteo razonablemente plácido. Su lectura del área sigue siendo la mejor del torneo. La incógnita: Inglaterra históricamente flojea en cruces decisivos.

## 3. Lionel Messi (Argentina) — la posible despedida

**Cuota:** +1200.

Casi con seguridad el **último Mundial** del 10 argentino, a sus 38 años. No llega ya con el volumen de gol de otros torneos (Argentina está construida más para el conjunto que para que Messi anote en serie), pero su capacidad para jugadas decisivas en eliminatorias está intacta. Argentina cayó en el **Grupo J** con **Argelia**, **Austria** y **Jordania**, uno de los grupos más asequibles del sorteo.

## 4. Erling Haaland (Noruega) — la X

**Cuota:** +1400.

Noruega ha logrado **clasificarse a un Mundial por primera vez desde 1998** gracias en gran parte a Haaland. Es una bestia goleadora a club, pero la duda es si el resto del equipo le sirve los balones que sí tiene en Manchester City — y, sobre todo, qué tan lejos llega Noruega. Le tocó el sorteo más cruel: **Grupo I** con **Francia** (Mbappé directo), **Senegal** e **Irak**. Probablemente caiga en octavos o cuartos, lo que limita su número de partidos.

## 5. Lamine Yamal (España) — la apuesta de valor

**Cuota:** +1600.

A sus **18 años**, llega como una de las figuras del Mundial tras ser MVP de la Euro 2024. Con España como una de las cuatro favoritas, su escenario goleador es teóricamente ideal: muchos partidos y mucho juego ofensivo. España está en el **Grupo H** junto a **Uruguay** (el rival fuerte), **Cabo Verde** (debut absoluto) y **Arabia Saudí**.

El contra: Lamine no es un '9' nato. Comparte protagonismo ofensivo con Nico Williams y los delanteros centro. Por eso la cuota se aleja del top: muchos números, pero repartidos.

## Apuestas alternativas a considerar

Otros nombres que aparecen en la mayoría de listas de favoritos a Bota de Oro (cuotas que se mueven cada semana):

- **Vinicius Jr.** y **Raphinha** (Brasil): cuota larga pero Brasil está en el **Grupo C** con **Marruecos**, **Escocia** y **Haití** — calendario que pinta a muchos goles si Brasil pasa cómoda.
- **Cristiano Ronaldo** (Portugal): aunque ya a sus 40, sigue con olfato. Portugal está en el **Grupo K** con **Colombia** (rival fuerte), RD Congo y Uzbekistán.
- **Cole Palmer** (Inglaterra): segundo nombre de Inglaterra después de Kane.

## Cómo el formato a 48 afecta a la Bota de Oro

El nuevo formato cambia las matemáticas del premio:

- **Más partidos por finalista**. Una selección que llegue a la final juega ahora **8 partidos** (3 de grupos + R32 + R16 + QF + SF + final), uno más que en formatos anteriores. Eso da una jornada adicional para sumar goles.
- **Goles de fase de grupos** suelen ser más fáciles de inflar contra rivales débiles del bombo 4. Las selecciones favoritas con grupos cómodos parten con ventaja estadística.
- **Tiebreakers**: en caso de empate a goles entre dos goleadores, gana quien tenga más asistencias; luego, quien haya jugado menos minutos.

## Cómo predecir la Bota de Oro en tu quiniela

En **Quiniela Mundial 2026** puedes apostar por tu candidato a máximo goleador como parte de las **6 categorías de predicción**. Si tu jugador acaba como máximo goleador del torneo, sumas **15 puntos**. Si queda 2º o 3º, **5 puntos**. Si entra entre los 5 primeros, **2 puntos**. [Crea tu quiniela](/login?next=%2Fonboarding) y elige a tu favorito antes del 11 de junio.

> Curiosidad: solo dos jugadores han ganado la Bota de Oro **y** la Copa del Mundo el mismo año en la era moderna: Mario Kempes (Argentina 1978, 6 goles) y, antes de él, Gerd Müller (Alemania Federal 1970, 10 goles), aunque ese año Brasil ganó el título. La combinación campeón + máximo goleador en la misma persona es estadísticamente rara.`,
  },
  {
    slug: "grupos-mundial-2026-favoritos-bombo-muerte",
    title:
      "Los 12 grupos del Mundial 2026: análisis, favoritos y grupo de la muerte",
    seoTitle: "Grupos Mundial 2026 · Análisis y favoritos en los 12 grupos",
    excerpt:
      "Tras el sorteo del 5 de diciembre de 2025 en Washington, los 12 grupos del Mundial 2026 están definidos. Análisis grupo a grupo: dónde están los favoritos, cuál es el grupo de la muerte y las selecciones outsider.",
    category: "analisis",
    tags: [
      "Grupos Mundial 2026",
      "Grupo de la muerte",
      "Sorteo Mundial 2026",
      "Kennedy Center",
    ],
    relatedTeamCodes: [],
    daysAgo: 6,
    body: `El **sorteo del Mundial 2026** se celebró el **5 de diciembre de 2025 en el Kennedy Center de Washington D.C.**. Por primera vez, distribuyó **48 selecciones en 12 grupos de 4**. Aquí va el análisis grupo a grupo con los emparejamientos confirmados.

## Cómo funcionó el sorteo a 48

Los 48 clasificados se distribuyeron en **4 bombos** de 12 selecciones cada uno, ordenados por ranking FIFA. Las tres anfitrionas (México, Canadá, Estados Unidos) fueron cabeza de los grupos A, B y D respectivamente. Brasil cerró el resto de cabezas de serie del bombo 1 junto a Alemania, Países Bajos, Bélgica, España, Francia, Argentina, Portugal e Inglaterra.

## Los 12 grupos confirmados

A continuación, los 12 grupos tal y como quedaron tras el sorteo y los repechajes:

| Grupo | Cabeza | Equipos |
|-------|--------|---------|
| A | México | México, Sudáfrica, Corea del Sur, República Checa |
| B | Canadá | Canadá, Bosnia y Herzegovina, Catar, Suiza |
| C | Brasil | Brasil, Marruecos, Escocia, Haití |
| D | Estados Unidos | USA, Paraguay, Australia, Turquía |
| E | Alemania | Alemania, Curazao, Costa de Marfil, Ecuador |
| F | Países Bajos | Países Bajos, Japón, Suecia, Túnez |
| G | Bélgica | Bélgica, Egipto, Irán, Nueva Zelanda |
| H | España | España, Cabo Verde, Arabia Saudí, Uruguay |
| I | Francia | Francia, Senegal, Irak, Noruega |
| J | Argentina | Argentina, Argelia, Austria, Jordania |
| K | Portugal | Portugal, RD Congo, Uzbekistán, Colombia |
| L | Inglaterra | Inglaterra, Croacia, Ghana, Panamá |

Mira la [ficha de cada selección](/equipos) para profundizar en cada equipo, y la [página de cada grupo](/grupos) para ver fechas y horarios de los partidos.

## ¿Cuál es el grupo de la muerte?

El consenso post-sorteo apuntó a tres grupos como los más exigentes:

- **Grupo C (Brasil)**: la *Canarinha* comparte grupo con **Marruecos** (semifinalista en Qatar 2022) y **Escocia**, lo que lo convierte en el grupo de cabeza de serie con el bombo 2 más fuerte.
- **Grupo H (España)**: España debe sortear a **Uruguay** — el rival fuerte del bombo 2 — además de Cabo Verde y Arabia Saudí. Cruce histórico que recuerda al Mundial 2010.
- **Grupo I (Francia)**: con **Senegal** del bombo 2 y, sobre todo, **Noruega** del bombo 3, Francia se topa con la **Erling Haaland** desde la primera fase. Es probablemente el grupo más mediático del torneo.

## Los favoritos al título

Las cuotas de mercado a un mes del torneo dan estas favoritas principales:

1. **Argentina** — vigente campeona. Defender un Mundial es históricamente difícil (solo Italia 1934-38 y Brasil 1958-62 lo han logrado).
2. **Francia** — Mbappé en su pico físico, plantilla con cuatro recambios por puesto.
3. **España** — campeona vigente de Europa, equipo más coral, generación Lamine + Pedri.
4. **Brasil** — proyecto bajo Carlo Ancelotti (primer seleccionador europeo de su historia).
5. **Inglaterra** — sorteo benévolo y la generación de Bellingham/Foden/Palmer en su techo.

Por debajo, **Alemania**, **Portugal** y **Países Bajos** completan el lote de aspirantes europeos.

## Las posibles sorpresas

El formato a 48 abre la puerta a más outsiders que nunca:

### Marruecos (Grupo C)
**Semifinalista en Qatar 2022**, con la mejor generación de su historia. Le tocó cruzarse con Brasil en grupo, pero un segundo puesto sigue siendo realista. Si pasa, es candidata real a octavos largos.

### Estados Unidos (Grupo D)
Anfitrión, con la generación más profesionalizada de su historia. Su grupo con **Paraguay**, **Australia** y **Turquía** es asequible, lo que les da margen para llegar como mínimo a octavos.

### Senegal (Grupo I)
Campeones de África en activo. Comparten grupo con Francia y Noruega — un escenario duro para cuajar pero ideal para reivindicarse.

### Croacia (Grupo L)
Subcampeones de 2018, tercer puesto de 2022. Con Luka Modrić cerca de los 40 años, es probablemente su última función.

### Uruguay (Grupo H)
Eterno bombo 2 con peligro real. Se cruzaron con España en grupo: enfrentamiento cargado de historia que viene desde el Mundial 2010.

## ¿Quién se cuela como mejor tercero?

Una de las novedades del formato es que **los 8 mejores terceros** pasan a dieciseisavos. Eso significa que perder un partido en fase de grupos ya no es eliminatorio, y selecciones de segundo nivel (Ecuador, Egipto, Turquía, Japón) tienen una vía clara para colarse en eliminatorias.

**Referencia histórica**: en la Euro 2016 — el último torneo grande con sistema de mejores terceros — solo hizo falta **3-4 puntos** para entrar como uno de los mejores terceros si el grupo no era de los más fuertes. La misma lógica aplica aquí.

## Cómo predecirlo en tu quiniela

En **Quiniela Mundial 2026** puedes:

- Predecir las **posiciones finales de los 12 grupos** (1º, 2º, 3º, 4º) — la posición exacta da 3 puntos por selección.
- Hacer el **bracket completo** desde dieciseisavos hasta la final, con puntos crecientes por ronda hasta los 20 del campeón.
- Apostar por el **goleador del torneo** y por los marcadores partido a partido.

[Crea tu quiniela](/login?next=%2Fonboarding) gratis con tu cuenta y empieza antes del 11 de junio.

> Si te quedas a medias, el [calendario completo](/calendario) y la [ficha de cada equipo](/equipos) te dan el contexto suficiente para arrancar.`,
  },
  {
    slug: "previa-partido-inaugural-mundial-2026-azteca",
    title:
      "Previa México vs Sudáfrica: el partido inaugural del Mundial 2026 en el Azteca",
    seoTitle:
      "México vs Sudáfrica · Partido inaugural Mundial 2026 en el Azteca",
    excerpt:
      "El 11 de junio, México y Sudáfrica se reencuentran 16 años después de la inauguración de Sudáfrica 2010. Previa, datos y claves del partido que abre el Mundial 2026 en el Azteca.",
    category: "previa",
    tags: [
      "México",
      "Sudáfrica",
      "Partido inaugural",
      "Estadio Azteca",
      "11 junio",
    ],
    relatedTeamCodes: ["MEX", "RSA"],
    daysAgo: 7,
    body: `El **jueves 11 de junio de 2026 a las 13:00 (hora del centro de México)**, el **Estadio Ciudad de México** — el Azteca — abre el Mundial 2026. **México** recibe a **Sudáfrica** en el partido inaugural, en una repetición sorpresa del partido inaugural del Mundial 2010 (Sudáfrica vs México, también un 11 de junio, hace exactamente 16 años).

## Lo que está en juego

El partido inaugural arranca con tres datos para la historia:

1. **El Estadio Azteca acoge su tercer Mundial** (1970, 1986, 2026). Es el primer estadio del mundo en lograrlo.
2. **Es el primer partido del torneo expandido a 48 selecciones**.
3. **Es la primera vez que dos selecciones se reencuentran en partido inaugural** en dos Mundiales distintos (2010 y 2026).

## Cómo llega México

**Javier "El Vasco" Aguirre** dirige al *Tri* en su tercer Mundial como seleccionador. El 12 de mayo de 2026 anunció la prelista de 55 jugadores, con **Edson Álvarez** confirmado como capitán. La lista definitiva de 26 — la oficial del Mundial — se anuncia en la semana del torneo.

Algunos puntos de la prelista publicada en mayo de 2026:

- **Edson Álvarez** (West Ham), capitán: ancla del mediocampo.
- **Santiago Giménez** (Milan): referencia ofensiva.
- **Raúl Jiménez**: a sus 35 años, viajará para su tercer Mundial.

Para el contexto deportivo previo, el *Tri* viene de un ciclo irregular: tras la eliminación en fase de grupos de Qatar 2022 — la primera vez desde 1978 que no pasaba —, Aguirre tomó el relevo con el mandato de cambiar la cara. La preparación pre-Mundial ha sido en altura (CDMX) para optimizar la ventaja del Azteca.

## Cómo llega Sudáfrica

**Hugo Broos**, técnico belga, dirige a *Bafana Bafana* desde 2021. Sudáfrica regresa a un Mundial **16 años después** — su última participación fue **Sudáfrica 2010** como anfitrión.

Llegan tras superar una eliminatoria africana competida y se han mostrado sólidos en amistosos recientes. **No son un equipo a tomar a broma**: el sorteo les colocó como segundo cabeza de bombo 2 más alto del grupo, junto a **Corea del Sur** y **República Checa**.

## El factor Azteca

Jugar en el Azteca da a México una ventaja real:

- **Altitud de 2.240 m**: penaliza a selecciones no aclimatadas. Los rivales suelen quedarse 7-10 días en CDMX antes del partido para minimizar el impacto.
- **Capacidad**: 83.000 espectadores, una masa abrumadoramente mexicana.
- **Récord histórico**: en partidos oficiales de eliminatorias / Copa Oro, México arrastra un dominio histórico de décadas en el Azteca.
- **Tradición de aperturas**: el Azteca ya inauguró Mundial 70 y Mundial 86 — y en ambos casos México ganó su partido inaugural (1-0 a la URSS en el 70, 2-1 a Bélgica en el 86).

## Las claves del partido

Tres puntos que va a vigilar el cuerpo técnico:

1. **Primera mitad**: México tiene que aprovechar el factor altitud. Presión alta los 25 primeros minutos.
2. **Segunda parte**: dosificar. Es el primer partido de un torneo largo y un mal resultado lastra el grupo entero.
3. **Balón parado**: el plan B de Sudáfrica suele incluir balones largos al área. Los centrales mexicanos van a sufrir si no leen bien las segundas jugadas.

## Cuándo y dónde verlo

- **Fecha**: jueves 11 de junio de 2026.
- **Hora**: 13:00 (hora del centro de México) / 15:00 ET / 12:00 PT / 21:00 hora peninsular española.
- **Sede**: Estadio Ciudad de México (Azteca), Ciudad de México.
- **Ceremonia inaugural**: previa al pitido inicial, con un cartel musical encabezado por **Maná**, **Alejandro Fernández**, **Belinda**, **Lila Downs**, **Los Ángeles Azules**, **Tyla**, **J Balvin** y **Danny Ocean**.

## Cómo predecirlo en tu quiniela

Si vas a jugar la **quiniela del Mundial 2026**, este partido es el primero de los **104 marcadores** que tienes que predecir. Por marcador exacto sumas **5 puntos**; por acertar solo el ganador, **2 puntos**; por predecir un goleador del partido, **4 puntos**.

[Crea tu quiniela gratis](/login?next=%2Fonboarding) y arranca con el inaugural. Revisa también la [ficha de México](/equipos/MEX), la [ficha de Sudáfrica](/equipos/RSA) y el [calendario completo](/calendario).`,
  },
  {
    slug: "como-funciona-quiniela-mundial-amigos-2026",
    title:
      "Cómo hacer una quiniela del Mundial 2026 con amigos: guía completa (gratis, sin Excel)",
    seoTitle: "Quiniela Mundial 2026 entre amigos · Cómo hacerla gratis",
    excerpt:
      "Crea tu quiniela del Mundial 2026 con tus amigos sin Excel ni capturas de WhatsApp. Te contamos cómo funciona, cómo se puntúa y cómo invitar a tu peña.",
    category: "destacada",
    tags: [
      "Quiniela Mundial 2026",
      "Quiniela amigos",
      "Cómo hacer quiniela",
      "Gratis",
    ],
    relatedTeamCodes: [],
    daysAgo: 8,
    body: `Hacer una **quiniela del Mundial 2026 con amigos** es una tradición. El problema clásico es la logística: una hoja de Excel que se rompe, capturas de WhatsApp con marcadores escritos a mano, y el de turno encargado de "calcular puntos" que se olvida tres jornadas. En **Quiniela Mundial 2026** lo hemos resuelto.

## Qué es Quiniela Mundial 2026

Una app web (también funciona como app móvil tras "Añadir a pantalla de inicio") donde puedes:

- **Predecir las posiciones de los 12 grupos** (1º, 2º, 3º, 4º).
- **Rellenar el bracket completo**: dieciseisavos, octavos, cuartos, semis y final.
- **Apostar por la Bota de Oro** (máximo goleador del torneo).
- **Predecir los 104 marcadores** partido a partido.
- **Elegir goleadores** por partido.
- Responder a **predicciones especiales** (preguntas que define el admin, tipo "¿llegará alguna selección africana a semis?").

Cada categoría tiene sus puntos. Conforme se juegan los partidos, los puntos se suman automáticamente. El ranking se actualiza en vivo.

## Cómo crear tu quiniela

Tres pasos:

1. **Crea tu cuenta gratis** desde [aquí](/login?next=%2Fonboarding). Solo necesitas email — se te envía un magic link.
2. **Crea una quiniela privada** desde la sección Mi Quiniela. Recibes un **código de 4 dígitos** y un enlace de invitación.
3. **Comparte el código o el enlace** con tu peña. Pueden unirse todos tus amigos al instante.

Cada usuario puede **pertenecer a 5 quinielas privadas** (creadas por él o por amigos), además de la **Quiniela Pública** (siempre activa, con todos los usuarios de la app).

## Cómo se puntúa

El sistema de puntos es transparente y configurable: en cada quiniela, el admin puede ajustar los pesos desde \`/admin/reglas\`. **Por defecto**:

| Categoría | Puntos |
|-----------|--------|
| Posición exacta de una selección en grupo | 3 pts |
| Posición adyacente (±1) | 1 pt |
| Bonus: aciertas los 2 que pasan, aunque cambien de orden | 1 pt |
| Pasa a octavos (R16) | 2 pts/equipo |
| Pasa a cuartos | 4 pts |
| Pasa a semifinales | 7 pts |
| Pasa a la final | 10 pts |
| Acertar al campeón | 20 pts |
| Bota de Oro (goleador exacto del torneo) | 15 pts |
| Bota de Oro top-3 | 5 pts |
| Bota de Oro top-5 | 2 pts |
| Marcador exacto de un partido | 5 pts |
| Resultado correcto (ganador / empate, sin marcador) | 2 pts |
| Goleador de partido | 4 pts |
| Bonus: tu goleador anota el primer gol | 2 pts |
| Predicciones especiales | 3-8 pts según pregunta |

En eliminatorias, el cálculo del marcador es ligeramente distinto: aciertas el clasificado por penaltis aunque no aciertes los 90' (3 pts), o aciertas el marcador a 90' (5 pts), o aciertas que va a penaltis aunque no aciertes el marcador (2 pts).

## Cómo es el ranking

Cada quiniela tiene **su propio ranking en vivo**. Puedes ver:

- **Posición general** de toda tu peña.
- **Tu tarjeta personal** con desglose de aciertos por categoría.
- **Comparativa** contra cualquier otro miembro: ves dónde le ganas y dónde te ganan.
- **Activity feed** con cada nuevo punto que se anota cualquiera.

## Cuándo cierran las predicciones

Las predicciones tienen **deadlines escalonados**:

- **Posiciones de grupo, bracket y Bota de Oro**: cierran al inicio del primer partido del Mundial (11 de junio, 13:00 hora del centro de México).
- **Marcadores partido a partido**: cierran al kickoff de cada partido individual.
- **Goleadores por partido**: igual, al kickoff de cada partido.

Eso significa que los **marcadores se pueden ir editando** hasta el último minuto antes de que empiece cada partido. La fase de grupos y el bracket no — esos se cierran de golpe el 11 de junio.

## ¿Cuánto cuesta?

Para la inmensa mayoría de peñas, **gratis**. Cero suscripción, cero anuncios, **hasta 20 miembros por quiniela privada**. Si juegas con tu grupo de amigos, tu familia o tu equipo de oficina pequeño, no vas a tocar ningún límite y no se te va a pedir ni una tarjeta.

Para **grupos grandes** — peñas de barrio, oficinas con plantilla amplia o asociaciones — hay [planes de pago](/precios) que suben el cupo hasta 50, 150 o ilimitado. Son **pagos únicos** por torneo, sin renovación automática, y se activan en el momento. Es lo que cubre desarrollo, hosting e infraestructura del proyecto.

## Cómo empezar

[Empieza tu quiniela del Mundial 2026 aquí](/login?next=%2Fonboarding). En 30 segundos tienes tu cuenta y puedes empezar a invitar a tu peña.

Si necesitas resolver dudas concretas, mira nuestras [preguntas frecuentes](/faq) o nuestro [contacto](/contacto).`,
  },
];
