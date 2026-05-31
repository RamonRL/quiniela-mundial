import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["user", "admin"]);

export const matchStage = pgEnum("match_stage", [
  "group",
  "r32",
  "r16",
  "qf",
  "sf",
  "third",
  "final",
]);

export const matchStatus = pgEnum("match_status", ["scheduled", "live", "finished"]);

export const specialPredictionType = pgEnum("special_prediction_type", [
  "yes_no",
  "single_choice",
  "team_with_round",
  "number_range",
  "player",
]);

export const newsCategory = pgEnum("news_category", [
  "convocatoria",
  "previa",
  "cronica",
  "analisis",
  "lesion",
  "sorteo",
  "destacada",
]);

export const newsStatus = pgEnum("news_status", [
  "draft",
  "scheduled",
  "published",
  "archived",
]);

// Plan comercial de una liga privada. "free" es el default (límite 20
// miembros, galería de logos predefinida). El resto son "Pases Mundial 2026"
// que un admin marca tras cobrar por PayPal — desbloquean más miembros,
// logo corporativo custom, anuncio fijado, export CSV y soporte prioritario.
export const leagueTier = pgEnum("league_tier", [
  "free",
  "team-50",
  "team-100",
  "team-250",
  "enterprise",
]);

export const commercialLeadStatus = pgEnum("commercial_lead_status", [
  "new",
  "contacted",
  "won",
  "lost",
]);

/**
 * Intenciones de pago manual (Bizum / IBAN / PayPal) tras quitar Lemon
 * Squeezy. El usuario clica "He pagado" en `/precios/pagar/[tier]` y se
 * persiste aquí. Admin verifica el ingreso en banco, marca verified y
 * sube el tier de la liga en `/admin/ligas/[id]`.
 */
export const pendingPaymentStatus = pgEnum("pending_payment_status", [
  "pending",
  "verified",
  "rejected",
]);

export const pendingPaymentMethod = pgEnum("pending_payment_method", [
  "bizum",
  "bank",
  "paypal",
  "unknown",
]);

export const pointsSource = pgEnum("points_source", [
  "group_position",
  "group_top2_swap",
  "bracket_slot",
  "tournament_top_scorer",
  "match_exact_score",
  "match_outcome",
  "knockout_qualifier",
  "knockout_pens_bonus",
  "knockout_score_90",
  "match_scorer",
  "match_first_scorer",
  "special_prediction",
  // Modo "Solo Ganador": acertar el 1/X/2 (grupos) o el ganador en 120' (KO).
  "solo_winner",
  // Modo "Solo Ganador" en KO: bonus por, habiendo predicho empate→pens,
  // acertar quién gana la tanda.
  "solo_winner_pens",
]);

/**
 * Modo de predicción de una liga:
 *  - completo: las 6 categorías (grupos, bracket, bota, especiales, marcador
 *    y goleador por partido). Comportamiento histórico.
 *  - marcador: solo el marcador exacto de cada partido (sin goleador ni el
 *    resto de categorías).
 *  - solo_ganador: solo el ganador (o empate→pens) de cada partido.
 */
export const predictionMode = pgEnum("prediction_mode", [
  "completo",
  "marcador",
  "solo_ganador",
]);

// ───────────────────────── identidad ─────────────────────────

/**
 * Una liga es un grupo cerrado de participantes que comparten ranking,
 * predicciones visibles y chat. La "Liga principal" (id=1, isPublic=true) es
 * la que ve cualquiera que entre por la URL pública. Las privadas se crean
 * desde /admin/ligas y se reparten por invite link `/invite/{inviteToken}`.
 *
 * Los datos del torneo (selecciones, partidos, jugadores, scoring rules)
 * son globales — el Mundial es uno solo para todos. Lo que cambia por liga
 * es quién aparece en cada ranking / cabeza de tabla / chat.
 */
