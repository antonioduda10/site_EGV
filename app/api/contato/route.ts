import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { contatoSchema } from "@/lib/validators";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = contatoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados inválidos. Confira nome, email, assunto e mensagem." }, { status: 400 });
    }

    try {
      await db.sugestaoContato.create({
        data: {
          ...parsed.data,
          perfilDestino: parsed.data.perfilDestino ?? "Direção",
          statusAtendimento: "NOVO"
        }
      });
    } catch (error) {
      // Compatibilidade temporária para ambientes sem migration do campo perfilDestino.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError
        && error.code === "P2022"
      ) {
        await db.sugestaoContato.create({
          data: {
            nome: parsed.data.nome,
            email: parsed.data.email,
            assunto: parsed.data.assunto,
            mensagem: parsed.data.mensagem,
            statusAtendimento: "NOVO"
          }
        });
      } else {
        throw error;
      }
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
      return NextResponse.json(
        { error: "Banco sem a tabela de contatos. Execute as migrations do Prisma." },
        { status: 500 }
      );
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2022") {
      return NextResponse.json(
        { error: "Banco desatualizado. Execute as migrations do Prisma para habilitar destino por perfil." },
        { status: 500 }
      );
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      return NextResponse.json(
        { error: "Falha de conexão com o banco de dados. Verifique o PostgreSQL e o DATABASE_URL." },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: "Erro interno ao enviar contato." }, { status: 500 });
  }
}
