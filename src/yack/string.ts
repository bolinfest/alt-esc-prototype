export function tryConsumeStringLiteral(s: string): {value: string; length: number} | null {
    if (s.charAt(0) !== '"') {
        return null;
    }

    let isEscape = false;
    for (let index = 1, len = s.length; index < len; ++index) {
        const c = s.charAt(index);
        if (isEscape) {
            isEscape = false;
        } else if (c === '"') {
            const length = index + 1;
            const value = JSON.parse(s.slice(0, length));
            return {value, length};
        } else if (c === '\\') {
            isEscape = true;
        }
    }

    return null;
}