export const leagues = pgTable(
  "leagues",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    // Logo opcional de la liga privada. Subido por el creador desde
    // el onboarding o /mi-quiniela. Las ligas públicas no usan logo.
    logoUrl: text("logo_url"),
    inviteToken: text("invite_token").notNull().unique(),
    // Código corto de 4 dígitos (0000-9999) para que la gente pueda unirse
    // sin compartir el invite link entero. NULL en la liga pública (no se une
    // por código). Se genera al crear la liga y es inmutable.
    joinCode: varchar("join_code", { length: 4 }).unique(),
    isPublic: boolean("is_public").notNull().default(false),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    // Tope de miembros. NULL = ilimitado (la pública). Las privadas
    // arrancan con 20 (Free); un admin lo sube a 50/100/250 al cobrar el
    // Pase. Se valida antes de cada join.
    memberLimit: integer("member_limit"),
    // Plan vigente — Free de fábrica, el admin lo cambia al cobrar.
    tier: leagueTier("tier").notNull().default("free"),
    // Modo de predicción de la liga. Se elige al crear y es inmutable.
    // Las 3 quinielas públicas existen una por modo.
    predictionMode: predictionMode("prediction_mode").notNull().default("completo"),
    // Trazas de la venta — el admin las rellena manualmente al confirmar
    // el pago por PayPal. paidAt indica también "última renovación".
    paidAt: timestamp("paid_at", { withTimezone: true }),
    paidAmountEur: integer("paid_amount_eur"),
    paidVia: text("paid_via"),
    // Idempotencia del flujo "pagar antes de crear": id de la transaction de
    // Paddle que creó/pagó esta liga. Único — evita duplicar si el webhook y
    // el finalize del cliente coinciden tras un pago. NULL en ligas gratis.
    paidTxId: text("paid_tx_id").unique(),
    // Anuncio fijado del owner — banner en /mi-quiniela. Premium-only.
    announcement: text("announcement"),
  },
  (t) => [
    index("leagues_invite_token_idx").on(t.inviteToken),
    index("leagues_is_public_idx").on(t.isPublic),
    index("leagues_tier_idx").on(t.tier),
  ],
);

/**
 * Leads comerciales — empresas/grupos que escriben pidiendo precio o un
 * plan a medida. Llegan por el formulario de /precios y /contacto y se
 * notifican por Telegram. El admin los gestiona desde /admin/leads.
 */
export const commercialLeads = pgTable(
  "commercial_leads",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    company: text("company"),
    email: text("email").notNull(),
    expectedMembers: integer("expected_members"),
    message: text("message"),
    status: commercialLeadStatus("status").notNull().default("new"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("commercial_leads_status_idx").on(t.status, t.createdAt),
    index("commercial_leads_created_idx").on(t.createdAt),
  ],
);

/**
 * Intención de pago manual creada cuando el usuario clica "He pagado"
 * en `/precios/pagar/[tier]`. El admin cruza este registro con el
 * ingreso real en banco/Bizum/PayPal (matcheando por `concept` o por
 * email) y entonces aplica el upgrade del tier de la liga
 * correspondiente desde `/admin/ligas/[id]`. Si tras X días el pago no
 * aparece, se marca `rejected`.
 */
export const pendingPayments = pgTable(
  "pending_payments",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id").references(() => profiles.id, { onDelete: "set null" }),
    leagueId: integer("league_id").references(() => leagues.id, { onDelete: "set null" }),
    tier: leagueTier("tier").notNull(),
    method: pendingPaymentMethod("method").notNull().default("unknown"),
    priceEur: integer("price_eur").notNull(),
    /** Concepto sugerido al usuario, ej. `QM26-TEAM100-A1B2`. */
    concept: text("concept").notNull(),
    /** Email + nombre que rellena el comprador en el formulario público. */
    email: text("email"),
    name: text("name"),
    status: pendingPaymentStatus("status").notNull().default("pending"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("pending_payments_status_idx").on(t.status, t.createdAt),
    index("pending_payments_league_idx").on(t.leagueId),
  ],
);

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey(),
    email: text("email").notNull().unique(),
    nickname: text("nickname"),
    avatarUrl: text("avatar_url"),
    role: userRole("role").notNull().default("user"),
    // Liga ACTIVA del participante (la que está viendo ahora mismo). Debe
    // coincidir con una fila de league_memberships salvo durante el
    // onboarding (instante entre creación del profile y elección de liga).
    leagueId: integer("league_id").references(() => leagues.id, {
      onDelete: "set null",
    }),
    bannedAt: timestamp("banned_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    // País del primer registro — código ISO-3166-1 alpha-2 ("ES", "MX"…)
    // capturado en la primera ejecución de getCurrentUser leyendo la
    // cabecera `x-vercel-ip-country`. Estático: no se sobreescribe.
    countryCode: text("country_code"),
    // Última conexión observada del usuario. Se actualiza en
    // getCurrentUser con throttling de 5 minutos para no martillear la DB
    // en cada navegación.
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    // Timestamp del primer cierre / completado del tutorial de bienvenida.
    // NULL = aún no lo ha visto → se autodispara al entrar a /dashboard.
    // Se marca también si pulsa "Saltar" para no volver a salir.
    tutorialCompletedAt: timestamp("tutorial_completed_at", { withTimezone: true }),
    // Zona horaria preferida del usuario (IANA, p. ej. "Europe/Madrid",
    // "America/Mexico_City"). NULL = "auto": el front la detecta del
    // navegador la primera vez que entra a /ajustes y la guarda, y en SSR
    // caemos a Europe/Madrid como default seguro. Cuando se establece,
    // los horarios de partidos en la app se renderizan en esa TZ.
    timezone: text("timezone"),
  },
  (t) => [
    index("profiles_role_idx").on(t.role),
    index("profiles_league_idx").on(t.leagueId),
    // Cubre el GROUP BY de /admin/monitoreo/geo y el COUNT(DISTINCT country_code)
    // del overview. Sin índice el geo page hace full scan.
    index("profiles_country_code_idx").on(t.countryCode),
    // Acelera /admin/monitoreo (online/DAU/WAU/MAU filtran por last_seen_at)
    // y la columna de "última conexión" en /admin/usuarios.
    index("profiles_last_seen_idx").on(t.lastSeenAt),
  ],
);

