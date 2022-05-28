export function tryParseCondition(s: string): {expr: string, length: number} | null {
    // For now, assume a condition cannot contain a ] character.
    const match = s.match(/\s*\[([^\]]+)\]/);
    return match != null ? {
        expr: match[1],
        length: match[0].length
    } : null;
}