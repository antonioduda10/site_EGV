import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import { requireLocalDatabase } from "./local-database";
import {
  grantLegacyAlertPermissions,
  legacyAlertPermissionPlan,
} from "../../lib/alerts-permission";

async function main() {
  loadEnvConfig(process.cwd(), true, { info() {}, error() {} });
  const { url } = requireLocalDatabase(process.env.DATABASE_URL);
  const db = new PrismaClient({
    log: [],
    datasources: { db: { url: url.toString() } },
  });
  try {
    if (!process.argv.includes("--apply")) {
      console.log(
        JSON.stringify({
          environment: "local-development",
          pendingGrants: (await legacyAlertPermissionPlan(db)).length,
          databaseWrites: false,
        }),
      );
      return;
    }
    const result = await db.$transaction((tx) =>
      grantLegacyAlertPermissions(tx),
    );
    console.log(
      JSON.stringify({
        environment: "local-development",
        addedGrants: result.count,
        passwordsChanged: false,
        productionAccessed: false,
      }),
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch(() => {
  console.error(
    "Nao foi possivel concluir o ajuste local de permissoes. Nenhuma credencial foi exibida.",
  );
  process.exitCode = 1;
});
