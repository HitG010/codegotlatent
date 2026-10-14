import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { HighlightStyle, indentUnit, syntaxHighlighting } from "@codemirror/language";
import { Compartment, EditorState, Prec } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import type { Language } from "@cgl/shared";
import { tags as t } from "@lezer/highlight";
import { basicSetup } from "codemirror";
import { useEffect, useRef } from "react";

const LANGUAGE_SUPPORT: Record<Language, () => ReturnType<typeof cpp>> = { cpp, python, javascript, java };

// Colours come from the design tokens, so the editor follows the theme
const theme = EditorView.theme({
  "&": { height: "100%", fontSize: "13.5px", color: "var(--fg)", backgroundColor: "var(--bg)" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": { fontFamily: "var(--face-mono)", lineHeight: "21px" },
  ".cm-content": { caretColor: "var(--signal)", padding: "12px 0" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--signal)", borderLeftWidth: "2px" },
  ".cm-gutters": { backgroundColor: "var(--bg)", color: "var(--fg-faint)", border: "none" },
  ".cm-lineNumbers .cm-gutterElement": { padding: "0 12px 0 16px", fontSize: "12px" },
  ".cm-activeLine": { backgroundColor: "color-mix(in oklab, var(--hover) 70%, transparent)" },
  ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--fg-muted)" },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, ::selection":
    { backgroundColor: "var(--signal-wash) !important" },
  ".cm-matchingBracket": { backgroundColor: "transparent", outline: "1px solid var(--line-strong)" },
  ".cm-foldGutter .cm-gutterElement": { color: "var(--fg-faint)" },
  ".cm-tooltip": { backgroundColor: "var(--raised)", border: "1px solid var(--line-strong)", borderRadius: "var(--r-1)" },
  ".cm-tooltip-autocomplete > ul > li[aria-selected]": { backgroundColor: "var(--hover)", color: "var(--fg)" },
  ".cm-panels": { backgroundColor: "var(--raised)", color: "var(--fg)" },
  ".cm-searchMatch": { backgroundColor: "var(--signal-wash)" },
});

const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.modifier, t.controlKeyword, t.operatorKeyword], color: "var(--syn-keyword)" },
  { tag: [t.processingInstruction, t.meta], color: "var(--syn-keyword)" },
  { tag: [t.string, t.special(t.string), t.character], color: "var(--syn-string)" },
  { tag: [t.number, t.bool, t.null, t.atom], color: "var(--syn-number)" },
  { tag: [t.typeName, t.className, t.namespace, t.standard(t.typeName)], color: "var(--syn-type)" },
  { tag: [t.comment, t.lineComment, t.blockComment], color: "var(--syn-comment)", fontStyle: "italic" },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "var(--fg)", fontWeight: "600" },
  { tag: [t.operator, t.punctuation, t.bracket], color: "var(--fg-muted)" },
]);

interface CodeEditorProps {
  language: Language;
  /** The editor's starting text; change `documentKey` to load different text. */
  initialCode: string;
  documentKey: string;
  onChange: (code: string) => void;
  onRun: () => void;
  onSubmit: () => void;
}

export function CodeEditor({ language, initialCode, documentKey, onChange, onRun, onSubmit }: CodeEditorProps) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const languageSlot = useRef(new Compartment());
  // Latest callbacks, read by keybindings without rebuilding the editor
  const handlers = useRef({ onChange, onRun, onSubmit });
  handlers.current = { onChange, onRun, onSubmit };

  useEffect(() => {
    const editor = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: initialCode,
        extensions: [
          Prec.highest(
            keymap.of([
              { key: "Mod-Enter", run: () => (handlers.current.onSubmit(), true) },
              { key: "Mod-'", run: () => (handlers.current.onRun(), true) },
            ]),
          ),
          basicSetup,
          indentUnit.of("    "),
          languageSlot.current.of(LANGUAGE_SUPPORT[language]()),
          theme,
          syntaxHighlighting(highlight),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) handlers.current.onChange(update.state.doc.toString());
          }),
          EditorView.contentAttributes.of({ "aria-label": "Code editor" }),
        ],
      }),
    });
    view.current = editor;
    // Line heights change when the web fonts arrive; re-measure so the gutter stays aligned
    void document.fonts?.ready.then(() => editor.requestMeasure());
    return () => editor.destroy();
    // A new document key means a fresh editor; language changes reconfigure below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentKey]);

  useEffect(() => {
    view.current?.dispatch({ effects: languageSlot.current.reconfigure(LANGUAGE_SUPPORT[language]()) });
  }, [language]);

  return <div ref={host} className="h-full min-h-0 overflow-hidden" />;
}
