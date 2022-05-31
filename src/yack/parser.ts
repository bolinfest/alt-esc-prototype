import type {ChoiceToken, ControlFlowToken, Token} from './tokenizer';
import type {Choice} from './dialog';

import {tryConsumeStringLiteral} from './string';
import {tryParseDivert} from './divert';
import {tryParseChoice} from './dialog';
import {tokenize} from './tokenizer';
import { assert } from 'console';

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
    console.log(JSON.stringify(tokens, null, 2));
    const parser = new Parser(tokens);
    const ast = parser.parse();
    return JSON.stringify(ast, null, 2);
}

class Parser {
    private index = 0;
    private currentToken: Token | null;
    private knots: KnotNode[] = [{type: 'knot', name: '', children: []}];

    constructor(private tokens: Token[]) {
        this.currentToken = tokens[this.index] ?? null;
    }

    private peek(): Token | null {
        return this.tokens[this.index + 1] ?? null;
    }

    private nextToken(): Token | null {
        this.currentToken = this.tokens[++this.index] ?? null;
        return this.currentToken;
    }

    private currentKnot(): KnotNode {
        return this.knots[this.knots.length - 1];
    }

    parse(): KnotNode[] {
        while (this.currentToken != null) {
            switch (this.currentToken.type) {
                case 'knot': {
                    const knot: KnotNode = {
                        type: 'knot',
                        name: this.currentToken.name,
                        children: [],
                    };
                    this.knots.push(knot);
                    break;
                }
                case 'divert': {
                    this.currentKnot().children.push({
                        type: 'divert',
                        target: this.currentToken.target,
                    });
                    break;
                }
                case 'actor_line': {
                    const nextToken = this.peek();
                    if (nextToken?.type === "string") {
                        this.currentKnot().children.push({
                            type: 'actor_line',
                            actor: this.currentToken.actor,
                            line: nextToken.value,
                        });
                    }
                    break;
                }
                case 'choice': {
                    const choiceExpr = this.parseChoiceExpr(this.currentToken);
                    if (choiceExpr != null) {
                        this.currentKnot().children.push(choiceExpr);
                    }
                    break;
                }
                // Error on unexpected tokens?
            }
            this.nextToken();
        }

        return this.knots;
    }

    private parseChoiceExpr(choiceToken: ChoiceToken): SimpleChoice | ComplexChoice {
        const nextToken = this.nextToken();
        if (nextToken == null) {
            this.throwParseError('expected some token following `*` for choice', choiceToken);
        }

        switch (nextToken.type) {
            case 'string': {
                const line = nextToken.value;

                // Consume optional conditions and diverts.
                // Should stop consuming tokens once the line number changes?
                const conditions: string[] = [];
                while (true) {
                    if (this.peek()?.type === 'condition') {
                        const conditionToken = this.nextToken();
                        if (conditionToken?.type === 'condition') {
                           conditions.push(conditionToken.expr);
                        } else {
                            throw new Error('invariant violation');
                        }
                    } else {
                        break;
                    }
                }

                let divert = null;
                if (this.peek()?.type === 'divert') {
                    const divertToken = this.nextToken();
                    if (divertToken?.type === 'divert') {
                        divert = divertToken.target;
                    } else {
                        throw new Error('invariant violation');
                    }
                }

                return {
                    type: 'simple_choice',
                    line,
                    conditions,
                    divert,
                };
            }
            case 'control_flow': {
                return this.parseComplexChoice('if');
            }
            default:
                this.throwParseError(`did not expect token of type \`${nextToken.type}\` following \`*\``, nextToken);
        }
    }

    /** `this.currentToken` must be the first token for the ComplexChoice. */
    private parseComplexChoice(expectedKeyword: 'if' | 'elif'): ComplexChoice {
        const token = this.currentToken;
        if (token == null) {
            throw Error('no tokens for choice');
        }

        switch (token.type) {
            case 'control_flow': {
                if (token.keyword !== expectedKeyword) {
                    this.throwParseError(`expected keyword \`${expectedKeyword}\` but was \`${token.keyword}\``, token);
                }

                const ifCondition = this.nextToken();
                if (ifCondition?.type !== "condition") {
                    this.throwParseError('if must be followed by a condition', token);
                }

                // Ensure next token is current one before calling into parseComplexChoice().
                this.nextToken();
                // This requires no empty if-blocks?
                const consequent = this.parseComplexChoice('if');

                const nextToken = this.nextToken();
                let alternate = null;
                if (nextToken == null) {
                    this.throwParseError('missing else or endif after if', token);
                } else if (nextToken.type !== 'control_flow') {
                    this.throwParseError('expect else or endif to close if', nextToken);
                } else if (nextToken.keyword === 'if') {
                    this.throwParseError('expect else, elif, or endif to close if', nextToken);
                } else if (nextToken.keyword === 'endif') {
                    // All done!
                } else if (nextToken.keyword === 'elif') {
                    alternate = this.parseComplexChoice('elif');
                } else if (nextToken.keyword === 'else') {
                    // Ensure next token is current one before calling into parseComplexChoice().
                    this.nextToken();
                    alternate = this.parseComplexChoice('if');
                    const endifToken = this.nextToken();
                    if (endifToken?.type !== 'control_flow' || endifToken.keyword !== 'endif') {
                        this.throwParseError('else missing closing endif', nextToken);
                    }
                }

                return {
                    type: 'control_flow_choice',
                    condition: ifCondition.expr,
                    consequent,
                    alternate,
                };
            }
            case 'string': {
                return this.parseUnconditionalChoice();
            }
        }
        this.throwParseError(`could not parse token for choice: type ${token.type}`, token);
    }

    private parseUnconditionalChoice(): UnconditionalChoice {
        if (this.currentToken?.type !== "string") {
            throw new Error('invariant violation');
        }

        const line = this.currentToken.value;
        const maybeDivertToken = this.peek();
        const divert = maybeDivertToken?.type === 'divert' ? maybeDivertToken.target : null;
        if (divert != null) {
            // Make sure to consume divert in this case.
            this.nextToken();
        }
        return {
            type: 'unconditional_choice',
            line,
            divert,
        };
    }

    private throwParseError(message: string, position: {line: number; column: number}): never {
        throw new Error(`parse error on line ${position.line + 1}: ${message}`);
    }
}

type KnotNode = {
    type: 'knot';
    name: string;
    children: AstNode[];
}

type DivertNode = {
    type: 'divert',
    target: string;
}

type ActorLineNode = {
    type: 'actor_line',
    actor: string;
    line: string;
}

type SimpleChoice = {
    type: 'simple_choice',
    line: string;
    conditions: string[];
    divert: string | null;
}

type UnconditionalChoice = {
    type: 'unconditional_choice',
    line: string;
    divert: string | null;
}

type ControlFlowChoice = {
    type: 'control_flow_choice',
    condition: string;
    consequent: UnconditionalChoice | ControlFlowChoice | null;
    alternate: UnconditionalChoice | ControlFlowChoice | null;
}

type ComplexChoice = ControlFlowChoice | UnconditionalChoice;

type AstNode = KnotNode | DivertNode | ActorLineNode | SimpleChoice | ComplexChoice;

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