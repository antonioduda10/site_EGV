import { PublicPageHero } from "@/components/public-page-hero";
import { db } from "@/lib/db";
import { rewriteUploadUrlsInHtml } from "@/lib/content-url";
import { createPublicMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = createPublicMetadata({
  title: "Política de Privacidade",
  description: "Informações sobre tratamento de dados e privacidade no Portal EGV.",
  path: "/politica-privacidade"
});

export default async function PoliticaPrivacidade() {
  // Busca o texto da politica de privacidade configurado no painel.
  const config = await db.configuracaoSite.findFirst({
    select: { politicaPrivacidade: true }
  }).catch(() => null);
  const conteudo = rewriteUploadUrlsInHtml(
    config?.politicaPrivacidade ?? "<p>Esta página descreve como os dados são tratados conforme a LGPD.</p>"
  );
  return (
    <div className="bg-slate-50 dark:bg-slate-950">
      <PublicPageHero
        eyebrow="LGPD e transparência"
        title="Política de Privacidade"
        description="Informações sobre tratamento de dados e privacidade no Portal EGV."
        icon="documents"
      />
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div
          className="article-content prose prose-slate max-w-none rounded-2xl border border-slate-200 bg-white px-6 py-7 shadow-sm dark:prose-invert dark:border-slate-800 dark:bg-slate-900"
          dangerouslySetInnerHTML={{
            // Renderiza o HTML salvo na configuracao do site.
            __html: conteudo
          }}
        />
      </section>
    </div>
  );
}
