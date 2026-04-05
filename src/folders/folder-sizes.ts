import { TAbstractFile, TFile, TFolder, Vault } from "obsidian";

export interface FolderSizeNode {
	path: string;
	name: string;
	sizeBytes: number;
	fileCount: number;
	children: FolderSizeNode[];
}

export interface FolderSizeTreeResult {
	totalSizeBytes: number;
	rootNodes: FolderSizeNode[];
}

export function buildFolderSizeTree(vault: Vault): FolderSizeTreeResult {
	const root = vault.getRoot();
	const sizeByPath = new Map<string, number>();
	const fileCountByPath = new Map<string, number>();
	let totalSizeBytes = 0;

	for (const abstractFile of vault.getAllLoadedFiles()) {
		if (!(abstractFile instanceof TFolder)) {
			continue;
		}

		sizeByPath.set(abstractFile.path, 0);
		fileCountByPath.set(abstractFile.path, 0);
	}

	for (const file of vault.getFiles()) {
		totalSizeBytes += file.stat.size;
		// Bubble file statistics up the full folder chain so each node is recursive.
		addFileStatsToParents(file, sizeByPath, fileCountByPath);
	}

	return {
		totalSizeBytes,
		rootNodes: root.children
			.filter((child): child is TFolder => child instanceof TFolder)
			.map((folder) => createFolderSizeNode(folder, sizeByPath, fileCountByPath))
			.filter((node) => node.fileCount > 0)
			.sort(compareFolderNodes),
	};
}

export function formatFolderSize(sizeBytes: number): string {
	if (sizeBytes < 1024) {
		return `${sizeBytes} B`;
	}

	if (sizeBytes < 1024 * 1024) {
		return `${(sizeBytes / 1024).toFixed(sizeBytes < 10 * 1024 ? 1 : 0)} kB`;
	}

	if (sizeBytes < 1024 * 1024 * 1024) {
		return `${(sizeBytes / (1024 * 1024)).toFixed(sizeBytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
	}

	return `${(sizeBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function addFileStatsToParents(
	file: TFile,
	sizeByPath: Map<string, number>,
	fileCountByPath: Map<string, number>,
) {
	let current: TAbstractFile | null = file.parent;
	while (current instanceof TFolder) {
		sizeByPath.set(current.path, (sizeByPath.get(current.path) ?? 0) + file.stat.size);
		fileCountByPath.set(current.path, (fileCountByPath.get(current.path) ?? 0) + 1);
		current = current.parent;
	}
}

function createFolderSizeNode(
	folder: TFolder,
	sizeByPath: Map<string, number>,
	fileCountByPath: Map<string, number>,
): FolderSizeNode {
	return {
		path: folder.path,
		name: folder.name,
		sizeBytes: sizeByPath.get(folder.path) ?? 0,
		fileCount: fileCountByPath.get(folder.path) ?? 0,
		children: folder.children
			.filter((child): child is TFolder => child instanceof TFolder)
			.map((child) => createFolderSizeNode(child, sizeByPath, fileCountByPath))
			.filter((child) => child.fileCount > 0)
			.sort(compareFolderNodes),
	};
}

function compareFolderNodes(left: FolderSizeNode, right: FolderSizeNode): number {
	if (right.sizeBytes !== left.sizeBytes) {
		return right.sizeBytes - left.sizeBytes;
	}

	return left.name.localeCompare(right.name);
}
