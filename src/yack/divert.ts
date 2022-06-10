export function tryParseDivert(line: string): {knot: string} | null {
  const match = line.match(/^\s*-> ([a-zA-Z][a-zA-Z0-9_]+)\b/);
  return match != null ? {knot: match[1]} : null;
}