/**
 * Tabla puente N↔N — un usuario puede pertenecer a la pública (siempre) +
 * hasta 5 ligas privadas. Reemplaza la semántica antigua de "una liga por
 * profile" sin tocar profiles.leagueId, que ahora indica solo cuál es la
 * liga ACTIVA del usuario.
 */
export const leagueMemberships = pgTable(
  "league_memberships",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    leagueId: integer("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    // Departamento dentro de la liga (solo planes pago). NULL = miembro
    // sin asignar. Si se borra el dept., los miembros caen aquí a NULL —
    // siguen en la liga pero pasan a "sin departamento" en el ranking
    // de departamentos.
    departmentId: integer("department_id").references(
      () => leagueDepartments.id,
      { onDelete: "set null" },
    ),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.leagueId] }),
    index("league_memberships_league_idx").on(t.leagueId),
    index("league_memberships_dept_idx").on(t.departmentId),
  ],
);

// Sub-grupos dentro de una liga premium (Marketing, Ventas, Ingeniería…).
// Solo se crean en ligas con plan de pago activo; el chequeo vive en las
// server actions (`lib/league-actions.ts`) y en la vista admin.
// El ranking de departamentos compite por MEDIA DE PUNTOS sobre miembros
// activos (≥1 predicción) — no totales — para que un dept. de 5 personas
// no pierda automáticamente contra uno de 50.
export const leagueDepartments = pgTable(
  "league_departments",
  {
    id: serial("id").primaryKey(),
    leagueId: integer("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // Decoración visual opcional para el card del dept. en el ranking.
    emoji: text("emoji"),
    color: text("color"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("league_departments_league_name_idx").on(t.leagueId, t.name),
    index("league_departments_league_idx").on(t.leagueId),
  ],
);

// ───────────────────────── torneo ─────────────────────────

export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
});

export const teams = pgTable(
  "teams",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    flagUrl: text("flag_url"),
    groupId: integer("group_id").references(() => groups.id, { onDelete: "set null" }),
  },
  (t) => [index("teams_group_idx").on(t.groupId)],
);

export const players = pgTable(
  "players",
  {
    id: serial("id").primaryKey(),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: text("position"),
    jerseyNumber: smallint("jersey_number"),
    photoUrl: text("photo_url"),
  },
  (t) => [index("players_team_idx").on(t.teamId)],
);

export const matchdays = pgTable("matchdays", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  stage: matchStage("stage").notNull(),
  predictionDeadlineAt: timestamp("prediction_deadline_at", { withTimezone: true }).notNull(),
  orderIndex: smallint("order_index").notNull().default(0),
});

