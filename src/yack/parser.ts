import type {Choice} from './dialog';

import {tryConsumeStringLiteral} from './string';
import {tryParseDivert} from './divert';
import {tryParseChoice} from './dialog';
import {tokenize} from './tokenizer';

const INDENT = '    '

const includeComments = true;

type RootContext = {
    type: "root"
}

type DialogMenu = {
    type: "dialog_menu",
    choices: Choice[],
}

type Context = RootContext | DialogMenu;

export function parseYackFile(src: string, filename: string): string {
    const tokens = tokenize(src);
    return JSON.stringify(tokens, null, 2);
}

function oldParseYackFile(src: string, filename: string): string {
    const knots: Knot[] = [];
    const stack: Context[] = [{type: "root" }];
    let currentKnot = null;

    const lines = src.split("\n");
    let index = 0;
    let maxIndex = lines.length;
    while (index < maxIndex) {
        const line = lines[index++];
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

                const parsedChoice = tryParseChoice(line, lines, index);
                if (parsedChoice != null) {
                    const context: DialogMenu = {
                        type: 'dialog_menu',
                        choices: [parsedChoice.choice],
                    };
                    index += parsedChoice.numLinesConsumed - 1;
                    stack.push(context);
                    break;
                }

                break;
            }
            case "dialog_menu": {
                // Note that blank lines and comments have already been filtered out
                // by this point.
                const parsedChoice = tryParseChoice(line, lines, index);
                if (parsedChoice != null) {
                    currentContext.choices.push(parsedChoice.choice);
                    index += parsedChoice.numLinesConsumed - 1;
                } else {
                    // Mark the existing menu "done" and re-parse this line in the new
                    // context.
                    stack.pop();
                    currentKnot?.addDialogMenu(currentContext, stack.length);
                    --index;
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
    private nextVarID = 0;

    constructor(private name: string) {
    }

    getName(): string {
        return this.name;
    }

    private getNextVar(): string {
        return '__genvar_' + (++this.nextVarID);
    }

    setNextKnot(name: string) {
        this.nextKnot = name;
    }

    addCode(line: string): void {
        this.lines.push(line);
    }

    addDialogMenu(menu: DialogMenu, depth: number): void {
        const varName = this.getNextVar();
        const indent = INDENT.repeat(depth);
        const choices = menu.choices.map(choice => {
            // const divert = choice.divert != null ? quote(choice.divert) : 'null';
            // return `${indent}${INDENT}Choice(${quote(choice.line)}, ${divert}, ${JSON.stringify(choice.conditions)}),\n`;
            return 'TODO';
        });
        this.lines.push(`${indent}var ${varName} = yield menu([\n${choices.join("")}${indent}])\n${indent}if ${varName} != null: return ${varName}`);
    }

    private static endsWithReturnStatement(body: string): boolean {
        const index = body.lastIndexOf('\n');
        const lastLine = index !== -1 ? body.substring(index + 1) : body;
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