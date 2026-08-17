import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { rewriteUploadUrlsInHtml } from "@/lib/content-url";
import { PublicPageHero } from "@/components/public-page-hero";
import { createPublicMetadata, stripHtmlToText } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const evento = await db.evento.findUnique({
    where: { id: params.id },
    select: { titulo: true, descricao: true, conteudo: true }
  });

  if (!evento) {
    return createPublicMetadata({
      title: "Evento não encontrado",
      description: "O evento solicitado não foi encontrado.",
      path: `/eventos/${params.id}`
    });
  }

  return createPublicMetadata({
    title: evento.titulo,
    description: evento.descricao || stripHtmlToText(evento.conteudo),
    path: `/eventos/${params.id}`,
    type: "article"
  });
}

export default async function EventoDetalhe({ params }: { params: { id: string } }) {
  // Busca o evento pelo id para exibir os detalhes.
  const evento = await db.evento.findUnique({
    where: { id: params.id }
  });
  if (!evento) return notFound();
  const conteudoNormalizado = rewriteUploadUrlsInHtml(evento.conteudo?.trim() ? evento.conteudo : `<p>${evento.descricao}</p>`);
  const dataEvento = new Date(evento.dataInicio).toLocaleDateString("pt-BR", { dateStyle: "medium" });
  const horaEvento = new Date(evento.dataInicio).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  });

  return (
    <div>
      <PublicPageHero
        eyebrow="Evento"
        title={evento.titulo}
        description={evento.local}
        icon="calendar"
        backLink={{ href: "/eventos", label: "Voltar para eventos" }}
        stats={[
          { value: dataEvento, label: "data" },
          { value: horaEvento, label: "horário" }
        ]}
      />

      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div
          className="article-content prose prose-slate max-w-none rounded-2xl border border-slate-200 bg-white px-6 py-7 shadow-sm dark:prose-invert dark:border-slate-800 dark:bg-slate-900"
          dangerouslySetInnerHTML={{
            __html: conteudoNormalizado
          }}
        />
      </section>
    </div>
  );
}