export const matches = pgTable(
  "matches",
  {
    id: serial("id").primaryKey(),
    code: text("code").notNull().unique(),
    stage: matchStage("stage").notNull(),
    matchdayId: integer("matchday_id").references(() => matchdays.id, { onDelete: "set null" }),
    groupId: integer("group_id").references(() => groups.id, { onDelete: "set null" }),
    homeTeamId: integer("home_team_id").references(() => teams.id, { onDelete: "set null" }),
    awayTeamId: integer("away_team_id").references(() => teams.id, { onDelete: "set null" }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    venue: text("venue"),
    status: matchStatus("status").notNull().default("scheduled"),
    homeScore: smallint("home_score"),
    awayScore: smallint("away_score"),
    wentToPens: boolean("went_to_pens").notNull().default(false),
    homeScorePen: smallint("home_score_pen"),
    awayScorePen: smallint("away_score_pen"),
    winnerTeamId: integer("winner_team_id").references(() => teams.id, { onDelete: "set null" }),
  },
  (t) => [
    index("matches_scheduled_idx").on(t.scheduledAt),
    index("matches_stage_idx").on(t.stage),
    index("matches_matchday_idx").on(t.matchdayId),
    index("matches_group_idx").on(t.groupId),
  ],
);

export const matchScorers = pgTable(
  "match_scorers",
  {
    id: serial("id").primaryKey(),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    minute: smallint("minute"),
    isFirstGoal: boolean("is_first_goal").notNull().default(false),
    isOwnGoal: boolean("is_own_goal").notNull().default(false),
    isPenalty: boolean("is_penalty").notNull().default(false),
  },
  (t) => [
    index("match_scorers_match_idx").on(t.matchId),
    index("match_scorers_player_idx").on(t.playerId),
  ],
);

// Posición final de cada equipo en su grupo (relleno por trigger explícito al cerrar fase grupos).
export const groupStandings = pgTable(
  "group_standings",
  {
    groupId: integer("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    position: smallint("position").notNull(),
    played: smallint("played").notNull().default(0),
    won: smallint("won").notNull().default(0),
    drawn: smallint("drawn").notNull().default(0),
    lost: smallint("lost").notNull().default(0),
    goalsFor: smallint("goals_for").notNull().default(0),
    goalsAgainst: smallint("goals_against").notNull().default(0),
    points: smallint("points").notNull().default(0),
    finalizedAt: timestamp("finalized_at", { withTimezone: true }),
  },
  (t) => [
    primaryKey({ columns: [t.groupId, t.teamId] }),
    check("position_range", sql`${t.position} between 1 and 4`),
  ],
);

// ───────────────────────── predicciones ─────────────────────────

export const predGroupRanking = pgTable(
  "pred_group_ranking",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    leagueId: integer("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    groupId: integer("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    pos1TeamId: integer("pos1_team_id").references(() => teams.id, { onDelete: "set null" }),
    pos2TeamId: integer("pos2_team_id").references(() => teams.id, { onDelete: "set null" }),
    pos3TeamId: integer("pos3_team_id").references(() => teams.id, { onDelete: "set null" }),
    pos4TeamId: integer("pos4_team_id").references(() => teams.id, { onDelete: "set null" }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.leagueId, t.groupId] }),
    index("pred_group_ranking_league_idx").on(t.leagueId),
  ],
);

export const predBracketSlot = pgTable(
  "pred_bracket_slot",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    leagueId: integer("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    stage: matchStage("stage").notNull(),
    slotPosition: smallint("slot_position").notNull(),
    predictedTeamId: integer("predicted_team_id").references(() => teams.id, {
      onDelete: "set null",
    }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.leagueId, t.stage, t.slotPosition] }),
    index("pred_bracket_slot_league_idx").on(t.leagueId),
  ],
);

export const predTournamentTopScorer = pgTable(
  "pred_tournament_top_scorer",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    leagueId: integer("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    playerId: integer("player_id").references(() => players.id, { onDelete: "set null" }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.leagueId] }),
    index("pred_tournament_top_scorer_league_idx").on(t.leagueId),
  ],
);

export const predMatchResult = pgTable(
  "pred_match_result",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    leagueId: integer("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    homeScore: smallint("home_score").notNull(),
    awayScore: smallint("away_score").notNull(),
    willGoToPens: boolean("will_go_to_pens").notNull().default(false),
    winnerTeamId: integer("winner_team_id").references(() => teams.id, {
      onDelete: "set null",
    }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.leagueId, t.matchId] }),
    index("pred_match_result_league_idx").on(t.leagueId),
    // Cubre el JOIN de loadDeadlineSummary y buildRunningHubProps que
    // filtran por matchId primero y luego (userId, leagueId).
    index("pred_match_result_match_user_league_idx").on(
      t.matchId,
      t.userId,
      t.leagueId,
    ),
  ],
);

