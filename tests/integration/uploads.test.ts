import path from "node:path";
import fs from "fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/uploads/[...path]/route";
import { getServerSession } from "next-auth";
import { dbMock } from "../mocks/db";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("fs/promises", () => ({ default: { readFile: vi.fn(), realpath: vi.fn() } }));

beforeEach(() => {
  vi.mocked(getServerSession).mockResolvedValue(null);
  vi.mocked(fs.realpath).mockImplementation(async (value) => String(value));
  dbMock.arquivoDocumento.findMany.mockResolvedValue([]);
  dbMock.midia.findMany.mockResolvedValue([{ caminho: "/api/uploads/midia/teste.png" }]);
});

describe("Leitura de uploads sem tocar em arquivos reais", () => {
  it("UPLOAD-01 serve bytes simulados com tipo e cache", async () => {
    const bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJXkAAAAASUVORK5CYII=", "base64");
    vi.mocked(fs.readFile).mockResolvedValue(bytes);
    const response = await GET(new Request("http://localhost"), { params: { path: ["midia", "teste.png"] } });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(Buffer.from(await response.arrayBuffer()).equals(bytes)).toBe(true);
  });
  it("UPLOAD-02 arquivo ausente retorna 404", async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error("ENOENT"));
    expect((await GET(new Request("http://localhost"), { params: { path: ["midia", "teste.png"] } })).status).toBe(404);
  });
  it.each([["..", "fora", "segredo.txt"], ["..", `${path.basename(path.resolve("uploads"))}-privado`, "segredo.txt"]])("UPLOAD-03 impede caminho fora da raiz (%j)", async (...segments) => {
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from("nao deve ser lido"));
    const response = await GET(new Request("http://localhost"), { params: { path: segments } });
    expect(response.status).toBe(400);
    expect(fs.readFile).not.toHaveBeenCalled();
  });
});
