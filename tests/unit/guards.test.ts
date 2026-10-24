import { beforeEach, describe, expect, it, vi } from "vitest";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/require-auth";
import { requirePermission } from "@/lib/require-permission";
import { Permissions as P } from "@/lib/permissions";
import { testSession } from "../helpers";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn((url: string) => { throw new Error(`redirect:${url}`); }) }));

beforeEach(() => { vi.mocked(getServerSession).mockResolvedValue(null); });

describe("Protecao administrativa", () => {
  it("GUARD-11 informa expiracao por inatividade", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ ...testSession, invalidated: true, invalidatedReason: "idle" });
    await expect(requireAuth()).rejects.toThrow("redirect:/login?reason=session-expired");
  });
  it("GUARD-01 redireciona para login sem sessao", async () => {
    await expect(requireAuth()).rejects.toThrow("redirect:/login");
    expect(redirect).toHaveBeenCalledWith("/login");
  });
  it("GUARD-02 rejeita sessao invalidada", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ ...testSession, invalidated: true });
    await expect(requireAuth()).rejects.toThrow("session-invalidated");
  });
  it("GUARD-03 rejeita sessao sem identificador", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ ...testSession, user: { ...testSession.user, id: "" } });
    await expect(requireAuth()).rejects.toThrow("session-invalidated");
  });
  it("GUARD-04 conserva sessao valida", async () => {
    vi.mocked(getServerSession).mockResolvedValue(testSession);
    expect(await requireAuth()).toBe(testSession);
  });
});

describe("requirePermission integrado ao RBAC", () => {
  it("GUARD-05 sem sessao nao autoriza", async () => expect(await requirePermission(P.NEWS_WRITE)).toEqual({ allowed: false, session: null }));
  it("GUARD-06 sessao invalidada nao autoriza", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ ...testSession, invalidated: true });
    expect((await requirePermission(P.NEWS_WRITE)).allowed).toBe(false);
  });
  it("GUARD-07 sessao sem id nao autoriza", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ ...testSession, user: { ...testSession.user, id: "" } });
    expect((await requirePermission(P.NEWS_WRITE)).allowed).toBe(false);
  });
  it("GUARD-08 autoriza permissao herdada", async () => {
    vi.mocked(getServerSession).mockResolvedValue(testSession);
    expect((await requirePermission(P.DOCS_WRITE)).allowed).toBe(true);
  });
  it("GUARD-09 nega perfil sem permissao", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ ...testSession, user: { ...testSession.user, roles: ["Docente"] } });
    expect((await requirePermission(P.USERS_WRITE)).allowed).toBe(false);
  });
  it("GUARD-10 respeita restricao manual", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ ...testSession, user: { ...testSession.user, permissions: [P.NEWS_READ] } });
    expect((await requirePermission(P.USERS_WRITE)).allowed).toBe(false);
  });
});
