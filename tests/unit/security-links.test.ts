import { expect, it } from "vitest";
import { safeHref } from "@/lib/safe-href";
it.each(["javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,test", "vbscript:test", "//example.invalid", "/\\evil.invalid", "java\nscript:test"])("SEC-LINK bloqueia protocolo perigoso %s", (url) => { expect(safeHref(url)).toBe("#"); });
it.each(["/noticias", "https://example.invalid", "http://example.invalid/p", "mailto:teste@example.invalid", "tel:+00000", "#formulario", "?pagina=2", "noticias"])("SEC-LINK preserva link legitimo %s", (url) => { expect(safeHref(url)).toBe(url); });
it("SEC-LINK aceita fallback somente para ausencia de URL", () => { expect(safeHref(null, "/p/escola")).toBe("/p/escola"); });