export const predMatchScorer = pgTable(
  "pred_match_scorer",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    leagueId: integer("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    playerId: integer("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.leagueId, t.matchId] }),
    index("pred_match_scorer_league_idx").on(t.leagueId),
    // Cubre el LEFT JOIN de pendingScorerCount en el dashboard (matchId
    // primero, luego scope user/league).
    index("pred_match_scorer_match_user_league_idx").on(
      t.matchId,
      t.userId,
      t.leagueId,
    ),
  ],
);

export const specialPredictions = pgTable("special_predictions", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  question: text("question").notNull(),
  type: specialPredictionType("type").notNull(),
  optionsJson: jsonb("options_json"),
  pointsConfigJson: jsonb("points_config_json").notNull(),
  closesAt: timestamp("closes_at", { withTimezone: true }).notNull(),
  resolvedValueJson: jsonb("resolved_value_json"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  orderIndex: smallint("order_index").notNull().default(0),
});

export const predSpecial = pgTable(
  "pred_special",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    leagueId: integer("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    specialId: integer("special_id")
      .notNull()
      .references(() => specialPredictions.id, { onDelete: "cascade" }),
    valueJson: jsonb("value_json").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.leagueId, t.specialId] }),
    index("pred_special_league_idx").on(t.leagueId),
  ],
);

// ───────────────────────── puntuación ─────────────────────────

