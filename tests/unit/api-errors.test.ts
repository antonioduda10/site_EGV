import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { withApiErrors } from "@/lib/api-errors";
import { logErrorEvent } from "@/lib/error-log";

describe("Tratamento de erros das APIs criticas", () => {
  it.each([["P2025", 404], ["P2002", 409], ["P1001", 500]])("ERROR-01 traduz Prisma %s para HTTP %s", async (code, status) => {
    const handler = withApiErrors(async () => { throw new Prisma.PrismaClientKnownRequestError("interno", { code, clientVersion: "5.18.0" }); }, "teste");
    const response = await handler();
    expect(response.status).toBe(status);
    expect(await response.json()).toHaveProperty("error");
    expect(logErrorEvent).toHaveBeenCalledWith(expect.objectContaining({ source: "api", status }));
  });
  it("ERROR-02 erro de log nao impede resposta HTTP", async () => {
    vi.mocked(logErrorEvent).mockRejectedValueOnce(new Error("log indisponivel"));
    const handler = withApiErrors(async () => { throw new Error("interno"); }, "teste");
    expect((await handler()).status).toBe(500);
  });
});
