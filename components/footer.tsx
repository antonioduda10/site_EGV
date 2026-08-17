import Link from "next/link";

type LinkItem = { href: string; label: string; newTab?: boolean };
type FooterData = {
  acessoRapido?: LinkItem[];
  politicas?: LinkItem[];
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
    mostrarMapa?: boolean;
  };
  sociais?:
    | Array<{ nome?: string; label?: string; href?: string; newTab?: boolean }>
    | {
      facebook?: string | { href?: string; newTab?: boolean };
      instagram?: string | { href?: string; newTab?: boolean };
      youtube?: string | { href?: string; newTab?: boolean };
    };
};

export function Footer({ data, logoUrl }: { data?: FooterData; logoUrl?: string | null }) {
  const acessoRapido = data?.acessoRapido ?? [
    { href: "/noticias", label: "Notícias" },
    { href: "/eventos", label: "Eventos" },
    { href: "/documentos", label: "Documentos" },
    { href: "/contato", label: "Contato" }
  ];

  const politicas = data?.politicas ?? [
    { href: "/politica-privacidade", label: "Política de Privacidade" },
    { href: "/cookies", label: "Cookies" },
    { href: "/termos", label: "Termos de Uso" }
  ];
  const escola = data?.escola ?? {
    nome: "Escola Getúlio Vargas",
    descricao: "Educação de qualidade, transformando vidas através do conhecimento e da cidadania desde 1978.",
    endereco: "Povoado Juverlândia, S/N — Sítio Novo do Tocantins - TO",
    telefone: "(63) 3446-1286",
    email: "contato@egv.edu.br"
  };
  const atendimento = data?.atendimento ?? { horarios: "Seg - Sex: 07h às 18h | Sábados: 08h às 12h (Plantão)" };
  const socialLinks = normalizeSocialLinks(data?.sociais);
  const mapVisible = atendimento.mostrarMapa !== false;
  const mapUrl = mapVisible ? buildMapEmbedUrl(escola.endereco ?? "", atendimento.mapaUrl ?? "") : "";
  const resolvedLogo = logoUrl?.trim() || "";
  return (
    <footer className="bg-slate-900 text-slate-200 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-8 grid gap-8 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3 mb-3">
            {resolvedLogo ? (
              <img
                src={resolvedLogo}
                alt="Logo da Escola Municipal Getúlio Vargas"
                className="h-10 w-10 rounded-full object-contain bg-white"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold">
                EGV
              </div>
            )}
            <div>
              <h2 className="font-bold text-white">{escola.nome}</h2>
              <p className="text-xs text-slate-400">{escola.descricao}</p>
            </div>
          </div>
          <div className="mt-2 text-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2 md:flex-1">
                <div className="flex items-center gap-2 text-slate-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{escola.endereco}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>{escola.telefone}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>{escola.email}</span>
                </div>
              </div>
              {mapUrl && (
                <div className="md:ml-3 md:shrink-0">
                  <div className="overflow-hidden rounded-lg border border-slate-800 max-w-[180px]">
                    <iframe
                      src={mapUrl}
                      title="Mapa da localização da escola"
                      className="w-full h-20"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white mb-3">Links Úteis</h3>
          <ul className="space-y-2 text-sm">
            {acessoRapido.map((link) => (
              <li key={link.href}>
                {renderConfiguredLink(link, "hover:text-white transition-colors")}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white mb-3">Atendimento</h3>
          <div className="space-y-2 text-sm text-slate-300">
            <p>{atendimento.horarios}</p>
          </div>
          <h3 className="text-sm font-semibold text-white mt-4 mb-3">Siga-nos</h3>
          <div className="space-y-2 text-sm">
            {socialLinks.map((social, index) => (
              <a
                key={`${social.nome}-${index}`}
                href={social.href}
                target={social.newTab ? "_blank" : undefined}
                rel={social.newTab ? "noreferrer" : undefined}
                className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
              >
                <span className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center">
                  {renderSocialIcon(social.nome, social.href)}
                </span>
                {social.nome}
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} Escola Municipal Getúlio Vargas. Todos os direitos reservados.</p>
          <div className="flex gap-4">
            {politicas.map((link) => (
              <span key={link.href}>{renderConfiguredLink(link, "hover:text-white transition-colors")}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

type SocialListItem = { nome: string; href: string; newTab: boolean };

function normalizeSocialLinks(value: FooterData["sociais"]): SocialListItem[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => ({
        nome: (item.nome ?? item.label ?? "Rede social").trim(),
        href: (item.href ?? "").trim(),
        newTab: item.newTab ?? true
      }))
      .filter((item) => item.nome && item.href);
  }

  const legacy = value ?? { facebook: "", instagram: "", youtube: "" };
  const mapped: SocialListItem[] = [
    { nome: "Facebook", ...normalizeLegacySocialLink(legacy.facebook) },
    { nome: "Instagram", ...normalizeLegacySocialLink(legacy.instagram) },
    { nome: "YouTube", ...normalizeLegacySocialLink(legacy.youtube) }
  ];

  return mapped.filter((item) => item.href);
}

function normalizeLegacySocialLink(value: string | { href?: string; newTab?: boolean } | undefined) {
  if (typeof value === "string") {
    return { href: value.trim(), newTab: true };
  }

  if (value && typeof value === "object") {
    return {
      href: (value.href ?? "").trim(),
      newTab: value.newTab ?? true
    };
  }

  return { href: "", newTab: true };
}

function renderSocialIcon(nome: string, href: string) {
  const key = `${nome} ${href}`.toLowerCase();

  if (key.includes("facebook") || key.includes("fb.com")) {
    return (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
      </svg>
    );
  }

  if (key.includes("instagram") || key.includes("instagr.am")) {
    return (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 7.2a4.8 4.8 0 100 9.6 4.8 4.8 0 000-9.6zm0 7.9a3.1 3.1 0 110-6.2 3.1 3.1 0 010 6.2z" />
        <path d="M16.9 2H7.1A5.1 5.1 0 002 7.1v9.8A5.1 5.1 0 007.1 22h9.8a5.1 5.1 0 005.1-5.1V7.1A5.1 5.1 0 0016.9 2zm3.4 14.9a3.4 3.4 0 01-3.4 3.4H7.1a3.4 3.4 0 01-3.4-3.4V7.1a3.4 3.4 0 013.4-3.4h9.8a3.4 3.4 0 013.4 3.4v9.8z" />
        <circle cx="17.3" cy="6.7" r="1.1" />
      </svg>
    );
  }

  if (key.includes("youtube") || key.includes("youtu.be")) {
    return (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M21 8.5a3 3 0 00-2.1-2.1C17 6 12 6 12 6s-5 0-6.9.4A3 3 0 003 8.5 31 31 0 003 12a31 31 0 00.1 3.5 3 3 0 002.1 2.1C7 18 12 18 12 18s5 0 6.9-.4a3 3 0 002.1-2.1A31 31 0 0021 12a31 31 0 000-3.5zM10 15V9l5 3-5 3z" />
      </svg>
    );
  }

  if (key.includes("linkedin")) {
    return (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M4.98 3.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM3 9h4v12H3zM9 9h3.8v1.7h.1c.5-1 1.9-2.1 4-2.1 4.2 0 5 2.8 5 6.4V21h-4v-5.2c0-1.2 0-2.9-1.8-2.9s-2 1.4-2 2.8V21H9z" />
      </svg>
    );
  }

  if (key.includes("tiktok")) {
    return (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M14 3h3.2A4.8 4.8 0 0021 6.8V10a8 8 0 01-4-1.1V15a6 6 0 11-6-6c.3 0 .7 0 1 .1v3.2a2.8 2.8 0 102.8 2.8V3z" />
      </svg>
    );
  }

  const initials = nome.trim().slice(0, 1).toUpperCase() || "#";
  return <span className="text-[10px] font-semibold leading-none">{initials}</span>;
}

function buildMapEmbedUrl(address: string, fixedUrl: string) {
  const fixed = fixedUrl.trim();
  if (fixed) {
    const iframeSrcMatch = fixed.match(/src=["']([^"']+)["']/i);
    const iframeSrc = iframeSrcMatch?.[1]?.trim();
    if (iframeSrc) {
      if (iframeSrc.includes("/maps/embed") || iframeSrc.includes("output=embed")) {
        return iframeSrc;
      }
      return `https://maps.google.com/maps?q=${encodeURIComponent(iframeSrc)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
    }

    if (!fixed.startsWith("http://") && !fixed.startsWith("https://")) {
      return `https://maps.google.com/maps?q=${encodeURIComponent(fixed)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
    }

    try {
      const parsed = new URL(fixed);
      const host = parsed.hostname.toLowerCase();

      if (host.includes("google.") && (parsed.pathname.includes("/maps/embed") || parsed.searchParams.get("output") === "embed")) {
        return fixed;
      }

      const query = parsed.searchParams.get("q")
        ?? parsed.searchParams.get("query")
        ?? parsed.searchParams.get("destination")
        ?? "";

      if (query.trim()) {
        return `https://maps.google.com/maps?q=${encodeURIComponent(query.trim())}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
      }

      const placeMatch = parsed.pathname.match(/\/place\/([^/]+)/i);
      if (placeMatch?.[1]) {
        const place = decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
        return `https://maps.google.com/maps?q=${encodeURIComponent(place)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
      }

      const coordinatesMatch = parsed.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
      if (coordinatesMatch) {
        const lat = coordinatesMatch[1];
        const lng = coordinatesMatch[2];
        return `https://maps.google.com/maps?q=${lat},${lng}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
      }
    } catch {
      return `https://maps.google.com/maps?q=${encodeURIComponent(fixed)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
    }

    return `https://maps.google.com/maps?q=${encodeURIComponent(fixed)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  }

  const normalized = address.trim();
  if (!normalized) return "";
  const query = encodeURIComponent(normalized);
  return `https://maps.google.com/maps?q=${query}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
}

function renderConfiguredLink(link: LinkItem, className: string) {
  const isExternal = link.href.startsWith("http://") || link.href.startsWith("https://");
  const shouldOpenInNewTab = Boolean(link.newTab ?? isExternal);

  if (isExternal) {
    return (
      <a
        href={link.href}
        target={shouldOpenInNewTab ? "_blank" : undefined}
        rel={shouldOpenInNewTab ? "noreferrer" : undefined}
        className={className}
      >
        {link.label}
      </a>
    );
  }

  return (
    <Link
      href={link.href}
      target={shouldOpenInNewTab ? "_blank" : undefined}
      rel={shouldOpenInNewTab ? "noreferrer" : undefined}
      className={className}
    >
      {link.label}
    </Link>
  );
}
