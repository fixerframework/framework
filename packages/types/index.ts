/**
 * @fixerframework/types — Shared public TypeScript types for FixerFramework
 *
 * Import types from here (or domain subpaths). Runtime values stay in their
 * owning packages (`@fixerframework/state`, `@fixerframework/ui`, …).
 *
 * ```ts
 * import type { AuthRuntime, QueryDef, ButtonProps } from "@fixerframework/types";
 * // or
 * import type { QueryDef } from "@fixerframework/types/state";
 * ```
 */

export type { Awaitable } from "./src/common.ts";

export type { Deferred, JwtPayload, CookieOptions } from "./src/utils.ts";

export type { AuthRuntime, ClerkAuthRuntime, CreateClerkAuthConfig } from "./src/auth.ts";

export type {
  RateLimitConfig,
  RateLimitDecision,
  RateLimiter,
  SessionClaims,
  VerifyOptions,
  ExtractOptions,
  SessionTokenResult,
  ProtectOptions,
  ProtectResult,
  SessionPayload,
  FlowConfig,
  FlowHandler,
  FlowResumeResult,
  WebhookHandler,
  WebhookConfig,
  WebhookRouter,
  CreateAuthServerConfig,
  AuthServer,
} from "./src/auth-server.ts";

export type {
  QueryKey,
  QueryStatus,
  QueryScope,
  FetchContext,
  QueryDef,
  MutateDef,
  Query,
  Atom,
  CreateStateOptions,
  StateRuntime,
} from "./src/state.ts";

export type {
  DialectId,
  SqlFragment,
  SqlRaw,
  SqlIdent,
  CompiledQuery,
  FieldInfo,
  QueryResult,
  DriverTx,
  Driver,
  Database,
  CreateDbOptions,
  DbErrorCode,
  SqlTypeName,
  TypeCodec,
  MockDriverOptions,
} from "./src/db.ts";

export type {
  PostgresConfig,
  PgPoolLike,
  PgClientLike,
  PostgresJsSql,
  CockroachConfig,
  MysqlConfig,
  MysqlPoolLike,
  MysqlConnectionLike,
  TidbConfig,
  SqliteConfig,
  BetterSqliteDatabase,
  BunSqliteConfig,
  BunDatabase,
  LibsqlConfig,
  LibsqlClient,
  D1PreparedStatement,
  D1Database,
  D1Config,
  MssqlConfig,
  MssqlPoolLike,
  MssqlRequestLike,
  MssqlTransactionLike,
  NeonConfig,
  NeonSql,
  PlanetscaleConfig,
  PlanetscaleConnection,
  RdsDataConfig,
  RdsDataClientLike,
} from "./src/db-drivers.ts";

export type {
  NavigationStatus,
  LocationState,
  NavigateOptions,
  LoaderContext,
  RouteDef,
  RouteMatch,
  HistoryLocation,
  HistoryAdapter,
  HistoryKind,
  CreateRouterOptions,
  RouterRuntime,
  RouterProps,
  LinkProps,
} from "./src/router.ts";

export type {
  TransformKey,
  StyleKey,
  Target,
  Variant,
  Variants,
  TargetAndTransition,
  EasingName,
  Easing,
  SpringTransition,
  TweenTransition,
  Transition,
  AnimationPlaybackControls,
  ReducedMotionSetting,
  DragConstraints,
  DragAxis,
  MotionProps,
} from "./src/animation.ts";

export type {
  DeployAdapter,
  RedirectRule,
  CloudflarePagesOptions,
  CloudflareWorkersOptions,
  RoutesJson,
  WranglerConfig,
  GenerateWranglerOptions,
  AssetFetcher,
  PagesEnv,
  WorkersEnv,
  ExecutionContext,
  PagesFunctionContext,
  PagesFunction,
  AppHandler,
  WorkerFetchHandler,
  CreateWorkerHandlerOptions,
  WorkerAppHandler,
  WorkerExecutionContext,
  WorkerAssetFetcher,
} from "./src/adapters.ts";

export type {
  MaybeSignal,
  ShowWhen,
  ShowProps,
  AwaitProps,
  MatchValue,
  MatchProps,
  BindTextProps,
  BindCheckboxProps,
  ButtonVariant,
  ButtonSize,
  ButtonProps,
  InputProps,
  TextareaProps,
  LabelProps,
  CheckboxProps,
  SwitchProps,
  CardProps,
  BadgeVariant,
  BadgeProps,
  AlertVariant,
  AlertProps,
  SeparatorProps,
  SkeletonProps,
  DialogRootProps,
  DialogContentProps,
  PopoverRootProps,
  SelectRootProps,
  TabsRootProps,
} from "./src/ui.ts";

export type {
  BuildMode,
  CliOptions,
  LibEntry,
  CopyAsset,
  LibConfigOptions,
  AppConfigOptions,
  ServerConfigOptions,
  VitestConfigOptions,
} from "./src/bundler.ts";
