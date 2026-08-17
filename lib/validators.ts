import { z } from "zod";

z.setErrorMap((issue, ctx) => {
  if (issue.code === "invalid_string" && issue.validation === "email") {
    return { message: "Email inválido." };
  }
  if (issue.code === "too_small" && issue.type === "string") {
    return { message: `Deve ter no mínimo ${issue.minimum} caracteres.` };
  }
  if (issue.code === "too_small" && issue.type === "number") {
    return { message: `Deve ser no mínimo ${issue.minimum}.` };
  }
  return { message: ctx.defaultError };
});

export const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(6)
});

export const noticiaSchema = z.object({
  titulo: z.string().min(3),
  resumo: z.string().min(10),
  conteudo: z.string().min(20),
  imagemCapa: z.string().optional().nullable(),
  imagemCapaTamanho: z.enum(["PEQUENO", "MEDIO", "GRANDE", "COMPLETO"]).optional().nullable(),
  dataPublicacao: z.string().optional().nullable()
});

export const eventoSchema = z.object({
  titulo: z.string().min(3),
  descricao: z.string().min(10),
  conteudo: z.string().min(10),
  dataInicio: z.string(),
  dataFim: z.string().optional().nullable(),
  local: z.string().min(3),
  ordem: z.coerce.number().optional()
});

export const secretariaServidorSchema = z.object({
  nome: z.string().min(2),
  cargo: z.string().min(2),
  setor: z.string().min(2),
  descricao: z.string().optional().nullable(),
  fotoUrl: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  telefone: z.string().optional().nullable(),
  ordem: z.coerce.number().optional(),
  ativo: z.boolean().optional()
});

export const paginaSchema = z.object({
  titulo: z.string().min(3),
  conteudo: z.string().min(20),
  slug: z.string().min(3)
});

export const contatoSchema = z.object({
  nome: z.string().min(3),
  email: z.string().email(),
  assunto: z.string().min(3),
  mensagem: z.string().min(10),
  perfilDestino: z.enum(["Direção", "Secretaria", "Coordenação", "Comunicação", "Docente"]).optional()
});

export const usuarioSchema = z.object({
  nome: z.string().min(3),
  email: z.string().email(),
  senha: z.string().min(6),
  perfil: z.string().min(2)
});

export const usuarioUpdateSchema = z.object({
  nome: z.string().min(3).optional(),
  email: z.string().email().optional(),
  senha: z.string().min(6).optional(),
  status: z.string().optional(),
  perfil: z.string().min(2).optional()
});

export const consentSchema = z.object({
  essenciais: z.boolean(),
  analiticos: z.boolean(),
  marketing: z.boolean()
});
