const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;

export function isHangulSyllable(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= HANGUL_START && code <= HANGUL_END;
}

export function extractUniqueHangul(text: string): string[] {
  const seen = new Set<string>();
  for (const char of text) {
    if (isHangulSyllable(char)) {
      seen.add(char);
    }
  }
  return [...seen];
}
