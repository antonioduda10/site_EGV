"use client";

import { useEffect, useState } from "react";

type ConsentState = {
  essenciais: boolean;
  analiticos: boolean;
  marketing: boolean;
};

const defaultConsent: ConsentState = {
  essenciais: true,
  analiticos: false,
  marketing: false
};

export function ConsentBanner() {
  const [show, setShow] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [consent, setConsent] = useState<ConsentState>(defaultConsent);

  useEffect(() => {
    const stored = localStorage.getItem("egv-consent");
    if (!stored) {
      setShow(true);
    }
  }, []);

  const saveConsent = async (state: ConsentState) => {
    localStorage.setItem("egv-consent", JSON.stringify(state));
    setShow(false);
    setConfigOpen(false);
    await fetch("/api/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state)
    });
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50">
      <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-lg shadow-lg p-4">
        <h2 className="font-semibold">Preferências de cookies</h2>
        <p className="text-sm text-slate-600 mt-2">
          Usamos cookies essenciais para funcionamento do portal e, com seu consentimento,
          cookies analíticos e de marketing.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            className="px-4 py-2 rounded bg-brand-600 text-white text-sm"
            onClick={() => saveConsent({ essenciais: true, analiticos: true, marketing: true })}
          >
            Aceitar todos
          </button>
          <button
            className="px-4 py-2 rounded bg-slate-200 text-slate-800 text-sm"
            onClick={() => saveConsent(defaultConsent)}
          >
            Recusar
          </button>
          <button
            className="px-4 py-2 rounded border border-slate-300 text-sm"
            onClick={() => setConfigOpen((prev) => !prev)}
          >
            Configurar
          </button>
        </div>
        {configOpen && (
          <div className="mt-4 border-t border-slate-200 pt-4 grid gap-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked disabled />
              Essenciais (obrigatórios)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={consent.analiticos}
                onChange={(event) => setConsent({ ...consent, analiticos: event.target.checked })}
              />
              Analíticos
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={consent.marketing}
                onChange={(event) => setConsent({ ...consent, marketing: event.target.checked })}
              />
              Marketing
            </label>
            <button
              className="mt-2 px-4 py-2 rounded bg-brand-600 text-white text-sm"
              onClick={() => saveConsent(consent)}
            >
              Salvar preferências
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
