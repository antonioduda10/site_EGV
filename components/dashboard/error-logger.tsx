"use client";

import { useEffect } from "react";

type DashboardWindow = Window & {
  __dashboardErrorLoggerInstalled?: boolean;
};

export function DashboardErrorLogger() {
  useEffect(() => {
    const dashboardWindow = window as DashboardWindow;
    if (dashboardWindow.__dashboardErrorLoggerInstalled) return;

    dashboardWindow.__dashboardErrorLoggerInstalled = true;
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input, init) => {
      const requestInfo = getRequestInfo(input, init);
      try {
        const response = await originalFetch(input, init);
        if (shouldLogError(requestInfo.path, response.status)) {
          const responseClone = response.clone();
          void reportHttpError(originalFetch, requestInfo, response, responseClone);
        }
        return response;
      } catch (error) {
        if (shouldLogError(requestInfo.path, 0)) {
          void reportNetworkError(originalFetch, requestInfo, error);
        }
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
      dashboardWindow.__dashboardErrorLoggerInstalled = false;
    };
  }, []);

  return null;
}

function getRequestInfo(input: RequestInfo | URL, init?: RequestInit) {
  const rawUrl = input instanceof Request ? input.url : String(input);
  const url = new URL(rawUrl, window.location.origin);
  const method = String(init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();

  return {
    method,
    url: url.toString(),
    path: `${url.pathname}${url.search}`
  };
}

function shouldLogError(path: string, status: number) {
  if (!path.startsWith("/api/")) return false;
  if (path.startsWith("/api/logs/errors")) return false;
  if (path.startsWith("/api/auth/ping")) return false;
  return status === 0 || status >= 400;
}

async function reportHttpError(
  fetcher: typeof fetch,
  requestInfo: ReturnType<typeof getRequestInfo>,
  response: Response,
  responseClone: Response
) {
  const responseText = await readResponseText(responseClone);
  await sendLog(fetcher, {
    action: inferAction(requestInfo.method, requestInfo.path, response.status),
    method: requestInfo.method,
    path: requestInfo.path,
    status: response.status,
    message: responseText || response.statusText || "Ação retornou erro",
    response: responseText,
    page: window.location.pathname
  });
}

async function reportNetworkError(fetcher: typeof fetch, requestInfo: ReturnType<typeof getRequestInfo>, error: unknown) {
  await sendLog(fetcher, {
    action: inferAction(requestInfo.method, requestInfo.path, 0),
    method: requestInfo.method,
    path: requestInfo.path,
    status: 0,
    message: error instanceof Error ? error.message : "Falha de conexão",
    page: window.location.pathname
  });
}

async function sendLog(fetcher: typeof fetch, body: Record<string, unknown>) {
  try {
    await fetcher("/api/logs/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true
    });
  } catch {
    // Se o próprio registro falhar, evita interromper a ação original do usuário.
  }
}

async function readResponseText(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const data = await response.json().catch(() => null);
    if (data && typeof data === "object") {
      const error = "error" in data ? data.error : undefined;
      const message = "message" in data ? data.message : undefined;
      if (typeof error === "string") return error;
      if (typeof message === "string") return message;
      return JSON.stringify(data).slice(0, 500);
    }
  }

  return response.text().then((text) => text.slice(0, 500)).catch(() => "");
}

function inferAction(method: string, path: string, status: number) {
  if (status === 401 || status === 403) return "Acesso negado";
  if (path.includes("/upload")) return "Upload";
  if (method === "DELETE") return "Excluir";
  if (method === "PATCH" || method === "PUT") return "Atualizar";
  if (method === "POST") return "Enviar";
  return "Carregar";
}
