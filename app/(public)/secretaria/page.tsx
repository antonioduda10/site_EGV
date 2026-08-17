import { db } from "@/lib/db";
import { toPublicUrl } from "@/lib/uploads-url";
import { PublicPageHero } from "@/components/public-page-hero";
import { createPublicMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

const setorPrioridade = ["Direção", "Coordenação", "Secretaria", "Apoio Administrativo"];

export const metadata = createPublicMetadata({
  title: "Secretaria e equipe gestora",
  description: "Direção, coordenação, secretaria e equipe administrativa da Escola Municipal Getúlio Vargas.",
  path: "/secretaria"
});

export default async function SecretariaPage() {
  const servidores = await db.secretariaServidor.findMany({
    where: { ativo: true },
    orderBy: [{ ordem: "asc" }, { setor: "asc" }, { nome: "asc" }]
  });

  const grupos = groupBySetor(servidores);

  return (
    <main className="bg-slate-50 dark:bg-slate-950">
      <PublicPageHero
        eyebrow="Atendimento e gestão escolar"
        title="Secretaria e equipe gestora"
        description="Conheça a equipe responsável pela direção, coordenação, secretaria e apoio administrativo da Escola Municipal Getúlio Vargas."
        icon="team"
        maxWidth="7xl"
        stats={[
          { value: servidores.length, label: "servidor(es)", hint: "publicado(s)" },
          { value: grupos.length, label: "setor(es)", hint: "organizado(s)" }
        ]}
      />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {servidores.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            As informações da secretaria serão publicadas em breve.
          </div>
        ) : (
          <div className="space-y-8">
            {grupos.map(([setor, items]) => (
              <section key={setor} className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700 dark:text-brand-300">
                    {items.length} integrante(s)
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{setor}</h2>
                </div>
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((servidor) => (
                    <ServidorCard key={servidor.id} servidor={servidor} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

type Servidor = Awaited<ReturnType<typeof db.secretariaServidor.findMany>>[number];

function ServidorCard({ servidor }: { servidor: Servidor }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="relative h-56 bg-slate-100 dark:bg-slate-800">
        {servidor.fotoUrl ? (
          <img
            src={toPublicUrl(servidor.fotoUrl)}
            alt={servidor.nome}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-5xl font-bold text-brand-700 dark:text-brand-300">
            {getInitials(servidor.nome)}
          </div>
        )}
      </div>
      <div className="space-y-3 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700 dark:text-brand-300">{servidor.cargo}</p>
          <h3 className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-100">{servidor.nome}</h3>
        </div>
        {servidor.descricao && (
          <p className="line-clamp-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{servidor.descricao}</p>
        )}
        {(servidor.email || servidor.telefone) && (
          <div className="flex flex-wrap gap-2 pt-1 text-xs">
            {servidor.email && (
              <a
                href={`mailto:${servidor.email}`}
                className="rounded-full bg-slate-100 px-3 py-1.5 font-medium text-slate-700 transition hover:bg-brand-50 hover:text-brand-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-brand-900/40 dark:hover:text-brand-300"
              >
                E-mail
              </a>
            )}
            {servidor.telefone && (
              <span className="rounded-full bg-slate-100 px-3 py-1.5 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {servidor.telefone}
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function groupBySetor(servidores: Servidor[]) {
  const grouped = new Map<string, Servidor[]>();
  for (const servidor of servidores) {
    const setor = servidor.setor || "Secretaria";
    grouped.set(setor, [...(grouped.get(setor) ?? []), servidor]);
  }

  return Array.from(grouped.entries()).sort(([setorA], [setorB]) => {
    const orderA = setorPrioridade.indexOf(setorA);
    const orderB = setorPrioridade.indexOf(setorB);
    const safeA = orderA === -1 ? Number.MAX_SAFE_INTEGER : orderA;
    const safeB = orderB === -1 ? Number.MAX_SAFE_INTEGER : orderB;
    return safeA - safeB || setorA.localeCompare(setorB, "pt-BR");
  });
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
