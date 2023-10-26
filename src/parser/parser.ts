import type {LiteralishValue} from './literalish';

import {tryParseLiteralishValue} from './literalish';
import nullthrows from 'nullthrows';

type RootBlock = {
  type: 'ROOT';
};

type StateBlock = {
  type: 'STATE';
};

type ItemBlock = {
  type: 'ITEM';
  id: string;
};

type EventBlock = {
  type: 'EVENT';
  id: string;
  /* event args? */
};

type ScriptLang = 'gd' | 'esc';

type VerbBlock = {
  type: 'VERB';
  id: string;
  lang: ScriptLang;
  /* verb args? */
  indent: string;
};

type ParseState = RootBlock | StateBlock | EventBlock | VerbBlock | ItemBlock;

type Property = {id: string; value: LiteralishValue};

type Room = {
  name: string;
  properties: Property[];
  items: Item[];
};

type Item = {
  name: string;
  properties: Property[];
  verbs: Verb[];
};

type Verb = {
  name: string;
  lang: ScriptLang;
  lines: string[];
};

/**
 * This should generate multiple files because each subclass needs its own
 * .gd file and each event that cannot be expressed in ESC also needs its own
 * .gd file as a subclass of `ESCEvent`.
 */
export function parseRoomScriptSource(src: string, roomName: string): Room {
  const roomProperties: Property[] = [];
  const state: ParseState[] = [{type: 'ROOT'}];
  const items: Item[] = [];
  const room = {
    name: roomName,
    properties: roomProperties,
    items,
  };

  let currentItem: Item | null = null;
  let currentVerb: Verb | null = null;

  for (const line of src.split('\n')) {
    if (isComment(line)) {
      continue;
    }

    const currentState = state.slice(-1)[0];
    switch (currentState.type) {
      case 'ROOT': {
        const itemBlockBegin = tryParseItemBlockBegin(line);
        if (itemBlockBegin != null) {
          state.push(itemBlockBegin);
          currentItem = {
            name: itemBlockBegin.id,
            properties: [],
            verbs: [],
          };
          break;
        }

        const stateBlockBegin = tryParseStateBlockBegin(line);
        if (stateBlockBegin != null) {
          state.push(stateBlockBegin);
          break;
        }

        break;
      }
      case 'STATE': {
        if (isCloseTopLevelBlock(line)) {
          state.pop();
          break;
        }

        const prop = tryParseProperty(line);
        if (prop != null) {
          roomProperties.push(prop);
          break;
        }

        break;
      }
      case 'ITEM': {
        const item = nullthrows(currentItem);
        if (isCloseTopLevelBlock(line)) {
          state.pop();
          items.push(item);
          currentItem = null;
          break;
        }

        const prop = tryParseProperty(line);
        if (prop != null) {
          item.properties.push(prop);
          break;
        }

        const verbBlockBegin = tryParseVerbBlockBegin(line);
        if (verbBlockBegin != null) {
          state.push(verbBlockBegin);
          currentVerb = {
            name: verbBlockBegin.id,
            lang: verbBlockBegin.lang,
            lines: [],
          };
          break;
        }
        break;
      }
      case 'VERB': {
        const verb = nullthrows(currentVerb);
        if (isCloseBlock(line, currentState.indent)) {
          nullthrows(currentItem).verbs.push(verb);
          currentVerb = null;
          state.pop();
        } else {
          verb.lines.push(line.slice(currentState.indent.length));
        }

        break;
      }
      default:
        throw Error(`unknown parse state: ${currentState}`);
    }
  }

  return room;
}

function isComment(line: string): boolean {
  return /^\s*#/.test(line);
}

function tryParseStateBlockBegin(line: string): StateBlock | null {
  const match = line.match(/^\s*state\s+\{\s*$/);
  if (match != null) {
    return {type: 'STATE'};
  } else {
    return null;
  }
}

function tryParseItemBlockBegin(line: string): ItemBlock | null {
  const match = line.match(/^\s*item\s+([\w-]+)\s*\{\s*$/);
  if (match != null) {
    return {type: 'ITEM', id: match[1]};
  } else {
    return null;
  }
}

function tryParseVerbBlockBegin(line: string): VerbBlock | null {
  const match = line.match(/^(\s*)([A-Z_]+)\(\)\s*(%?)\{\s*$/);
  if (match != null) {
    return {
      type: 'VERB',
      id: match[2],
      lang: match[2] === '%' ? 'esc' : 'gd',
      indent: match[1],
    };
  } else {
    return null;
  }
}

function tryParseProperty(line: string): Property | null {
  const match = line.match(/^(\s*)([\w-]+)\s*=\s*(.+)\s*$/);
  if (match == null) {
    return null;
  }

  const value = tryParseLiteralishValue(match[3]);
  return value != null
    ? {
        id: match[2],
        value,
      }
    : null;
}

function isCloseTopLevelBlock(line: string): boolean {
  return /^\}\s*$/.test(line);
}

function isCloseBlock(line: string, indent: string): boolean {
  const match = line.match(/^(\s*)\}\s*$/);
  return match != null && match[1] === indent;
}
