import { describe, expect, it } from "vitest";
import { sanitizeRichHtml } from "@/lib/sanitize-rich-html";

describe("AULA12 HTML rico no servidor", () => {
  it.each([
    '<script>alert(1)</script>',
    '<img src="x" onerror="alert(1)">',
    '<a href="javascript:alert(1)">teste</a>',
    '<a href="java&#x73;cript:alert(1)">teste</a>',
    '<img src="data:image/svg+xml;base64,PHN2Zz4=">',
    '<iframe src="https://externo.example.invalid"></iframe><object data="x"></object><embed src="x">',
    '<svg onload="alert(1)"><script>alert(1)</script></svg>',
    '<math><mtext><img src=x onerror=alert(1)></mtext></math>',
    '<noscript><p onclick="alert(1)">x</p></noscript>',
    '<textarea>ignorar</textarea/><img src=x onerror=alert(1)>',
    '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">'
  ])("SEC-HTML-01 remove HTML executavel (%#)", (payload) => {
    const html = sanitizeRichHtml(payload);
    expect(/<script|\bon\w+\s*=|javascript:|data:|<iframe|<object|<embed|<svg|<math|<meta/i.test(html)).toBe(false);
  });
  it("SEC-HTML-02 preserva formatacao e alinhamento do Quill", () => {
    const html = sanitizeRichHtml('<h2 class="ql-align-center">Titulo</h2><p><strong>Forte</strong> <em>Enfase</em> <u>Sublinhado</u></p><ol><li>Item</li></ol><blockquote>Citacao</blockquote>');
    for (const tag of ["h2", "strong", "em", "u", "ol", "li", "blockquote"]) expect(html.includes(`<${tag}`)).toBe(true);
    expect(html).toContain('class="ql-align-center"');
  });
  it("SEC-HTML-03 preserva tamanho e alinhamento legitimos das imagens", () => {
    const html = sanitizeRichHtml('<figure class="media media--wide"><img src="/api/uploads/paginas/exemplo.png" alt="Projeto" style="width:70%;display:block;margin-left:auto;margin-right:auto" data-align="center"><figcaption>Legenda</figcaption></figure>');
    expect(html).toContain('src="/api/uploads/paginas/exemplo.png"');
    expect(html).toContain("width:70%");
    expect(html).toContain("margin-left:auto");
    expect(html).toContain("Legenda");
    expect(html).toContain('loading="lazy"');
  });
  it("SEC-HTML-04 exclui classes e CSS fora da allowlist", () => {
    const html = sanitizeRichHtml('<p class="ql-align-right fixed inset-0" style="text-align:right;position:fixed;background:url(javascript:alert(1));width:expression(alert(1))">Texto</p>');
    expect(html).toContain("ql-align-right");
    expect(html).not.toMatch(/position|background|expression|inset|\bfixed\b/);
  });
  it.each(["https://example.invalid", "http://example.invalid", "mailto:equipe@example.invalid", "tel:+000000", "/documentos", "#conteudo"])("SEC-HTML-05 preserva protocolo legitimo (%#)", (href) => {
    expect(sanitizeRichHtml(`<a href="${href}" target="_blank">Link</a>`)).toContain(`href="${href}"`);
  });
  it("SEC-HTML-06 remove URL relativa a protocolo e protege nova aba", () => {
    const html = sanitizeRichHtml('<a href="//externo.example.invalid" target="_blank">Link</a>');
    expect(html).not.toContain("href=");
    expect(html).toContain('rel="noopener noreferrer"');
  });
  it("SEC-HTML-07 normaliza uploads antigos e suporta vazio", () => {
    expect(sanitizeRichHtml('<img src="https://host-antigo.example.invalid/api/uploads/a.png">')).toContain('src="/api/uploads/a.png"');
    expect(sanitizeRichHtml(null)).toBe("");
  });
});
