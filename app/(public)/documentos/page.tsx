import { PublicPageHero } from "@/components/public-page-hero";
import { db } from "@/lib/db";
import { createPublicMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = createPublicMetadata({
  title: "Documentos",
  description: "Arquivos públicos, editais e documentos administrativos da Escola Municipal Getúlio Vargas.",
  path: "/documentos"
});

export default async function DocumentosPage({
  searchParams
}: {
  searchParams: { q?: string; categoria?: string; ano?: string };
}) {
  const { q, categoria, ano } = searchParams;
  // Aplica filtros apenas quando o usuario informa algum campo.
  const documentos = await db.arquivoDocumento.findMany({
    where: {
      status: "ATIVO",
      categoria: categoria || undefined,
      ano: ano ? Number(ano) : undefined,
      OR: q
        ? [
            { nome: { contains: q, mode: "insensitive" } },
            { descricao: { contains: q, mode: "insensitive" } }
          ]
        : undefined
    },
    // Ordena por prioridade definida no painel e, em seguida, por data.
    orderBy: [{ ordem: "asc" }, { dataUpload: "desc" }]
  });

  const filtrosAtivos = Boolean(q || categoria || ano);
  const categorias = new Set(documentos.map((documento) => documento.categoria).filter(Boolean)).size;

  return (
    <div>
      <PublicPageHero
        eyebrow="Transparência e arquivos"
        title="Documentos"
        description="Consulte arquivos públicos, documentos administrativos, editais e materiais disponibilizados pela escola."
        icon="documents"
        stats={[
          { value: documentos.length, label: "documento(s)", hint: filtrosAtivos ? "resultado(s) do filtro" : "disponível(is)" },
          { value: categorias, label: "categoria(s)", hint: "na listagem atual" }
        ]}
      />

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <form
          className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-[1fr_180px_140px_auto]"
          method="get"
          role="search"
          aria-label="Filtrar documentos"
        >
          <input
            name="q"
            placeholder="Buscar documentos"
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            defaultValue={q}
          />
          <input
            name="categoria"
            placeholder="Categoria"
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            defaultValue={categoria}
          />
          <input
            name="ano"
            placeholder="Ano"
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            defaultValue={ano}
          />
          {filtrosAtivos ? (
            <a
              href="/documentos"
              className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 shadow-sm transition hover:border-red-300 hover:bg-red-50 dark:border-red-900/60 dark:bg-slate-950 dark:text-red-300 dark:hover:bg-red-950/30"
            >
              Limpar filtro
            </a>
          ) : (
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
              type="submit"
            >
              Filtrar
            </button>
          )}
        </form>

        {documentos.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            Nenhum documento encontrado para os filtros informados.
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {documentos.map((doc) => (
              <article
                key={doc.id}
                className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{doc.nome}</h2>
                  {doc.descricao && <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{doc.descricao}</p>}
                  <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {doc.categoria} • {doc.ano}
                  </p>
                </div>
                <a
                  className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-2xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
                  href={`/api/documentos/${doc.id}/download`}
                >
                  Download
                </a>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
