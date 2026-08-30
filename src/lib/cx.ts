/** Junta classes ignorando falsos (o `clsx` de 3 linhas). */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}
