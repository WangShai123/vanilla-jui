export function removeSpaces(value: string | null | undefined): string {
  return value?.replace(/\s+/g, '') ?? '';
}
