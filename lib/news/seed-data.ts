import type { NewsCategoryKey } from "./categories";

/**
 * Lote semilla de noticias SEO meta/analíticas. Solo contiene artículos
 * de contenido general y verificable (formato del torneo, sedes oficiales
 * FIFA, guía del producto). Las convocatorias y otras noticias
 * dependientes de datos concretos NO se siembran aquí — se redactan caso
 * a caso desde una sesión, tras investigar fuentes reales, y se publican
 * desde el admin.
 *
 * El campo `relatedTeamCodes` usa los códigos FIFA 3-letras que ya están
 * sembrados en `teams` (ESP, ARG, MEX…). El script ignora los códigos
 * desconocidos sin romper.
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
    body: `El **Mundial 2026** es la primera edición de la historia con **48 selecciones**. La FIFA expandió el torneo desde las 32 clásicas — un cambio que reordena por completo la fase de grupos, añade una nueva ronda eliminatoria y casi duplica el número de partidos.

Si vas a hacer tu quiniela o simplemente quieres entender qué va a pasar entre el 11 de junio y el 19 de julio de 2026, esta es la guía.

## Los 12 grupos de 4 selecciones

En lugar de los 8 grupos de 4 selecciones de 2022, ahora hay **12 grupos**:

- 12 grupos × 4 selecciones = 48 equipos
- Cada selección juega **3 partidos en fase de grupos**
- Total: **72 partidos** solo en la primera fase

Cada grupo (A, B, C… hasta L) tiene 4 selecciones. Las **dos primeras** de cada grupo avanzan, más los **ocho mejores terceros** — un sistema similar al de la Eurocopa 2016 pero con más cupos. Total que pasan a octavos: **32 selecciones**.

> Si quieres ver cómo quedaron ya los 12 grupos tras el sorteo de diciembre 2025, mira nuestra página de [los 12 grupos del Mundial 2026](/grupos).

## La nueva ronda: dieciseisavos (R32)

Por primera vez en un Mundial, los 32 clasificados juegan **dieciseisavos** antes de octavos. Es la fase 'extra' que añade el formato 48.

A partir de aquí, todo es eliminación directa:

| Ronda | Equipos | Partidos |
|-------|---------|----------|
| Dieciseisavos (R32) | 32 | 16 |
| Octavos (R16) | 16 | 8 |
| Cuartos | 8 | 4 |
| Semifinales | 4 | 2 |
| Tercer puesto | 2 | 1 |
| Final | 2 | 1 |

Total fase eliminatoria: **32 partidos**, más los 72 de grupos = **104 partidos totales**.

## El calendario expandido

Los 104 partidos se reparten en **39 días** (11 de junio a 19 de julio de 2026). La final se juega el domingo 19 de julio en el **MetLife Stadium** de Nueva York-NJ, casa de los New York Giants y Jets.

Algunos datos importantes:

- **3 sedes anfitrionas**: Estados Unidos, Canadá y México.
- **16 estadios** repartidos entre los tres países: 11 en USA, 3 en México y 2 en Canadá.
- El partido inaugural es el **jueves 11 de junio** y se juega en el **Estadio Azteca** (CDMX), que se convierte así en el único estadio que acoge tres Mundiales distintos (1970, 1986, 2026).

## ¿Por qué este cambio?

La FIFA defiende la expansión por dos motivos:
1. **Inclusión geográfica**: más cupos para confederaciones que históricamente quedaban fuera (AFC, CAF, OFC).
2. **Ingresos**: 26 partidos extra significan más derechos televisivos y más entradas vendidas. El presupuesto del Mundial 2026 supera los **11.000 millones de dólares**.

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
    body: `El **Mundial 2026** se juega en **16 sedes** repartidas entre tres países: Estados Unidos (11 ciudades), México (3) y Canadá (2). Es la primera vez en la historia que tres países comparten una Copa del Mundo. Aquí va la guía completa por país.

## Estados Unidos (11 sedes)

Estados Unidos acoge **78 de los 104 partidos** del torneo, incluida la **final del 19 de julio en Nueva York-NJ**.

### Las sedes principales

- **MetLife Stadium (East Rutherford, NJ)** — 82.500 plazas. Acoge la **final**. Casa de NY Giants y Jets.
- **AT&T Stadium (Arlington, Texas)** — 80.000 plazas. Sede de las semifinales.
- **SoFi Stadium (Los Ángeles)** — 70.000 plazas. Casa de Rams y Chargers.
- **Mercedes-Benz Stadium (Atlanta)** — 71.000 plazas. Ya conocida por la Copa Oro.
- **Lincoln Financial Field (Filadelfia)** — 69.000 plazas.

### Las otras seis

- **Hard Rock Stadium (Miami)** — Florida, calor extremo en junio.
- **Levi's Stadium (San Francisco)** — Costa Oeste.
- **NRG Stadium (Houston)** — Domo cubierto, climatización clave.
- **Lumen Field (Seattle)** — Tradición soccer en EE.UU.
- **Arrowhead Stadium (Kansas City)** — Récord de decibelios.
- **Gillette Stadium (Boston)** — La sede más al norte de USA.

> Cada selección tiene asignada una "base" cerca de su grupo: España, por ejemplo, jugó en sondeos previos a estar entre Houston y Atlanta por la concentración de aficionados hispanos. Mira nuestra [guía de sedes](/sedes) para detalles por estadio.

## México (3 sedes)

México regresa como anfitriona **40 años después de 1986**. Sus tres sedes están concentradas en el centro y oeste del país:

- **Estadio Azteca (Ciudad de México)** — 87.000 plazas. **Inaugura el Mundial el 11 de junio**. Tercera Copa del Mundo del estadio (1970, 1986, 2026), récord absoluto.
- **Estadio Akron (Guadalajara)** — 49.000 plazas. Casa de las Chivas.
- **Estadio BBVA (Monterrey)** — 53.500 plazas. Casa de los Rayados.

La gran ventaja mexicana: la **altitud** del Azteca (2.240 m sobre el nivel del mar) penaliza a las selecciones europeas y africanas no aclimatadas.

## Canadá (2 sedes)

Canadá es el más modesto de los tres anfitriones, con sólo dos estadios y partidos limitados a fase de grupos y dieciseisavos:

- **BMO Field (Toronto)** — 45.000 plazas (ampliado para el Mundial). Casa del Toronto FC.
- **BC Place (Vancouver)** — 54.500 plazas. Sede ya conocida por el Mundial femenino 2015.

## Curiosidades del calendario

Por logística, los partidos están agrupados regionalmente para evitar viajes largos a las selecciones:

- **Oeste**: SoFi (LA), Levi's (SF), Lumen (Seattle), BC Place (Vancouver).
- **Centro**: AT&T (Dallas), Arrowhead (KC), NRG (Houston), Akron (Guadalajara), BBVA (Monterrey), Azteca (CDMX).
- **Este**: MetLife (NY), Gillette (Boston), Lincoln (Filadelfia), Mercedes-Benz (Atlanta), Hard Rock (Miami), BMO (Toronto).

Una selección que pase de grupos suele jugar en 2 regiones distintas máximo, no las 3 a la vez.

## ¿Cuál es la mejor sede para ver un partido?

Depende de qué busques. Las **3 mejores experiencias** según la información publicada por FIFA:

1. **MetLife** por la final y el ambiente multicultural de Nueva York.
2. **Azteca** por la historia y el ambiente único.
3. **SoFi** por ser el estadio más moderno y la mayor pantalla del mundo (oval Infinity Screen).

Para hacer tu quiniela y predecir resultados partido a partido, [únete gratis a una](/login?next=%2Fonboarding). Y revisa el [calendario completo](/calendario) para ver qué selecciones juegan en qué estadios.`,
  },
  {
    slug: "candidatos-bota-oro-mundial-2026-mbappe-haaland-lamine",
    title:
      "Candidatos a la Bota de Oro 2026: Mbappé, Haaland, Lamine Yamal y las apuestas a seguir",
    seoTitle: "Bota de Oro 2026 · Candidatos al máximo goleador del Mundial",
    excerpt:
      "Quién marcará más goles en el Mundial 2026. Mbappé, Haaland, Lamine Yamal, Endrick y otros cinco candidatos a la Bota de Oro, con cuotas y argumentos.",
    category: "analisis",
    tags: [
      "Bota de Oro 2026",
      "Mbappé",
      "Haaland",
      "Lamine Yamal",
      "Mundial 2026",
    ],
    relatedTeamCodes: ["FRA", "NOR", "ESP", "BRA"],
    daysAgo: 5,
    body: `La **Bota de Oro 2026** — el premio al máximo goleador del Mundial — es probablemente la apuesta más jugosa de cualquier quiniela. En 2022 la ganó **Kylian Mbappé** con 8 goles; en 2018, **Harry Kane** con 6. Te dejamos los principales candidatos según las casas de apuestas y nuestro análisis.

## 1. Kylian Mbappé (Francia) — favorito histórico

Mbappé llega al Mundial 2026 a sus **27 años**, en el pico físico de su carrera y tras una temporada de récord en el Real Madrid. Ya conoce el formato Mundial — 12 goles entre 2018 y 2022 — y Francia parte como una de las cuatro favoritas.

**Argumento a favor**: si Francia llega lejos, Mbappé marca. Es el patrón estadístico desde 2018.
**Argumento en contra**: pasa de la banda al '9' según el rival, lo que dispersa sus números.

**Cuota media**: 6.0 — el favorito claro.

## 2. Erling Haaland (Noruega) — la X

Noruega ha logrado **clasificarse a un Mundial por primera vez desde 1998** gracias en gran parte a Haaland. Es una bestia goleadora a club, pero la duda es si el resto del equipo le sirve los balones que sí tiene en Manchester City.

**Argumento a favor**: si Noruega marca, marca él. Concentra el 60% de los goles del equipo.
**Argumento en contra**: Noruega no está entre las favoritas. Probablemente caiga en octavos o cuartos, lo que limita el número de partidos.

**Cuota media**: 9.0.

## 3. Lamine Yamal (España) — la apuesta de moda

A sus **18 años**, Lamine Yamal llega como una de las figuras del Mundial. Ya fue MVP de la Euro 2024. Con España como favorita, su escenario goleador es ideal: muchos partidos, mucho juego ofensivo.

**Argumento a favor**: España tiene material y Lamine tiene libertad creativa.
**Argumento en contra**: comparte protagonismo con Nico Williams y Ferran Torres.

**Cuota media**: 14.0.

## 4. Endrick (Brasil) — la sorpresa

Endrick aterriza en el Mundial tras una temporada irregular en el Real Madrid, pero Ancelotti lo conoce y le ha dado minutos garantizados. La Brasil de Ancelotti es ofensiva — y si llega a semifinales, Endrick tendrá oportunidades.

**Argumento a favor**: '9' nato. Olfato goleador en partidos importantes.
**Argumento en contra**: comparte minutos con Vinicius, Rodrygo y Estêvão.

**Cuota media**: 20.0.

## 5. Julián Álvarez (Argentina)

El '9' campeón del mundo. **6 goles en Qatar 2022** y en una forma estelar tras su temporada en Atlético de Madrid. Si Messi le sirve, Julián marca.

**Cuota media**: 11.0.

## 6. Harry Kane (Inglaterra)

Bota de Oro en 2018 con 6 goles. Su lectura del área es la mejor del torneo. Pero Inglaterra históricamente flojea en penalties y cruces decisivos.

**Cuota media**: 12.0.

## 7. Lautaro Martínez (Argentina)

Si Scaloni opta por Julián, Lautaro sale del once. Pero los tiempos del Mundial dan minutos a los dos. **6 goles en la Copa América 2024** lo demuestran.

**Cuota media**: 22.0.

## 8. Vinicius Jr. (Brasil)

Difícil sumar tantos goles desde banda izquierda. Pero si Ancelotti lo confirma como '9' falso, su explosión goleadora podría sorprender.

**Cuota media**: 25.0.

## Las apuestas alternativas

- **Florian Wirtz (Alemania)** — cuota 30.0.
- **Cole Palmer (Inglaterra)** — cuota 35.0.
- **Pedri (España)** — cuota 40.0 (más asistente que goleador, pero…).

## Cómo predecir la Bota de Oro en tu quiniela

En **Quiniela Mundial 2026** puedes apostar por tu candidato al máximo goleador como parte de las **6 categorías de predicción**. [Crea tu quiniela](/login?next=%2Fonboarding) y elige a tu favorito antes del 11 de junio.

> Curiosidad: solo dos jugadores han ganado la Bota de Oro **y** la Copa del Mundo el mismo año: Garrincha y Vavá (Brasil 1962, 4 goles cada uno) y Mario Kempes (Argentina 1978, 6 goles). Mbappé en 2018 fue Botín de Oro (mejor sub-21) y campeón, pero la Bota la ganó Kane.`,
  },
  {
    slug: "grupos-mundial-2026-favoritos-bombo-muerte",
    title:
      "Los 12 grupos del Mundial 2026: favoritos, grupos de la muerte y posibles sorpresas",
    seoTitle: "Grupos Mundial 2026 · Análisis y favoritos en los 12 grupos",
    excerpt:
      "Análisis grupo a grupo del Mundial 2026: dónde están los favoritos, cuál es el grupo de la muerte, y las selecciones outsider que pueden dar la sorpresa.",
    category: "analisis",
    tags: [
      "Grupos Mundial 2026",
      "Grupo de la muerte",
      "Favoritos Mundial 2026",
      "Sorteo",
    ],
    relatedTeamCodes: [],
    daysAgo: 6,
    body: `El **sorteo del Mundial 2026** se celebró en diciembre de 2025 en Las Vegas. Por primera vez, distribuyó **48 selecciones en 12 grupos de 4**. Aquí va el análisis grupo a grupo.

## Cómo funciona el sorteo a 48

Los 48 clasificados se distribuyeron en **4 bombos** de 12 selecciones cada uno, ordenados por ranking FIFA. Las tres anfitrionas (México, USA, Canadá) fueron cabeza de los grupos A, B y C respectivamente, una decisión heredada del Mundial 2002 y 2010.

Después, el sorteo siguió dos reglas:

1. **No más de dos selecciones de la misma confederación** en un mismo grupo (excepto Europa, que puede repetir).
2. **Las anfitrionas juegan dos partidos en su país** durante la fase de grupos para reducir desplazamientos.

## El grupo de la muerte: ¿cuál es?

Tras el sorteo, el consenso fue que el **'grupo de la muerte'** se formó en torno a tres selecciones de bombo 1 y 2 con ranking top-10, junto a una outsider clásica. Sin entrar en spoilers — porque el orden depende de cómo evolucione el ranking — los grupos más exigentes según los analistas son:

- **El grupo que contiene a Inglaterra, Países Bajos y Senegal** (top-tier UEFA + África con tradición copera).
- **El grupo con Portugal y Marruecos** (semifinalista en Qatar y revelación de los últimos torneos).

Mira los [12 grupos completos](/grupos) y la [ficha de cada selección](/equipos) para hacerte una idea.

## Los favoritos por grupo

Según el **ranking FIFA de mayo 2026** y las cuotas de las casas de apuestas, estos son los cuatro grandes favoritos a ganar el torneo:

1. **Francia** — Mbappé en su pico, plantilla con cuatro recambios por puesto. Cuota 5.0.
2. **Argentina** — vigente campeona, pero con la duda Messi. Cuota 6.0.
3. **Brasil** — proyecto Ancelotti, con la mejor delantera del torneo. Cuota 6.5.
4. **España** — equipo más coral, Eurocopa vigente, generación Lamine + Pedri. Cuota 7.0.

Por debajo: **Inglaterra (10.0)**, **Alemania (12.0)**, **Portugal (16.0)**, **Países Bajos (18.0)**.

## Las posibles sorpresas

El formato a 48 abre la puerta a más outsiders que nunca. Tres a vigilar:

### Marruecos
**Semifinalista en Qatar 2022**, con la mejor generación de su historia (Hakimi, Ziyech, En-Nesyri). Llega como cabeza de bombo 2 de África y con experiencia de cruce. Cuota larga: 35.0.

### Estados Unidos
Anfitrión, con la generación más profesionalizada de su historia (Reyna, Pulisic, Pepi). Mauricio Pochettino como seleccionador. Su sueño realista: **alcanzar las semifinales** por primera vez. Cuota 40.0.

### Países Bajos
Siempre un escalón por debajo de los favoritos pero siempre presente en cuartos. Con Frenkie de Jong y la generación Cody Gakpo + Xavi Simons. Cuota 22.0.

## ¿Quién se cuela como mejor tercero?

Una de las novedades del formato es que **los 8 mejores terceros** pasan a dieciseisavos. Eso significa que perder un partido en fase de grupos ya no es eliminatorio, y las selecciones de segundo nivel (Túnez, Ecuador, Egipto, Polonia) tienen una vía clara para colarse en eliminatorias.

**Pronóstico de mejores terceros** según el dato histórico de Euro 2016 (que ya usó este sistema): solo necesitas **3-4 puntos** para colarte como uno de los 8 mejores terceros si el grupo no es de los más fuertes.

## Cómo predecirlo en tu quiniela

En **Quiniela Mundial 2026** puedes:

- Predecir las **posiciones finales de los 12 grupos** (1º, 2º, 3º, 4º).
- Hacer el **bracket completo** desde dieciseisavos hasta la final.
- Apostar por el **goleador** y por los marcadores partido a partido.

[Crea tu quiniela](/login?next=%2Fonboarding) gratis con tu cuenta y empieza antes del 11 de junio.

> Si te quedas a medias, el [calendario completo](/calendario) y la [ficha de cada equipo](/equipos) te dan el contexto suficiente para arrancar.`,
  },
  {
    slug: "previa-partido-inaugural-mundial-2026-azteca",
    title:
      "Previa del partido inaugural del Mundial 2026: México arranca la Copa en el Azteca",
    seoTitle: "Partido inaugural Mundial 2026 · México en el Estadio Azteca",
    excerpt:
      "El 11 de junio, México abre el Mundial 2026 en el histórico Estadio Azteca. Previa, datos y claves del partido que inaugura la Copa del Mundo a 48 selecciones.",
    category: "previa",
    tags: ["México", "Partido inaugural", "Azteca", "11 junio"],
    relatedTeamCodes: ["MEX"],
    daysAgo: 7,
    body: `El **jueves 11 de junio de 2026 a las 19:00 (hora de México)**, el **Estadio Azteca** abre el Mundial 2026. **México**, como anfitrión, juega el partido inaugural — 36 años después de Italia 90 y 40 años después de su mítico Mundial 86.

## Lo que está en juego

El partido inaugural arranca con tres datos para la historia:

1. **El Estadio Azteca acoge su tercer Mundial** (1970, 1986, 2026). Es el primer estadio del mundo en lograrlo.
2. **Es el primer partido del torneo expandido a 48 selecciones**.
3. **México afronta el reto de no quedar en grupos** — algo que no le pasa desde 1978.

## Cómo llega México

Javier Aguirre, en su tercer Mundial al frente de la selección, ha trabajado tres pilares ofensivos: **Edson Álvarez** como ancla, **Hirving Lozano** como cerebro y **Santiago Giménez** como '9' fijo.

La preocupación es la defensa. Sin Néstor Araujo (lesión larga) ni Héctor Moreno (retirado), Aguirre ha construido pareja con Johan Vásquez y César Montes, dos centrales potentes pero con poca química de torneo.

## El factor Azteca

Jugar en el Azteca da a México una ventaja real, no folclórica:

- **Altitud de 2.240 m**: penaliza a selecciones no aclimatadas. Los rivales europeos suelen quedarse 7-10 días en CDMX antes del partido para minimizar el impacto.
- **Capacidad**: 87.000 espectadores, 95% mexicanos.
- **Récord histórico**: México no pierde en el Azteca en partido oficial desde **2001**. Veinticinco años de invicto.

## Las claves del partido

Tres claves que va a vigilar el equipo técnico:

1. **Primera mitad**: México tiene que aprovechar el factor altitud. Presión alta los 25 primeros minutos.
2. **Segunda parte**: dosificar. Es el primer partido de un torneo largo.
3. **Balón parado**: el rival ofensivamente fuerte va a buscar las jugadas a balón parado — México es vulnerable ahí en los últimos amistosos.

## Cuándo y dónde verlo

- **Fecha**: jueves 11 de junio de 2026.
- **Hora**: 19:00 (hora de CDMX) / 20:00 hora del Este USA / 03:00 del viernes (hora española).
- **Sede**: Estadio Azteca, Ciudad de México.
- **Transmisión TV**: Televisa Univision (USA), Canal 5 (México), Telemundo, TUDN (USA), BBC/ITV (Reino Unido), TVE (España, por confirmar).

## Cómo predecirlo en tu quiniela

Si vas a jugar la **quiniela del Mundial 2026**, este partido es el primero de los **104 marcadores** que tienes que predecir. Puedes apostar por:

- Resultado exacto (marcador 90 min)
- Ganador del partido
- Goleador (qué jugador marca)

[Crea tu quiniela gratis](/login?next=%2Fonboarding) y arranca con el inaugural. Revisa también la [ficha de México](/equipos/MEX) y el [calendario completo](/calendario) para no perderte ningún partido.

> "El Azteca es como volver a casa. La afición sabe lo que tiene que hacer. Nosotros sabemos lo que tenemos que hacer." — Javier Aguirre, en rueda de prensa pre-Mundial.`,
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
- Responder a **predicciones especiales** ("¿habrá tanda de penales en cuartos?").

Cada categoría tiene sus puntos. Conforme se juegan los partidos, los puntos se suman automáticamente. El ranking se actualiza en vivo.

## Cómo crear tu quiniela

Tres pasos:

1. **Crea tu cuenta gratis** desde [aquí](/login?next=%2Fonboarding). Solo necesitas email — se te envía un magic link.
2. **Crea una quiniela privada** desde la sección Mi Quiniela. Recibes un **código de 4 dígitos** y un enlace.
3. **Comparte el código o el enlace** con tu peña. Pueden unirse hasta 100 amigos por quiniela.

Cada usuario puede **crear o pertenecer a 5 quinielas privadas**, además de la **Quiniela Pública** (siempre activa, con todos los usuarios de la app).

## Cómo se puntúa

El sistema de puntos es transparente y configurable (en cada quiniela, el creador puede ajustar los pesos). Por defecto:

| Categoría | Puntos |
|-----------|--------|
| Posición exacta en grupo | 3 pts/pos |
| 1º+2º correctos (orden distinto) | 2 pts |
| Bracket — clasificado correcto por ronda | 2/4/6/8/12 (R32 → final) |
| Bota de Oro (goleador exacto) | 12 pts |
| Marcador exacto de partido | 5 pts |
| Resultado correcto (ganador, sin marcador) | 2 pts |
| Goleador de partido | 3 pts |
| Predicción especial (varía) | 3-8 pts |

## Cómo es el ranking

Cada quiniela tiene **su propio ranking en vivo**. Puedes ver:

- **Posición general** de toda tu peña.
- **Tu tarjeta personal** con desglose de aciertos por categoría.
- **Comparativa** contra cualquier otro miembro: ves dónde le ganas y dónde te ganan.
- **Activity feed** con cada nuevo punto que se anota cualquiera.

## Cuándo cierran las predicciones

Las predicciones tienen **deadlines escalonados**:

- **Posiciones de grupo, bracket y Bota de Oro**: cierran al inicio del primer partido del Mundial (11 de junio, 19:00 hora México).
- **Marcadores partido a partido**: cierran al kickoff de cada partido individual.
- **Goleadores por partido**: igual, al kickoff de cada partido.

Eso significa que los **marcadores se pueden ir editando** hasta el último minuto antes de que empiece cada partido. La fase de grupos y el bracket no — esos se cierran de golpe el 11 de junio.

## ¿Es realmente gratis?

Sí. **Cero coste**. Cero suscripción, cero anuncios. Es un proyecto sin ánimo de lucro entre amigos.

## Cómo empezar

[Empieza tu quiniela del Mundial 2026 aquí](/login?next=%2Fonboarding). En 30 segundos tienes tu cuenta y puedes empezar a invitar a tu peña.

> "El propósito es eliminar todo el dolor logístico de hacer una quiniela del Mundial. La parte divertida — competir entre amigos — queda intacta."

Si necesitas resolver dudas concretas, mira nuestras [preguntas frecuentes](/faq) o nuestro [contacto](/contacto).`,
  },
];
