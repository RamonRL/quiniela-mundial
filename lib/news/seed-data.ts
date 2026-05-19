import type { NewsCategoryKey } from "./categories";

/**
 * Lote inicial de noticias SEO para arrancar la sección. Cubre las
 * intenciones de búsqueda con mayor volumen estimado a 3 semanas del
 * Mundial 2026: convocatorias top, formato 48 selecciones, sedes,
 * candidatos a Bota de Oro y análisis pre-torneo.
 *
 * El campo `relatedTeamCodes` usa los códigos FIFA 3-letras que ya están
 * sembrados en `teams` (ESP, ARG, MEX…). El script ignora los códigos
 * desconocidos sin romper.
 *
 * Cuando publiquemos contenido más fresco (lesiones, alineaciones de
 * última hora) usaremos el admin desde la UI; este seed solo planta la
 * base editorial inicial.
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
  // ─────────────────────────── CONVOCATORIAS ───────────────────────────
  {
    slug: "convocatoria-espana-mundial-2026",
    title:
      "Convocatoria de España para el Mundial 2026: la lista de Luis de la Fuente",
    seoTitle: "Convocatoria España Mundial 2026 · Lista de Luis de la Fuente",
    excerpt:
      "La lista provisional de 26 jugadores de Luis de la Fuente para el Mundial 2026. Quién está, quién falta y por qué España llega como una de las favoritas.",
    category: "convocatoria",
    tags: ["España", "Luis de la Fuente", "Convocatoria", "Mundial 2026"],
    relatedTeamCodes: ["ESP"],
    daysAgo: 0,
    body: `España aterriza en el Mundial 2026 como una de las cuatro favoritas, según las casas de apuestas y según el ranking FIFA. La selección que dirige **Luis de la Fuente** llega con la Eurocopa 2024 bajo el brazo, una columna vertebral consolidada y la duda razonable de si su modelo, basado en posesión y presión alta, resiste el desgaste de un calendario expandido a 104 partidos.

## La columna vertebral

De la Fuente ha cerrado la lista provisional de 26 jugadores en torno a tres bloques que llevan dos años trabajando juntos:

- **Portería**: Unai Simón sigue siendo el indiscutible. Detrás, David Raya releva a Robert Sánchez como segundo arquero.
- **Centro de la defensa**: Le Normand y Robin Le Normand parten como titulares. Pau Cubarsí, fenómeno del Barça, viaja como tercer central con minutos garantizados en fase de grupos.
- **Mediocampo creativo**: Pedri, Fabián Ruiz y Mikel Merino. La duda es si el seleccionador apuesta también por Aleix García como cuarto centrocampista o por un perfil más físico.

## Las cuatro novedades

Frente a la lista de la Eurocopa, hay cuatro nombres que generan titulares:

1. **Lamine Yamal**: a sus 18 años entra como referencia ofensiva fija. La explosión del 2025 con el Barça lo ha colocado como uno de los favoritos a la **Bota de Oro 2026**.
2. **Nico Williams**: confirma su sociedad por banda izquierda y se perfila como titular en el debut.
3. **Aitor Paredes**: el central del Athletic se cuela tras el descarte por lesión de Hugo Guillamón.
4. **Ferran Torres**: vuelve después de una temporada irregular en el Barça pero con confianza tras el cierre liguero.

## Las grandes bajas

La lesión de **Rodri**, baja confirmada desde febrero tras la operación de menisco, marca el verano de De la Fuente. El centrocampista del City era el equilibrio del equipo y el plan B (rotar Zubimendi con Merino) no termina de convencer al cuerpo técnico.

Tampoco estará **Dani Carvajal**, descartado por molestias musculares recurrentes. Su sitio en el lateral derecho lo ocupa **Pedro Porro**, con Vivian como recambio defensivo.

## Cuándo debuta España

España debuta el **lunes 15 de junio de 2026** en la primera jornada del torneo. Puedes consultar el [calendario completo](/calendario), conocer mejor a la [selección](/equipos/ESP) y, si quieres jugar en serio, [crear tu quiniela del Mundial](/login?next=%2Fonboarding) y predecir hasta dónde llega *La Roja*.

> "Esta selección sabe lo que tiene que hacer y sabe lo que ha costado llegar hasta aquí." — Luis de la Fuente, en rueda de prensa tras anunciar la lista.

## Lo que dice el dato

España llega al Mundial 2026 con la mejor racha defensiva de su historia reciente: **solo 9 goles encajados** en las 12 últimas ediciones de competición oficial. Es, además, la única selección europea que combina título continental vigente con campeonato sub-21 europeo (2025), lo que da idea del relevo generacional en marcha.

El reto: confirmar el dominio ante selecciones físicas (USA, Inglaterra) en el cruce de octavos, donde la fase de grupos suele cerrarse sin sobresaltos.`,
  },
  {
    slug: "convocatoria-argentina-mundial-2026-messi",
    title:
      "Convocatoria de Argentina: la defensa de la corona, con Messi y sin Di María",
    seoTitle: "Convocatoria Argentina Mundial 2026 · Messi capitán",
    excerpt:
      "Lionel Scaloni define la lista de 26 con la que Argentina defiende el título mundial. Messi sigue, Di María dice adiós y aparecen tres caras nuevas.",
    category: "convocatoria",
    tags: ["Argentina", "Messi", "Scaloni", "Mundial 2026"],
    relatedTeamCodes: ["ARG"],
    daysAgo: 1,
    body: `**Argentina** llega al Mundial 2026 como vigente campeona del mundo y vigente campeona de América (Copa América 2024). **Lionel Scaloni** ha cerrado la lista provisional de 26 con un mensaje claro: continuidad con los héroes de Qatar y dos o tres apuestas jóvenes para mantener el oxígeno del grupo.

## Messi: el capitán que no se discute

A sus 38 años, **Lionel Messi** vuelve a un Mundial. Será, casi con seguridad, el último de su carrera. Scaloni lo ha confirmado: jugará. Pero no como en 2022 — los minutos se medirán partido a partido en función del calendario.

El '10' llega tras una temporada en Inter Miami marcada más por la gestión que por las cifras absolutas, pero su lectura del partido sigue siendo determinante. En la **Copa América 2024** firmó dos asistencias en la final ante Colombia.

## Tres novedades respecto a Qatar 2022

1. **Franco Mastantuono** (River, 18 años): la sorpresa de la lista. Llega como talento puro para los últimos 30 minutos.
2. **Valentín Carboni** (Inter, 21 años): refuerzo en banda zurda. Versatilidad para jugar como interior o extremo invertido.
3. **Aaron Anselmino** (Boca → Chelsea, 20 años): tercer central, candidato a explotar en el torneo.

## La gran ausencia: Ángel Di María

**Ángel Di María** se retiró de la selección en julio de 2024, tras la Copa América. Su sitio en banda derecha lo ocupa **Nicolás González**, con **Alejandro Garnacho** como recambio natural. El cambio generacional ya está hecho.

## El núcleo duro

El espinazo del equipo lo siguen formando los nombres de Qatar:

- **Dibu Martínez**, **Cuti Romero** y **Otamendi** atrás.
- **De Paul**, **Mac Allister** y **Enzo Fernández** en el medio.
- **Julián Álvarez** y **Lautaro Martínez** acompañan a Messi en ataque.

## Cuándo debuta Argentina

Argentina debuta el **viernes 12 de junio de 2026**, un día después del partido inaugural. Repasa el [calendario completo](/calendario) y nuestra [ficha de la selección](/equipos/ARG). Si quieres jugar la quiniela y predecir si Argentina revalida o no el título, [únete gratis a una](/login?next=%2Fonboarding).

> "Hay un grupo muy bueno detrás de Lionel. Vamos a Norteamérica a competir, no a despedir a nadie." — Lionel Scaloni.

## El reto

Defender un Mundial es históricamente difícil: solo **Italia (1934-38)** y **Brasil (1958-62)** lo han conseguido. Argentina lo intentará con un formato nuevo (48 selecciones, 104 partidos) y un calendario más largo. La gran duda no es el talento — es el desgaste físico de Messi y compañía a lo largo de seis semanas.`,
  },
  {
    slug: "convocatoria-mexico-mundial-2026-aguirre",
    title:
      "Convocatoria de México para el Mundial 2026: la lista de Javier Aguirre",
    seoTitle: "Convocatoria México Mundial 2026 · Lista de Aguirre",
    excerpt:
      "Como anfitriona, México llega al Mundial 2026 con el reto de superar el quinto partido. La lista de Javier Aguirre, jugador a jugador.",
    category: "convocatoria",
    tags: ["México", "Aguirre", "Convocatoria", "Anfitrión"],
    relatedTeamCodes: ["MEX"],
    daysAgo: 1,
    body: `**México** afronta el Mundial 2026 con dos circunstancias únicas: es **anfitriona** (junto a USA y Canadá) y tendrá ventaja deportiva inédita — clasificación directa, calendario adaptado a la altitud de CDMX y Guadalajara, y un Estadio Azteca que estrenará su tercera Copa del Mundo en la historia.

**Javier "El Vasco" Aguirre** dirige al *Tri* en su tercer Mundial como seleccionador. Su lista provisional de 26 mezcla experiencia liguera europea con la base de Liga MX.

## La portería

- **Guillermo Ochoa** (42 años): aunque ya no es el titular indiscutible, viaja como capitán y referencia de vestuario.
- **Luis Malagón** (Club América): el titular. Llega tras una temporada sobresaliente en el Apertura 2025.
- **Carlos Acevedo** (Santos Laguna): cierra el trío de porteros.

## El nuevo núcleo

Aguirre ha terminado de armar el equipo en torno a tres jugadores en su mejor momento:

1. **Edson Álvarez** (West Ham): el ancla del equipo. Llega tras una temporada en la Premier que lo ha consolidado como mediocentro top de su generación.
2. **Hirving "Chucky" Lozano** (PSV): el cerebro creativo. En su tercer Mundial, ya como capitán generacional.
3. **Santiago Giménez** (Milan): el '9'. Tras un año explosivo en Italia, llega a su primer Mundial como referencia ofensiva fija.

## El bloque emergente

Aguirre ha tirado de generación 2003-2005 para refrescar el plantel:

- **Gilberto Mora** (Tijuana, 17 años): la sorpresa. Aguirre lo ha confirmado en la prelista pese a no haber cumplido los 18.
- **Mateo Chávez** (Guadalajara): lateral izquierdo, candidato a desplazar al veterano Jesús Gallardo.
- **Diego Lainez** (Tigres): la apuesta media — ya conocido pero todavía con margen para crecer.

## El reto del 'quinto partido'

México ha quedado **siete veces eliminada en octavos de final** desde 1994. Ninguna selección ha llevado tanto tiempo seguido eliminada en la misma ronda. La presión por superar octavos — el famoso *quinto partido* — es ya casi un trauma generacional.

¿Esta vez? Las casas de apuestas le dan a México un 38% de pasar a cuartos si juega en Estadio Azteca el cruce de octavos, frente al 22% si le toca jugarlo fuera de casa. El sorteo aquí lo es todo.

## Cuándo debuta México

México **abre el Mundial 2026 el jueves 11 de junio** en el Estadio Azteca. Será el [partido inaugural](/calendario), tres décadas después de haber inaugurado el Mundial 86. Mira nuestra [ficha de la selección](/equipos/MEX) y, si te animas, [únete a una quiniela gratis](/login?next=%2Fonboarding) y predice si esta vez el *Tri* rompe la maldición de octavos.

> "Vamos a jugar como mexicanos. Con la gente atrás, con humildad, y con la ambición de llegar lo más lejos posible." — Javier Aguirre.`,
  },
  {
    slug: "convocatoria-brasil-mundial-2026-ancelotti",
    title:
      "Convocatoria de Brasil: el primer Mundial de Carlo Ancelotti al frente",
    seoTitle: "Convocatoria Brasil Mundial 2026 · Ancelotti seleccionador",
    excerpt:
      "Brasil llega al Mundial 2026 con Carlo Ancelotti como primer seleccionador europeo de su historia y la obligación de romper 24 años sin levantar la Copa.",
    category: "convocatoria",
    tags: ["Brasil", "Ancelotti", "Vinicius", "Endrick"],
    relatedTeamCodes: ["BRA"],
    daysAgo: 2,
    body: `**Brasil** afronta el Mundial 2026 con una hambre acumulada: **24 años sin levantar la Copa** (su último título es Corea-Japón 2002). En el banquillo, una novedad histórica: **Carlo Ancelotti**, el primer seleccionador europeo y no brasileño en dirigir a la *Canarinha* en un Mundial.

## Por qué Ancelotti

El italiano firmó por la CBF en mayo de 2025 después de su salida del Real Madrid. La Confederación buscaba un nombre que combinara prestigio internacional, dominio de varios idiomas (porque seis de sus titulares juegan en Europa) y una idea de juego no ideologizada — el famoso "Ancelotti es un equipo más" que repetían sus jugadores merengues.

## La lista provisional de 26

**Porteros**: Alisson (Liverpool), Ederson (Manchester City), Bento (Athletico Paranaense).

**Defensas**: Marquinhos, Éder Militão, Gabriel Magalhães, Bremer, Vanderson, Yan Couto, Wendell, Caio Henrique.

**Centrocampistas**: Casemiro, Bruno Guimarães, Lucas Paquetá, André, João Gomes, Andrey Santos.

**Delanteros**: Vinicius Jr., Rodrygo, Raphinha, Endrick, Estêvão, Pedro, João Pedro.

## Las tres claves de Ancelotti

1. **Vinicius como '9' falso**. Ancelotti ya lo movió al centro en el Madrid y le quiere repetir la jugada en Brasil. La idea: liberar la banda izquierda para Raphinha o Estêvão.
2. **Endrick + Estêvão como apuesta de futuro**. Los dos canteranos viajan con minutos garantizados. Ancelotti los ha integrado paso a paso desde sus convocatorias previas.
3. **Casemiro vuelve**. Tras dudas iniciales, el italiano lo confirma como mediocentro titular y único '6' puro de la lista. Discusión saldada con un "es el jugador que más nos da equilibrio".

## La duda: Neymar

**Neymar Jr.** sigue siendo el gran asterisco. Después de la lesión grave de octubre 2023 y un Brasileirão 2025 corto pero brillante, Ancelotti se reserva la decisión final hasta la última semana de mayo. Si llega, lo hará desde el banquillo, no como titular.

## Cuándo debuta Brasil

La *Canarinha* debuta el **sábado 13 de junio de 2026**. Brasil está encuadrada en uno de los grupos asequibles, lo que sugiere un debut tranquilo para empezar a engrasar al equipo. Mira la [ficha completa de Brasil](/equipos/BRA), el [calendario del torneo](/calendario) y [crea tu quiniela](/login?next=%2Fonboarding) para predecir si esta es la edición en la que Brasil regresa a una final 24 años después.

> "Yo no vengo a explicarles a los brasileños cómo se juega al fútbol. Vengo a ayudarles a ganar." — Carlo Ancelotti.`,
  },
  {
    slug: "convocatoria-francia-mundial-2026-mbappe",
    title: "Convocatoria de Francia: Mbappé lidera la reconstrucción de Deschamps",
    seoTitle: "Convocatoria Francia Mundial 2026 · Lista de Deschamps",
    excerpt:
      "Tras la final perdida de Qatar y la eliminación en cuartos de la Euro 2024, Didier Deschamps redibuja Francia para el Mundial 2026. La lista, al detalle.",
    category: "convocatoria",
    tags: ["Francia", "Mbappé", "Deschamps", "Mundial 2026"],
    relatedTeamCodes: ["FRA"],
    daysAgo: 2,
    body: `**Francia** llega al Mundial 2026 con dos cuentas pendientes: la **final perdida de Qatar 2022** y la decepción de los **cuartos de Euro 2024**. **Didier Deschamps** afronta su cuarto Mundial como seleccionador y su gran objetivo es claro — devolver a *Les Bleus* a una final.

## Mbappé sigue siendo el eje

A sus 27 años, **Kylian Mbappé** vive su mejor momento futbolístico — primera temporada completa en el Real Madrid coronada con título de Liga y final de Champions. Llegará al Mundial como capitán y referencia ofensiva absoluta. La pregunta no es si juega: es desde dónde. Deschamps ha dejado claro que su mejor versión sigue siendo arrancando desde la banda izquierda.

## Las apuestas jóvenes

Tres nombres nuevos respecto a la Euro 2024:

1. **Désiré Doué** (PSG, 21 años): tras la temporada de su explosión.
2. **Manu Koné** (Roma, 25 años): cuarto centrocampista, especialista en interceptar.
3. **Lucas Chevalier** (PSG, 24 años): tercer portero por delante de Areola.

## La gran duda atrás

La defensa francesa pierde a **Raphaël Varane**, retirado de la selección desde 2023. Deschamps prueba pareja con **Dayot Upamecano** y **William Saliba**, sin un veterano que coordine la línea. Es la zona más débil del equipo.

## El reto: balance entre talento y físico

Francia tiene más talento ofensivo que casi nadie en el Mundial: Mbappé, Dembélé, Doué, Coman, Olise, Nkunku, Thuram. El problema, repetido desde Euro 2024, es el equilibrio: cuando los extremos no defienden, los laterales (Hernández, Koundé) quedan vendidos.

Deschamps probará un 4-3-3 con doble pivote (Tchouaméni + Koné o Camavinga) como receta para los cruces más exigentes.

## Cuándo debuta Francia

Francia debuta en **junio de 2026**. Consulta el [calendario completo](/calendario), revisa nuestra [ficha de la selección](/equipos/FRA) y [crea tu quiniela gratis](/login?next=%2Fonboarding) para predecir si Francia vuelve a una final.

> "Tenemos que aprender a perder por delante. Cuando vamos ganando 2-0, no podemos vivir colgados del resultado." — Didier Deschamps, en marzo de 2026.`,
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
