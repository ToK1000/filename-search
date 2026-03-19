export interface I18nStrings {
	commandOpenSearch: string;
	viewTitle: string;
	searchHeading: string;
	searchDescription: string;
	searchPlaceholder: string;
	clearSearch: string;
	resultTooltip: string;
	noMatchesTitle: string;
	noMatchesDescription: string;
	resultsCount: (count: number) => string;
	resultsShowing: (shown: number, total: number) => string;
	modifiedLabel: (value: string) => string;
	settingsHeading: string;
	settingsShowPath: string;
	settingsShowPathDesc: string;
	settingsShowModifiedDate: string;
	settingsShowModifiedDateDesc: string;
	settingsExcludedFolders: string;
	settingsExcludedFoldersDesc: string;
	settingsAddFolder: string;
	settingsNoFolders: string;
	settingsExcludedFolderDesc: string;
	settingsRemoveFolder: string;
	settingsChooseFolder: string;
}

const TRANSLATIONS: { en: I18nStrings; de: I18nStrings; es: I18nStrings; fr: I18nStrings; pt: I18nStrings } = {
	en: {
		commandOpenSearch: "Open file name search",
		viewTitle: "Filename search",
		searchHeading: "Search file names",
		searchDescription: "Searches only file names across your vault.",
		searchPlaceholder: "Type part of a file name...",
		clearSearch: "Clear search",
		resultTooltip: "Click to open, Cmd-click to open in a new tab",
		noMatchesTitle: "No matching files found.",
		noMatchesDescription: "Try a different file name or a shorter fuzzy search.",
		resultsCount: (count: number) => `${count} match${count === 1 ? "" : "es"}`,
		resultsShowing: (shown: number, total: number) => `Showing ${shown} of ${total} matches`,
		modifiedLabel: (value: string) => `Modified ${value}`,
		settingsHeading: "Filename search",
		settingsShowPath: "Show path",
		settingsShowPathDesc: "Display the file path in each search result.",
		settingsShowModifiedDate: "Show modified date",
		settingsShowModifiedDateDesc: "Display the last modified date in each search result.",
		settingsExcludedFolders: "Excluded folders",
		settingsExcludedFoldersDesc: "Files inside these vault folders will be ignored by the filename search.",
		settingsAddFolder: "Add folder",
		settingsNoFolders: "No excluded folders yet.",
		settingsExcludedFolderDesc: "Excluded from filename search",
		settingsRemoveFolder: "Remove excluded folder",
		settingsChooseFolder: "Choose a folder to exclude...",
	},
	de: {
		commandOpenSearch: "Dateinamensuche öffnen",
		viewTitle: "Dateinamensuche",
		searchHeading: "Dateinamen suchen",
		searchDescription: "Durchsucht nur Dateinamen im gesamten Vault.",
		searchPlaceholder: "Teil eines Dateinamens eingeben...",
		clearSearch: "Suche leeren",
		resultTooltip: "Klicken zum Öffnen, Cmd-Klick für neuen Tab",
		noMatchesTitle: "Keine passenden Dateien gefunden.",
		noMatchesDescription: "Versuche einen anderen Dateinamen oder eine kürzere Fuzzy-Suche.",
		resultsCount: (count: number) => `${count} Treffer`,
		resultsShowing: (shown: number, total: number) => `${shown} von ${total} Treffern angezeigt`,
		modifiedLabel: (value: string) => `Geändert ${value}`,
		settingsHeading: "Dateinamensuche",
		settingsShowPath: "Pfad anzeigen",
		settingsShowPathDesc: "Zeigt den Dateipfad in jedem Suchergebnis an.",
		settingsShowModifiedDate: "Änderungsdatum anzeigen",
		settingsShowModifiedDateDesc: "Zeigt das letzte Änderungsdatum in jedem Suchergebnis an.",
		settingsExcludedFolders: "Ausgeschlossene Ordner",
		settingsExcludedFoldersDesc: "Dateien in diesen Vault-Ordnern werden bei der Dateinamensuche ignoriert.",
		settingsAddFolder: "Ordner hinzufügen",
		settingsNoFolders: "Noch keine ausgeschlossenen Ordner.",
		settingsExcludedFolderDesc: "Von der Dateinamensuche ausgeschlossen",
		settingsRemoveFolder: "Ausgeschlossenen Ordner entfernen",
		settingsChooseFolder: "Ordner zum Ausschließen auswählen...",
	},
	es: {
		commandOpenSearch: "Abrir busqueda por nombre de archivo",
		viewTitle: "Busqueda por nombre de archivo",
		searchHeading: "Buscar nombres de archivo",
		searchDescription: "Busca solo nombres de archivo en todo tu vault.",
		searchPlaceholder: "Escribe parte del nombre del archivo...",
		clearSearch: "Limpiar busqueda",
		resultTooltip: "Haz clic para abrir, Cmd-clic para abrir en una nueva pestana",
		noMatchesTitle: "No se encontraron archivos coincidentes.",
		noMatchesDescription: "Prueba con otro nombre de archivo o una busqueda difusa mas corta.",
		resultsCount: (count: number) => `${count} resultado${count === 1 ? "" : "s"}`,
		resultsShowing: (shown: number, total: number) => `Mostrando ${shown} de ${total} resultados`,
		modifiedLabel: (value: string) => `Modificado ${value}`,
		settingsHeading: "Busqueda por nombre de archivo",
		settingsShowPath: "Mostrar ruta",
		settingsShowPathDesc: "Muestra la ruta del archivo en cada resultado de busqueda.",
		settingsShowModifiedDate: "Mostrar fecha de modificacion",
		settingsShowModifiedDateDesc: "Muestra la ultima fecha de modificacion en cada resultado de busqueda.",
		settingsExcludedFolders: "Carpetas excluidas",
		settingsExcludedFoldersDesc: "Los archivos dentro de estas carpetas del vault se ignoraran en la busqueda.",
		settingsAddFolder: "Anadir carpeta",
		settingsNoFolders: "Todavia no hay carpetas excluidas.",
		settingsExcludedFolderDesc: "Excluida de la busqueda por nombre de archivo",
		settingsRemoveFolder: "Eliminar carpeta excluida",
		settingsChooseFolder: "Elige una carpeta para excluir...",
	},
	fr: {
		commandOpenSearch: "Ouvrir la recherche par nom de fichier",
		viewTitle: "Recherche par nom de fichier",
		searchHeading: "Rechercher des noms de fichiers",
		searchDescription: "Recherche uniquement les noms de fichiers dans tout votre vault.",
		searchPlaceholder: "Saisissez une partie du nom de fichier...",
		clearSearch: "Effacer la recherche",
		resultTooltip: "Cliquer pour ouvrir, Cmd-clic pour ouvrir dans un nouvel onglet",
		noMatchesTitle: "Aucun fichier correspondant trouve.",
		noMatchesDescription: "Essayez un autre nom de fichier ou une recherche floue plus courte.",
		resultsCount: (count: number) => `${count} resultat${count === 1 ? "" : "s"}`,
		resultsShowing: (shown: number, total: number) => `${shown} sur ${total} resultats affiches`,
		modifiedLabel: (value: string) => `Modifie ${value}`,
		settingsHeading: "Recherche par nom de fichier",
		settingsShowPath: "Afficher le chemin",
		settingsShowPathDesc: "Affiche le chemin du fichier dans chaque resultat de recherche.",
		settingsShowModifiedDate: "Afficher la date de modification",
		settingsShowModifiedDateDesc: "Affiche la derniere date de modification dans chaque resultat.",
		settingsExcludedFolders: "Dossiers exclus",
		settingsExcludedFoldersDesc: "Les fichiers de ces dossiers du vault seront ignores par la recherche.",
		settingsAddFolder: "Ajouter un dossier",
		settingsNoFolders: "Aucun dossier exclu pour le moment.",
		settingsExcludedFolderDesc: "Exclu de la recherche par nom de fichier",
		settingsRemoveFolder: "Supprimer le dossier exclu",
		settingsChooseFolder: "Choisissez un dossier a exclure...",
	},
	pt: {
		commandOpenSearch: "Abrir busca por nome de arquivo",
		viewTitle: "Busca por nome de arquivo",
		searchHeading: "Buscar nomes de arquivos",
		searchDescription: "Pesquisa apenas nomes de arquivos em todo o seu vault.",
		searchPlaceholder: "Digite parte do nome do arquivo...",
		clearSearch: "Limpar busca",
		resultTooltip: "Clique para abrir, Cmd-clique para abrir em uma nova aba",
		noMatchesTitle: "Nenhum arquivo correspondente encontrado.",
		noMatchesDescription: "Tente outro nome de arquivo ou uma busca difusa mais curta.",
		resultsCount: (count: number) => `${count} resultado${count === 1 ? "" : "s"}`,
		resultsShowing: (shown: number, total: number) => `Mostrando ${shown} de ${total} resultados`,
		modifiedLabel: (value: string) => `Modificado ${value}`,
		settingsHeading: "Busca por nome de arquivo",
		settingsShowPath: "Mostrar caminho",
		settingsShowPathDesc: "Exibe o caminho do arquivo em cada resultado da busca.",
		settingsShowModifiedDate: "Mostrar data de modificacao",
		settingsShowModifiedDateDesc: "Exibe a ultima data de modificacao em cada resultado.",
		settingsExcludedFolders: "Pastas excluidas",
		settingsExcludedFoldersDesc: "Arquivos dentro dessas pastas do vault serao ignorados pela busca.",
		settingsAddFolder: "Adicionar pasta",
		settingsNoFolders: "Ainda nao ha pastas excluidas.",
		settingsExcludedFolderDesc: "Excluida da busca por nome de arquivo",
		settingsRemoveFolder: "Remover pasta excluida",
		settingsChooseFolder: "Escolha uma pasta para excluir...",
	},
};

type SupportedLocale = keyof typeof TRANSLATIONS;

export function getStrings(): I18nStrings {
	const locale = getPreferredLocale();
	return TRANSLATIONS[locale] ?? TRANSLATIONS.en;
}

function getPreferredLocale(): SupportedLocale {
	const preferred = window.navigator.language.toLowerCase();

	if (preferred.startsWith("de")) {
		return "de";
	}

	if (preferred.startsWith("es")) {
		return "es";
	}

	if (preferred.startsWith("fr")) {
		return "fr";
	}

	if (preferred.startsWith("pt")) {
		return "pt";
	}

	return "en";
}
