import { test, expect } from "@playwright/test";

test("AVISOS-ORIGIN edicao no navegador com host real, alias de autenticacao e bloqueios preservados", async ({
  page,
  request,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(process.env.E2E_EMAIL!);
  await page
    .getByLabel("Senha", { exact: true })
    .fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  if (process.env.EGV_E2E_AUTH_ALIAS === "1")
    expect(new URL(process.env.NEXTAUTH_URL!).hostname).not.toBe(
      new URL(page.url()).hostname,
    );
  const created = await page.request.post("/api/avisos", {
    data: {
      titulo: "Aviso ficticio para verificar origem",
      descricao: "Teste isolado de edicao.",
      ativo: false,
    },
  });
  expect(created.status()).toBe(201);
  const id = (await created.json()).alert.id;
  try {
    await page.goto("/dashboard/avisos");
    const row = page.locator(`tr[data-alert-id="${id}"]`);
    await row.getByRole("button", { name: "Editar", exact: true }).click();
    const form = page.getByRole("form", { name: "Editar aviso", exact: true });
    await form
      .getByLabel("Título do aviso")
      .fill("Aviso editado com a origem correta");
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/avisos/${id}`) &&
        response.request().method() === "PATCH",
    );
    await form
      .getByRole("button", { name: "Salvar aviso", exact: true })
      .click();
    const response = await responsePromise;
    expect(await response.request().headerValue("origin")).toBe(
      new URL(page.url()).origin,
    );
    expect(response.status()).toBe(200);
    await expect(row).toContainText("Aviso editado com a origem correta");
    expect(
      (
        await page.request.patch(`/api/avisos/${id}`, {
          headers: {
            origin: "https://external.example.invalid",
            "x-forwarded-host": "external.example.invalid",
          },
          data: { ativo: true },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await request.patch(`/api/avisos/${id}`, { data: { ativo: true } })
      ).status(),
    ).toBe(403);
  } finally {
    await page.request.delete(`/api/avisos/${id}`);
  }
});
