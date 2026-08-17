"use client";

import { useEffect, useState } from "react";
import { defaultPublicTexts, parsePublicTexts, type PublicTexts } from "@/lib/public-texts";
import {
  defaultHomeAlerts,
  defaultHomeDisplaySettings,
  parseHomeAlerts,
  parseHomeDisplaySettings,
  serializeHomeAlertsConfig,
  type HomeAlert,
  type HomeAlertAnimationSpeed,
  type HomeDisplaySettings
} from "@/lib/home-alerts";
import { toPublicUrl } from "@/lib/uploads-url";

type MenuLink = { href: string; label: string; newTab?: boolean };
type SocialLinkItem = { nome: string; href: string; newTab?: boolean };
type RodapeLinks = {
  acessoRapido: MenuLink[];
  politicas: MenuLink[];
  escola: {
    nome: string;
    descricao: string;
    endereco: string;
    telefone: string;
    email: string;
  };
  atendimento: {
    horarios: string;
    mapaUrl?: string;
    mostrarMapa?: boolean;
  };
  sociais: SocialLinkItem[];
};
type RodapeLinkSection = "acessoRapido" | "politicas";
type AcessoRapidoItem = { label: string; href: string; descricao: string; newTab?: boolean };

type Config = {
  logoUrl?: string | null;
  corPrimaria?: string | null;
  corSecundaria?: string | null;
  politicaPrivacidade?: string | null;
  cookies?: string | null;
  termos?: string | null;
  botaoHistoriaLink?: string | null;
  botaoHistoriaNovaAba?: boolean;
  menuLinks: MenuLink[];
  acessoRapido: AcessoRapidoItem[];
  rodape: RodapeLinks;
  publicTexts: PublicTexts;
  homeAlerts: HomeAlert[];
  homeDisplaySettings: HomeDisplaySettings;
};

const defaultMenuLinks: MenuLink[] = [
  { href: "/", label: "Início", newTab: false },
  { href: "/noticias", label: "Notícias", newTab: false },
  { href: "/eventos", label: "Eventos", newTab: false },
  { href: "/galeria", label: "Galeria", newTab: false },
  { href: "/documentos", label: "Documentos", newTab: false },
  { href: "/p/escola", label: "Escola", newTab: false },
  { href: "/contato", label: "Contato", newTab: false }
];

const defaultAcessoRapido: AcessoRapidoItem[] = [
  {
    label: "Documentos",
    href: "/documentos",
    descricao: "Editais, arquivos de matrícula e regimento escolar.",
    newTab: false
  },
  {
    label: "Calendário",
    href: "/eventos",
    descricao: "Veja os eventos e reuniões programadas.",
    newTab: false
  },
  {
    label: "Secretaria Virtual",
    href: "/contato",
    descricao: "Fale conosco ou solicite declarações online.",
    newTab: false
  }
];

const defaultRodape: RodapeLinks = {
  acessoRapido: [
    { href: "/documentos", label: "Documentos", newTab: false },
    { href: "/noticias", label: "Notícias", newTab: false },
    { href: "/eventos", label: "Eventos", newTab: false },
    { href: "/galeria", label: "Galeria", newTab: false },
    { href: "/contato", label: "Contato", newTab: false }
  ],
  politicas: [
    { href: "/politica-privacidade", label: "Política de Privacidade", newTab: false },
    { href: "/cookies", label: "Cookies", newTab: false },
    { href: "/termos", label: "Termos de Uso", newTab: false }
  ],
  escola: {
    nome: "Escola Getúlio Vargas",
    descricao: "Educação de qualidade, transformando vidas através do conhecimento e da cidadania desde 1978.",
    endereco: "Povoado Juverlândia, S/N — Sítio Novo do Tocantins - TO",
    telefone: "(63) 3446-1286",
    email: "contato@egv.edu.br"
  },
  atendimento: {
    horarios: "Seg - Sex: 07h às 18h | Sábados: 08h às 12h (Plantão)",
    mapaUrl: "",
    mostrarMapa: true
  },
  sociais: [
    { nome: "Facebook", href: "", newTab: true },
    { nome: "Instagram", href: "", newTab: true },
    { nome: "YouTube", href: "", newTab: true }
  ]
};

const emptyConfig: Config = {
  logoUrl: "",
  corPrimaria: "",
  corSecundaria: "",
  politicaPrivacidade: "",
  cookies: "",
  termos: "",
  botaoHistoriaLink: "",
  botaoHistoriaNovaAba: false,
  menuLinks: defaultMenuLinks,
  acessoRapido: defaultAcessoRapido,
  rodape: defaultRodape,
  publicTexts: defaultPublicTexts,
  homeAlerts: defaultHomeAlerts,
  homeDisplaySettings: defaultHomeDisplaySettings
};

const sectionClass =
  "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none sm:p-6";
const sectionHeaderClass = "mb-5 border-b border-slate-100 pb-4 dark:border-slate-800";
const eyebrowClass = "text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300";
const sectionTitleClass = "mt-1 text-lg font-semibold text-slate-950 dark:text-white";
const sectionDescriptionClass = "mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400";
const subPanelClass =
  "rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-950/40 dark:shadow-none";
const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500";
const textareaClass = `${inputClass} min-h-28 resize-y`;
const compactTextareaClass = `${inputClass} min-h-20 resize-y`;
const colorInputClass = "h-11 w-14 cursor-pointer rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-950";
const rowClass =
  "rounded-2xl border border-slate-200 bg-white p-3 shadow-sm shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none";
const checkboxLabelClass = "flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300";
const actionGroupClass = "flex flex-wrap items-center gap-2 pt-1";
const secondaryButtonClass =
  "inline-flex min-h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-brand-500/40 dark:hover:bg-brand-900/40 dark:hover:text-brand-200";
const subtleButtonClass =
  "inline-flex min-h-9 items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white";
const dangerButtonClass =
  "inline-flex min-h-9 items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40";
const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-2xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-brand-500 dark:hover:bg-brand-400";

