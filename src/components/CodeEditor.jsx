import Editor from "@monaco-editor/react";
import { langIdToName } from "../data/langIdToName";

const CodeEditor = ({ langId, code, SetCode }) => {
  // console.log("Code Editor Lang ID:", langId);
  // console.log(langIdtoLangName[langId]);

  const handleEditorChange = (val) => {
    SetCode(val);
  };

  return (
    <Editor
      onChange={handleEditorChange}
      height="100%"
      width="100%"
      defaultLanguage="cpp"
      language={langIdToName[langId]}
      value={code}
      theme="vs-dark"
      options={{
        fontSize: 14,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        wordWrap: "on",
        wrappingIndent: "indent",
        lineNumbers: "on",
        lineNumbersMinChars: 3,
        renderLineHighlight: "all",
        contextmenu: true,
        tabSize: 2,
        acceptSuggestionOnEnter: "on",
        suggestOnTriggerCharacters: true,
        quickSuggestions: true,
        quickSuggestionsDelay: 10,
        parameterHints: true,
        formatOnType: true,
        formatOnPaste: true,
        folding: true,
        foldingStrategy: "auto",
        foldingHighlight: true,
        autoClosingBrackets: "always",
        autoClosingQuotes: "always",
        autoIndent: "full",
        suggestSelection: "first",
        snippetSuggestions: "inline",
        renderWhitespace: "none",
        renderControlCharacters: false,
        renderIndentGuides: true,
        overviewRulerLanes: 3,
        overviewRulerBorder: true,
        scrollbar: {
          alwaysConsumeMouseWheel: false,
          vertical: "auto",
          horizontal: "auto",
          useShadows: true,
          verticalHasArrows: false,
          horizontalHasArrows: false,
          arrowSize: 11,
          handleMouseWheel: true,
          horizontalScrollbarSize: 10,
          verticalScrollbarSize: 10,
          mouseWheelScrollSensitivity: 1,
          mouseWheelZoom: false,
          scrollByPage: false,
          smoothScrolling: true,
          useShadows: true,
          horizontalHasArrows: false,
          verticalHasArrows: false,
          horizontalScrollbarSize: 10,
          verticalScrollbarSize: 10,
          horizontalSliderSize: 10,
          verticalSliderSize: 10,
        },
      }}
    />
  );
};

export default CodeEditor;
