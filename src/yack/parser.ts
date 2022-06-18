import type {
  ComplexChoice,
  ConditionalNode,
  KnotChildNode,
  KnotNode,
  SimpleChoice,
  UnconditionalChoice,
} from './ast';
import type {ChoiceToken, Token} from './tokenizer';

import {tokenize} from './tokenizer';

type ConditionalBlock = {
  state: 'consequent' | 'alternate' | 'closed';
  node: ConditionalNode;
};

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
  private scopes: ConditionalBlock[] = [];

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

  private addChild(child: KnotChildNode) {
    if (this.scopes.length > 0) {
      const topScope = this.scopes[this.scopes.length - 1];
      switch (topScope.state) {
        case 'consequent':
          topScope.node.consequent.push(child);
          break;
        case 'alternate':
          topScope.node.alternate.push(child);
          break;
        case 'closed':
          throw new Error(
            `cannot add child ${JSON.stringify(child)} to closed block`,
          );
      }
    } else {
      this.currentKnot().children.push(child);
    }
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
          this.addChild({
            type: 'divert',
            target: this.currentToken.target,
          });
          break;
        }
        case 'actor_line': {
          const nextToken = this.peek();
          if (nextToken?.type === 'string') {
            this.addChild({
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
            this.addChild(choiceExpr);
          }
          break;
        }
        case 'control_flow': {
          switch (this.currentToken.keyword) {
            case 'if': {
              const conditions = this.parseConditions();
              const scope: ConditionalBlock = {
                state: 'consequent',
                node: {
                  type: 'conditional',
                  conditions,
                  consequent: [],
                  alternate: [],
                },
              };
              this.scopes.push(scope);
              // Then need to push context onto stack until else of endif reached?
              break;
            }
            case 'elif': {
              const topScope = this.scopes[this.scopes.length - 1];
              if (topScope == null) {
                this.throwParseError(
                  'no if continued by elif',
                  this.currentToken,
                );
              }

              const conditions = this.parseConditions();
              const scope: ConditionalBlock = {
                state: 'consequent',
                node: {
                  type: 'conditional',
                  conditions,
                  consequent: [],
                  alternate: [],
                },
              };
              topScope.state = 'alternate';
              this.addChild(scope.node);
              topScope.state = 'closed';
              this.scopes.push(scope);
              break;
            }
            case 'endif': {
              const topScope = this.scopes[this.scopes.length - 1];
              if (topScope == null) {
                this.throwParseError(
                  'no open block closed by endif',
                  this.currentToken,
                );
              }
              topScope.state = 'closed';

              // This endif could be closing a chain of elifs, so walk up the
              // scope stack, popping off nodes in the 'closed' state. If the
              // stack is cleared, then the ConditionalNode can be added to the
              // KnotChildNode.
              while (true) {
                const scope = this.scopes[this.scopes.length - 1];
                if (scope?.state === 'closed') {
                  this.scopes.pop();
                  if (this.scopes.length === 0) {
                    this.addChild(scope.node);
                  }
                } else {
                  break;
                }
              }
              break;
            }
            default: {
              this.throwParseError(
                `unexpected keyword \`${this.currentToken.keyword}\` at the top level`,
                this.currentToken,
              );
            }
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
        const conditions = this.parseConditions();

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

  /**
   * `this.currentToken` is a token before the conditions. Note this will return
   * the empty list if the next token is not a `ConditionToken`.
   */
  private parseConditions(): string[] {
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
    return conditions;
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
