import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

function workshopTheme(dark: boolean) {
  const c = dark
    ? {
        background: "#211e1a",
        text: "#ede5d8",
        muted: "#a79a87",
        border: "#443c31",
        active: "#2b261f",
        selection: "#695033",
        amber: "#f0bb70",
        popup: "#2c2720",
        keyword: "#e2b0bd",
        string: "#b4cc95",
        number: "#e8c18b",
        type: "#96c8c4",
        fn: "#edcc8f",
        error: "#ff9b8f",
      }
    : {
        background: "#faf7f0",
        text: "#342d24",
        muted: "#786b59",
        border: "#d9cebc",
        active: "#f0e9dc",
        selection: "#e8d1aa",
        amber: "#86520c",
        popup: "#fffcf6",
        keyword: "#8c4161",
        string: "#48652d",
        number: "#87520d",
        type: "#256b70",
        fn: "#795014",
        error: "#b72e25",
      };
  return [
    EditorView.theme(
      {
        "&": {
          height: "100%",
          fontSize: "13px",
          color: c.text,
          backgroundColor: c.background,
        },
        "&.cm-focused": { outline: "none" },
        ".cm-scroller": {
          overflow: "auto",
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          lineHeight: "1.7",
        },
        ".cm-content": { padding: "12px 0 5rem", caretColor: c.amber },
        ".cm-line": { padding: "0 16px 0 10px" },
        ".cm-gutters": {
          backgroundColor: c.background,
          color: c.muted,
          borderRight: `1px solid ${c.border}`,
        },
        ".cm-gutterElement": { paddingLeft: "10px" },
        ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: c.active },
        ".cm-cursor, .cm-dropCursor": { borderLeftColor: c.amber },
        "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
          { backgroundColor: c.selection },
        ".cm-selectionMatch": {
          backgroundColor: c.active,
          outline: `1px solid ${c.border}`,
        },
        "&.cm-focused .cm-matchingBracket": {
          backgroundColor: c.selection,
          color: c.amber,
          outline: `1px solid ${c.amber}`,
        },
        ".cm-foldPlaceholder": {
          backgroundColor: c.active,
          color: c.muted,
          border: `1px solid ${c.border}`,
          borderRadius: "4px",
        },
        ".cm-tooltip": {
          backgroundColor: c.popup,
          color: c.text,
          border: `1px solid ${c.border}`,
          borderRadius: "8px",
          boxShadow: "0 8px 24px #0003",
          maxWidth: "min(360px, calc(100vw - 24px))",
          overflowWrap: "anywhere",
        },
        ".cm-tooltip-autocomplete > ul": {
          fontFamily: "inherit",
          maxWidth: "min(420px, calc(100vw - 24px))",
        },
        ".cm-tooltip-autocomplete > ul > li": { padding: "5px 9px" },
        ".cm-tooltip-autocomplete > ul > li[aria-selected]": {
          backgroundColor: c.selection,
          color: c.text,
        },
        ".cm-completionDetail": {
          color: c.muted,
          fontSize: "11px",
          marginLeft: "10px",
        },
        ".cm-completionMatchedText": {
          color: c.amber,
          textDecoration: "none",
          fontWeight: "600",
        },
        ".cm-completionInfo, .cm-effect-doc": {
          fontFamily: "Outfit, sans-serif",
          padding: "10px 12px",
          fontSize: "13px",
          lineHeight: "1.5",
        },
        ".cm-effect-doc code": {
          fontFamily: "ui-monospace, monospace",
          color: c.amber,
          fontSize: "12px",
          whiteSpace: "pre-wrap",
        },
        ".cm-effect-doc p": { margin: "6px 0 0" },
        ".cm-diagnostic": {
          fontFamily: "Outfit, sans-serif",
          padding: "8px 12px",
        },
        ".cm-diagnostic-error": { borderLeftColor: c.error },
        ".cm-diagnostic-warning": { borderLeftColor: c.amber },
        ".cm-panels": { backgroundColor: c.popup, color: c.text },
        ".cm-searchMatch": { backgroundColor: c.selection },
        ".cm-searchMatch.cm-searchMatch-selected": {
          outline: `1px solid ${c.amber}`,
        },
      },
      { dark },
    ),
    syntaxHighlighting(
      HighlightStyle.define([
        { tag: tags.comment, color: c.muted, fontStyle: "italic" },
        { tag: [tags.keyword, tags.operatorKeyword], color: c.keyword },
        { tag: [tags.string, tags.character], color: c.string },
        { tag: [tags.number, tags.bool, tags.null], color: c.number },
        { tag: [tags.typeName, tags.className], color: c.type },
        { tag: tags.function(tags.variableName), color: c.fn },
        { tag: [tags.variableName, tags.propertyName], color: c.text },
        { tag: [tags.operator, tags.punctuation], color: c.muted },
        { tag: tags.invalid, color: c.error },
      ]),
    ),
  ];
}

export const workshopEditorThemes = {
  dark: workshopTheme(true),
  light: workshopTheme(false),
};
