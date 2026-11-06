import { describe, expect, it } from "vitest";
import { zipSync, strToU8, type Zippable } from "fflate";
import { validateUpload } from "@/lib/upload-policy";

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aJXkAAAAASUVORK5CYII=", "base64");

describe("AULA12 politica central de uploads", () => {
  it("SEC-UP-01 aceita PNG com MIME, extensao e assinatura coerentes", async () => {
    expect((await validateUpload(new File([png], "imagem.png", { type: "image/png" }), "noticias")).mime).toBe("image/png");
  });
  it.each([
    ["imagem.png", "image/png", "<html>nao e imagem</html>"],
    ["arquivo.html", "image/png", png],
    ["imagem.jpg", "image/jpeg", png],
    ["imagem.svg", "image/svg+xml", "<svg></svg>"],
    ["script.js", "application/javascript", "alert(1)"],
    ["programa.exe", "application/octet-stream", "MZ"]
  ])("SEC-UP-02 rejeita MIME/extensao falsos e formatos proibidos (%#)", async (name, type, bytes) => {
    await expect(validateUpload(new File([bytes], name, { type }), "noticias")).rejects.toThrow();
  });
  it.each(["documentos", "midia", "banners"])("SEC-UP-03 rejeita arquivo acima do limite (%s)", async (folder) => {
    const size = folder === "midia" ? 100 * 1024 * 1024 + 1 : folder === "documentos" ? 10 * 1024 * 1024 + 1 : 5 * 1024 * 1024 + 1;
    const file = new File(["fixture"], folder === "midia" ? "x.mp4" : folder === "banners" ? "x.png" : "x.pdf", { type: folder === "midia" ? "video/mp4" : folder === "banners" ? "image/png" : "application/pdf" });
    Object.defineProperty(file, "size", { value: size });
    await expect(validateUpload(file, folder)).rejects.toThrow("não ultrapassar");
  });
  it("SEC-UP-04 aceita PDF e rejeita arquivo vazio ou destino externo", async () => {
    const file = new File(["%PDF-1.4\n%%EOF"], "edital.pdf", { type: "application/pdf" });
    expect((await validateUpload(file, "documentos")).mime).toBe("application/pdf");
    await expect(validateUpload(new File([], "x.png", { type: "image/png" }), "noticias")).rejects.toThrow();
    await expect(validateUpload(file, "../externo")).rejects.toThrow();
  });
  it.each(["docx", "xlsx"])("SEC-UP-05 identifica conteiner Office real (%s)", async (extension) => {
    const part = extension === "docx" ? "word/document.xml" : "xl/workbook.xml";
    const partType = extension === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml";
    const files: Zippable = {
      "[Content_Types].xml": strToU8(`<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/${part}" ContentType="${partType}"/></Types>`),
      [part]: strToU8(extension === "docx" ? '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body/></w:document>' : '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheets/></workbook>')
    };
    const bytes = zipSync(files);
    const type = extension === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    expect((await validateUpload(new File([bytes], `arquivo.${extension}`, { type }), "documentos")).mime).toBe(type);
  });
  it("SEC-UP-06 ZIP comum nao pode fingir ser documento Office", async () => {
    const bytes = zipSync({ "texto.txt": strToU8("conteudo de teste") });
    await expect(validateUpload(new File([bytes], "arquivo.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), "documentos")).rejects.toThrow();
  });
});
