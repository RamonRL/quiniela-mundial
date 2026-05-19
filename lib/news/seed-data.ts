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

## ¿Es realmente gratis?

Sí. **Cero coste**. Cero suscripción, cero anuncios. Es un proyecto sin ánimo de lucro entre amigos.

## Cómo empezar

[Empieza tu quiniela del Mundial 2026 aquí](/login?next=%2Fonboarding). En 30 segundos tienes tu cuenta y puedes empezar a invitar a tu peña.

Si necesitas resolver dudas concretas, mira nuestras [preguntas frecuentes](/faq) o nuestro [contacto](/contacto).`,
  },
];
