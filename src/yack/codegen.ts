import type {
  ActorLineNode,
  ComplexChoice,
  ConditionalNode,
  DivertNode,
  KnotChildNode,
  KnotNode,
  MacroNode,
  ScriptNode,
  SimpleChoice,
} from './ast';

/** GDScript uses 4-space indents. */
const INDENT = 4;

type DisplayContext = {
  /**
   * Buffer where GDScript is collected.
   * Will ultimately be concatenated to produce the generated code.
   */
  code: string[];

  /** Number of spaces to indent. */
  indent: number;

  nextVar: number;
};

type Dialog = {
  type: 'dialog';
  choices: (SimpleChoice | ComplexChoice)[];
};

export function generateGDScript(ast: KnotNode[]): string {
  const ctx = {
    code: [],
    indent: 0,
    nextVar: 0,
  };

  generateStateController(ast, ctx);

  ast.forEach((knot, index) =>
    generateKnot(knot, ast[index + 1]?.name ?? null, ctx),
  );

  return ctx.code.join('');
}

function generateKnot(
  knot: KnotNode,
  nextKnotName: string | null,
  ctx: DisplayContext,
) {
  // Knot function should potentially do some work and then return
  // the name of the next state to go to. Body of func may yield?
  const {name} = knot;
  addLine(`func ${functionNameForKnotName(name)}() -> String:`, ctx);
  indent(ctx);

  const normalizedChildren = generateBlock(knot.children, ctx);

  // Ensure there is a final return clause, if necessary.
  if (!endsWithDivert(normalizedChildren)) {
    addLine(
      `return ${nextKnotName != null ? quote(nextKnotName) : 'null'}`,
      ctx,
    );
  }

  unindent(ctx);
  addBlankLine(ctx, 2);
}

function generateBlock(
  knotChildNodes: KnotChildNode[],
  ctx: DisplayContext,
): KnotChild[] {
  // Sequence of "Choice" children must be grouped into dialogs.
  const normalizedChildren = normalizeKnotChildren(knotChildNodes);
  if (normalizedChildren.length === 0) {
    addLine('pass', ctx);
    return normalizedChildren;
  }

  for (const child of normalizedChildren) {
    switch (child.type) {
      case 'dialog': {
        generateDialog(child, ctx);
        break;
      }
      case 'actor_line': {
        const {actor, line} = child;
        addLine(`sayLine(${actor}, ${quote(line)})`, ctx);
        break;
      }
      case 'divert': {
        generateDivert(child, ctx);
        break;
      }
      case 'conditional': {
        generateConditional(child, ctx);
        break;
      }
      case 'macro': {
        generateMacro(child, ctx);
        break;
      }
      case 'script': {
        generateInlineScript(child, ctx);
        break;
      }
      // TODO: prove this is unreachable with the type checker?
      default: {
        throw new Error(`unexpected node type in block: ${child}`);
      }
    }
  }
  return normalizedChildren;
}

function generateStateController(knots: KnotNode[], ctx: DisplayContext) {
  const knotNames = knots.map(knot => knot.name);
  addLine('func main(init_state):', ctx);
  indent(ctx);

  addLine(`var state = init_state`, ctx);
  addLine('while state != null:', ctx);
  indent(ctx);

  addLine('match state:', ctx);
  indent(ctx);

  for (const name of knotNames) {
    addLine(`${quote(name)}:`, ctx);
    indent(ctx);
    addLine(`state = yield ${functionNameForKnotName(name)}()`, ctx);
    unindent(ctx);
  }

  unindent(ctx);
  unindent(ctx);
  unindent(ctx);

  addBlankLine(ctx, 2);
}

type KnotChild =
  | ActorLineNode
  | ConditionalNode
  | Dialog
  | DivertNode
  | MacroNode
  | ScriptNode;

