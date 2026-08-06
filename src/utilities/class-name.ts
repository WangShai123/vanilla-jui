export type ClassNameToken = string | false | null | undefined;

export function joinClasses(...tokens: ClassNameToken[]): string {
  return tokens.filter(Boolean).join(' ');
}
