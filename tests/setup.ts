import { beforeEach, vi } from "vitest";
import { dbMock, resetDatabaseMock } from "./mocks/db";
import { logErrorEvent } from "@/lib/error-log";

vi.mock("@/lib/db", () => ({ db: dbMock }));
vi.mock("@/lib/error-log", () => ({ logErrorEvent: vi.fn().mockResolvedValue({ id: "error-test" }) }));

beforeEach(() => {
  resetDatabaseMock();
  vi.mocked(logErrorEvent).mockResolvedValue({ id: "error-test", dataHora: "2026-10-17T00:00:00Z" });
});