export const scoringRules = pgTable("scoring_rules", {
  key: text("key").primaryKey(),
  valueJson: jsonb("value_json").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Ajustes globales clave→JSON. KV genérico para flags de configuración que
 * no merecen tabla propia (p. ej. qué eventos se notifican a Telegram). El
 * caller decide la forma del `valueJson` por clave.
 */
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  valueJson: jsonb("value_json").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pointsLedger = pgTable(
  "points_ledger",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    leagueId: integer("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    source: pointsSource("source").notNull(),
    sourceRef: jsonb("source_ref").notNull(),
    sourceKey: text("source_key").notNull(),
    points: integer("points").notNull(),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("points_ledger_unique").on(t.userId, t.leagueId, t.source, t.sourceKey),
    index("points_ledger_user_idx").on(t.userId),
    index("points_ledger_league_idx").on(t.leagueId),
    index("points_ledger_source_key_idx").on(t.source, t.sourceKey),
    // Cubre la query agregada del leaderboard que filtra por leagueId y
    // agrupa/joinea por userId.
    index("points_ledger_league_user_idx").on(t.leagueId, t.userId),
    // Cubre loadActivityFeed (userId+leagueId, orden por computedAt DESC).
    index("points_ledger_user_league_computed_idx").on(
      t.userId,
      t.leagueId,
      t.computedAt,
    ),
  ],
);

// ───────────────────────── social ─────────────────────────

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: serial("id").primaryKey(),
    leagueId: integer("league_id")
      .notNull()
      .references(() => leagues.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: uuid("deleted_by").references(() => profiles.id, { onDelete: "set null" }),
  },
  (t) => [index("chat_messages_league_idx").on(t.leagueId, t.createdAt)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: serial("id").primaryKey(),
    adminId: uuid("admin_id").references(() => profiles.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    payloadJson: jsonb("payload_json"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_log_created_idx").on(t.createdAt)],
);

// ───────────────────────── noticias (SEO) ─────────────────────────

/**
 * Artículos de noticias para captar tráfico orgánico: convocatorias,
 * previas, crónicas, análisis, lesiones, sorteo, etc. Públicos por
 * defecto e indexables. Los redacta el equipo editorial (en la práctica,
 * yo desde sesiones de Claude Code) y un admin los publica/edita desde
 * `/admin/noticias`.
 *
 * Vinculación al producto: `relatedTeamCodes` (códigos FIFA tipo "ESP",
 * "MEX") + `relatedMatchId` permiten cruzar el artículo con sus páginas
 * de equipo y partido — esto multiplica el internal-link graph y mejora
 * el SEO de TODA la web, no solo de /noticias.
 *
 * `slug` es la URL final (`/noticias/<slug>`) y es inmutable una vez
 * publicado para no romper backlinks de Google.
 *
 * Estados: draft (privado, solo admin), scheduled (publicado cuando
 * `publishedAt <= now()`), published (visible), archived (oculto pero
 * preservado para no perder links externos — devuelve 410 Gone).
 */
export const newsArticles = pgTable(
  "news_articles",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    seoTitle: text("seo_title"),
    excerpt: text("excerpt").notNull(),
    body: text("body").notNull(),
    coverUrl: text("cover_url"),
    coverAlt: text("cover_alt"),
    category: newsCategory("category").notNull(),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    relatedTeamCodes: text("related_team_codes")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    relatedMatchId: integer("related_match_id").references(() => matches.id, {
      onDelete: "set null",
    }),
    authorId: uuid("author_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    status: newsStatus("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    viewCount: integer("view_count").notNull().default(0),
  },
  (t) => [
    index("news_articles_status_published_idx").on(t.status, t.publishedAt),
    index("news_articles_category_idx").on(t.category),
    index("news_articles_related_match_idx").on(t.relatedMatchId),
    // GIN para búsquedas tipo `relatedTeamCodes && '{ESP,MEX}'`.
    index("news_articles_tags_gin").using("gin", t.tags),
    index("news_articles_related_teams_gin").using(
      "gin",
      t.relatedTeamCodes,
    ),
  ],
);

// ───────────────────────── minijuegos ─────────────────────────

export const minigameScores = pgTable(
  "minigame_scores",
  {
    id: serial("id").primaryKey(),
    gameKey: text("game_key").notNull(),
    userId: uuid("user_id").references(() => profiles.id, { onDelete: "cascade" }),
    guestNickname: text("guest_nickname"),
    identityKey: text("identity_key").notNull(),
    displayName: text("display_name").notNull(),
    bestScore: integer("best_score").notNull(),
    playedAt: timestamp("played_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("minigame_scores_identity").on(t.gameKey, t.identityKey),
    index("minigame_scores_game_score_idx").on(t.gameKey, t.bestScore),
  ],
);

// ───────────────────────── rate limiting ─────────────────────────

/**
 * Limitador fixed-window por clave (p. ej. "chat:<userId>"). Una sola fila por
 * clave: guardamos el inicio de la ventana actual y el contador, y en cada hit
 * hacemos un upsert atómico que resetea el contador si la ventana ya expiró.
 * Ver `lib/ratelimit.ts`.
 */
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  count: integer("count").notNull().default(0),
});

// ───────────────────────── backups ─────────────────────────

/**
 * Bitácora de copias de seguridad. Los workflows de GitHub Actions insertan una
 * fila tras subir con éxito el dump/tar a Cloudflare R2. El panel
 * /admin/monitoreo/sistema lee el `max(finished_at)` por tipo para mostrar la
 * frescura de la última copia (y confirmar que el cron sigue vivo).
 */
export const backupRuns = pgTable(
  "backup_runs",
  {
    id: serial("id").primaryKey(),
    kind: text("kind").notNull(), // 'db' | 'storage'
    objectKey: text("object_key"),
    finishedAt: timestamp("finished_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("backup_runs_kind_finished_idx").on(t.kind, t.finishedAt)],
);

// ───────────────────────── patch notes (novedades de la app) ─────────────────────────

/**
 * Tipo de nota — pinta el badge a color en el tablón:
 *  - feature      → algo nuevo en la web
 *  - fix          → bug arreglado
 *  - improvement  → mejora sobre algo ya existente
 *  - note         → comunicación general (mantenimiento, aviso…)
 */
export const patchNoteType = pgEnum("patch_note_type", [
  "feature",
  "fix",
  "improvement",
  "note",
]);

/**
 * Tablón de novedades de Quiniela Mundial. El admin va publicando notas
 * sobre actualizaciones, features nuevos, bugs arreglados y mejoras. Las
 * últimas N publicadas aparecen en el dashboard del usuario. CRUD desde
 * /admin/notas.
 */
export const patchNotes = pgTable(
  "patch_notes",
  {
    id: serial("id").primaryKey(),
    type: patchNoteType("type").notNull().default("note"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    /** Null = borrador (no se muestra en el dashboard). */
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("patch_notes_published_idx").on(t.publishedAt)],
);
