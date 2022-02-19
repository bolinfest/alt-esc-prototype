enum ParseState {
  ROOT,
}

export function parseRoomScriptSource(src: string, roomName: string): string {
  const out: string[] = [];
  const state: ParseState[] = [ParseState.ROOT];

  for (const line of src.split("\n")) {
    if (isComment(line)) {
      out.push(line + "\n");
    }

    const currentState = state.slice(-1)[0];
    switch (currentState) {
      case ParseState.ROOT: {
        break;
      }
      default:
        throw Error(`unknown parse state: ${currentState}`);
    }
  }

  return out.join("");
}

function isComment(line: string): boolean {
  return /^\s*#/.test(line);
}
