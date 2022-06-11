import type {ChoiceToken, Token} from './tokenizer';

import {tokenize} from './tokenizer';

export function parseYackFile(src: string, filename: string): KnotNode[] {
  const tokens = tokenize(src);
  const parser = new Parser(tokens);
  const ast = parser.parse();
  return ast;
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
          if (nextToken?.type === 'string') {
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

    // Currently, it is undefined behavior if the "anonymous" knot has children.
    // In the expected case where the "anonymous" knot is unused, strip it from
    // the output.
    const sliceIndex = this.knots[0].children.length === 0 ? 1 : 0;
    return this.knots.slice(sliceIndex);
  }

  private parseChoiceExpr(
    choiceToken: ChoiceToken,
  ): SimpleChoice | ComplexChoice {
    const nextToken = this.nextToken();
    if (nextToken == null) {
      this.throwParseError(
        'expected some token following `*` for choice',
        choiceToken,
      );
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
        this.throwParseError(
          `did not expect token of type \`${nextToken.type}\` following \`*\``,
          nextToken,
        );
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
          this.throwParseError(
            `expected keyword \`${expectedKeyword}\` but was \`${token.keyword}\``,
            token,
          );
        }

        const ifCondition = this.nextToken();
        if (ifCondition?.type !== 'condition') {
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
          this.throwParseError(
            'expect else, elif, or endif to close if',
            nextToken,
          );
        } else if (nextToken.keyword === 'endif') {
          // All done!
        } else if (nextToken.keyword === 'elif') {
          alternate = this.parseComplexChoice('elif');
        } else if (nextToken.keyword === 'else') {
          // Ensure next token is current one before calling into parseComplexChoice().
          this.nextToken();
          alternate = this.parseComplexChoice('if');
          const endifToken = this.nextToken();
          if (
            endifToken?.type !== 'control_flow' ||
            endifToken.keyword !== 'endif'
          ) {
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
    this.throwParseError(
      `could not parse token for choice: type ${token.type}`,
      token,
    );
  }

  private parseUnconditionalChoice(): UnconditionalChoice {
    if (this.currentToken?.type !== 'string') {
      throw new Error('invariant violation');
    }

    const line = this.currentToken.value;
    const maybeDivertToken = this.peek();
    const divert =
      maybeDivertToken?.type === 'divert' ? maybeDivertToken.target : null;
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

  private throwParseError(
    message: string,
    position: {line: number; column: number},
  ): never {
    throw new Error(`parse error on line ${position.line + 1}: ${message}`);
  }
}

type KnotNode = {
  type: 'knot';
  name: string;
  children: AstNode[];
};

type DivertNode = {
  type: 'divert';
  target: string;
};

type ActorLineNode = {
  type: 'actor_line';
  actor: string;
  line: string;
};

type SimpleChoice = {
  type: 'simple_choice';
  line: string;
  conditions: string[];
  divert: string | null;
};

type UnconditionalChoice = {
  type: 'unconditional_choice';
  line: string;
  divert: string | null;
};

type ControlFlowChoice = {
  type: 'control_flow_choice';
  condition: string;
  consequent: UnconditionalChoice | ControlFlowChoice | null;
  alternate: UnconditionalChoice | ControlFlowChoice | null;
};

type ComplexChoice = ControlFlowChoice | UnconditionalChoice;

type AstNode =
  | KnotNode
  | DivertNode
  | ActorLineNode
  | SimpleChoice
  | ComplexChoice;
