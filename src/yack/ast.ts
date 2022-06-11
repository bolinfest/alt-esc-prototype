export type KnotNode = {
  type: 'knot';
  name: string;
  children: KnotChildNode[];
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

type KnotChildNode = DivertNode | ActorLineNode | SimpleChoice | ComplexChoice;
