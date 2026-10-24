import type { Session } from "next-auth";

export const testSession: Session = {
  expires: "2099-01-01T00:00:00.000Z",
  user: { id: "user-test", name: "Pessoa de teste", email: "teste@example.invalid", roles: ["Admin"], permissions: [], superAdmin: false }
};

export const testUser = {
  id: "user-test", nome: "Pessoa de teste", email: "teste@example.invalid",
  senhaHash: "hash-simulado", status: "ATIVO", sessaoVersao: 1, superAdmin: false,
  perfis: [{ perfil: { nome: "Comunicação" } }],
  permissoes: [{ permissao: "NEWS_WRITE" }]
};

export function jsonRequest(path: string, body: unknown, method = "POST") {
  return new Request(`http://localhost${path}`, {
    method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
  });
}

export const params = { params: { id: "record-test" } };
