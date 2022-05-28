import {tryConsumeStringLiteral} from './string';
import {tryParseDivert} from './divert';
import {tryParseCondition} from './condition';

export type Condition = string;

export type Choice = {
    number: number;
    line: string;
    conditions: Condition[];
    divert: string | null;
}

export function tryParseChoice(line: string): Choice | null {
    const dialogBeginMatch = line.match(/^(\d+)\s(.*)$/);
    if (dialogBeginMatch == null) {
        return null;
    }

    let rest = dialogBeginMatch[2];
    const stringLiteralMatch = tryConsumeStringLiteral(rest);
    if (stringLiteralMatch == null) {
        return null;
    }

    rest = rest.substring(stringLiteralMatch.length); 
    const conditions = [];
    do {
        const condition = tryParseCondition(rest);
        if (condition != null) {
            conditions.push(condition.expr);
            rest = rest.substring(condition.length);
        } else {
            break;
        }
    } while (true);

    const divert = tryParseDivert(rest);
    return {
        number: parseInt(dialogBeginMatch[1], 10),
        line: stringLiteralMatch.value,
        conditions,
        divert: divert?.knot ?? null,
    }
}
