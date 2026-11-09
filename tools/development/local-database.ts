import { execFileSync } from "node:child_process";

export type LocalDatabase = { running: boolean; database: string; user: string; ports: string[] };

export function validateLocalDatabase(url: URL, database: LocalDatabase, nodeEnv?: string) {
  if (nodeEnv === "production" || !["postgres:", "postgresql:"].includes(url.protocol)
    || !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    || !database.running || !database.ports.includes(url.port || "5432")
    || decodeURIComponent(url.pathname.slice(1)) !== database.database
    || decodeURIComponent(url.username) !== database.user
    || (url.searchParams.get("schema") || "public") !== "public") {
    throw new Error("Operacao permitida somente no PostgreSQL local de desenvolvimento validado.");
  }
}

export function requireLocalDatabase(databaseUrl: string | undefined, nodeEnv: string | undefined = process.env.NODE_ENV) {
  if (!databaseUrl || nodeEnv === "production") throw new Error("Banco local nao autorizado.");
  try {
    if (process.env.DOCKER_HOST && !/^(?:unix|npipe):/.test(process.env.DOCKER_HOST)) throw new Error();
    const options = { encoding: "utf8" as const, stdio: ["ignore", "pipe", "pipe"] as ["ignore", "pipe", "pipe"], windowsHide: true };
    const endpoint = execFileSync("docker", ["context", "inspect", "--format", '{{(index .Endpoints "docker").Host}}'], options).trim();
    if (!/^(?:unix|npipe):/.test(endpoint)) throw new Error();
    const inspected = JSON.parse(execFileSync("docker", ["inspect", "egv-postgres"], options))[0];
    const values = Object.fromEntries((inspected.Config.Env as string[]).map((value) => {
      const separator = value.indexOf("=");
      return [value.slice(0, separator), value.slice(separator + 1)];
    }));
    const url = new URL(databaseUrl);
    const database: LocalDatabase = {
      running: inspected.State.Running === true,
      database: values.POSTGRES_DB,
      user: values.POSTGRES_USER,
      ports: (inspected.HostConfig.PortBindings?.["5432/tcp"] || []).map((binding: { HostPort: string }) => binding.HostPort)
    };
    validateLocalDatabase(url, database, nodeEnv);
    return { url, database };
  } catch {
    throw new Error("Nao foi possivel comprovar que o destino e o container local egv-postgres. Nenhum dado foi alterado.");
  }
}

export function requireDevelopmentSeed(env: { NODE_ENV?: string; EGV_ALLOW_DEV_SEED?: string; DATABASE_URL?: string } = process.env) {
  if (env.NODE_ENV === "production" || env.EGV_ALLOW_DEV_SEED !== "1") {
    throw new Error("Seed desativado. Autorize explicitamente com EGV_ALLOW_DEV_SEED=1 somente no ambiente local.");
  }
  return requireLocalDatabase(env.DATABASE_URL, env.NODE_ENV);
}
