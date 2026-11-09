import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { logErrorEvent } from "./error-log";
import { UploadValidationError } from "./upload-policy";
import { UploadPathError } from "./upload-path";
import { HomeAlertsError } from "./home-alerts-config";

export function withApiErrors<Args extends unknown[]>(handler: (...args: Args) => Promise<Response>, action: string) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      let status = 500;
      let message = "Não foi possível concluir a operação. Tente novamente.";
      if (error instanceof UploadValidationError || error instanceof UploadPathError || error instanceof HomeAlertsError) {
        status = error.status;
        message = error.message;
      } else if (error instanceof SyntaxError) {
        status = 400;
        message = "Dados inválidos";
      } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          status = 404;
          message = "Registro não encontrado";
        } else if (error.code === "P2002") {
          status = 409;
          message = "Já existe um registro com esses dados.";
        }
      }
      // Do not copy payloads, credentials, paths or database messages into the log.
      await logErrorEvent({
        source: "api", action, status, message,
        detalhes: { type: error instanceof Error ? error.name : "UnknownError" }
      }).catch(() => undefined);
      return NextResponse.json({ error: message }, { status });
    }
  };
}
