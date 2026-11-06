import { vi } from "vitest";

const query = () => vi.fn();
const model = () => ({ findUnique: query(), findFirst: query(), findMany: query(), create: query(), update: query(), updateMany: query(), delete: query(), deleteMany: query() });

// Only explicit test doubles are available: importing a route never opens PostgreSQL.
export const dbMock = {
  usuario: { findUnique: query(), findMany: query(), create: query(), update: query(), delete: query() },
  noticia: { findUnique: query(), findMany: query(), create: query(), update: query(), updateMany: query(), delete: query() },
  arquivoDocumento: { findUnique: query(), findFirst: query(), findMany: query(), create: query(), update: query(), delete: query() },
  logAuditoria: { create: query() },
  perfil: model(), usuarioPerfil: model(), usuarioPermissao: model(), passwordResetToken: model(),
  evento: model(), paginaInstitucional: model(), banner: model(), secretariaServidor: model(),
  midia: model(), albumFoto: model(), videoGaleria: model(), configuracaoSite: model(),
  $transaction: query(),
  $queryRaw: query(),
  $executeRaw: query(),
  $executeRawUnsafe: query()
};

export function resetDatabaseMock() {
  for (const model of Object.values(dbMock)) {
    const functions = typeof model === "function" ? [model] : Object.values(model);
    for (const fn of functions) {
      fn.mockReset();
      fn.mockImplementation(() => { throw new Error("Database call must be configured in the test"); });
    }
  }
  dbMock.logAuditoria.create.mockResolvedValue({ id: "audit-test" });
}
