type RootBlock = {
  type: 'ROOT';
};

type StateBlock = {
  type: 'STATE';
};

type ObjectBlock = {
  type: 'OBJECT';
  id: string;
};

type EventBlock = {
  type: 'EVENT';
  id: string;
  /* event args? */
};

type VerbBlock = {
  type: 'VERB';
  id: string;
  /* verb args? */
  indent: string;
};

type ParseState = RootBlock | StateBlock | EventBlock | VerbBlock | ObjectBlock;

const includeComments = false;

export function parseRoomScriptSource(src: string, roomName: string): string {
  const out: string[] = [];
  const state: ParseState[] = [{type: 'ROOT'}];

  for (const line of src.split('\n')) {
    if (isComment(line)) {
      if (includeComments) {
        out.push(line + '\n');
      }
      continue;
    }

    const currentState = state.slice(-1)[0];
    switch (currentState.type) {
      case 'ROOT': {
        const objectBlockBegin = tryParseObjectBlockBegin(line);
        if (objectBlockBegin != null) {
          state.push(objectBlockBegin);
          out.push(`\nclass ESCObject(${objectBlockBegin.id}):\n`);
          break;
        }

        const stateBlockBegin = tryParseStateBlockBegin(line);
        if (stateBlockBegin != null) {
          state.push(stateBlockBegin);
          out.push(`# <state variables here>\n`);
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
          out.push(`var ${prop.id} = ${prop.value}\n`);
          break;
        }

        break;
      }
      case 'OBJECT': {
        if (isCloseTopLevelBlock(line)) {
          state.pop();
          break;
        }

        const prop = tryParseProperty(line);
        if (prop != null) {
          out.push(`  ${prop.id} = ${prop.value}\n`);
          break;
        }

        const verbBlockBegin = tryParseVerbBlockBegin(line);
        if (verbBlockBegin != null) {
          state.push(verbBlockBegin);
          out.push(`  func ${verbBlockBegin.id}():\n`);
          break;
        }
        break;
      }
      case 'VERB': {
        if (isCloseBlock(line, currentState.indent)) {
          state.pop();
        }

        break;
      }
      default:
        throw Error(`unknown parse state: ${currentState}`);
    }
  }

  return out.join('');
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

function tryParseObjectBlockBegin(line: string): ObjectBlock | null {
  const match = line.match(/^\s*object\s+([\w-]+)\s*\{\s*$/);
  if (match != null) {
    return {type: 'OBJECT', id: match[1]};
  } else {
    return null;
  }
}

function tryParseVerbBlockBegin(line: string): VerbBlock | null {
  const match = line.match(/^(\s*)([A-Z_]+)\(\)\s*\{\s*$/);
  if (match != null) {
    return {type: 'VERB', id: match[2], indent: match[1]};
  } else {
    return null;
  }
}

function tryParseProperty(line: string): {id: string; value: string} | null {
  const match = line.match(/^(\s*)([\w-]+)\s*=(.+)$/);
  if (match != null) {
    let value = null;
    try {
      value = JSON.parse(match[3]);
    } catch (e) {
      return null;
    }

    return {
      id: match[2],
      value: JSON.stringify(value),
    };
  }

  return null;
}

function isCloseTopLevelBlock(line: string): boolean {
  return /^\}\s*$/.test(line);
}

function isCloseBlock(line: string, indent: string): boolean {
  const match = line.match(/^(\s*)\}\s*$/);
  return match != null && match[1] === indent;
}