export function ConfigForm() {
  const [status, setStatus] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"success" | "error" | null>(null);
  const [logoUploadStatus, setLogoUploadStatus] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [homeAlertUploadStatus, setHomeAlertUploadStatus] = useState<Record<number, string>>({});
  const [uploadingHomeAlertIndex, setUploadingHomeAlertIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<Config>(emptyConfig);

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        const menuLinks = parseArray<MenuLink>(data?.menuJson, emptyConfig.menuLinks);
        const rodape = parseRodape(data?.rodapeJson, emptyConfig.rodape);
        const acessoRapido = parseArray<AcessoRapidoItem>(data?.acessoRapidoJson, emptyConfig.acessoRapido);
        const publicTexts = parsePublicTexts(data?.textosPublicosJson);
        const homeAlerts = parseHomeAlerts(data?.avisosHomeJson);
        const homeDisplaySettings = parseHomeDisplaySettings(data?.avisosHomeJson);
        setConfig({
          logoUrl: data?.logoUrl ?? "",
          corPrimaria: data?.corPrimaria ?? "",
          corSecundaria: data?.corSecundaria ?? "",
          politicaPrivacidade: data?.politicaPrivacidade ?? "",
          cookies: data?.cookies ?? "",
          termos: data?.termos ?? "",
          botaoHistoriaLink: data?.botaoHistoriaLink ?? "",
          botaoHistoriaNovaAba: Boolean(data?.botaoHistoriaNovaAba),
          menuLinks,
          acessoRapido,
          rodape,
          publicTexts,
          homeAlerts,
          homeDisplaySettings
        });
      })
      .catch(() => null);
  }, []);

  const updateMenu = (index: number, field: "label" | "href", value: string) => {
    const next = [...config.menuLinks];
    next[index] = { ...next[index], [field]: value };
    setConfig({ ...config, menuLinks: next });
  };

  const updateMenuNewTab = (index: number, value: boolean) => {
    const next = [...config.menuLinks];
    next[index] = { ...next[index], newTab: value };
    setConfig({ ...config, menuLinks: next });
  };

  const updateRodape = (section: RodapeLinkSection, index: number, field: "label" | "href", value: string) => {
    const nextSection = [...config.rodape[section]];
    nextSection[index] = { ...nextSection[index], [field]: value };
    setConfig({ ...config, rodape: { ...config.rodape, [section]: nextSection } });
  };

  const updateRodapeNewTab = (section: RodapeLinkSection, index: number, value: boolean) => {
    const nextSection = [...config.rodape[section]];
    nextSection[index] = { ...nextSection[index], newTab: value };
    setConfig({ ...config, rodape: { ...config.rodape, [section]: nextSection } });
  };

  const addMenuItem = () =>
    setConfig({ ...config, menuLinks: [...config.menuLinks, { href: "", label: "", newTab: false }] });
  const removeMenuItem = (index: number) =>
    setConfig({ ...config, menuLinks: config.menuLinks.filter((_, i) => i !== index) });

  const addRodapeItem = (section: RodapeLinkSection) =>
    setConfig({
      ...config,
      rodape: { ...config.rodape, [section]: [...config.rodape[section], { href: "", label: "", newTab: false }] }
    });

  const removeRodapeItem = (section: RodapeLinkSection, index: number) =>
    setConfig({
      ...config,
      rodape: { ...config.rodape, [section]: config.rodape[section].filter((_, i) => i !== index) }
    });

  const updateSocial = (index: number, field: "nome" | "href", value: string) => {
    const next = [...config.rodape.sociais];
    next[index] = { ...next[index], [field]: value };
    setConfig({ ...config, rodape: { ...config.rodape, sociais: next } });
  };

  const updateSocialNewTab = (index: number, value: boolean) => {
    const next = [...config.rodape.sociais];
    next[index] = { ...next[index], newTab: value };
    setConfig({ ...config, rodape: { ...config.rodape, sociais: next } });
  };

  const addSocialItem = () =>
    setConfig({
      ...config,
      rodape: { ...config.rodape, sociais: [...config.rodape.sociais, { nome: "", href: "", newTab: true }] }
    });

  const removeSocialItem = (index: number) =>
    setConfig({
      ...config,
      rodape: { ...config.rodape, sociais: config.rodape.sociais.filter((_, i) => i !== index) }
    });

  const updateAcessoRapido = (index: number, field: keyof AcessoRapidoItem, value: string) => {
    const next = [...config.acessoRapido];
    next[index] = { ...next[index], [field]: value };
    setConfig({ ...config, acessoRapido: next });
  };

  const updateAcessoRapidoNewTab = (index: number, value: boolean) => {
    const next = [...config.acessoRapido];
    next[index] = { ...next[index], newTab: value };
    setConfig({ ...config, acessoRapido: next });
  };

  const addAcessoRapido = () =>
    setConfig({
      ...config,
      acessoRapido: [...config.acessoRapido, { label: "", href: "", descricao: "", newTab: false }]
    });

  const removeAcessoRapido = (index: number) =>
    setConfig({ ...config, acessoRapido: config.acessoRapido.filter((_, i) => i !== index) });

  const updateHomeAlert = (index: number, field: keyof HomeAlert, value: string | boolean) => {
    const next = [...config.homeAlerts];
    next[index] = { ...next[index], [field]: value };
    setConfig({ ...config, homeAlerts: next });
  };

  const addHomeAlert = () =>
    setConfig({
      ...config,
      homeAlerts: [...config.homeAlerts, { titulo: "", descricao: "", href: "", imagemUrl: "", ativo: true }]
    });

  const removeHomeAlert = (index: number) =>
    setConfig({ ...config, homeAlerts: config.homeAlerts.filter((_, i) => i !== index) });

  const updateHomeDisplaySettings = <K extends keyof HomeDisplaySettings>(field: K, value: HomeDisplaySettings[K]) => {
    setConfig({
      ...config,
      homeDisplaySettings: {
        ...config.homeDisplaySettings,
        [field]: value
      }
    });
  };

  const updatePublicText = (section: keyof PublicTexts, field: string, value: string) => {
    setConfig((prev) => ({
      ...prev,
      publicTexts: {
        ...prev.publicTexts,
        [section]: {
          ...prev.publicTexts[section],
          [field]: value
        }
      } as PublicTexts
    }));
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    setUploadingLogo(true);
    setLogoUploadStatus(null);

    try {
      const formData = new FormData();
      formData.append("arquivo", arquivo);

      const response = await fetch("/api/config/logo", {
        method: "POST",
        body: formData
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.url) {
        setLogoUploadStatus(data?.error ?? "Erro ao enviar logo.");
        return;
      }

      setConfig((prev) => ({ ...prev, logoUrl: data.url }));
      setLogoUploadStatus("Logo enviada. Clique em Salvar para publicar no site.");
    } catch {
      setLogoUploadStatus("Erro ao enviar logo.");
    } finally {
      setUploadingLogo(false);
      event.target.value = "";
    }
  };

  const handleHomeAlertImageUpload = async (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    setUploadingHomeAlertIndex(index);
    setHomeAlertUploadStatus((prev) => ({ ...prev, [index]: "" }));

    try {
      const formData = new FormData();
      formData.append("arquivo", arquivo);

      const response = await fetch("/api/config/avisos/upload", {
        method: "POST",
        body: formData
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.url) {
        setHomeAlertUploadStatus((prev) => ({ ...prev, [index]: data?.error ?? "Erro ao enviar imagem." }));
        return;
      }

      setConfig((prev) => {
        const next = [...prev.homeAlerts];
        next[index] = { ...next[index], imagemUrl: data.url };
        return { ...prev, homeAlerts: next };
      });
      setHomeAlertUploadStatus((prev) => ({
        ...prev,
        [index]: "Imagem enviada. Clique em Salvar para publicar no site."
      }));
    } catch {
      setHomeAlertUploadStatus((prev) => ({ ...prev, [index]: "Erro ao enviar imagem." }));
    } finally {
      setUploadingHomeAlertIndex(null);
      event.target.value = "";
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    setStatusKind(null);

    const normalizedPrimary = normalizeHexColor(config.corPrimaria ?? "");
    const normalizedSecondary = normalizeHexColor(config.corSecundaria ?? "");

    if ((config.corPrimaria ?? "").trim() && !normalizedPrimary) {
      setStatusKind("error");
      setStatus("Cor primária inválida. Use formato hex, como #1647d6.");
      return;
    }

    if ((config.corSecundaria ?? "").trim() && !normalizedSecondary) {
      setStatusKind("error");
      setStatus("Cor secundária inválida. Use formato hex, como #1439ad.");
      return;
    }

    const cleanedMenu = config.menuLinks
      .map((item) => ({ label: item.label.trim(), href: normalizeHref(item.href), newTab: Boolean(item.newTab) }))
      .filter((item) => item.label && item.href);
    const cleanedAcessoRapido = config.acessoRapido
      .map((item) => ({
        label: item.label.trim(),
        href: normalizeHref(item.href),
        descricao: item.descricao.trim(),
        newTab: Boolean(item.newTab)
      }))
      .filter((item) => item.label && item.href);
    const cleanedRodape = {
      acessoRapido: config.rodape.acessoRapido
        .map((item) => ({ label: item.label.trim(), href: normalizeHref(item.href), newTab: Boolean(item.newTab) }))
        .filter((item) => item.label && item.href),
      politicas: config.rodape.politicas
        .map((item) => ({ label: item.label.trim(), href: normalizeHref(item.href), newTab: Boolean(item.newTab) }))
        .filter((item) => item.label && item.href),
      escola: {
        nome: config.rodape.escola.nome.trim(),
        descricao: config.rodape.escola.descricao.trim(),
        endereco: config.rodape.escola.endereco.trim(),
        telefone: config.rodape.escola.telefone.trim(),
        email: config.rodape.escola.email.trim()
      },
      atendimento: {
        horarios: config.rodape.atendimento.horarios.trim(),
        mapaUrl: config.rodape.atendimento.mapaUrl?.trim() || "",
        mostrarMapa: config.rodape.atendimento.mostrarMapa !== false
      },
      sociais: config.rodape.sociais
        .map((item) => ({
          nome: item.nome.trim(),
          href: normalizeHref(item.href),
          newTab: Boolean(item.newTab)
        }))
        .filter((item) => item.nome && item.href)
    };
    const payload = {
      logoUrl: config.logoUrl?.trim() || null,
      corPrimaria: normalizedPrimary,
      corSecundaria: normalizedSecondary,
      politicaPrivacidade: config.politicaPrivacidade,
      cookies: config.cookies,
      termos: config.termos,
      botaoHistoriaLink: normalizeHref(config.botaoHistoriaLink ?? ""),
      botaoHistoriaNovaAba: Boolean(config.botaoHistoriaNovaAba),
      menuJson: cleanedMenu.length ? JSON.stringify(cleanedMenu) : null,
      acessoRapidoJson: cleanedAcessoRapido.length ? JSON.stringify(cleanedAcessoRapido) : null,
      rodapeJson: JSON.stringify(cleanedRodape),
      textosPublicosJson: JSON.stringify(config.publicTexts),
      avisosHomeJson: serializeHomeAlertsConfig(config.homeAlerts, config.homeDisplaySettings)
    };

    setSaving(true);

    try {
      const response = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      setStatusKind(response.ok ? "success" : "error");
      setStatus(response.ok ? "Configurações salvas." : "Erro ao salvar.");
    } catch {
      setStatusKind("error");
      setStatus("Erro ao salvar. Confira sua conexão e tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-8" aria-busy={saving}>
      <section className={sectionClass}>
        <div className={sectionHeaderClass}>
          <p className={eyebrowClass}>Identidade do site</p>
          <h2 className={sectionTitleClass}>Identidade visual</h2>
          <p className={sectionDescriptionClass}>
            Envie a logo e personalize as cores do tema sem precisar acessar pastas do projeto.
          </p>
        </div>

        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <div className={subPanelClass}>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Logo principal</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Formatos aceitos: JPG, PNG e WebP.</p>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleLogoUpload}
              className={`${inputClass} mt-3 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-brand-900 dark:file:text-brand-200`}
            />
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950">
                {config.logoUrl ? (
                  <img src={config.logoUrl} alt="Pré-visualização da logo" className="h-full w-full object-contain p-1.5" />
                ) : (
                  <span className="px-2 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">Sem logo</span>
                )}
              </div>
              <div className="min-w-0 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                <p className="font-semibold text-slate-800 dark:text-slate-100">Arquivo atual</p>
                <p className="break-all">{config.logoUrl || "Nenhuma logo configurada"}</p>
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">URL manual (opcional)</label>
              <input
                name="logoUrl"
                placeholder="Ex: /api/uploads/config/minha-logo.png"
                value={config.logoUrl ?? ""}
                onChange={(event) => setConfig({ ...config, logoUrl: event.target.value })}
                className={inputClass}
              />
              <button
                type="button"
                className={`${subtleButtonClass} w-fit px-0 hover:bg-transparent`}
                onClick={() => setConfig({ ...config, logoUrl: "" })}
              >
                Remover logo personalizada
              </button>
            </div>
            {uploadingLogo && <p className="text-xs font-medium text-brand-700 dark:text-brand-300">Enviando logo...</p>}
            {logoUploadStatus && <p className="text-xs text-slate-600 dark:text-slate-300">{logoUploadStatus}</p>}
          </div>

          <div className={subPanelClass}>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Cores do tema</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              A cor primária afeta botões e destaques. A secundária reforça menu e variações escuras.
            </p>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Cor primária</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={normalizeHexColor(config.corPrimaria ?? "") ?? "#1647d6"}
                    onChange={(event) => setConfig({ ...config, corPrimaria: event.target.value })}
                    className={colorInputClass}
                  />
                  <input
                    name="corPrimaria"
                    placeholder="#1647d6"
                    value={config.corPrimaria ?? ""}
                    onChange={(event) => setConfig({ ...config, corPrimaria: event.target.value })}
                    className={inputClass}
                  />
                </div>
              </label>

              <label className="space-y-1">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Cor secundária</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={normalizeHexColor(config.corSecundaria ?? "") ?? "#1439ad"}
                    onChange={(event) => setConfig({ ...config, corSecundaria: event.target.value })}
                    className={colorInputClass}
                  />
                  <input
                    name="corSecundaria"
                    placeholder="#1439ad"
                    value={config.corSecundaria ?? ""}
                    onChange={(event) => setConfig({ ...config, corSecundaria: event.target.value })}
                    className={inputClass}
                  />
                </div>
              </label>
            </div>

            <div className={actionGroupClass}>
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => setConfig({ ...config, corPrimaria: "#1647d6", corSecundaria: "#1439ad" })}
              >
                Azul institucional
              </button>
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => setConfig({ ...config, corPrimaria: "#0f766e", corSecundaria: "#115e59" })}
              >
                Verde educacional
              </button>
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => setConfig({ ...config, corPrimaria: "#b45309", corSecundaria: "#92400e" })}
              >
                Dourado clássico
              </button>
              <button
                type="button"
                className={subtleButtonClass}
                onClick={() => setConfig({ ...config, corPrimaria: "", corSecundaria: "" })}
              >
                Restaurar padrão
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">Prévia: botão primário</p>
                <div
                  className="rounded-xl px-3 py-2 text-center text-xs font-semibold text-white shadow-sm"
                  style={{ backgroundColor: normalizeHexColor(config.corPrimaria ?? "") ?? "#1647d6" }}
                >
                  Exemplo de botão
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">Prévia: cor secundária</p>
                <div
                  className="h-9 rounded-xl"
                  style={{ backgroundColor: normalizeHexColor(config.corSecundaria ?? "") ?? "#1439ad" }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <div className={sectionHeaderClass}>
          <p className={eyebrowClass}>Topo do site</p>
          <h2 className={sectionTitleClass}>Menu principal</h2>
          <p className={sectionDescriptionClass}>
          Defina os links que aparecem no topo do site. Você pode digitar só o caminho (ex: documentos) que será
          convertido para /documentos automaticamente. Para link externo, use http:// ou https://.
          </p>
        </div>
        <div className="mt-4 space-y-3">
          {config.menuLinks.map((item, index) => (
            <div key={`${item.href}-${index}`} className={`${rowClass} grid items-center gap-2 md:grid-cols-[1fr_1fr_auto]`}>
              <input
                className={inputClass}
                placeholder="Texto do menu"
                value={item.label}
                onChange={(event) => updateMenu(index, "label", event.target.value)}
              />
              <input
                className={inputClass}
                placeholder="Link (ex: /documentos)"
                value={item.href}
                onChange={(event) => updateMenu(index, "href", event.target.value)}
              />
              <label className={`${checkboxLabelClass} md:col-span-2`}>
                <input
                  type="checkbox"
                  checked={Boolean(item.newTab)}
                  onChange={(event) => updateMenuNewTab(index, event.target.checked)}
                />
                Abrir em nova aba
              </label>
              <button
                type="button"
                className={dangerButtonClass}
                onClick={() => removeMenuItem(index)}
              >
                Remover
              </button>
            </div>
          ))}
          <div className={actionGroupClass}>
            <button type="button" className={secondaryButtonClass} onClick={addMenuItem}>
              + Adicionar link
            </button>
            <button type="button" className={subtleButtonClass} onClick={() => setConfig({ ...config, menuLinks: defaultMenuLinks })}>
              Restaurar menu padrão
            </button>
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <div className={sectionHeaderClass}>
          <p className={eyebrowClass}>Home</p>
          <h2 className={sectionTitleClass}>Página inicial</h2>
          <p className={sectionDescriptionClass}>
          Configure o link do botão &quot;Nossa História&quot; da home. Para link externo, use http:// ou https://.
          </p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] items-center">
          <input
            className={inputClass}
            placeholder="Link (ex: /p/escola)"
            value={config.botaoHistoriaLink ?? ""}
            onChange={(event) => setConfig({ ...config, botaoHistoriaLink: event.target.value })}
          />
          <button
            type="button"
            className={subtleButtonClass}
            onClick={() => setConfig({ ...config, botaoHistoriaLink: "/p/escola" })}
          >
            Restaurar padrão
          </button>
        </div>
        <label className={`${checkboxLabelClass} mt-3`}>
          <input
            type="checkbox"
            checked={Boolean(config.botaoHistoriaNovaAba)}
            onChange={(event) => setConfig({ ...config, botaoHistoriaNovaAba: event.target.checked })}
          />
          Abrir em nova aba
        </label>
      </section>

      <section className={sectionClass}>
        <div className={sectionHeaderClass}>
          <p className={eyebrowClass}>Comunicados da home</p>
          <h2 className={sectionTitleClass}>Avisos importantes</h2>
          <p className={sectionDescriptionClass}>
            Cadastre mensagens curtas para destacar na página inicial, como matrículas, reuniões, prazos ou comunicados urgentes.
          </p>
        </div>
        <div className="mt-4 space-y-3">
          <div className="max-w-2xl rounded-2xl border border-amber-100 bg-amber-50/60 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Animação dos avisos</h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  Controle o movimento suave do bloco exibido na página inicial.
                </p>
              </div>
              <label className={checkboxLabelClass}>
                <input
                  type="checkbox"
                  checked={config.homeDisplaySettings.alertAnimationEnabled}
                  onChange={(event) => updateHomeDisplaySettings("alertAnimationEnabled", event.target.checked)}
                />
                Ativar animação discreta
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Velocidade da animação</span>
                <select
                  className={inputClass}
                  value={config.homeDisplaySettings.alertAnimationSpeed}
                  disabled={!config.homeDisplaySettings.alertAnimationEnabled}
                  onChange={(event) =>
                    updateHomeDisplaySettings("alertAnimationSpeed", event.target.value as HomeAlertAnimationSpeed)
                  }
                >
                  <option value="slow">Lenta</option>
                  <option value="normal">Moderada</option>
                  <option value="fast">Mais chamativa</option>
                </select>
              </label>
            </div>
          </div>

          {config.homeAlerts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300">
              Nenhum aviso cadastrado. A home ocultará essa seção quando não houver aviso ativo.
            </div>
          ) : (
            config.homeAlerts.map((item, index) => (
              <div key={`aviso-home-${index}`} className={`${rowClass} grid gap-3 lg:grid-cols-[1fr_1fr_auto]`}>
                <input
                  className={inputClass}
                  placeholder="Título do aviso"
                  value={item.titulo}
                  onChange={(event) => updateHomeAlert(index, "titulo", event.target.value)}
                />
                <input
                  className={inputClass}
                  placeholder="Link opcional (ex: /noticias)"
                  value={item.href ?? ""}
                  onChange={(event) => updateHomeAlert(index, "href", event.target.value)}
                />
                <label className={`${checkboxLabelClass} lg:justify-end`}>
                  <input
                    type="checkbox"
                    checked={item.ativo !== false}
                    onChange={(event) => updateHomeAlert(index, "ativo", event.target.checked)}
                  />
                  Exibir aviso
                </label>
                <textarea
                  className={`${compactTextareaClass} lg:col-span-2`}
                  placeholder="Descrição curta"
                  rows={3}
                  value={item.descricao}
                  onChange={(event) => updateHomeAlert(index, "descricao", event.target.value)}
                />
                <button type="button" className={`${dangerButtonClass} lg:row-start-2`} onClick={() => removeHomeAlert(index)}>
                  Remover
                </button>
                <div className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40 lg:col-span-3">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="flex h-24 w-full shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white text-center text-xs font-semibold text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 sm:w-36">
                      {item.imagemUrl ? (
                        <img
                          src={toPublicUrl(item.imagemUrl)}
                          alt="Pré-visualização do aviso"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="px-3">Sem imagem</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Imagem opcional do aviso
                      </label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={uploadingHomeAlertIndex === index}
                        onChange={(event) => handleHomeAlertImageUpload(index, event)}
                        className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-amber-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-amber-700 hover:file:bg-amber-100 dark:file:bg-amber-900 dark:file:text-amber-200`}
                      />
                      <input
                        className={inputClass}
                        placeholder="URL manual da imagem (opcional)"
                        value={item.imagemUrl ?? ""}
                        onChange={(event) => updateHomeAlert(index, "imagemUrl", event.target.value)}
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        {uploadingHomeAlertIndex === index && (
                          <span className="text-xs font-medium text-brand-700 dark:text-brand-300">Enviando imagem...</span>
                        )}
                        {homeAlertUploadStatus[index] && (
                          <span className="text-xs text-slate-600 dark:text-slate-300">{homeAlertUploadStatus[index]}</span>
                        )}
                        {item.imagemUrl && (
                          <button
                            type="button"
                            className={`${subtleButtonClass} px-0 hover:bg-transparent`}
                            onClick={() => updateHomeAlert(index, "imagemUrl", "")}
                          >
                            Remover imagem
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          <div className={actionGroupClass}>
            <button type="button" className={secondaryButtonClass} onClick={addHomeAlert}>
              + Adicionar aviso
            </button>
            <button type="button" className={subtleButtonClass} onClick={() => setConfig({ ...config, homeAlerts: defaultHomeAlerts })}>
              Limpar avisos
            </button>
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <div className={sectionHeaderClass}>
          <p className={eyebrowClass}>Conteúdo editável</p>
          <h2 className={sectionTitleClass}>Textos públicos</h2>
          <p className={sectionDescriptionClass}>
            Ajuste chamadas e descrições das principais páginas públicas sem alterar notícias, eventos ou páginas
            cadastradas. Os textos atuais continuam como padrão.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className={`${subPanelClass} lg:col-span-2`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Página inicial</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Textos de apresentação, últimas notícias e próximos eventos.
                </p>
              </div>
              <button
                type="button"
                className={subtleButtonClass}
                onClick={() => setConfig({ ...config, publicTexts: defaultPublicTexts })}
              >
                Restaurar textos padrão
              </button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <PublicTextField
                label="Chamada superior"
                value={config.publicTexts.home.eyebrow}
                onChange={(value) => updatePublicText("home", "eyebrow", value)}
              />
              <PublicTextField
                label="Título principal"
                value={config.publicTexts.home.title}
                onChange={(value) => updatePublicText("home", "title", value)}
              />
              <PublicTextField
                label="Descrição principal"
                value={config.publicTexts.home.description}
                onChange={(value) => updatePublicText("home", "description", value)}
                multiline
                className="md:col-span-2"
              />
              <PublicTextField
                label="Título de últimas notícias"
                value={config.publicTexts.home.newsTitle}
                onChange={(value) => updatePublicText("home", "newsTitle", value)}
              />
              <PublicTextField
                label="Descrição de últimas notícias"
                value={config.publicTexts.home.newsDescription}
                onChange={(value) => updatePublicText("home", "newsDescription", value)}
                multiline
              />
              <PublicTextField
                label="Título de próximos eventos"
                value={config.publicTexts.home.eventsTitle}
                onChange={(value) => updatePublicText("home", "eventsTitle", value)}
              />
              <PublicTextField
                label="Descrição de próximos eventos"
                value={config.publicTexts.home.eventsDescription}
                onChange={(value) => updatePublicText("home", "eventsDescription", value)}
                multiline
              />
            </div>
          </div>

          <div className={subPanelClass}>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Notícias</h3>
            <div className="mt-3 grid gap-3">
              <PublicTextField
                label="Título"
                value={config.publicTexts.noticias.title}
                onChange={(value) => updatePublicText("noticias", "title", value)}
              />
              <PublicTextField
                label="Descrição"
                value={config.publicTexts.noticias.description}
                onChange={(value) => updatePublicText("noticias", "description", value)}
                multiline
              />
            </div>
          </div>

          <div className={subPanelClass}>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Páginas institucionais</h3>
            <div className="mt-3 grid gap-3">
              <PublicTextField
                label="Identificação lateral"
                value={config.publicTexts.institucional.label}
                onChange={(value) => updatePublicText("institucional", "label", value)}
              />
              <PublicTextField
                label="Descrição lateral"
                value={config.publicTexts.institucional.description}
                onChange={(value) => updatePublicText("institucional", "description", value)}
                multiline
              />
            </div>
          </div>

          <div className={subPanelClass}>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Galeria</h3>
            <div className="mt-3 grid gap-3">
              <PublicTextField
                label="Chamada superior"
                value={config.publicTexts.galeria.eyebrow}
                onChange={(value) => updatePublicText("galeria", "eyebrow", value)}
              />
              <PublicTextField
                label="Título"
                value={config.publicTexts.galeria.title}
                onChange={(value) => updatePublicText("galeria", "title", value)}
              />
              <PublicTextField
                label="Descrição"
                value={config.publicTexts.galeria.description}
                onChange={(value) => updatePublicText("galeria", "description", value)}
                multiline
              />
            </div>
          </div>

          <div className={subPanelClass}>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Contato</h3>
            <div className="mt-3 grid gap-3">
              <PublicTextField
                label="Título"
                value={config.publicTexts.contato.title}
                onChange={(value) => updatePublicText("contato", "title", value)}
              />
              <PublicTextField
                label="Descrição"
                value={config.publicTexts.contato.description}
                onChange={(value) => updatePublicText("contato", "description", value)}
                multiline
              />
            </div>
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <div className={sectionHeaderClass}>
          <p className={eyebrowClass}>Atalhos da home</p>
          <h2 className={sectionTitleClass}>Acesso rápido</h2>
          <p className={sectionDescriptionClass}>
          Links destacados na home, em formato de cartões. Para link externo, use http:// ou https://.
          </p>
        </div>
        <div className="mt-4 space-y-3">
          {config.acessoRapido.map((item, index) => (
            <div key={`acesso-home-${index}`} className={`${rowClass} grid items-center gap-2 md:grid-cols-[1fr_1fr_1fr_auto]`}>
              <input
                className={inputClass}
                placeholder="Título do cartão"
                value={item.label}
                onChange={(event) => updateAcessoRapido(index, "label", event.target.value)}
              />
              <input
                className={inputClass}
                placeholder="Link (ex: /documentos)"
                value={item.href}
                onChange={(event) => updateAcessoRapido(index, "href", event.target.value)}
              />
              <input
                className={inputClass}
                placeholder="Descrição curta"
                value={item.descricao}
                onChange={(event) => updateAcessoRapido(index, "descricao", event.target.value)}
              />
              <label className={`${checkboxLabelClass} md:col-span-3`}>
                <input
                  type="checkbox"
                  checked={Boolean(item.newTab)}
                  onChange={(event) => updateAcessoRapidoNewTab(index, event.target.checked)}
                />
                Abrir em nova aba
              </label>
              <button
                type="button"
                className={dangerButtonClass}
                onClick={() => removeAcessoRapido(index)}
              >
                Remover
              </button>
            </div>
          ))}
          <div className={actionGroupClass}>
            <button type="button" className={secondaryButtonClass} onClick={addAcessoRapido}>
              + Adicionar card
            </button>
            <button type="button" className={subtleButtonClass} onClick={() => setConfig({ ...config, acessoRapido: defaultAcessoRapido })}>
              Restaurar padrão
            </button>
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <div className={sectionHeaderClass}>
          <p className={eyebrowClass}>Informações institucionais</p>
          <h2 className={sectionTitleClass}>Rodapé</h2>
          <p className={sectionDescriptionClass}>
            Organize links, dados da escola, atendimento, mapa e redes sociais exibidos no final do site.
          </p>
        </div>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div className={subPanelClass}>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Acesso rápido</h3>
            <div className="mt-3 space-y-3">
              {config.rodape.acessoRapido.map((item, index) => (
                <div key={`acesso-${index}`} className="grid items-center gap-2 md:grid-cols-[1fr_1fr_auto]">
                  <input
                    className={inputClass}
                    placeholder="Texto do link"
                    value={item.label}
                    onChange={(event) => updateRodape("acessoRapido", index, "label", event.target.value)}
                  />
                  <input
                    className={inputClass}
                    placeholder="Link (ex: /eventos)"
                    value={item.href}
                    onChange={(event) => updateRodape("acessoRapido", index, "href", event.target.value)}
                  />
                  <label className={`${checkboxLabelClass} md:col-span-2`}>
                    <input
                      type="checkbox"
                      checked={Boolean(item.newTab)}
                      onChange={(event) => updateRodapeNewTab("acessoRapido", index, event.target.checked)}
                    />
                    Abrir em nova aba
                  </label>
                  <button
                    type="button"
                    className={dangerButtonClass}
                    onClick={() => removeRodapeItem("acessoRapido", index)}
                  >
                    Remover
                  </button>
                </div>
              ))}
              <div className={actionGroupClass}>
                <button type="button" className={secondaryButtonClass} onClick={() => addRodapeItem("acessoRapido")}>
                  + Adicionar link
                </button>
                <button
                  type="button"
                  className={subtleButtonClass}
                  onClick={() => setConfig({ ...config, rodape: { ...config.rodape, acessoRapido: defaultRodape.acessoRapido } })}
                >
                  Restaurar padrão
                </button>
              </div>
            </div>
          </div>
          <div className={subPanelClass}>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Políticas</h3>
            <div className="mt-3 space-y-3">
              {config.rodape.politicas.map((item, index) => (
                <div key={`politica-${index}`} className="grid items-center gap-2 md:grid-cols-[1fr_1fr_auto]">
                  <input
                    className={inputClass}
                    placeholder="Texto do link"
                    value={item.label}
                    onChange={(event) => updateRodape("politicas", index, "label", event.target.value)}
                  />
                  <input
                    className={inputClass}
                    placeholder="Link (ex: /politica-privacidade)"
                    value={item.href}
                    onChange={(event) => updateRodape("politicas", index, "href", event.target.value)}
                  />
                  <label className={`${checkboxLabelClass} md:col-span-2`}>
                    <input
                      type="checkbox"
                      checked={Boolean(item.newTab)}
                      onChange={(event) => updateRodapeNewTab("politicas", index, event.target.checked)}
                    />
                    Abrir em nova aba
                  </label>
                  <button
                    type="button"
                    className={dangerButtonClass}
                    onClick={() => removeRodapeItem("politicas", index)}
                  >
                    Remover
                  </button>
                </div>
              ))}
              <div className={actionGroupClass}>
                <button type="button" className={secondaryButtonClass} onClick={() => addRodapeItem("politicas")}>
                  + Adicionar link
                </button>
                <button
                  type="button"
                  className={subtleButtonClass}
                  onClick={() => setConfig({ ...config, rodape: { ...config.rodape, politicas: defaultRodape.politicas } })}
                >
                  Restaurar padrão
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className={subPanelClass}>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Dados da escola</h3>
            <div className="mt-3 space-y-3">
              <input
                className={inputClass}
                placeholder="Nome da escola"
                value={config.rodape.escola.nome}
                onChange={(event) => setConfig({
                  ...config,
                  rodape: { ...config.rodape, escola: { ...config.rodape.escola, nome: event.target.value } }
                })}
              />
              <input
                className={inputClass}
                placeholder="Texto/descrição"
                value={config.rodape.escola.descricao}
                onChange={(event) => setConfig({
                  ...config,
                  rodape: { ...config.rodape, escola: { ...config.rodape.escola, descricao: event.target.value } }
                })}
              />
              <input
                className={inputClass}
                placeholder="Endereço"
                value={config.rodape.escola.endereco}
                onChange={(event) => setConfig({
                  ...config,
                  rodape: { ...config.rodape, escola: { ...config.rodape.escola, endereco: event.target.value } }
                })}
              />
              <input
                className={inputClass}
                placeholder="Telefone"
                value={config.rodape.escola.telefone}
                onChange={(event) => setConfig({
                  ...config,
                  rodape: { ...config.rodape, escola: { ...config.rodape.escola, telefone: event.target.value } }
                })}
              />
              <input
                className={inputClass}
                placeholder="E-mail"
                value={config.rodape.escola.email}
                onChange={(event) => setConfig({
                  ...config,
                  rodape: { ...config.rodape, escola: { ...config.rodape.escola, email: event.target.value } }
                })}
              />
            </div>
          </div>
          <div className={subPanelClass}>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Atendimento e redes sociais</h3>
            <div className="mt-3 space-y-3">
              <input
                className={inputClass}
                placeholder="Horários de atendimento"
                value={config.rodape.atendimento.horarios}
                onChange={(event) => setConfig({
                  ...config,
                  rodape: {
                    ...config.rodape,
                    atendimento: { ...config.rodape.atendimento, horarios: event.target.value }
                  }
                })}
              />
              <input
                className={inputClass}
                placeholder="URL fixa do mapa (opcional)"
                value={config.rodape.atendimento.mapaUrl ?? ""}
                onChange={(event) => setConfig({
                  ...config,
                  rodape: {
                    ...config.rodape,
                    atendimento: { ...config.rodape.atendimento, mapaUrl: event.target.value }
                  }
                })}
              />
              <label className={checkboxLabelClass}>
                <input
                  type="checkbox"
                  checked={config.rodape.atendimento.mostrarMapa !== false}
                  onChange={(event) => setConfig({
                    ...config,
                    rodape: {
                      ...config.rodape,
                      atendimento: { ...config.rodape.atendimento, mostrarMapa: event.target.checked }
                    }
                  })}
                />
                Mostrar mapa no rodapé
              </label>
              {config.rodape.sociais.map((item, index) => (
                <div key={`social-${index}`} className="grid items-center gap-2 md:grid-cols-[1fr_1fr_auto]">
                  <input
                    className={inputClass}
                    placeholder="Rede (ex: Facebook, LinkedIn)"
                    value={item.nome}
                    onChange={(event) => updateSocial(index, "nome", event.target.value)}
                  />
                  <input
                    className={inputClass}
                    placeholder="URL da rede"
                    value={item.href}
                    onChange={(event) => updateSocial(index, "href", event.target.value)}
                  />
                  <label className={`${checkboxLabelClass} md:col-span-2`}>
                    <input
                      type="checkbox"
                      checked={Boolean(item.newTab)}
                      onChange={(event) => updateSocialNewTab(index, event.target.checked)}
                    />
                    Abrir em nova aba
                  </label>
                  <button type="button" className={dangerButtonClass} onClick={() => removeSocialItem(index)}>
                    Remover
                  </button>
                </div>
              ))}
              <div className={actionGroupClass}>
                <button type="button" className={secondaryButtonClass} onClick={addSocialItem}>
                  + Adicionar link
                </button>
                <button
                  type="button"
                  className={subtleButtonClass}
                  onClick={() => setConfig({ ...config, rodape: { ...config.rodape, sociais: defaultRodape.sociais } })}
                >
                  Restaurar padrão
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <div className={sectionHeaderClass}>
          <p className={eyebrowClass}>LGPD e transparência</p>
          <h2 className={sectionTitleClass}>Políticas do site</h2>
          <p className={sectionDescriptionClass}>
            Atualize os textos legais exibidos nas páginas públicas de privacidade, cookies e termos de uso.
          </p>
        </div>
        <div className="mt-4 grid gap-4">
          <textarea
            name="politicaPrivacidade"
            placeholder="Política de privacidade"
            value={config.politicaPrivacidade ?? ""}
            onChange={(event) => setConfig({ ...config, politicaPrivacidade: event.target.value })}
            rows={4}
            className={textareaClass}
          />
          <textarea
            name="cookies"
            placeholder="Política de cookies"
            value={config.cookies ?? ""}
            onChange={(event) => setConfig({ ...config, cookies: event.target.value })}
            rows={4}
            className={textareaClass}
          />
          <textarea
            name="termos"
            placeholder="Termos de uso"
            value={config.termos ?? ""}
            onChange={(event) => setConfig({ ...config, termos: event.target.value })}
            rows={4}
            className={textareaClass}
          />
        </div>
      </section>

      <div className="sticky bottom-4 z-30 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-2xl shadow-slate-300/70 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-black/30">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Pronto para publicar as alterações?</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              As mudanças salvas passam a valer no site público.
            </p>
          </div>
          <button className={primaryButtonClass} type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
        {status && (
          <p
            className={`mt-3 rounded-2xl px-3 py-2 text-sm font-medium ${
              statusKind === "success"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
                : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200"
            }`}
          >
            {status}
          </p>
        )}
      </div>
    </form>
  );
}

function PublicTextField({
  label,
  value,
  onChange,
  multiline = false,
  className = ""
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  className?: string;
}) {
  return (
    <label className={`space-y-1 ${className}`}>
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={3}
          className={compactTextareaClass}
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass}
        />
      )}
    </label>
  );
}

function parseArray<T>(value: string | null | undefined, fallback: T[]) {
  try {
    const parsed = JSON.parse(value ?? "");
    return Array.isArray(parsed) && parsed.length ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function parseRodape(value: string | null | undefined, fallback: RodapeLinks) {
  try {
    const parsed = JSON.parse(value ?? "");
    if (!parsed || typeof parsed !== "object") return fallback;
    return {
      acessoRapido: Array.isArray(parsed.acessoRapido) && parsed.acessoRapido.length ? parsed.acessoRapido : fallback.acessoRapido,
      politicas: Array.isArray(parsed.politicas) && parsed.politicas.length ? parsed.politicas : fallback.politicas
      ,
      escola: {
        nome: parsed.escola?.nome ?? fallback.escola.nome,
        descricao: parsed.escola?.descricao ?? fallback.escola.descricao,
        endereco: parsed.escola?.endereco ?? fallback.escola.endereco,
        telefone: parsed.escola?.telefone ?? fallback.escola.telefone,
        email: parsed.escola?.email ?? fallback.escola.email
      },
      atendimento: {
        horarios: parsed.atendimento?.horarios ?? fallback.atendimento.horarios,
        mapaUrl: parsed.atendimento?.mapaUrl ?? fallback.atendimento.mapaUrl ?? "",
        mostrarMapa: typeof parsed.atendimento?.mostrarMapa === "boolean"
          ? parsed.atendimento.mostrarMapa
          : (fallback.atendimento.mostrarMapa ?? true)
      },
      sociais: parseSociais(parsed.sociais, fallback.sociais)
    };
  } catch {
    return fallback;
  }
}

function parseSociais(value: unknown, fallback: SocialLinkItem[]): SocialLinkItem[] {
  if (Array.isArray(value)) {
    const parsed = value
      .map((item) => parseSocialItem(item))
      .filter((item): item is SocialLinkItem => Boolean(item?.nome && item?.href));

    return parsed.length ? parsed : fallback;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const parsed = Object.entries(record)
      .map(([key, item]) => parseSocialItem(item, key))
      .filter((item): item is SocialLinkItem => Boolean(item?.nome && item?.href));

    return parsed.length ? parsed : fallback;
  }

  return fallback;
}

function parseSocialItem(value: unknown, fallbackName = "Rede social"): SocialLinkItem | null {
  if (typeof value === "string") {
    const href = value.trim();
    if (!href) return null;
    return { nome: fallbackName, href, newTab: true };
  }

  if (value && typeof value === "object") {
    const candidate = value as { nome?: unknown; label?: unknown; href?: unknown; newTab?: unknown };
    const href = typeof candidate.href === "string" ? candidate.href.trim() : "";
    if (!href) return null;
    const nomeCandidate = typeof candidate.nome === "string"
      ? candidate.nome
      : typeof candidate.label === "string"
        ? candidate.label
        : fallbackName;

    return {
      nome: nomeCandidate.trim() || fallbackName,
      href,
      newTab: typeof candidate.newTab === "boolean" ? candidate.newTab : true
    };
  }

  return null;
}

function normalizeHref(href: string) {
  const value = href.trim();
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/")) return value;
  return `/${value}`;
}

function normalizeHexColor(value: string) {
  const input = value.trim();
  if (!input) return null;
  const withHash = input.startsWith("#") ? input : `#${input}`;
  if (/^#[0-9a-fA-F]{3}$/.test(withHash)) {
    const r = withHash[1];
    const g = withHash[2];
    const b = withHash[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  if (/^#[0-9a-fA-F]{6}$/.test(withHash)) {
    return withHash.toLowerCase();
  }
  return null;
}
