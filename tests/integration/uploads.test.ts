import path from "node:path";
import fs from "fs/promises";
import { describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/uploads/[...path]/route";

vi.mock("fs/promises", () => ({ default: { readFile: vi.fn() } }));

describe("Leitura de uploads sem tocar em arquivos reais", () => {
  it("UPLOAD-01 serve bytes simulados com tipo e cache", async () => {
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from("imagem-teste"));
    const response = await GET(new Request("http://localhost"), { params: { path: ["fotos", "teste.png"] } });
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toContain("max-age");
    expect(await response.text()).toBe("imagem-teste");
  });
  it("UPLOAD-02 arquivo ausente retorna 404", async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error("ENOENT"));
    expect((await GET(new Request("http://localhost"), { params: { path: ["ausente.png"] } })).status).toBe(404);
  });
  it.each([["..", "fora", "segredo.txt"], ["..", `${path.basename(path.resolve("uploads"))}-privado`, "segredo.txt"]])("UPLOAD-03 impede caminho fora da raiz (%j)", async (...segments) => {
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from("nao deve ser lido"));
    const response = await GET(new Request("http://localhost"), { params: { path: segments } });
    expect(response.status).toBe(400);
    expect(fs.readFile).not.toHaveBeenCalled();
  });
});
