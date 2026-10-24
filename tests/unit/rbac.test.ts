import { describe, expect, it } from "vitest";
import { can, getPermissionsForRoles, hasRole } from "@/lib/rbac";
import { Permissions as P } from "@/lib/permissions";

describe("RBAC", () => {
  it("RBAC-01 Admin herda todas as permissoes", () => {
    for (const permission of Object.values(P)) expect(can(["Admin"], permission)).toBe(true);
  });
  it("RBAC-02 Comunicacao pode criar noticias", () => expect(can(["Comunicação"], P.NEWS_WRITE)).toBe(true));
  it("RBAC-03 Docente nao pode administrar usuarios", () => expect(can(["Docente"], P.USERS_WRITE)).toBe(false));
  it("RBAC-04 combina permissoes herdadas de varios perfis", () => {
    expect(can(["Docente", "Secretaria"], P.DOCS_WRITE)).toBe(true);
    expect(getPermissionsForRoles(["Docente", "Secretaria"])).toContain(P.DOCS_WRITE);
  });
  it("RBAC-05 permissoes manuais prevalecem sobre Admin", () => expect(can(["Admin"], P.USERS_WRITE, [P.NEWS_READ])).toBe(false));
  it("RBAC-06 permissao manual autoriza sem perfil", () => expect(can([], P.DOCS_WRITE, [P.DOCS_WRITE])).toBe(true));
  it("RBAC-07 lista manual vazia conserva heranca", () => expect(can(["Secretaria"], P.DOCS_WRITE, [])).toBe(true));
  it("RBAC-08 superAdmin conserva acesso", () => expect(can([], P.USERS_WRITE, [P.INTERNAL_NO_PERMISSIONS], true)).toBe(true));
  it("RBAC-09 sem perfil ou permissao nega acesso", () => expect(can([], P.NEWS_WRITE)).toBe(false));
  it("RBAC-10 sentinela manual nega acessos herdados", () => expect(can(["Admin"], P.NEWS_WRITE, [P.INTERNAL_NO_PERMISSIONS])).toBe(false));
  it("RBAC-11 identifica perfil sem ampliar autorizacao", () => {
    expect(hasRole(["Docente"], "Docente")).toBe(true);
    expect(hasRole(["Docente"], "Admin")).toBe(false);
  });
});
