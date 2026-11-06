import type { Prisma } from "@prisma/client";

// Explicit allowlist: credentials, reset tokens and session versions never cross HTTP/RSC boundaries.
export const safeUserSelect = {
  id: true,
  nome: true,
  email: true,
  status: true,
  superAdmin: true,
  dataCadastro: true,
  perfis: { select: { id: true, perfil: { select: { id: true, nome: true } } } },
  permissoes: { select: { permissao: true } }
} satisfies Prisma.UsuarioSelect;
