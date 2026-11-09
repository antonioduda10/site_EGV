import { z } from "zod";
import { safeHref } from "./safe-href";

const link = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (value) => !value || Boolean(safeHref(value, "")),
    "Informe um link valido.",
  );
const image = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (value) =>
      !value ||
      (Boolean(safeHref(value, "")) &&
        (/^\/(?!\/)/.test(value) || /^https?:\/\//i.test(value))),
    "Use uma imagem com endereco interno, HTTP ou HTTPS.",
  );

export const homeAlertInputSchema = z
  .object({
    titulo: z
      .string()
      .trim()
      .max(180, "Use ate 180 caracteres no titulo.")
      .default(""),
    descricao: z.string().trim().max(4000).default(""),
    href: link.default(""),
    imagemUrl: image.default(""),
    ativo: z.boolean().default(true),
  })
  .strict()
  .refine(
    (alert) => Boolean(alert.titulo || alert.descricao),
    "Informe o titulo ou a descricao do aviso.",
  );

export const homeAlertPatchSchema = z.union([
  homeAlertInputSchema,
  z.object({ ativo: z.boolean() }).strict(),
  z.object({ mover: z.enum(["subir", "descer"]) }).strict(),
]);

export const homeAlertSettingsSchema = z
  .object({
    alertAnimationEnabled: z.boolean(),
    alertAnimationSpeed: z.enum(["slow", "normal", "fast"]),
  })
  .strict();

export const homeAlertIdSchema = z.string().regex(/^[a-zA-Z0-9-]{1,100}$/);

export function isHomeAlertsSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin === null) return true;
  try {
    const source = new URL(origin);
    const target = new URL(request.url);
    if (
      ![source, target].every((url) =>
        ["http:", "https:"].includes(url.protocol),
      ) ||
      source.username ||
      source.password ||
      source.pathname !== "/" ||
      source.search ||
      source.hash
    )
      return false;

    // Next can expose a bind address or normalize loopback in request.url; Host retains the browser's authority.
    const host = request.headers.get("host");
    if (
      host !== null &&
      (!host ||
        /\s/.test(host) ||
        ["\\", "/", "?", "#", "@", ","].some((character) =>
          host.includes(character),
        ))
    )
      return false;
    const destination =
      host === null ? target : new URL(`${target.protocol}//${host}`);
    if (source.origin === destination.origin) return true;

    try {
      const canonical = new URL(process.env.NEXTAUTH_URL ?? "");
      return (
        ["http:", "https:"].includes(canonical.protocol) &&
        !canonical.username &&
        !canonical.password &&
        source.origin === canonical.origin
      );
    } catch {
      return false;
    }
  } catch {
    return false;
  }
}
