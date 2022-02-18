import { useRef } from 'react';
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import './App.css';
import {ARCADE_ROOM} from './Rooms';
import Editor from "@monaco-editor/react";
import { registerLanguages } from './TextMate';

type Monaco = typeof monaco;

function App() {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  function handleSourceEditorDidMount(editor: monaco.editor.IStandaloneCodeEditor, monaco: Monaco) {
    registerLanguages(monaco);
    editor.updateOptions({
      minimap: {
        enabled: false
      }
    });
    editorRef.current = editor;
  }

  return (
    <div className="App">
      <header className="App-header">
        <Editor
          height="90vh"
          width="50%"
          theme="vs-dark"
          defaultLanguage="javascript"
          defaultValue={ARCADE_ROOM}
          onMount={handleSourceEditorDidMount}
        />
        <Editor
          height="90vh"
          width="50%"
          theme="vs-dark"
          defaultLanguage="python"
          defaultValue="# output appears here"
        />
      </header>
    </div>
  );
}

export default App;
