/** Values are 0-based. */
type Position = {
  line: number;
  column: number;
};

type StringLiteralToken = {
  type: 'string';
  value: string;
} & Position;

type KnotToken = {
  type: 'knot';
  name: string;
} & Position;

type DivertToken = {
  type: 'divert';
  target: string;
} & Position;

export type ChoiceToken = {
  type: 'choice';
} & Position;

type ConditionToken = {
  type: 'condition';
  expr: string;
} & Position;

/** Script native to the host platform. */
type ScriptToken = {
  type: 'script';
  code: string;
} & Position;

export type ActorLineToken = {
  type: 'actor_line';
  actor: string;
} & Position;

export type ControlFlowToken = {
  type: 'control_flow';
  keyword: 'if' | 'elif' | 'else' | 'endif';
} & Position;

/** Symbol that is not a keyword. */
export type SymbolToken = {
  type: 'symbol';
  value: string;
} & Position;

export type Token =
  | StringLiteralToken
  | KnotToken
  | DivertToken
  | ConditionToken
  | ScriptToken
  | ChoiceToken
  | ActorLineToken
  | ControlFlowToken
  | SymbolToken;

export function tokenize(src: string): Token[] {
  let line = 0;
  let indexOfPosition = 0;
  const maxPosition = src.length;
  const tokens: Token[] = [];

  while (true) {
    if (indexOfPosition >= maxPosition) {
      break;
    }

    const newlineIndex = src.indexOf('\n', indexOfPosition);
    const code = src.slice(indexOfPosition, newlineIndex);

    tokenizeLine(code, line, tokens);

    indexOfPosition = newlineIndex + 1;
    ++line;
  }
  return tokens;
}

function tokenizeLine(code: string, line: number, tokens: Token[]) {
  for (let column = 0, len = code.length; column < len; ++column) {
    const c = code.charAt(column);
    switch (c) {
      case ' ':
      case '\n':
      case '\t':
      case '\r':
        break;
      case '/': {
        if (code.charAt(column + 1) === '/') {
          // This is a comment: ignore the rest of the line.
          return;
        } else {
          throw Error(`unexpected \`/\` at ${formatPosition(line, column)}`);
        }
      }
      case '"': {
        const str = tryConsumeStringLiteral(code.slice(column));
        if (str != null) {
          tokens.push({
            type: 'string',
            value: str.value,
            line,
            column,
          });
          column += str.length - 1;
          break;
        } else {
          throw Error(`unterminated \`"\` at ${formatPosition(line, column)}`);
        }
      }
      case '=': {
        if (column === 0) {
          const knotName = tryParseKnot(code);
          if (knotName != null) {
            tokens.push({
              type: 'knot',
              name: knotName,
              line,
              column,
            });
            // Can return because a knot must match the entire line.
            return;
          }
        }
        throw Error(`unexpected \`=\` at ${formatPosition(line, column)}`);
      }
      case '-': {
        const target = tryParseDivert(code.slice(column));
        if (target != null) {
          tokens.push({
            type: 'divert',
            target,
            line,
            column,
          });
          // Can return because a divert must match to the end of the ilne.
          return;
        }
        throw Error(`unexpected \`-\` at ${formatPosition(line, column)}`);
      }
      case '[': {
        const condition = tryParseCondition(code.slice(column));
        if (condition != null) {
          tokens.push({
            type: 'condition',
            expr: condition.expr,
            line,
            column,
          });
          column += condition.length - 1;
          break;
        } else {
          throw Error(`unterminated \`[\` at ${formatPosition(line, column)}`);
        }
      }
      case '{': {
        // Ultimately, we should support multi-line script blocks, but for now, we
        // support only single-line ones.
        const script = tryParseScript(code.slice(column));
        if (script != null) {
          tokens.push({
            type: 'script',
            code: script.expr,
            line,
            column,
          });
          column += script.length - 1;
          break;
        } else {
          throw Error(`unterminated \`{\` at ${formatPosition(line, column)}`);
        }
      }
      case '*': {
        if (column === 0 && code.charAt(1) === ' ') {
          tokens.push({
            type: 'choice',
            line,
            column,
          });
          break;
        }
        throw Error(`unexpected \`*\` at ${formatPosition(line, column)}`);
      }
      default: {
        if (/[a-z]/.test(c)) {
          const ident = tryParseIdentifier(code.slice(column));
          if (ident != null) {
            const symbol = ident.ident;
            if (code.charAt(column + ident.length) === ':') {
              tokens.push({
                type: 'actor_line',
                actor: symbol,
                line,
                column,
              });
              column += ident.length;
              break;
            } else if (
              symbol === 'if' ||
              symbol === 'elif' ||
              symbol === 'else' ||
              symbol === 'endif'
            ) {
              tokens.push({
                type: 'control_flow',
                keyword: symbol,
                line,
                column,
              });
              column += ident.length - 1;
              break;
            } else {
              tokens.push({
                type: 'symbol',
                value: symbol,
                line,
                column,
              });
              column += ident.length - 1;
              break;
            }
          }
        }
        throw Error(
          `unexpected character \`${c}\` at ${formatPosition(line, column)}`,
        );
      }
    }
  }
}

function tryConsumeStringLiteral(
  s: string,
): {value: string; length: number} | null {
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

function tryParseKnot(code: string): string | null {
  const match = code.match(/^={2,}\s(\w+)\s+={2,}$/);
  return match != null ? match[1] : null;
}

/** Must match to the end of the line. */
function tryParseDivert(line: string): string | null {
  const match = line.match(/^-> ([a-zA-Z][a-zA-Z0-9_]+)$/);
  return match != null ? match[1] : null;
}

function tryParseCondition(
  code: string,
): {expr: string; length: number} | null {
  // For now, assume a condition cannot contain a ] character.
  const match = code.match(/\s*\[([^\]]+)\]/);
  return match != null
    ? {
        expr: match[1],
        length: match[0].length,
      }
    : null;
}

function tryParseScript(code: string): {expr: string; length: number} | null {
  // For now, assume a script cannot contain a } character.
  const match = code.match(/\{\s*([^\}]+)\}/);
  return match != null
    ? {
        expr: match[1].trim(),
        length: match[0].length,
      }
    : null;
}

function tryParseIdentifier(
  code: string,
): {ident: string; length: number} | null {
  const match = code.match(/^[a-zA-Z_]+/);
  if (match != null) {
    const ident = match[0];
    return {
      ident,
      length: ident.length,
    };
  } else {
    return null;
  }
}

function formatPosition(line: number, column: number): string {
  return `line: ${line + 1}, column: ${column + 1}`;
}
