export const MIN_PASSWORD_LENGTH = 15;
export const MAX_PASSWORD_LENGTH = 128;
export const PASSWORD_POLICY_MESSAGE = "Use de 15 a 128 caracteres. Espaços e frases-senha são permitidos.";

export function newPasswordError(value: string): string | null {
  const length = Array.from(value).length;
  return !value.trim() || length < MIN_PASSWORD_LENGTH || length > MAX_PASSWORD_LENGTH ? PASSWORD_POLICY_MESSAGE : null;
}
