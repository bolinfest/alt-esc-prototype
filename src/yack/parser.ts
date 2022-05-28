const includeComments = true;

type RootContext = {
    type: "root"
}

type Context = RootContext;

export function parseYackFile(src: string, filename: string): string {
    const knots: Knot[] = [];
    const stack: Context[] = [{type: "root" }];
    let currentKnot = null;

    for (const [_lineNumber, line] of src.split("\n").entries()) {
        if (isComment(line)) {
            if (includeComments && currentKnot != null) {
                const gd = line.replace(/^\s*\/\//, "#");
                currentKnot.addCode(gd);
            }
            continue;
        } else if (line.trim().length === 0) {
            continue;
        }

        const currentContext = stack.slice(-1)[0];
        switch (currentContext.type) {
            case "root": {
                const knotName = isKnot(line);
                if (knotName != null) {
                    if (currentKnot != null) {
                        currentKnot.setNextKnot(knotName);
                    }

                    currentKnot = new Knot(knotName);
                    knots.push(currentKnot);
                    break;
                }

                if (currentKnot == null) {
                    throw Error(`cannot parse line \`${line}\` outside of a knot`);
                }

                const dialog = tryParseDialogLine(line);
                if (dialog != null) {
                    currentKnot.addCode(`    speak(Actor.${dialog.actor}, ${quote(dialog.line)})`)
                    break;
                }

                const divert = tryParseDivert(line);
                if (divert != null) {
                    currentKnot.addCode(`    return ${quote(divert.knot)}`);
                    break;
                }
                break;
            }
        }
    }

    return createMainFunc(knots) + '\n' + knots.join("\n");
}

class Knot {
    private lines: string[] = [];
    private nextKnot: string | null = null;

    constructor(private name: string) {
    }

    getName(): string {
        return this.name;
    }

    setNextKnot(name: string) {
        this.nextKnot = name;
    }

    addCode(line: string): void {
        this.lines.push(line);
    }

    private static endsWithReturnStatement(body: string): boolean {
        const index = body.lastIndexOf('\n');
        const lastLine = index !== -1 ? body.substring(index + 1) : body;
        console.log(lastLine)
        const match = lastLine.match(/^\s+return\s(.*)$/);
        if (match == null) {
            return false;
        }

        const expr = match[1];
        return tryConsumeStringLiteral(expr) != null;
    }

    toString(): string {
        let body = this.lines.length ? this.lines.join('\n') : '';
        if (this.nextKnot && !Knot.endsWithReturnStatement(body)) {
            body += `\n    return ${quote(this.nextKnot)}`;
        }
        if (body === '') {
            body = '\n    pass';
        }

        return `\
static func knot__${this.name}():
${body}
`;
    }
}

function isKnot(line: string): string | null {
    const match = line.match(/^={2,}\s(\w+)\s+={2,}$/);
    return match != null ? match[1] : null
}

function tryParseDialogLine(line: string): {actor: string, line: string} | null {
    const actorMatch = line.match(/^([a-z]+):\s+(.+)$/);
    if (actorMatch == null) {
        return null;
    }

    const actor = actorMatch[1];
    const rest = actorMatch[2];
    const actorLine = tryConsumeStringLiteral(rest);
    if (actorLine != null) {
        // TODO: see if there is more content?
        return {
            actor,
            line: actorLine.value
        };
    } else {
        return null;
    }
}

function tryParseDivert(line: string): {knot: string} | null {
    const match = line.match(/^\s*-> ([a-zA-Z][a-zA-Z0-9_]+)\b/);
    return match != null ? {knot: match[1]} : null;
}

function tryConsumeStringLiteral(s: string): {value: string; length: number} | null {
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

function isComment(line: string): boolean {
    return /^\s*\/\//.test(line);
}

function createMainFunc(knots: Knot[]): string {
    const cases = knots.map(knot => `\
            ${quote(knot.getName())}:
                current_knot = knot__${knot.getName()}()
`);
    return `\
static func main(knot_name):
    var current_knot = knot_name
    while true:
        match current_knot:
            "exit":
                return
` + cases.join("");
}

function quote(s: string): string {
    return JSON.stringify(s);
}