const joplin = require('api');

export type Language = 'pl' | 'en';

export const translations = {
	pl: {
		// Settings
		settingSectionLabel: 'Asystent AI',
		settingLanguageLabel: 'Język',
		settingLanguageDescription: 'Wybierz język interfejsu i podpowiedzi dla AI.',
		settingLanguageAuto: 'Automatyczny (zgodny z Joplin)',
		settingAiModeLabel: 'Tryb AI',
		settingAiModeLocal: 'Lokalna Ollama',
		settingAiModeRemote: 'Zdalne API (OpenAI compatible)',
		settingLocalOllamaUrlLabel: 'URL lokalnej Ollamy',
		settingRemoteApiUrlLabel: 'URL zdalnego API',
		settingRemoteApiKeyLabel: 'Klucz API zdalnego modelu',
		settingSelectedModelLabel: 'Wybrany model',
		settingSelectedModelDesc: 'Wpisz nazwę modelu ręcznie lub użyj przycisku poniżej, aby wybrać z dostępnych lokalnie.',
		settingSelectModelBtnLabel: '🔍 Wybierz model z lokalnej Ollamy',
		settingSearchProviderLabel: 'Dostawca wyszukiwania',
		settingTavilyApiKeyLabel: 'Klucz API Tavily',
		settingSerperApiKeyLabel: 'Klucz API Serper.dev',

		// Auto-tagging settings & messages
		settingAutoTagNewNotesLabel: 'Automatycznie taguj nowe notatki',
		settingAutoTagNewNotesDesc: 'Opcja aktywna po pierwszym ręcznym uruchomieniu. Etykietuje nowe notatki po 24h od ich utworzenia.',
		settingAutoTaggingStatusLabel: 'Status tagowania',
		settingRunAutoTaggingBtnLabel: '🏷️ Uruchom ręczne tagowanie wszystkich notatek',

		taggingSystemPrompt: 'Jesteś asystentem analizującym notatki. Wygeneruj od 1 do 5 słów kluczowych/tagów najlepiej opisujących treść notatki. Zwróć WYŁĄCZNIE listę tagów rozdzielonych przecinkami, bez cudzysłowów, ponumerowania czy dodatkowego tekstu (np. projekty, spotkanie, planowanie).',

		taggingStatusNotStarted: 'Nieuruchomione (wymagane pierwsze ręczne uruchomienie)',
		taggingStatusInProgress: (current: number, total: number) => `W trakcie tagowania: ${current}/${total} notatek...`,
		taggingStatusCompleted: (processed: number, dateStr: string) => `Zakończono: przetworzono ${processed} notatek (${dateStr}).`,
		taggingStatusError: (error: string) => `Błąd tagowania: ${error}`,

		cmdAutoTagAllLabel: 'AI: Taguj wszystkie notatki',
		menuAutoTagAllLabel: 'Taguj wszystkie notatki (ręczne)',

		autoTagConfirmRun: 'Czy chcesz uruchomić ręczne etykietowanie wszystkich notatek?',
		autoTagAlreadyRunning: 'Proces tagowania notatek jest już w trakcie.',

		// Backup & Folders
		backupFolderName: 'Notatki ai',
		backupNoteTitle: (title: string) => `[Oryginał] ${title}`,
		summaryNoteTitle: (title: string) => `Podsumowanie: ${title}`,

		// System Prompts
		grammarSystemPrompt: 'Jesteś profesjonalnym edytorem tekstu. Popraw błędy gramatyczne, ortograficzne i stylistyczne w podanym tekście, zachowując jego sens i oryginalny język. Zwróć TYLKO poprawiony tekst.',
		markdownSystemPrompt: 'Przekształć podany tekst na przejrzysty format Markdown. Użyj nagłówków, list, pogrubień tam, gdzie to pasuje, aby tekst był czytelniejszy. Zwróć TYLKO wynik w Markdown.',
		webSearchSystemPrompt: 'Zredaguj lub rozbuduj podany tekst korzystając z dostarczonych informacji z sieci. Zawsze podawaj źródła w formie przypisów [1], [2] itd. i dodaj listę źródeł na końcu. Zachowaj styl Markdown.',
		webSearchUserPrompt: (query: string, context: string) => `Temat/Tekst: ${query}\n\nInformacje z sieci:\n${context}`,
		summarySystemPrompt: 'Stwórz zwięzłe podsumowanie poniższej notatki w punktach w języku polskim. Użyj formatu Markdown.',

		// Dialogs & Messages
		selectTextForSearch: 'Zaznacz fragment tekstu, który ma być tematem wyszukiwania.',
		searchErrorPrefix: 'Błąd wyszukiwania:',
		summaryGeneratedNotice: (folderName: string) => `Podsumowanie zostało wygenerowane i zapisane w folderze "${folderName}".`,
		aiErrorPrefix: 'Błąd AI:',
		tavilyApiKeyMissing: 'Brak klucza API Tavily w ustawieniach.',
		serperApiKeyMissing: 'Brak klucza API Serper w ustawieniach.',
		tavilyErrorPrefix: 'Błąd Tavily:',
		serperErrorPrefix: 'Błąd Serper:',
		sourcePrefix: (index: number, url: string) => `Źródło ${index} (${url}):`,

		// Model selection dialogs
		availableModelsTitle: (models: string) => `Dostępne modele Ollama:\n${models}`,
		setFirstModelPrompt: (model: string) => `Czy chcesz ustawić pierwszy z nich (${model}) jako aktywny?`,
		noModelsFound: 'Nie znaleziono lokalnych modeli Ollama. Upewnij się, że Ollama działa na porcie 11434.',
		cannotFetchModelsError: 'Błąd: Nie można pobrać modeli z Ollamy. Upewnij się, że Ollama działa (http://127.0.0.1:11434).',
		selectModelDialogTitle: 'Wybierz model, który chcesz ustawić jako aktywny:',
		modelSetNotice: (selected: string) => `Ustawiono model: ${selected}`,

		// Notebook summary & concurrency lock
		settingNotebookSummaryStatusLabel: 'Status generowania spisu zawartości',
		notebookSummaryCategoryTitle: 'Spis zawartości notatek',
		notebookSummaryNoteTitle: 'Spis zawartości wszystkich notatek',
		notebookSummaryStatusNotStarted: 'Nieuruchomione',
		notebookSummaryStatusInProgress: (current: number, total: number) => `W trakcie generowania spisu: ${current}/${total} notatek...`,
		notebookSummaryStatusCompleted: (processedNotes: number, processedNotebooks: number, dateStr: string) => `Zakończono: wygenerowano spis dla ${processedNotes} notatek w ${processedNotebooks} notatnikach (${dateStr}).`,
		notebookSummaryStatusError: (error: string) => `Błąd generowania spisu: ${error}`,
		notebookSummaryMainHeader: (dateStr: string) => `# Spis zawartości wszystkich notatek\n\n*Data wygenerowania: ${dateStr}*\n\n`,
		notebookSummaryCategoryNotice: (categoryName: string) => `Spis zawartości został pomyślnie wygenerowany i zapisany w kategorii "${categoryName}".`,

		notebookSummaryTitle: 'Spis zawartości notatek',
		notebookSummarySystemPrompt: 'Jesteś asystentem analizującym notatki. Przeczytaj poniższą treść notatki i stwórz zwięzłe podsumowanie jej zawartości dokładnie w 2 do 3 zdań. Zwróć sam tekst podsumowania, bez dodatkowego wstępu, tytułów czy cudzysłowów.',
		cmdNotebookSummaryLabel: 'AI: Generuj streszczenie całego notatnika',
		menuNotebookSummaryLabel: 'Generuj streszczenie całego notatnika',
		taskAlreadyRunningNotice: (taskName: string) => taskName ? `Inne zadanie AI (${taskName}) jest w tym momencie wykonywane. Poczekaj na jego zakończenie.` : 'Inne zadanie AI jest w tym momencie wykonywane. Poczekaj na jego zakończenie.',
		notebookSummarySuccess: (folderTitle: string) => `Spis zawartości notatek został pomyślnie wygenerowany w kategorii "${folderTitle}".`,
		notebookSummaryEmptyNoteNotice: '(Notatka jest pusta)',
		untitledNote: 'Bez tytułu',
		noNotebookSelectedNotice: 'Nie wybrano notatnika ani notatki.',
		notebookSummaryHeader: (folderTitle: string, dateStr: string) => `# Spis zawartości notatek: ${folderTitle}\n\n*Data wygenerowania: ${dateStr}*\n\n`,
		emptyNotebookNotice: 'Brak notatek w systemie do przetworzenia.',
		taskNameAutoTagging: 'Tagowanie notatek',
		taskNameNotebookSummary: 'Generowanie streszczenia notatnika',
		taskNameGrammar: 'Poprawa gramatyki',
		taskNameMarkdown: 'Formatowanie Markdown',
		taskNameSearch: 'Wyszukiwanie w sieci',
		taskNameSummary: 'Generowanie podsumowania',
		taskNameChat: 'Czat z AI',

		// Chat Panel
		chatTitle: 'Asystent AI (Czat)',
		chatUserRole: 'Użytkownik',
		chatAssistantRole: 'AI Assistant',
		chatModeAsk: '❓ Podpytanie o notatkę',
		chatModeEdit: '✏️ Edycja notatki',
		chatModeAskDesc: 'Pytaj o notatkę. AI przeszuka sieć i udzieli odpowiedzi ze źródłami (nie zmienia treści notatki).',
		chatModeEditDesc: 'Podaj uwagi do edycji. AI zredaguje i nadpisze treść notatki z uwzględnieniem wiedzy z sieci.',
		chatVersionHistoryNotice: 'ℹ️ Każda zmiana wykonana przez AI zapisuje nową wersję w historii wersji notatki Joplin (Note History), skąd możesz łatwo przywrócić poprzednią treść.',
		chatPlaceholder: 'Wpisz wiadomość lub pytanie do notatki...',
		chatSendBtn: 'Wyślij',
		chatClearHistoryBtn: 'Wyczyść historię',
		chatInsertAtCursor: '📥 Wstaw w miejscu kursora',
		chatAppendNote: '➕ Dołącz na końcu',
		chatReplaceNote: 'Zastąp treść notatki',
		chatRestoreOriginalBtn: '↺ Przywróć wersję sprzed edycji',
		chatRestoredNotice: 'Przywrócono treść notatki sprzed edycji AI.',
		
		// Quick Action Chips - Mode Ask
		chatQuickSummary: '📌 Podsumuj notatkę',
		chatQuickSummaryPrompt: 'Podsumuj tę notatkę w zwięzłych punktach w języku polskim.',
		chatQuickExplain: '❓ Wyjaśnij zagadnienia',
		chatQuickExplainPrompt: 'Wyjaśnij kluczowe pojęcia i zagadnienia z tej notatki w języku polskim.',
		chatQuickSources: '🌐 Dodaj informacje z sieci',
		chatQuickSourcesPrompt: 'Wyszukaj w sieci aktualne informacje powiązane z tematem tej notatki i zredaguj zwięzłe omówienie z przypisami źródłowymi w języku polskim.',

		// Quick Action Chips - Mode Edit
		chatQuickEditRewrite: '✍️ Zredaguj i ulepsz treść',
		chatQuickEditRewritePrompt: 'Przeredaguj treść notatki, popraw styl i czytelność, zachowując strukturę Markdown w języku polskim.',
		chatQuickEditTable: '📊 Przekształć w tabelę',
		chatQuickEditTablePrompt: 'Przekształć kluczowe informacje z tej notatki w czytelną tabelę Markdown w języku polskim.',
		chatQuickEditTitle: '🏷️ Wygeneruj i ustaw tytuł',
		chatQuickEditTags: '🏷️ Wygeneruj i ustaw etykiety (Tagi)',

		chatTitleUpdatedNotice: (title: string) => `🏷️ Zaktualizowano tytuł notatki na: "**${title}**"`,
		chatTagsUpdatedNotice: (tags: string) => `🏷️ Wygenerowano i przypisano etykiety do notatki: **${tags}**`,
		chatNoTagsGeneratedNotice: 'Dla tej notatki nie wygenerowano nowych etykiet.',

		chatNoNoteSelected: 'Brak otwartej notatki. Wybierz notatkę z listy, aby rozpocząć czat.',
		chatThinking: 'AI przetwarza odpowiedź...',

		// Commands & Menu labels
		cmdGrammarLabel: 'AI: Popraw gramatykę',
		cmdMarkdownLabel: 'AI: Formatuj Markdown',
		cmdSearchLabel: 'AI: Szukaj w sieci i zredaguj',
		cmdSummaryLabel: 'AI: Generuj podsumowanie',
		cmdRefreshModelsLabel: 'AI: Odśwież listę lokalnych modeli',
		cmdToggleChatLabel: 'AI: Otwórz/Zamknij panel czatu',
		menuGrammarLabel: 'Popraw gramatykę',
		menuMarkdownLabel: 'Formatuj Markdown',
		menuSearchLabel: 'Szukaj w sieci',
		menuSummaryLabel: 'Generuj podsumowanie',
		menuRefreshModelsLabel: 'Odśwież listę modeli',
		menuToggleChatLabel: 'Asystent AI (Czat)',

		// Context menu labels
		contextGrammarLabel: 'Popraw gramatykę (AI)',
		contextMarkdownLabel: 'Formatuj Markdown (AI)',
		contextSearchLabel: 'Szukaj w sieci (AI)',
		contextSummaryLabel: 'Generuj podsumowanie (AI)',
	},
	en: {
		// Settings
		settingSectionLabel: 'AI Assistant',
		settingLanguageLabel: 'Language',
		settingLanguageDescription: 'Select the interface and prompt language for AI.',
		settingLanguageAuto: 'Auto (follow Joplin)',
		settingAiModeLabel: 'AI Mode',
		settingAiModeLocal: 'Local Ollama',
		settingAiModeRemote: 'Remote API (OpenAI compatible)',
		settingLocalOllamaUrlLabel: 'Local Ollama URL',
		settingRemoteApiUrlLabel: 'Remote API URL',
		settingRemoteApiKeyLabel: 'Remote API Key',
		settingSelectedModelLabel: 'Selected Model',
		settingSelectedModelDesc: 'Type model name manually or use the button below to choose from locally available models.',
		settingSelectModelBtnLabel: '🔍 Select model from local Ollama',
		settingSearchProviderLabel: 'Search Provider',
		settingTavilyApiKeyLabel: 'Tavily API Key',
		settingSerperApiKeyLabel: 'Serper.dev API Key',

		// Auto-tagging settings & messages
		settingAutoTagNewNotesLabel: 'Automatically tag new notes',
		settingAutoTagNewNotesDesc: 'Active after first manual execution. Tags new notes 24 hours after creation.',
		settingAutoTaggingStatusLabel: 'Tagging Status',
		settingRunAutoTaggingBtnLabel: '🏷️ Run manual tagging for all notes',

		taggingSystemPrompt: 'You are an assistant analyzing notes. Generate between 1 and 5 keywords/tags that best describe the content of the note. Return ONLY a comma-separated list of tags, without quotes, numbering, or extra text (e.g. projects, meeting, planning).',

		taggingStatusNotStarted: 'Not started (requires first manual run)',
		taggingStatusInProgress: (current: number, total: number) => `Tagging in progress: ${current}/${total} notes...`,
		taggingStatusCompleted: (processed: number, dateStr: string) => `Completed: processed ${processed} notes (${dateStr}).`,
		taggingStatusError: (error: string) => `Tagging error: ${error}`,

		cmdAutoTagAllLabel: 'AI: Tag all notes',
		menuAutoTagAllLabel: 'Tag all notes (manual)',

		autoTagConfirmRun: 'Do you want to run manual tagging on all notes?',
		autoTagAlreadyRunning: 'Note tagging process is already in progress.',

		// Backup & Folders
		backupFolderName: 'AI Notes',
		backupNoteTitle: (title: string) => `[Original] ${title}`,
		summaryNoteTitle: (title: string) => `Summary: ${title}`,

		// System Prompts
		grammarSystemPrompt: 'You are a professional editor. Correct grammar, spelling, and stylistic errors in the provided text while preserving its meaning and original language. Return ONLY the corrected text.',
		markdownSystemPrompt: 'Convert the provided text into clean Markdown format. Use headings, lists, and bold text where appropriate to make the text more readable. Return ONLY the Markdown result.',
		webSearchSystemPrompt: 'Edit or expand the provided text using the supplied web search information. Always cite sources as [1], [2] etc. and append a sources list at the end. Maintain Markdown style.',
		webSearchUserPrompt: (query: string, context: string) => `Topic/Text: ${query}\n\nWeb Information:\n${context}`,
		summarySystemPrompt: 'Create a concise bullet-point summary of the following note in English. Use Markdown format.',

		// Dialogs & Messages
		selectTextForSearch: 'Please select a text snippet to use as the search topic.',
		searchErrorPrefix: 'Search error:',
		summaryGeneratedNotice: (folderName: string) => `Summary generated and saved in notebook "${folderName}".`,
		aiErrorPrefix: 'AI error:',
		tavilyApiKeyMissing: 'Missing Tavily API Key in settings.',
		serperApiKeyMissing: 'Missing Serper API Key in settings.',
		tavilyErrorPrefix: 'Tavily error:',
		serperErrorPrefix: 'Serper error:',
		sourcePrefix: (index: number, url: string) => `Source ${index} (${url}):`,

		// Model selection dialogs
		availableModelsTitle: (models: string) => `Available Ollama models:\n${models}`,
		setFirstModelPrompt: (model: string) => `Do you want to set the first one (${model}) as active?`,
		noModelsFound: 'No local Ollama models found. Make sure Ollama is running on port 11434.',
		cannotFetchModelsError: 'Error: Cannot fetch models from Ollama. Make sure Ollama is running (http://127.0.0.1:11434).',
		selectModelDialogTitle: 'Select the model you want to set as active:',
		modelSetNotice: (selected: string) => `Model set to: ${selected}`,

		// Notebook summary & concurrency lock
		settingNotebookSummaryStatusLabel: 'Notebook TOC Generation Status',
		notebookSummaryCategoryTitle: 'Table of Contents',
		notebookSummaryNoteTitle: 'Table of Contents for All Notes',
		notebookSummaryStatusNotStarted: 'Not started',
		notebookSummaryStatusInProgress: (current: number, total: number) => `Generating table of contents: ${current}/${total} notes...`,
		notebookSummaryStatusCompleted: (processedNotes: number, processedNotebooks: number, dateStr: string) => `Completed: generated index for ${processedNotes} notes in ${processedNotebooks} notebooks (${dateStr}).`,
		notebookSummaryStatusError: (error: string) => `Index generation error: ${error}`,
		notebookSummaryMainHeader: (dateStr: string) => `# Table of Contents for All Notes\n\n*Generated on: ${dateStr}*\n\n`,
		notebookSummaryCategoryNotice: (categoryName: string) => `Table of contents successfully generated and saved in category "${categoryName}".`,

		notebookSummaryTitle: 'Table of Contents',
		notebookSummarySystemPrompt: 'You are an assistant analyzing notes. Read the note content below and create a concise summary in exactly 2 to 3 sentences. Return only the summary text without introduction, headers, or quotes.',
		cmdNotebookSummaryLabel: 'AI: Generate summary for whole notebook',
		menuNotebookSummaryLabel: 'Generate summary for whole notebook',
		taskAlreadyRunningNotice: (taskName: string) => taskName ? `Another AI task (${taskName}) is currently running. Please wait for it to finish.` : 'Another AI task is currently running. Please wait for it to finish.',
		notebookSummarySuccess: (folderTitle: string) => `Table of contents successfully generated in category "${folderTitle}".`,
		notebookSummaryEmptyNoteNotice: '(Note is empty)',
		untitledNote: 'Untitled',
		noNotebookSelectedNotice: 'No notebook or note selected.',
		notebookSummaryHeader: (folderTitle: string, dateStr: string) => `# Table of Contents: ${folderTitle}\n\n*Generated on: ${dateStr}*\n\n`,
		emptyNotebookNotice: 'No notes found to process.',
		taskNameAutoTagging: 'Note Tagging',
		taskNameNotebookSummary: 'Notebook TOC Generation',
		taskNameGrammar: 'Grammar Correction',
		taskNameMarkdown: 'Markdown Formatting',
		taskNameSearch: 'Web Search',
		taskNameSummary: 'Summary Generation',
		taskNameChat: 'AI Chat',

		// Chat Panel
		chatTitle: 'AI Assistant (Chat)',
		chatUserRole: 'User',
		chatAssistantRole: 'AI Assistant',
		chatModeAsk: '❓ Ask about note',
		chatModeEdit: '✏️ Edit note',
		chatModeAskDesc: 'Ask questions about the note. AI will search the web and answer with sources (does not modify note content).',
		chatModeEditDesc: 'Provide edit instructions. AI will rewrite and replace the note content including web knowledge.',
		chatVersionHistoryNotice: 'ℹ️ Every AI edit creates a new version in Joplin Note History, so you can easily restore previous content.',
		chatPlaceholder: 'Type a message or question about the note...',
		chatSendBtn: 'Send',
		chatClearHistoryBtn: 'Clear History',
		chatInsertAtCursor: '📥 Insert at cursor',
		chatAppendNote: '➕ Append to end',
		chatReplaceNote: 'Replace note content',
		chatRestoreOriginalBtn: '↺ Restore pre-edit version',
		chatRestoredNotice: 'Restored note content prior to AI edit.',
		
		// Quick Action Chips - Mode Ask
		chatQuickSummary: '📌 Summarize note',
		chatQuickSummaryPrompt: 'Summarize this note in concise bullet points in English.',
		chatQuickExplain: '❓ Explain topics',
		chatQuickExplainPrompt: 'Explain the key concepts and main topics from this note in English.',
		chatQuickSources: '🌐 Add web information',
		chatQuickSourcesPrompt: 'Search the web for up-to-date information on this note\'s topic and provide a concise summary with cited sources in English.',

		// Quick Action Chips - Mode Edit
		chatQuickEditRewrite: '✍️ Rewrite & improve content',
		chatQuickEditRewritePrompt: 'Rewrite the note content to improve clarity, flow, and formatting while maintaining Markdown structure in English.',
		chatQuickEditTable: '📊 Convert to table format',
		chatQuickEditTablePrompt: 'Convert the structured data and key points in this note into a clean Markdown table in English.',
		chatQuickEditTitle: '🏷️ Generate & set note title',
		chatQuickEditTags: '🏷️ Generate & apply tags',

		chatTitleUpdatedNotice: (title: string) => `🏷️ Updated note title to: "**${title}**"`,
		chatTagsUpdatedNotice: (tags: string) => `🏷️ Generated and applied tags to note: **${tags}**`,
		chatNoTagsGeneratedNotice: 'No new tags generated for this note.',

		chatNoNoteSelected: 'No note open. Select a note from the list to start chatting.',
		chatThinking: 'AI is thinking...',

		// Commands & Menu labels
		cmdGrammarLabel: 'AI: Correct Grammar',
		cmdMarkdownLabel: 'AI: Format Markdown',
		cmdSearchLabel: 'AI: Search Web & Rewrite',
		cmdSummaryLabel: 'AI: Generate Summary',
		cmdRefreshModelsLabel: 'AI: Refresh Local Models List',
		cmdToggleChatLabel: 'AI: Toggle Chat Panel',
		menuGrammarLabel: 'Correct Grammar',
		menuMarkdownLabel: 'Format Markdown',
		menuSearchLabel: 'Search Web',
		menuSummaryLabel: 'Generate Summary',
		menuRefreshModelsLabel: 'Refresh Models List',
		menuToggleChatLabel: 'AI Assistant (Chat)',

		// Context menu labels
		contextGrammarLabel: 'Correct Grammar (AI)',
		contextMarkdownLabel: 'Format Markdown (AI)',
		contextSearchLabel: 'Search Web (AI)',
		contextSummaryLabel: 'Generate Summary (AI)',
	}
};

export async function detectJoplinLocale(): Promise<Language> {
	try {
		if (joplin.settings.globalValue) {
			const locale = await joplin.settings.globalValue('locale');
			if (typeof locale === 'string' && locale.toLowerCase().startsWith('pl')) {
				return 'pl';
			}
		}
	} catch (e) {
		// Ignore and fallback to value('locale')
	}

	try {
		const locale = await joplin.settings.value('locale');
		if (typeof locale === 'string' && locale.toLowerCase().startsWith('pl')) {
			return 'pl';
		}
	} catch (e) {
		// Fallback to default
	}

	return 'en';
}

export async function getLanguage(): Promise<Language> {
	try {
		const lang = await joplin.settings.value('appLanguage');
		if (lang === 'en' || lang === 'pl') {
			return lang;
		}
	} catch (e) {
		// Setting might not be registered yet during initial load
	}

	return await detectJoplinLocale();
}

export async function getTranslation() {
	const lang = await getLanguage();
	return translations[lang];
}