function normalizeKnotChildren(knotChildNodes: KnotChildNode[]): KnotChild[] {
  const out = [];
  let dialog: Dialog | null = null;
  for (const child of knotChildNodes) {
    const {type} = child;
    if (
      type === 'simple_choice' ||
      type === 'unconditional_choice' ||
      type === 'control_flow_choice'
    ) {
      if (dialog === null) {
        dialog = {type: 'dialog', choices: []};
        out.push(dialog);
      }
      dialog.choices.push(child);
    } else {
      dialog = null;
      out.push(child);
    }
  }
  return out;
}

// Dialog must produce a list of choices.
function generateDialog(dialog: Dialog, ctx: DisplayContext) {
  const selectedChoice = nextVar(ctx);
  addLine(`var ${selectedChoice} = yield menu([`, ctx);
  indent(ctx);

  for (const choice of dialog.choices) {
    switch (choice.type) {
      case 'unconditional_choice': {
        const {type, line, divert} = choice;
        addJSONArg({type, line, divert}, ctx);
        break;
      }
      case 'simple_choice': {
        const {type, line, conditions, divert} = choice;
        addJSONArg({type, line, conditions, divert}, ctx);
        break;
      }
      case 'control_flow_choice': {
        const {type, conditions, consequent, alternate} = choice;
        addJSONArg({type, conditions, consequent, alternate}, ctx);
        break;
      }
    }
  }

  unindent(ctx);
  addLine('])', ctx);
  addLine(`if ${selectedChoice} != null:`, ctx);

  indent(ctx);
  addLine(`return ${selectedChoice}`, ctx);
  unindent(ctx);
}

function generateConditional(node: ConditionalNode, ctx: DisplayContext) {
  const {conditions: rawConditions, consequent, alternate} = node;
  // TODO: Some processing will have to be applied to conditionals at some point...
  const conditions = rawConditions
    .map(cond => `eval_cond(${JSON.stringify(cond)})`)
    .join(' && ');
  addLine(`if ${conditions}:`, ctx);
  indent(ctx);
  generateBlock(consequent, ctx);
  unindent(ctx);

  if (alternate.length > 0) {
    addLine('else:', ctx);
    indent(ctx);
    generateBlock(alternate, ctx);
    unindent(ctx);
  }
}

function generateMacro(node: MacroNode, ctx: DisplayContext) {
  const {name, args} = node;
  addLine(`call_macro(${quote(name)}, [${args.map(quote).join(',')}])`, ctx);
}

function generateInlineScript(node: ScriptNode, ctx: DisplayContext) {
  const {code} = node;
  addLine(code, ctx);
}

function functionNameForKnotName(name: string): string {
  return `__knot__${name}`;
}

function generateDivert({target}: DivertNode, ctx: DisplayContext) {
  // Returns the name of the next state to go to.
  addLine(`return ${quote(target)}`, ctx);
}

function nextVar(context: DisplayContext): string {
  const id = context.nextVar++;
  return `__genvar_${id}`;
}

function indent(context: DisplayContext) {
  context.indent += INDENT;
}

function unindent(context: DisplayContext) {
  context.indent -= INDENT;
}

function quote(str: string): string {
  return JSON.stringify(str);
}

function addBlankLine(ctx: DisplayContext, repeat: number = 1) {
  ctx.code.push('\n'.repeat(repeat));
}

function addLine(line: string, ctx: DisplayContext) {
  ctx.code.push(' '.repeat(ctx.indent) + line + '\n');
}

function addJSONArg(value: any, ctx: DisplayContext) {
  const arg = JSON.stringify(value, null, INDENT);
  const lines = arg.split('\n');
  if (lines.length > 0) {
    lines[lines.length - 1] += ',';
  }
  lines.forEach(line => addLine(line, ctx));
}

function endsWithDivert(knotChildren: KnotChild[]): boolean {
  if (knotChildren.length > 0) {
    const lastChild = knotChildren[knotChildren.length - 1];
    if (lastChild.type === 'divert') {
      return true;
    }
  }

  return false;
}
