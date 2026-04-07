import { Editor, EditorPosition, Notice } from "obsidian";
import ObsidianFilenameSearchPlugin from "../main";

export type CalloutDefinition = {
	id: string;
	label: string;
	description: string;
	icon?: string;
	accent?: string;
	source?: "built-in" | "callout-manager";
};

export const CALLOUT_TOOLBAR_ICON = "panel-top";

export const CALLOUT_DEFINITIONS: CalloutDefinition[] = [
	{ id: "note", label: "Note", description: "General note with neutral emphasis.", source: "built-in" },
	{ id: "abstract", label: "Abstract", description: "Summary or overview content.", source: "built-in" },
	{ id: "info", label: "Info", description: "Informational callout for context.", source: "built-in" },
	{ id: "todo", label: "Todo", description: "Open tasks or follow-up work.", source: "built-in" },
	{ id: "tip", label: "Tip", description: "Helpful suggestion or best practice.", source: "built-in" },
	{ id: "success", label: "Success", description: "Positive outcome or completed step.", source: "built-in" },
	{ id: "question", label: "Question", description: "Question, prompt, or decision point.", source: "built-in" },
	{ id: "warning", label: "Warning", description: "Important caveat or risk.", source: "built-in" },
	{ id: "failure", label: "Failure", description: "Problem, error, or negative outcome.", source: "built-in" },
	{ id: "danger", label: "Danger", description: "High-risk or destructive warning.", source: "built-in" },
	{ id: "bug", label: "Bug", description: "Bug, defect, or issue tracking note.", source: "built-in" },
	{ id: "example", label: "Example", description: "Worked example or sample block.", source: "built-in" },
	{ id: "quote", label: "Quote", description: "Quoted source or highlighted citation.", source: "built-in" },
];

type SelectionRange = {
	from: EditorPosition;
	to: EditorPosition;
	text: string;
};

export function insertCalloutForSelection(
	plugin: ObsidianFilenameSearchPlugin,
	editor: Editor | undefined,
	calloutId: string,
	title: string,
): boolean {
	const markdownView = plugin.getPreferredMarkdownView();
	const filePath = markdownView?.file?.path;
	const activeEditor = editor ?? markdownView?.editor;
	if (!activeEditor || !filePath) {
		new Notice(plugin.strings.calloutNoActiveMarkdown);
		return false;
	}

	const selection = getSelectionRange(plugin, activeEditor, filePath);
	if (!selection || !selection.text.trim()) {
		new Notice(plugin.strings.calloutNoSelection);
		return false;
	}

	activeEditor.replaceRange(
		buildCalloutBlock(calloutId, selection.text, title),
		selection.from,
		selection.to,
	);
	new Notice(plugin.strings.calloutInserted(calloutId));
	return true;
}

export function buildCalloutBlock(calloutId: string, text: string, title: string): string {
	const normalizedLines = text.replace(/\r\n/g, "\n").split("\n");
	const heading = title.trim().length > 0 ? `> [!${calloutId}] ${title.trim()}` : `> [!${calloutId}]`;
	const body = normalizedLines.map((line) => line.length > 0 ? `> ${line}` : ">").join("\n");
	return `${heading}\n${body}`;
}

function getSelectionRange(
	plugin: ObsidianFilenameSearchPlugin,
	editor: Editor,
	filePath: string,
): SelectionRange | null {
	if (editor.somethingSelected()) {
		const from = editor.getCursor("from");
		const to = editor.getCursor("to");
		return {
			from,
			to,
			text: editor.getRange(from, to),
		};
	}

	const rememberedSelection = plugin.getRememberedMarkdownSelection(filePath);
	if (!rememberedSelection) {
		return null;
	}

	const from = {
		line: rememberedSelection.startLine,
		ch: rememberedSelection.startCh,
	};
	const to = {
		line: rememberedSelection.endLine,
		ch: rememberedSelection.endCh,
	};
	return {
		from,
		to,
		text: editor.getRange(from, to),
	};
}
