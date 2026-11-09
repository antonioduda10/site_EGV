import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { isHomeAlertsSameOrigin } from "@/lib/home-alerts-validation";

beforeEach(() => vi.stubEnv("NEXTAUTH_URL", "https://portal.example.invalid"));
afterEach(() => vi.unstubAllEnvs());

const request = (
  host: string,
  origin: string,
  internal = "http://0.0.0.0:3000/api/avisos/legacy-1",
) => new Request(internal, { method: "PATCH", headers: { host, origin } });

it.each([
  ["localhost:3000", "http://localhost:3000"],
  ["127.0.0.1:3000", "http://127.0.0.1:3000"],
  ["192.168.1.9:3000", "http://192.168.1.9:3000"],
  ["[::1]:3000", "http://[::1]:3000"],
])(
  "aceita origem do navegador correspondente ao Host %s com bind interno diferente",
  (host, origin) => {
    expect(isHomeAlertsSameOrigin(request(host, origin))).toBe(true);
  },
);

it("considera o Host original quando NextRequest normaliza 127.0.0.1 para localhost", () => {
  vi.stubEnv("NEXTAUTH_URL", "http://localhost:3100");
  const req = new NextRequest("http://127.0.0.1:3100/api/avisos/legacy-1", {
    method: "PATCH",
    headers: { host: "127.0.0.1:3100", origin: "http://127.0.0.1:3100" },
  });
  expect(new URL(req.url).hostname).toBe("localhost");
  expect(isHomeAlertsSameOrigin(req)).toBe(true);
});

it("aceita HTTPS encaminhado pelo Next e preserva a origem canonica configurada", () => {
  expect(
    isHomeAlertsSameOrigin(
      request(
        "escola.example.invalid",
        "https://escola.example.invalid",
        "https://0.0.0.0:3000/api/avisos",
      ),
    ),
  ).toBe(true);
  expect(
    isHomeAlertsSameOrigin(
      request("app:3000", "https://portal.example.invalid"),
    ),
  ).toBe(true);
});

it.each([
  "https://foreign.example.invalid",
  "http://localhost:3001",
  "https://localhost:3000",
  "http://0.0.0.0:3000",
  "null",
  "",
  "ftp://localhost:3000",
  "http://user@localhost:3000",
  "http://localhost:3000/path",
  "http://localhost:3000?query=1",
  "http://localhost:3000#fragment",
  "http://localhost:3000, https://foreign.example.invalid",
])("recusa origem externa, divergente ou malformada: %s", (origin) => {
  expect(isHomeAlertsSameOrigin(request("localhost:3000", origin))).toBe(false);
});

it.each([
  "",
  "localhost:3000/other",
  "localhost:3000\\other",
  "user@localhost:3000",
  "localhost:3000,foreign.example.invalid",
  "localhost:invalid",
])("nao aceita Host malformado: %s", (host) => {
  expect(isHomeAlertsSameOrigin(request(host, "http://localhost:3000"))).toBe(
    false,
  );
});

it("nao confia em X-Forwarded-Host para autorizar uma origem externa", () => {
  const req = request("localhost:3000", "https://foreign.example.invalid");
  req.headers.set("x-forwarded-host", "foreign.example.invalid");
  expect(isHomeAlertsSameOrigin(req)).toBe(false);
});

it("mantem fallback sem Host e nao deixa configuracao canonica invalida bloquear a origem real", () => {
  expect(
    isHomeAlertsSameOrigin(
      new Request("http://localhost:3000/api/avisos", {
        headers: { origin: "http://localhost:3000" },
      }),
    ),
  ).toBe(true);
  vi.stubEnv("NEXTAUTH_URL", "invalid-url");
  expect(
    isHomeAlertsSameOrigin(request("localhost:3000", "http://localhost:3000")),
  ).toBe(true);
});
