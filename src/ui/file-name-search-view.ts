import { ItemView, Keymap, TFile, WorkspaceLeaf } from "obsidian";
import ObsidianFilenameSearchPlugin from "../main";
import { FILE_NAME_SEARCH_ICON } from "../main";
import { searchFiles } from "../search/file-name-search";

const MAX_RESULTS = 100;

export const FILE_NAME_SEARCH_VIEW_TYPE = "file-name-search-view";

export class FileNameSearchView extends ItemView {
	private inputEl!: HTMLInputElement;
	private resultsEl!: HTMLDivElement;
	private summaryEl!: HTMLDivElement;
	private selectedIndex = 0;

	constructor(
		leaf: WorkspaceLeaf,
		private readonly plugin: ObsidianFilenameSearchPlugin,
	) {
		super(leaf);
	}

	getViewType(): string {
		return FILE_NAME_SEARCH_VIEW_TYPE;
	}

	getDisplayText(): string {
		return this.plugin.strings.viewTitle;
	}

	getIcon(): string {
		return FILE_NAME_SEARCH_ICON;
	}

	async onOpen() {
		this.render();
	}

	async onClose() {
		this.contentEl.empty();
	}

	refresh() {
		if (!this.inputEl) {
			return;
		}

		this.renderResults();
	}

	focusInput() {
		if (!this.inputEl) {
			return;
		}

		window.setTimeout(() => {
			this.inputEl.focus();
			this.inputEl.select();
		}, 0);
	}

	private render() {
		const { contentEl } = this;

		contentEl.empty();
		contentEl.addClass("ofs-view");

		contentEl.createEl("h2", { text: this.plugin.strings.searchHeading });
		contentEl.createDiv({
			text: this.plugin.strings.searchDescription,
			cls: "ofs-description",
		});

		this.inputEl = contentEl.createEl("input", {
			type: "text",
			placeholder: this.plugin.strings.searchPlaceholder,
			cls: "ofs-input",
		});

		this.summaryEl = contentEl.createDiv({ cls: "ofs-summary" });
		this.resultsEl = contentEl.createDiv({ cls: "ofs-results" });

		this.inputEl.addEventListener("input", () => {
			this.selectedIndex = 0;
			this.renderResults();
		});

		this.inputEl.addEventListener("keydown", (event) => {
			if (event.key === "ArrowDown") {
				event.preventDefault();
				this.moveSelection(1);
				return;
			}

			if (event.key === "ArrowUp") {
				event.preventDefault();
				this.moveSelection(-1);
				return;
			}

			if (event.key === "Enter") {
				event.preventDefault();
				const selectedFile = this.getVisibleResults()[this.selectedIndex];
				if (selectedFile) {
					void this.openFile(selectedFile, event);
				}
			}
		});

		this.addAction("cross", this.plugin.strings.clearSearch, () => {
			this.inputEl.value = "";
			this.selectedIndex = 0;
			this.renderResults();
			this.inputEl.focus();
		});

		this.focusInput();
		this.renderResults();
	}

	private renderResults() {
		const visibleResults = this.getVisibleResults();
		const allMatches = searchFiles(this.plugin.getFiles(), this.inputEl.value);

		this.resultsEl.empty();

		if (visibleResults.length === 0) {
			this.summaryEl.setText(this.plugin.strings.noMatchesTitle);
			this.resultsEl.createDiv({
				text: this.plugin.strings.noMatchesDescription,
				cls: "ofs-empty",
			});
			return;
		}

		this.selectedIndex = Math.min(this.selectedIndex, visibleResults.length - 1);
		this.summaryEl.setText(
			allMatches.length > MAX_RESULTS
				? this.plugin.strings.resultsShowing(visibleResults.length, allMatches.length)
				: this.plugin.strings.resultsCount(visibleResults.length),
		);

		visibleResults.forEach((file, index) => {
			const row = this.resultsEl.createDiv({
				cls: `ofs-result-item${index === this.selectedIndex ? " is-selected" : ""}`,
				title: this.plugin.strings.resultTooltip,
			});

			const main = row.createDiv({ cls: "ofs-result-main" });

			main.createDiv({
				text: file.basename,
				cls: "ofs-result-name",
			});

			if (this.plugin.settings.showPath) {
				main.createDiv({
					text: file.path,
					cls: "ofs-result-path",
				});
			}

			if (this.plugin.settings.showModifiedDate) {
				const meta = row.createDiv({ cls: "ofs-result-meta" });
				meta.setText(this.plugin.strings.modifiedLabel(formatDate(file.stat.mtime)));
			}

			row.addEventListener("mouseenter", () => {
				this.setSelectedIndex(index);
			});

			row.addEventListener("mousedown", (event) => {
				event.preventDefault();
				this.setSelectedIndex(index);
				void this.openFile(file, event);
			});
		});
	}

	private getVisibleResults(): TFile[] {
		return searchFiles(this.plugin.getFiles(), this.inputEl?.value ?? "")
			.slice(0, MAX_RESULTS)
			.map((result) => result.file);
	}

	private moveSelection(offset: number) {
		const visibleResults = this.getVisibleResults();
		if (visibleResults.length === 0) {
			return;
		}

		const lastIndex = visibleResults.length - 1;
		this.selectedIndex = Math.min(lastIndex, Math.max(0, this.selectedIndex + offset));
		this.renderResults();
		this.scrollSelectedResultIntoView();
	}

	private setSelectedIndex(index: number) {
		if (index === this.selectedIndex) {
			return;
		}

		this.selectedIndex = index;
		this.renderResults();
	}

	private scrollSelectedResultIntoView() {
		const selectedEl = this.resultsEl.children[this.selectedIndex];
		if (selectedEl instanceof HTMLElement) {
			selectedEl.scrollIntoView({ block: "nearest" });
		}
	}

	private async openFile(file: TFile, event?: MouseEvent | KeyboardEvent) {
		const paneTarget = Keymap.isModEvent(event);
		const leaf = paneTarget
			? this.app.workspace.getLeaf(paneTarget)
			: this.app.workspace.getMostRecentLeaf() ?? this.app.workspace.getLeaf(false);

		await leaf.openFile(file);
	}
}

function formatDate(timestamp: number): string {
	return new Date(timestamp).toLocaleString();
}
