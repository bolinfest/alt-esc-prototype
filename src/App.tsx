import React, { useRef } from 'react';
import './App.css';

import {ARCADE_ROOM} from './Rooms';
import Editor from "@monaco-editor/react";

function App() {
  const editorRef = useRef(null);

  function handleSourceEditorDidMount(editor: any, monaco: any) {
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
