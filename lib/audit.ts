import { db } from "./db";

type AuditInput = {
  acao: string;
  entidade: string;
  registroId?: string | number | null;
  usuarioId?: string | number | null;
  detalhes?: Record<string, unknown>;
};

export async function logAuditoria(input: AuditInput) {
  await db.logAuditoria.create({
    data: {
      acao: input.acao,
      entidadeAfetada: input.entidade,
      idRegistroAfetado: input.registroId ? String(input.registroId) : null,
      usuarioResponsavelId: input.usuarioId ? String(input.usuarioId) : null,
      detalhesJson: input.detalhes ? JSON.stringify(input.detalhes) : null
    }
  });
}
