import { expect, it } from "vitest";
import { GET } from "@/app/api/health/route";
import { dbMock } from "../mocks/db";

it("HEALTH-01 readiness checks the database without exposing metadata", async () => {
  dbMock.$queryRaw.mockResolvedValue([{ result: 1 }]);
  const response = await GET();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ status: "ok" });
  expect(response.headers.get("cache-control")).toBe("no-store");
});
it("HEALTH-02 unavailable database returns a generic 503", async () => {
  dbMock.$queryRaw.mockRejectedValue(new Error("internal information must not leave the server"));
  const response = await GET();
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ status: "unavailable" });
});
