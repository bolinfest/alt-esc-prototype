export type KnotNode = {
  type: 'knot';
  name: string;
  children: KnotChildNode[];
};

export type DivertNode = {
  type: 'divert';
  target: string;
};

export type ActorLineNode = {
  type: 'actor_line';
  actor: string;
  line: string;
};

export type SimpleChoice = {
  type: 'simple_choice';
  line: string;
  conditions: string[];
  divert: string | null;
};

export type UnconditionalChoice = {
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

export type ComplexChoice = ControlFlowChoice | UnconditionalChoice;

export type ConditionalNode = {
  type: 'conditional';
  conditions: string[];
  consequent: KnotChildNode[];
  alternate: KnotChildNode[];
};

export type MacroNode = {
  type: 'macro';
  name: string;
  args: string[];
};

export type ScriptNode = {
  type: 'script';
  code: string;
};

export type KnotChildNode =
  | DivertNode
  | ActorLineNode
  | SimpleChoice
  | ComplexChoice
  | ConditionalNode
  | MacroNode
  | ScriptNode;
