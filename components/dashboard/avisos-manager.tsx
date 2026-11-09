"use client";

import { useRef, useState, type FormEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toPublicUrl } from "@/lib/uploads-url";
import type {
  HomeAlertsConfig,
  HomeDisplaySettings,
  ManagedHomeAlert,
} from "@/lib/home-alerts";

type Fields = {
  titulo: string;
  descricao: string;
  href: string;
  imagemUrl: string;
  ativo: boolean;
};
type Result = {
  error?: string;
  alerts?: ManagedHomeAlert[];
  settings?: HomeDisplaySettings;
  url?: string;
};
const empty: Fields = {
  titulo: "",
  descricao: "",
  href: "",
  imagemUrl: "",
  ativo: true,
};
const inputClass =
  "w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-brand-900";
const buttonClass =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800";
const primaryClass =
  "inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60";

function json(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export function AvisosManager({
  initialConfig,
}: {
  initialConfig: HomeAlertsConfig;
}) {
  const router = useRouter();
  const [config, setConfig] = useState(initialConfig);
  const [form, setForm] = useState<Fields | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const inFlight = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState<{
    text: string;
    error: boolean;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("todos");
  const [animation, setAnimation] = useState({
    alertAnimationEnabled: config.settings.alertAnimationEnabled,
    alertAnimationSpeed: config.settings.alertAnimationSpeed,
  });
  const active = config.alerts.filter((alert) => alert.ativo !== false).length;
  const visible = config.alerts.filter(
    (alert) =>
      `${alert.titulo} ${alert.descricao}`
        .toLocaleLowerCase("pt-BR")
        .includes(search.toLocaleLowerCase("pt-BR")) &&
      (filter === "todos" ||
        (filter === "ativos" ? alert.ativo !== false : alert.ativo === false)),
  );

  const perform = async (
    action: string,
    endpoint: string,
    options: RequestInit,
    success: string,
    after?: (data: Result) => void,
  ) => {
    if (inFlight.current) return false;
    inFlight.current = true;
    setPending(action);
    setMessage(null);
    try {
      const response = await fetch(endpoint, options);
      const data: Result = await response.json();
      if (!response.ok) {
        setMessage({
          text: data.error || "Não foi possível concluir a operação.",
          error: true,
        });
        return false;
      }
      setConfig((current) => ({
        alerts: data.alerts ?? current.alerts,
        settings: data.settings ?? current.settings,
      }));
      after?.(data);
      if (data.alerts || data.settings) router.refresh();
      setMessage({ text: success, error: false });
      return true;
    } catch {
      setMessage({
        text: "Não foi possível confirmar a operação. Confira sua conexão e recarregue a página antes de tentar novamente.",
        error: true,
      });
      return false;
    } finally {
      inFlight.current = false;
      setPending(null);
    }
  };

  const edit = (alert?: ManagedHomeAlert) => {
    setEditingId(alert?.id ?? null);
    setForm(
      alert
        ? {
            titulo: alert.titulo,
            descricao: alert.descricao,
            href: alert.href ?? "",
            imagemUrl: alert.imagemUrl ?? "",
            ativo: alert.ativo !== false,
          }
        : { ...empty },
    );
    setMessage(null);
    requestAnimationFrame(() => {
      const currentForm = formRef.current;
      if (!currentForm) return;
      const editor = currentForm.closest("section") ?? currentForm;
      const pane = currentForm.closest<HTMLElement>(".lg\\:overflow-y-auto");
      const topbar = pane?.querySelector<HTMLElement>(".sticky.top-0");
      const offset = (topbar?.offsetHeight ?? 0) + 16;
      const behavior = window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches
        ? "auto"
        : "smooth";
      // Keep desktop scrolling inside the content pane, below its sticky topbar.
      if (
        pane &&
        ["auto", "scroll"].includes(getComputedStyle(pane).overflowY)
      ) {
        pane.scrollTo({
          top: Math.max(
            0,
            pane.scrollTop +
              editor.getBoundingClientRect().top -
              pane.getBoundingClientRect().top -
              offset,
          ),
          behavior,
        });
      } else {
        const headerHeight =
          document.querySelector("header")?.getBoundingClientRect().height ?? 0;
        window.scrollTo({
          top: Math.max(
            0,
            window.scrollY +
              editor.getBoundingClientRect().top -
              headerHeight -
              offset,
          ),
          behavior,
        });
      }
      currentForm
        .querySelector<HTMLInputElement>("input")
        ?.focus({ preventScroll: true });
    });
  };
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form) return;
    if (!form.titulo.trim() && !form.descricao.trim()) {
      setMessage({
        text: "Informe o título ou a descrição do aviso.",
        error: true,
      });
      return;
    }
    await perform(
      "salvar",
      editingId ? `/api/avisos/${editingId}` : "/api/avisos",
      json(editingId ? "PATCH" : "POST", form),
      "Aviso salvo.",
      () => setForm(null),
    );
  };
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const body = new FormData();
    body.append("arquivo", file);
    await perform(
      "imagem",
      "/api/avisos/upload",
      { method: "POST", body },
      "Imagem enviada. Salve o aviso para concluir.",
      (data) => {
        const url = data.url;
        if (url)
          setForm((current) => current && { ...current, imagemUrl: url });
      },
    );
    event.target.value = "";
  };

  return (
    <div className="min-w-0 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
            Comunicação escolar
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">
            Avisos da página inicial
          </h2>
        </div>
        <button
          className={primaryClass}
          type="button"
          disabled={Boolean(pending)}
          onClick={() => edit()}
        >
          Novo aviso
        </button>
      </header>

      <dl className="grid grid-cols-3 divide-x divide-slate-200 rounded-lg border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
        {[
          {
            label: "Cadastrados",
            count: config.alerts.length,
            color: "text-slate-900 dark:text-white",
          },
          {
            label: "Ativos",
            count: active,
            color: "text-emerald-700 dark:text-emerald-300",
          },
          {
            label: "Ocultos",
            count: config.alerts.length - active,
            color: "text-amber-700 dark:text-amber-300",
          },
        ].map((item) => (
          <div key={item.label} className="min-w-0 p-3 sm:p-5">
            <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {item.label}
            </dt>
            <dd className={`mt-1 text-2xl font-bold ${item.color}`}>
              {item.count}
            </dd>
          </div>
        ))}
      </dl>

      {message && (
        <p
          role={message.error ? "alert" : "status"}
          className={`rounded-lg border p-3 text-sm ${message.error ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200" : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"}`}
        >
          {message.text}
        </p>
      )}

      {form && (
        <section className="scroll-mt-24 border-y border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
            {editingId ? "Editar aviso" : "Novo aviso"}
          </h3>
          <form
            ref={formRef}
            onSubmit={save}
            aria-label={editingId ? "Editar aviso" : "Novo aviso"}
            aria-busy={Boolean(pending)}
            className="grid scroll-mt-24 gap-4 sm:grid-cols-2"
          >
            <label className="space-y-1 text-sm font-medium sm:col-span-2">
              Título do aviso
              <input
                className={inputClass}
                value={form.titulo}
                maxLength={180}
                disabled={Boolean(pending)}
                onChange={(event) =>
                  setForm({ ...form, titulo: event.target.value })
                }
              />
            </label>
            <label className="space-y-1 text-sm font-medium sm:col-span-2">
              Descrição
              <textarea
                className={`${inputClass} min-h-28 resize-y`}
                value={form.descricao}
                maxLength={4000}
                disabled={Boolean(pending)}
                onChange={(event) =>
                  setForm({ ...form, descricao: event.target.value })
                }
              />
            </label>
            <label className="space-y-1 text-sm font-medium sm:col-span-2">
              Link opcional
              <input
                className={inputClass}
                value={form.href}
                maxLength={2048}
                disabled={Boolean(pending)}
                placeholder="/noticias ou https://..."
                onChange={(event) =>
                  setForm({ ...form, href: event.target.value })
                }
              />
            </label>
            <label className="space-y-1 text-sm font-medium">
              Imagem do aviso
              <input
                className={`${inputClass} mt-1 file:mr-2 file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs dark:file:bg-slate-800 dark:file:text-slate-200`}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={Boolean(pending)}
                onChange={upload}
              />
            </label>
            <label className="space-y-1 text-sm font-medium">
              Endereço da imagem
              <input
                className={inputClass}
                value={form.imagemUrl}
                maxLength={2048}
                disabled={Boolean(pending)}
                onChange={(event) =>
                  setForm({ ...form, imagemUrl: event.target.value })
                }
              />
            </label>
            {form.imagemUrl && (
              <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                <Image
                  src={toPublicUrl(form.imagemUrl)}
                  alt="Prévia da imagem do aviso"
                  width={176}
                  height={112}
                  unoptimized
                  className="h-28 w-44 rounded-lg border border-slate-200 bg-slate-50 object-contain dark:border-slate-700 dark:bg-slate-950"
                  decoding="async"
                />
                <button
                  type="button"
                  className={buttonClass}
                  disabled={Boolean(pending)}
                  onClick={() => setForm({ ...form, imagemUrl: "" })}
                >
                  Remover imagem
                </button>
              </div>
            )}
            <label className="flex min-h-11 items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={form.ativo}
                disabled={Boolean(pending)}
                onChange={(event) =>
                  setForm({ ...form, ativo: event.target.checked })
                }
              />
              Exibir aviso na home
            </label>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <button className={primaryClass} disabled={Boolean(pending)}>
                {pending === "salvar" ? "Salvando..." : "Salvar aviso"}
              </button>
              <button
                className={buttonClass}
                type="button"
                disabled={Boolean(pending)}
                onClick={() => setForm(null)}
              >
                Cancelar
              </button>
              {pending === "imagem" && (
                <span role="status" className="self-center text-sm">
                  Enviando imagem...
                </span>
              )}
            </div>
          </form>
        </section>
      )}

      <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
          <h3 className="self-center font-semibold text-slate-900 dark:text-slate-100">
            Avisos cadastrados
          </h3>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <input
              type="search"
              className={`${inputClass} flex-1 sm:w-60`}
              aria-label="Buscar avisos"
              placeholder="Buscar avisos"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              className={`${inputClass} w-auto`}
              aria-label="Filtrar avisos por status"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="todos">Todos</option>
              <option value="ativos">Ativos</option>
              <option value="ocultos">Ocultos</option>
            </select>
          </div>
        </div>
        {visible.length === 0 ? (
          <p className="p-6 text-sm text-slate-500 dark:text-slate-400">
            {config.alerts.length
              ? "Nenhum aviso encontrado."
              : "Nenhum aviso cadastrado."}
          </p>
        ) : (
          <div
            className="overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-label="Lista de avisos"
          >
            <table
              className="w-full min-w-[920px] text-left text-sm"
              aria-label="Avisos cadastrados"
            >
              <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                <tr>
                  <th className="p-4">Aviso</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Ordem</th>
                  <th className="p-4">Datas</th>
                  <th className="p-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((alert) => {
                  const index = config.alerts.findIndex(
                    (item) => item.id === alert.id,
                  );
                  const update = (
                    action: string,
                    payload: unknown,
                    success: string,
                  ) =>
                    perform(
                      `${action}-${alert.id}`,
                      `/api/avisos/${alert.id}`,
                      json("PATCH", payload),
                      success,
                    );
                  return (
                    <tr
                      key={alert.id}
                      className="border-b border-slate-100 align-top last:border-b-0 dark:border-slate-800"
                      data-alert-id={alert.id}
                    >
                      <td className="max-w-md p-4">
                        <div className="flex items-start gap-3">
                          {alert.imagemUrl && (
                            <Image
                              src={toPublicUrl(alert.imagemUrl)}
                              alt=""
                              width={96}
                              height={64}
                              unoptimized
                              loading="lazy"
                              decoding="async"
                              className="h-16 w-24 shrink-0 rounded-md border border-slate-200 bg-slate-50 object-contain dark:border-slate-700 dark:bg-slate-950"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="break-words font-semibold text-slate-900 dark:text-slate-100">
                              {alert.titulo || "Aviso sem título"}
                            </p>
                            {alert.descricao && (
                              <p className="mt-1 line-clamp-2 break-words text-xs leading-5 text-slate-500 dark:text-slate-400">
                                {alert.descricao}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <label
                          className={`inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-xs font-semibold ${alert.ativo !== false ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200" : "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"}`}
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            aria-label={`Exibir aviso ${alert.titulo}`}
                            checked={alert.ativo !== false}
                            disabled={Boolean(pending)}
                            onChange={async (event) => {
                              const checked = event.target.checked;
                              const previous = alert.ativo !== false;
                              setConfig((current) => ({
                                ...current,
                                alerts: current.alerts.map((item) =>
                                  item.id === alert.id
                                    ? { ...item, ativo: checked }
                                    : item,
                                ),
                              }));
                              const saved = await update(
                                "status",
                                { ativo: checked },
                                "Status do aviso atualizado.",
                              );
                              if (!saved)
                                setConfig((current) => ({
                                  ...current,
                                  alerts: current.alerts.map((item) =>
                                    item.id === alert.id
                                      ? { ...item, ativo: previous }
                                      : item,
                                  ),
                                }));
                            }}
                          />
                          {pending === `status-${alert.id}`
                            ? "Salvando..."
                            : alert.ativo !== false
                              ? "Ativo"
                              : "Oculto"}
                        </label>
                      </td>
                      <td className="p-4">
                        <span className="mb-2 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                          #{index + 1}
                        </span>
                        <div className="flex gap-1">
                          {(["subir", "descer"] as const).map((direction) => (
                            <button
                              type="button"
                              className={`${buttonClass} w-11 px-0 text-lg`}
                              key={direction}
                              title={
                                direction === "subir"
                                  ? "Subir aviso"
                                  : "Descer aviso"
                              }
                              aria-label={`${direction === "subir" ? "Subir" : "Descer"} aviso ${alert.titulo}`}
                              disabled={
                                Boolean(pending) ||
                                (direction === "subir"
                                  ? index === 0
                                  : index === config.alerts.length - 1)
                              }
                              onClick={() =>
                                update(
                                  direction,
                                  { mover: direction },
                                  "Ordem dos avisos atualizada.",
                                )
                              }
                            >
                              {direction === "subir" ? (
                                <span aria-hidden="true">&uarr;</span>
                              ) : (
                                <span aria-hidden="true">&darr;</span>
                              )}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="whitespace-nowrap p-4 text-xs text-slate-500 dark:text-slate-400">
                        <p>Criado em</p>
                        <p className="mt-1 text-slate-700 dark:text-slate-200">
                          {formatDate(alert.criadoEm)}
                        </p>
                        <p className="mt-3">Atualizado em</p>
                        <p className="mt-1 text-slate-700 dark:text-slate-200">
                          {formatDate(alert.atualizadoEm)}
                        </p>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className={buttonClass}
                            disabled={Boolean(pending)}
                            onClick={() => edit(alert)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className={`${buttonClass} text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40`}
                            disabled={Boolean(pending)}
                            onClick={() => {
                              if (
                                confirm(
                                  `Excluir o aviso "${alert.titulo}"? Esta ação não pode ser desfeita.`,
                                )
                              )
                                void perform(
                                  `excluir-${alert.id}`,
                                  `/api/avisos/${alert.id}`,
                                  { method: "DELETE" },
                                  "Aviso excluído.",
                                  () => {
                                    if (editingId === alert.id) setForm(null);
                                  },
                                );
                            }}
                          >
                            {pending === `excluir-${alert.id}`
                              ? "Excluindo..."
                              : "Excluir"}
                          </button>
                        </div>
                        {pending === `subir-${alert.id}` ||
                        pending === `descer-${alert.id}` ? (
                          <p role="status" className="mt-2 text-xs">
                            Processando...
                          </p>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="border-t border-slate-200 pt-5 dark:border-slate-800">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
          Animação dos avisos
        </h3>
        <form
          aria-label="Animação dos avisos"
          className="mt-3 flex flex-wrap items-end gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void perform(
              "animacao",
              "/api/avisos/settings",
              json("POST", animation),
              "Animação atualizada.",
            );
          }}
        >
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={animation.alertAnimationEnabled}
              disabled={Boolean(pending)}
              onChange={(event) =>
                setAnimation({
                  ...animation,
                  alertAnimationEnabled: event.target.checked,
                })
              }
            />
            Ativar animação discreta
          </label>
          <label className="space-y-1 text-xs font-medium">
            Velocidade da animação
            <select
              className={inputClass}
              value={animation.alertAnimationSpeed}
              disabled={Boolean(pending) || !animation.alertAnimationEnabled}
              onChange={(event) =>
                setAnimation({
                  ...animation,
                  alertAnimationSpeed: event.target
                    .value as HomeDisplaySettings["alertAnimationSpeed"],
                })
              }
            >
              <option value="slow">Lenta</option>
              <option value="normal">Moderada</option>
              <option value="fast">Mais chamativa</option>
            </select>
          </label>
          <button className={buttonClass} disabled={Boolean(pending)}>
            {pending === "animacao" ? "Salvando..." : "Salvar animação"}
          </button>
        </form>
      </section>
    </div>
  );
}

function formatDate(value?: string) {
  return value
    ? new Date(value).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "America/Araguaina",
      })
    : "Não registrada";
}
