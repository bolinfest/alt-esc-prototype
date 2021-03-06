import {useRef, useState} from 'react';
import loader from '@monaco-editor/loader';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import './App.css';
import {ARCADE_ROOM} from './Rooms';
import {KITCHEN_SINK} from './Yacks';
import Editor from '@monaco-editor/react';
import {registerLanguagesForMonaco} from './TextMate';
import {parseRoomScriptSource} from './parser/parser';
import {parseYackFile} from './yack/parser';
import { generateGDScript } from './yack/codegen';

const useYackParser = true;

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
        const parseFn = useYackParser ? parseAndSerializeYackFile : parseRoomScriptSource;
        const gdscript = parseFn(model.getValue(), 'Arcade.room');
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
          defaultValue={useYackParser ? KITCHEN_SINK : ARCADE_ROOM}
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
