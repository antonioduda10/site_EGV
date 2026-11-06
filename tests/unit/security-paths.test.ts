import path from "node:path";
import fs from "fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolvePathInsideUploads, assertRealUploadPath, getUploadRoot } from "@/lib/upload-path";
import { deleteFile, uploadFile, uploadPath } from "@/lib/uploads";

vi.mock("fs/promises", () => ({ default: { realpath: vi.fn(), mkdir: vi.fn(), writeFile: vi.fn(), unlink: vi.fn() } }));
beforeEach(() => {
  vi.mocked(fs.realpath).mockImplementation(async (value) => String(value));
  vi.mocked(fs.unlink).mockResolvedValue(undefined);
  vi.mocked(fs.mkdir).mockResolvedValue(undefined);
  vi.mocked(fs.writeFile).mockResolvedValue(undefined);
});

describe("AULA12 confinamento de leitura/escrita/exclusao", () => {
  it.each(["../segredo.txt", "/api/uploads/../segredo.txt", "%2e%2e/segredo.txt", "%252e%252e/segredo.txt", "..\\segredo.txt", "../uploads-vizinho/a.pdf", "/arquivo-externo.pdf", "C:\\outro\\arquivo.pdf", "midia/a.png:fluxo", "midia/\u0000.png", "", "/api/uploads/"])("SEC-PATH-01 rejeita escape ou caminho corrompido (%#)", (value) => {
    expect(() => resolvePathInsideUploads(value)).toThrow();
  });
  it.each(["midia/foto.png", "uploads/midia/foto.png", "/api/uploads/midia/foto.png", "https://host-antigo.example.invalid/api/uploads/midia/foto.png"])("SEC-PATH-02 conserva caminhos legitimos (%#)", (value) => {
    expect(resolvePathInsideUploads(value)).toBe(path.join(getUploadRoot(), "midia", "foto.png"));
  });
  it("SEC-PATH-03 uploadPath tambem exige confinamento", () => {
    expect(() => uploadPath("../fora")).toThrow();
  });
  it("SEC-PATH-04 exclusao externa bloqueada antes de unlink", async () => {
    await expect(deleteFile("../fora.pdf")).rejects.toThrow();
    expect(fs.unlink).not.toHaveBeenCalled();
  });
  it("SEC-PATH-05 link simbolico que escapa da raiz e bloqueado", async () => {
    const root = getUploadRoot();
    vi.mocked(fs.realpath).mockImplementation(async (value) => String(value) === root ? root : path.join(root, "..", "externo", "arquivo.pdf"));
    await expect(assertRealUploadPath(resolvePathInsideUploads("documentos/arquivo.pdf"))).rejects.toThrow();
    await expect(deleteFile("/api/uploads/documentos/arquivo.pdf")).rejects.toThrow();
    expect(fs.unlink).not.toHaveBeenCalled();
  });
  it("SEC-PATH-06 arquivo ausente nao exclui outro alvo", async () => {
    vi.mocked(fs.realpath).mockRejectedValue(Object.assign(new Error("ausente"), { code: "ENOENT" }));
    await deleteFile("/api/uploads/documentos/arquivo.pdf");
    expect(fs.unlink).not.toHaveBeenCalled();
  });
  it("SEC-PATH-07 escrita usa nome aleatorio e criacao exclusiva", async () => {
    const bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJXkAAAAASUVORK5CYII=", "base64");
    const url = await uploadFile(new File([bytes], "foto.png", { type: "image/png" }), "noticias");
    expect(url).toMatch(/^\/api\/uploads\/noticias\/[a-f0-9-]{36}\.png$/);
    expect(fs.writeFile).toHaveBeenCalledWith(expect.any(String), expect.any(Buffer), { flag: "wx" });
  });
});
