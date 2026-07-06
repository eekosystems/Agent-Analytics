/**
 * Active Trace SDK.
 *
 * Usage:
 *   import { ActiveTraceClient } from "@activetrace/client";
 *   const activeTrace = new ActiveTraceClient(); // reads ACTIVETRACE_* env vars
 *
 * Environment variables:
 *   ACTIVETRACE_SECRET_KEY — secret API key (sk-at-...)
 *   ACTIVETRACE_PUBLIC_KEY — public API key (pk-at-...)
 *   ACTIVETRACE_BASE_URL   — base URL of your Active Trace instance
 */
import { LangfuseClient } from "@langfuse/client";

type ActiveTraceClientOptions = ConstructorParameters<typeof LangfuseClient>[0];

function envDefaults(): ActiveTraceClientOptions {
  const env =
    typeof process !== "undefined" ? (process.env ?? {}) : ({} as Record<string, string | undefined>);
  return {
    secretKey: env.ACTIVETRACE_SECRET_KEY ?? env.LANGFUSE_SECRET_KEY,
    publicKey: env.ACTIVETRACE_PUBLIC_KEY ?? env.LANGFUSE_PUBLIC_KEY,
    baseUrl: env.ACTIVETRACE_BASE_URL ?? env.LANGFUSE_BASE_URL ?? env.LANGFUSE_BASEURL,
  };
}

export class ActiveTraceClient extends LangfuseClient {
  constructor(options?: ActiveTraceClientOptions) {
    super({ ...envDefaults(), ...options });
  }
}

export * from "@langfuse/client";
