/**
 * Internal re-export of adapter types from `@fixerframework/types`.
 * Public consumers should import types from `@fixerframework/types` / `@fixerframework/types/adapters`.
 */
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
} from "@fixerframework/types/adapters";
