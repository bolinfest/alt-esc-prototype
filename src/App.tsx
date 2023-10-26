import {useRef, useState} from 'react';
import loader from '@monaco-editor/loader';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import './App.css';
import {ARCADE_ROOM} from './Rooms';
import {KITCHEN_SINK} from './Yacks';
import Editor from '@monaco-editor/react';
import {registerLanguagesForMonaco} from './TextMate';
import {parseRoomScriptSource} from './parser/parser';
import {renderLiteralishValue} from './parser/literalish';
import {parseYackFile} from './yack/parser';
import {generateGDScript} from './yack/codegen';
import {generateFilesForRoom} from './parser/codegen';

const parseInputAsYackFile = false;

type Monaco = typeof monaco;

// Must load monaco-editor-core instead of monaco-editor because
// monaco-editor comes with its own set of languages that interfere
// with the versions we want to load that are configured with TextMate grammars.
loader.config({
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor-core@0.30.1/min/vs',
  },
});

// It would be cleaner to use Recoil for state management rather than this
// hacky stuff with useState() and useRef(), but for the purposes of this
// demo, it doesn't matter.

export default function App() {
  const [monacoLibrary, setMonacoLibrary] = useState<Monaco | null>(null);
  if (monacoLibrary != null) {
    return <RealApp />;
  } else {
    loader.init().then(monaco => {
      registerLanguagesForMonaco(monaco).then(() => setMonacoLibrary(monaco));
    });
    return <div>Loading monaco...</div>;
  }
}

function RealApp() {
  const sourceEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(
    null,
  );
  const outputEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(
    null,
  );

  function handleSourceEditorDidMount(
    editor: monaco.editor.IStandaloneCodeEditor,
    monaco: Monaco,
  ) {
    editor.updateOptions({
      minimap: {
        enabled: false,
      },
    });
    sourceEditorRef.current = editor;
  }

  function handleOutputEditorDidMount(
    editor: monaco.editor.IStandaloneCodeEditor,
    monaco: Monaco,
  ) {
    editor.updateOptions({
      minimap: {
        enabled: false,
      },
    });
    outputEditorRef.current = editor;

    const model = sourceEditorRef.current?.getModel();
    if (model != null) {
      const onDidChangeContent = () => {
        const userCode = model.getValue();
        let gdscript;
        if (parseInputAsYackFile) {
          gdscript = parseAndSerializeYackFile(userCode, 'Kitchen.yack');
        } else {
          const room = parseRoomScriptSource(userCode, 'Arcade');
          const out: string[] = [];

          out.push('# This will generate one .gd file for the room');
          out.push('# and one .gd file per item.');
          out.push('# The expectation is that all of these .gd files will');
          out.push('# go in the same folder as the .tscn for the room.');
          out.push('');

          const files = generateFilesForRoom(room, {
            omitTranslationWrapper: false,
          });
          for (const [filename, gdscript] of files.entries()) {
            out.push(`# File: ${filename}`);
            out.push(gdscript);
          }

          gdscript = out.join('\n');
        }
        editor.getModel()?.setValue(gdscript);
      };
      model.onDidChangeContent(onDidChangeContent);

      // Invoke explicitly on initial load.
      onDidChangeContent();
    } else {
      throw Error('invariant failed: model not set');
    }
  }

  return (
    <div className="App">
      <header className="App-header">
        <Editor
          height="90vh"
          width="50%"
          theme="vs-dark"
          defaultLanguage="python"
          defaultValue={parseInputAsYackFile ? KITCHEN_SINK : ARCADE_ROOM}
          onMount={handleSourceEditorDidMount}
        />
        <Editor
          height="90vh"
          width="50%"
          theme="vs-dark"
          defaultLanguage="gdscript"
          defaultValue="# output appears here"
          onMount={handleOutputEditorDidMount}
        />
      </header>
    </div>
  );
}

function parseAndSerializeYackFile(src: string, filename: string): string {
  const ast = parseYackFile(src, filename);
  return generateGDScript(ast);
}
