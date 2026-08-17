import { PublicPageHero } from "@/components/public-page-hero";
import { ContatoForm } from "@/components/forms/contato-form";
import { db } from "@/lib/db";
import { parsePublicTexts } from "@/lib/public-texts";
import { getPublicTextsJson } from "@/lib/public-texts-config";
import { createPublicMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = createPublicMetadata({
  title: "Contato",
  description: "Canal de atendimento para solicitações, dúvidas, sugestões e mensagens à Escola Municipal Getúlio Vargas.",
  path: "/contato"
});

type RodapeConfig = {
  escola?: {
    nome?: string;
    descricao?: string;
    endereco?: string;
    telefone?: string;
    email?: string;
  };
  atendimento?: {
    horarios?: string;
    mapaUrl?: string;
  };
};

const fallbackEscola = {
  nome: "Escola Municipal Getúlio Vargas",
  descricao: "Educação, acolhimento e comunicação próxima com a comunidade escolar.",
  endereco: "Povoado Juverlândia, S/N - Sítio Novo do Tocantins - TO",
  telefone: "(63) 3446-1286",
  email: "contato@egv.edu.br"
};

const fallbackAtendimento = {
  horarios: "Segunda a sexta, das 7h às 18h"
};

export default async function ContatoPage() {
  const [config, textosPublicosJson] = await Promise.all([
    db.configuracaoSite.findFirst({ select: { rodapeJson: true } }).catch(() => null),
    getPublicTextsJson()
  ]);
  const rodape = parseRodapeConfig(config?.rodapeJson);
  const textos = parsePublicTexts(textosPublicosJson);
  const escola = { ...fallbackEscola, ...(rodape?.escola ?? {}) };
  const atendimento = { ...fallbackAtendimento, ...(rodape?.atendimento ?? {}) };
  const telefoneHref = buildPhoneHref(escola.telefone);
  const mapaHref = buildMapHref(escola.endereco, atendimento.mapaUrl);

  return (
    <div className="bg-slate-50 dark:bg-slate-950">
      <PublicPageHero
        eyebrow="Fale conosco"
        title={textos.contato.title}
        description={textos.contato.description}
        icon="contact"
        contentCard
        actions={[
          { href: "#formulario-contato", label: "Enviar mensagem" },
          ...(mapaHref ? [{ href: mapaHref, label: "Ver localização", external: true, variant: "secondary" as const }] : [])
        ]}
        aside={
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
              Atendimento escolar
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">{escola.nome}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{escola.descricao}</p>
            <div className="mt-5 space-y-3">
              <ContactLine label="Horário" value={atendimento.horarios} />
              <ContactLine label="Telefone" value={escola.telefone} href={telefoneHref} />
              <ContactLine label="E-mail" value={escola.email} href={`mailto:${escola.email}`} />
            </div>
          </div>
        }
      />

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:py-12">
        <div className="space-y-4">
          <InfoCard
            title="Secretaria"
            description="Use este canal para documentos, declarações, matrículas e dúvidas administrativas."
          />
          <InfoCard
            title="Direção e coordenação"
            description="Encaminhe assuntos pedagógicos, sugestões de melhoria e mensagens institucionais."
          />
          <InfoCard
            title="Localização"
            description={escola.endereco}
            href={mapaHref}
            action="Abrir no mapa"
          />
        </div>

        <div id="formulario-contato" className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="mb-6 border-b border-slate-100 pb-5 dark:border-slate-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
              Formulário
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">Envie sua mensagem</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Preencha os dados abaixo para que a escola possa responder com mais agilidade.
            </p>
          </div>
          <ContatoForm />
        </div>
      </section>
    </div>
  );
}

function ContactLine({ label, value, href }: { label: string; value?: string; href?: string }) {
  if (!value) return null;

  const content = (
    <span className="text-sm font-semibold text-slate-900 dark:text-white">{value}</span>
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      {href ? (
        <a href={href} className="mt-1 inline-flex break-words hover:text-brand-700 dark:hover:text-brand-200">
          {content}
        </a>
      ) : (
        <p className="mt-1">{content}</p>
      )}
    </div>
  );
}

function InfoCard({ title, description, href, action }: { title: string; description: string; href?: string; action?: string }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-sm font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
        {title.slice(0, 1)}
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
      {href && action && (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex text-sm font-semibold text-brand-700 hover:text-brand-800 dark:text-brand-300 dark:hover:text-brand-200"
        >
          {action}
        </a>
      )}
    </article>
  );
}

function parseRodapeConfig(value?: string | null): RodapeConfig | null {
  try {
    const parsed = JSON.parse(value ?? "");
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function buildPhoneHref(phone?: string) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return undefined;
  return digits.startsWith("55") ? `tel:+${digits}` : `tel:+55${digits}`;
}

function buildMapHref(address?: string, fixedUrl?: string) {
  const fixed = fixedUrl?.trim();
  const iframeSrc = fixed?.match(/src=["']([^"']+)["']/i)?.[1]?.trim();
  if (iframeSrc?.startsWith("http://") || iframeSrc?.startsWith("https://")) return iframeSrc;
  if (fixed?.startsWith("http://") || fixed?.startsWith("https://")) return fixed;
  const target = fixed || address?.trim();
  return target ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(target)}` : undefined;
}
