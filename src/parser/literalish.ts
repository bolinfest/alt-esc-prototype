/** A literal value or a translation. */
export type LiteralishValue =
  | {
      type: 'translation';
      value: string;
    }
  | {
      type: 'string';
      value: string;
    }
  | {
      type: 'number';
      value: number;
    }
  | {
      type: 'boolean';
      value: boolean;
    }
  | {
      type: 'null';
    };

export function renderLiteralishValue(literalish: LiteralishValue): string {
  switch (literalish.type) {
    case 'translation':
      return `$T(${JSON.stringify(literalish.value)})`;
    case 'null':
      return 'null';
    case 'string':
    case 'number':
    case 'boolean':
      return JSON.stringify(literalish.value);
  }
}

export function tryParseLiteralishValue(text: string): LiteralishValue | null {
  const match = text.match(/^\$T\((.*)\)$/);
  if (match != null) {
    const arg = match[1];
    let value;
    try {
      value = JSON.parse(arg);
    } catch {
      // Will throw later.
    }

    if (typeof value !== 'string') {
      throw Error(
        `T() must take a double-quoted string literal but got \`${arg}\``,
      );
    } else {
      return {
        type: 'translation',
        value,
      };
    }
  } else {
    let value = undefined;
    try {
      value = JSON.parse(text);
    } catch {
      // `text` does not appear to be a literal value, so return null.
    }

    if (value === null) {
      return {type: 'null'};
    } else {
      switch (typeof value) {
        case 'string':
          return {
            type: 'string',
            value,
          };
        case 'boolean':
          return {
            type: 'boolean',
            value,
          };
        case 'number':
          return {
            type: 'number',
            value,
          };
        default:
          // Must be a complex type that is not a LiteralishValue, so return null.
          return null;
      }
    }
  }
}
