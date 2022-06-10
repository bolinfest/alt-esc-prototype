import {tryConsumeStringLiteral} from './string';
import {tryParseDivert} from './divert';
import {tryParseCondition} from './condition';

export type Condition = string;

export type SimpleChoice = {
  type: 'simple';
  line: string;
  conditions: Condition[];
  divert: string | null;
};

export type ConditionBlock = {
  condition: string;
  choice: Choice;
};

export type ComplexChoice = {
  type: 'complex';
  ifBlock: ConditionBlock;
  elifBlocks: ConditionBlock[];
  elseChoice: Choice | null;
};

export type Choice = SimpleChoice | ComplexChoice;

export type ParsedChoice = {
  choice: Choice;
  numLinesConsumed: number;
};

/**
 * Note that a choice can be a single line, such as:
 *
 *     * "Pizza!" [once] -> pizza
 *
 * Or multiple lines, starting with an `if`:
 *
 *     * if [!inInventory(Inventory.camera)]
 *         "Where did you say the camera was again?" -> where_is_camera
 *       else
 *         "Can I get some more film?" -> film
 *       endif
 */
export function tryParseChoice(
  line: string,
  lines: string[],
  index: number,
): ParsedChoice | null {
  if (!line.startsWith('* ')) {
    return null;
  }

  const rest = line.slice(2);
  if (rest.startsWith('"')) {
    const choice = tryParseSpokenLine(rest);
    return choice != null ? {choice, numLinesConsumed: 1} : null;
  } else {
    return tryParseMultiLine(rest, lines, index);
  }
}

function tryParseMultiLine(
  firstLine: string,
  lines: string[],
  index: number,
): ParsedChoice | null {
  if (!firstLine.startsWith('if ')) {
    return null;
  }

  // TODO: parse!
  return null;
}

function tryParseSpokenLine(line: string): SimpleChoice | null {
  const stringLiteralMatch = tryConsumeStringLiteral(line);
  if (stringLiteralMatch == null) {
    return null;
  }

  let rest = line.substring(stringLiteralMatch.length);
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
    type: 'simple',
    line: stringLiteralMatch.value,
    conditions,
    divert: divert?.knot ?? null,
  };
}
