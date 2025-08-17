import Editor from "@monaco-editor/react";
import { langIdToName } from "../data/langIdToName";
import { useRef } from "react";

const CodeEditor = ({ langId, setLangId, code, SetCode, probId, handleRunSubmit, handleSubmit }) => {
  const editorRef = useRef(null);

  const handleEditorChange = (val) => {
    SetCode(val);
    if (probId) {
      localStorage.setItem(`code${probId}${langId}`, val);
    }
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    // set the language from the localstorage if available
    if (probId) {
      const savedCode = localStorage.getItem(`code${probId}${langId}`);
      if (savedCode) {
      editor.setValue(savedCode);
      }
      const savedLangId = localStorage.getItem(`langId${probId}`);
      if (savedLangId) {
        // editor.setModelLanguage(editor.getModel(), langIdToName[savedLangId] || "cpp");
        // langId = savedLangId;
        setLangId(parseInt(savedLangId));
        console.log("Monaco: Loaded saved language ID:", savedLangId);
      }
    }

    // set the correct language in the monaco editor
    const language = langIdToName[langId] || "cpp";
    monaco.editor.setModelLanguage(editor.getModel(), language);

    // Bind Ctrl/Cmd + Enter to submit
    if (handleSubmit) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        console.log("Monaco: Ctrl/Cmd + Enter pressed - Submit");
        const currentCode = editor.getValue();
        console.log("Current Code:", currentCode);
        // Update state and localStorage
        SetCode(currentCode);
        if (probId) {
          localStorage.setItem(`code${probId}${langId}`, currentCode);
        }
        // Pass the current code directly to the handler
        handleSubmit(currentCode);
      });
    }

    // Bind Ctrl/Cmd + ' to run (using backquote key which is the ` key)
    if (handleRunSubmit) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Backquote, () => {
        console.log("Monaco: Ctrl/Cmd + ` pressed - Run");
        const currentCode = editor.getValue();
        console.log("Current Code:", currentCode);
        // Update state and localStorage
        SetCode(currentCode);
        if (probId) {
          localStorage.setItem(`code${probId}${langId}`, currentCode);
        }
        // Pass the current code directly to the handler
        handleRunSubmit(currentCode);
      });

      // Also bind Ctrl/Cmd + ' (single quote) to run - using Quote key
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Quote, () => {
        console.log("Monaco: Ctrl/Cmd + ' pressed - Run");
        const currentCode = editor.getValue();
        console.log("Current Code:", currentCode);
        // Update state and localStorage
        SetCode(currentCode);
        if (probId) {
          localStorage.setItem(`code${probId}${langId}`, currentCode);
        }
        // Pass the current code directly to the handler
        handleRunSubmit(currentCode);
      });
    }
  };

  return (
    <Editor
      onMount={handleEditorDidMount}
      onChange={handleEditorChange}
      height="100%"
      width="100%"
      defaultLanguage="cpp"
      language={langIdToName[langId] || "cpp"}
      value={code}
      theme="vs-dark"
      options={{
        fontSize: 14,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        wordWrap: "on",
        lineNumbers: "on",
        contextmenu: true,
        tabSize: 2,
        autoClosingBrackets: "always",
        autoClosingQuotes: "always",
        autoIndent: "full",
        formatOnType: true,
        formatOnPaste: true,
        folding: true,
        quickSuggestions: true,
        parameterHints: true,
        scrollbar: {
          vertical: "auto",
          horizontal: "auto",
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
        },
      }}
    />
  );
};

export default CodeEditor;
