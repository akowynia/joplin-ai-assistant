const joplin = require('api');
import { getTranslation, getLanguage } from '../utils/i18n';
import { getChatHtml } from './chatHtml';
import { AiService, ChatMessage } from '../services/aiService';
import { SearchService } from '../services/searchService';
import { TaggingService } from '../services/taggingService';

export class ChatPanel {
	private static panelId: string | null = null;
	private static isVisible: boolean = false;
	private static activeMode: 'ask' | 'edit' = 'ask';
	private static currentNoteId: string | null = null;
	private static currentNoteTitle: string = '';
	private static chatHistories: Map<string, ChatMessage[]> = new Map(); // noteId -> ChatMessage[]
	private static isThinking: boolean = false;

	/**
	 * Inicjalizuje panel boczny czatu
	 */
	public static async init(): Promise<void> {
		if (this.panelId) return;

		this.panelId = await joplin.views.panels.create('aiChatPanel');

		// Pobierz wstępnie aktywne notatki
		await this.fetchCurrentNote();

		// Wyrenderuj kod HTML w panelu z aktualnymi danymi
		await this.refreshHtml();

		// Dodaj skrypt Webview (wymagany przez Joplin CSP)
		await joplin.views.panels.addScript(this.panelId, './views/chatWebview.js');

		// Obsługa wiadomości z panelu Webview z powrotnym zwracaniem stanu (RPC API)
		await joplin.views.panels.onMessage(this.panelId, async (message: any) => {
			return await this.handleWebviewMessage(message);
		});

		// Nasłuchiwanie zmiany aktywnej notatki
		await joplin.workspace.onNoteSelectionChange(async () => {
			await this.handleNoteSelectionChange();
		});

		// Nasłuchiwanie edycji treści notatki
		await joplin.workspace.onNoteChange(async () => {
			await this.handleNoteSelectionChange();
		});
	}

	/**
	 * Przełącza widoczność panelu czatu
	 */
	public static async toggle(): Promise<void> {
		if (!this.panelId) await this.init();
		
		this.isVisible = !this.isVisible;
		await joplin.views.panels.show(this.panelId!, this.isVisible);

		if (this.isVisible) {
			await this.handleNoteSelectionChange();
			await this.postStateUpdate();
		}
	}

	/**
	 * Fetches currently selected note from Joplin API
	 */
	private static async fetchCurrentNote(): Promise<boolean> {
		try {
			const lang = await getLanguage();
			const note = await joplin.workspace.selectedNote();
			const newId = note ? note.id : null;
			const newTitle = note ? (note.title || (lang === 'en' ? 'Untitled' : 'Bez tytułu')) : '';

			const isChanged = newId !== this.currentNoteId;
			this.currentNoteId = newId;
			this.currentNoteTitle = newTitle;

			return isChanged;
		} catch (e) {
			console.warn('[Joplin AI Chat] Error fetching selectedNote:', e);
			const isChanged = this.currentNoteId !== null;
			this.currentNoteId = null;
			this.currentNoteTitle = '';
			return isChanged;
		}
	}

	/**
	 * Refreshes full HTML code and state in the panel
	 */
	public static async refresh(): Promise<void> {
		await this.refreshHtml();
		await this.postStateUpdate();
	}

	/**
	 * Renders full HTML code in the panel
	 */
	private static async refreshHtml(): Promise<void> {
		if (!this.panelId) return;

		const t = await getTranslation();
		const lang = await getLanguage();
		const model = await joplin.settings.value('selectedModel');

		const html = getChatHtml({
			t: t,
			currentModel: model,
			activeMode: this.activeMode,
			noteTitle: this.currentNoteTitle,
			lang: lang,
		});

		await joplin.views.panels.setHtml(this.panelId, html);
	}

	/**
	 * Reaguje na zmianę wybranej notatki w Joplin
	 */
	private static async handleNoteSelectionChange(): Promise<void> {
		const isChanged = await this.fetchCurrentNote();
		if (isChanged) {
			this.isThinking = false;
		}
		await this.postStateUpdate();
	}

	/**
	 * Pobiera historię rozmów dla aktualnej notatki
	 */
	private static getHistory(): ChatMessage[] {
		const key = this.currentNoteId || 'global';
		if (!this.chatHistories.has(key)) {
			this.chatHistories.set(key, []);
		}
		return this.chatHistories.get(key)!;
	}

	/**
	 * Returns current state payload to deliver to Webview
	 */
	private static async getStatePayload(): Promise<any> {
		const model = await joplin.settings.value('selectedModel');
		const t = await getTranslation();
		return {
			type: 'updateState',
			messages: this.getHistory(),
			noteTitle: this.currentNoteTitle,
			model: model,
			isThinking: this.isThinking,
			mode: this.activeMode,
			labels: {
				user: t.chatUserRole || 'User',
				assistant: t.chatAssistantRole || 'AI Assistant',
				insertAtCursor: t.chatInsertAtCursor || 'Insert at cursor',
				appendNote: t.chatAppendNote || 'Append to end',
				restoreOriginal: t.chatRestoreOriginalBtn || 'Restore pre-edit version',
				thinking: t.chatThinking || 'AI is thinking...',
				noNote: t.chatNoNoteSelected || 'No note open. Select a note from the list to start chatting.',
			}
		};
	}

	/**
	 * Wysyła zaktualizowany stan do interfejsu Webview (push fallback)
	 */
	private static async postStateUpdate(): Promise<void> {
		if (!this.panelId) return;
		try {
			const payload = await this.getStatePayload();
			await joplin.views.panels.postMessage(this.panelId, payload);
		} catch (e) {
			console.warn('[Joplin AI Chat] Nie można wysłać postMessage:', e);
		}
	}

	/**
	 * Obsługuje zdarzenia przychodzące z panelu Webview (zwrotny payload dla RPC)
	 */
	private static async handleWebviewMessage(message: any): Promise<any> {
		if (!message || !message.type) return await this.getStatePayload();

		switch (message.type) {
			case 'requestState':
				await this.fetchCurrentNote();
				return await this.getStatePayload();

			case 'switchMode':
				if (message.mode === 'ask' || message.mode === 'edit') {
					this.activeMode = message.mode;
				}
				return await this.getStatePayload();

			case 'clearHistory':
				const key = this.currentNoteId || 'global';
				this.chatHistories.set(key, []);
				return await this.getStatePayload();

			case 'sendMessage':
				return await this.processUserMessage(message.text, message.mode || this.activeMode);

			case 'insertText':
				await this.insertTextToNote(message.text, message.position || 'cursor');
				return await this.getStatePayload();

			case 'restoreOriginal':
				if (message.text !== undefined) {
					await this.restoreNoteBody(message.text);
				}
				return await this.getStatePayload();

			case 'generateTitle':
				return await this.generateAndSetTitle();

			case 'generateTags':
				return await this.generateAndApplyTags();

			default:
				return await this.getStatePayload();
		}
	}

	/**
	 * Generuje i ustawia nowy tytuł notatki w Joplin
	 */
	private static async generateAndSetTitle(): Promise<any> {
		await this.fetchCurrentNote();
		if (!this.currentNoteId) return await this.getStatePayload();

		const history = this.getHistory();
		const t = await getTranslation();

		history.push({ role: 'user', content: t.chatQuickEditTitle });
		this.isThinking = true;

		try {
			let noteBody = '';
			try {
				const note = await joplin.workspace.selectedNote();
				noteBody = note ? (note.body || '') : '';
			} catch (e) {
				noteBody = await joplin.commands.execute('editor.getText');
			}

			const lang = await getLanguage();
			const prompt = lang === 'en'
				? `You are a professional editor. Generate a short, concise, and descriptive title for the note (between 3 to 7 words) in the language of the note. Return ONLY THE TITLE without quotes, brackets, or additional explanations.\n\nNote content:\n${AiService.sanitizeNoteBody(noteBody, 4000)}`
				: `Jesteś profesjonalnym redaktorem. Wygeneruj krótki, precyzyjny i opisowy tytuł notatki (maksymalnie od 3 do 7 słów) w języku notatki. Zwróć SAM TYTUŁ bez cudzysłowów, nawiasów ani dodatkowych wyjaśnień.\n\nTreść notatki:\n${AiService.sanitizeNoteBody(noteBody, 4000)}`;

			const generatedTitle = await AiService.chat([{ role: 'system', content: prompt }]);
			const cleanTitle = generatedTitle.replace(/^["'#\s]+|["'\s]+$/g, '').trim();

			if (cleanTitle) {
				await joplin.data.put(['notes', this.currentNoteId], null, { title: cleanTitle });
				this.currentNoteTitle = cleanTitle;
				history.push({
					role: 'assistant',
					content: t.chatTitleUpdatedNotice(cleanTitle)
				});
			}
		} catch (error: any) {
			console.error('[Joplin AI Chat] Błąd generowania tytułu:', error);
			history.push({
				role: 'assistant',
				content: `⚠️ ${t.aiErrorPrefix} ${error.message || error}`
			});
		} finally {
			this.isThinking = false;
		}

		return await this.getStatePayload();
	}

	/**
	 * Generuje i przypisuje etykiety (Tagi) do aktualnej notatki
	 */
	private static async generateAndApplyTags(): Promise<any> {
		await this.fetchCurrentNote();
		if (!this.currentNoteId) return await this.getStatePayload();

		const history = this.getHistory();
		const t = await getTranslation();

		history.push({ role: 'user', content: t.chatQuickEditTags });
		this.isThinking = true;

		try {
			let noteBody = '';
			try {
				const note = await joplin.workspace.selectedNote();
				noteBody = note ? (note.body || '') : '';
			} catch (e) {
				noteBody = await joplin.commands.execute('editor.getText');
			}

			const tags = await TaggingService.tagCurrentNote(this.currentNoteId, this.currentNoteTitle, noteBody);

			if (tags && tags.length > 0) {
				history.push({
					role: 'assistant',
					content: t.chatTagsUpdatedNotice(tags.join(', '))
				});
			} else {
				history.push({
					role: 'assistant',
					content: t.chatNoTagsGeneratedNotice
				});
			}
		} catch (error: any) {
			console.error('[Joplin AI Chat] Błąd generowania tagów:', error);
			history.push({
				role: 'assistant',
				content: `⚠️ ${t.aiErrorPrefix} ${error.message || error}`
			});
		} finally {
			this.isThinking = false;
		}

		return await this.getStatePayload();
	}

	/**
	 * Przetwarza wiadomość użytkownika i wywołuje model AI
	 */
	private static async processUserMessage(userText: string, mode: 'ask' | 'edit'): Promise<any> {
		await this.fetchCurrentNote();
		const history = this.getHistory();

		const lastMsg = history[history.length - 1];
		if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== userText) {
			history.push({ role: 'user', content: userText });
		}
		
		this.isThinking = true;

		try {
			const lang = await getLanguage();
			let noteTitle = this.currentNoteTitle || (lang === 'en' ? 'Untitled' : 'Bez tytułu');
			let noteBody = '';

			try {
				const selectedNote = await joplin.workspace.selectedNote();
				if (selectedNote) {
					noteTitle = selectedNote.title || noteTitle;
					noteBody = selectedNote.body || '';
				}
			} catch (e) {
				console.warn('[Joplin AI Chat] Error reading selectedNote:', e);
			}

			if (!noteBody) {
				try {
					noteBody = await joplin.commands.execute('editor.getText');
				} catch (e) {
					console.warn('[Joplin AI Chat] Error reading editor.getText:', e);
				}
			}

			const preEditOriginalBody = noteBody;

			// Web search (RAG)
			let webContext = '';
			const provider = await joplin.settings.value('searchProvider');
			const tavilyKey = await joplin.settings.value('tavilyApiKey');
			const serperKey = await joplin.settings.value('serperApiKey');
			const hasSearchKey = (provider === 'tavily' && tavilyKey) || (provider === 'serper' && serperKey);

			const lowerText = userText.toLowerCase();
			const isSearchIntent = lowerText.includes('szukaj') || 
								   lowerText.includes('sieć') || 
								   lowerText.includes('informacje z sieci') ||
								   lowerText.includes('search') ||
								   lowerText.includes('web') ||
								   lowerText.includes('internet');

			if (hasSearchKey && isSearchIntent) {
				try {
					const searchResults = await SearchService.search(userText);
					if (searchResults && searchResults.length > 0) {
						webContext = await SearchService.formatResultsForLLM(searchResults);
					}
				} catch (searchErr) {
					console.warn('[Joplin AI Chat] Web search skipped:', searchErr);
				}
			}

			const systemPromptContent = mode === 'ask'
				? AiService.buildAskSystemPrompt(noteTitle, noteBody, lang, webContext)
				: AiService.buildEditSystemPrompt(noteTitle, noteBody, lang, webContext);

			const fullMessages: ChatMessage[] = [
				{ role: 'system', content: systemPromptContent },
				...history.filter(m => m.role !== 'system')
			];

			const aiResponse = await AiService.chat(fullMessages);

			if (mode === 'edit') {
				try {
					await joplin.commands.execute('editor.setText', aiResponse);
				} catch (e) {
					await joplin.commands.execute('editor.execCommand', { name: 'setValue', value: aiResponse });
				}
			}

			history.push({
				role: 'assistant',
				content: aiResponse,
				originalBody: mode === 'edit' ? preEditOriginalBody : undefined
			});

		} catch (error: any) {
			console.error('[Joplin AI Chat] Błąd podczas przetwarzania wiadomości w czacie:', error);
			const t = await getTranslation();
			history.push({
				role: 'assistant',
				content: `⚠️ ${t.aiErrorPrefix} ${error.message || error}`
			});
		} finally {
			this.isThinking = false;
		}

		return await this.getStatePayload();
	}

	/**
	 * Przywraca treść notatki sprzed edycji AI
	 */
	private static async restoreNoteBody(text: string): Promise<void> {
		try {
			await joplin.commands.execute('editor.setText', text);
		} catch (e) {
			console.warn('[Joplin AI Chat] Błąd przywracania editor.setText:', e);
			try {
				await joplin.commands.execute('editor.execCommand', { name: 'setValue', value: text });
			} catch (err) {
				console.error('[Joplin AI Chat] Błąd przywracania treści:', err);
			}
		}
	}

	/**
	 * Wstawia wygenerowany tekst do edytora notatki
	 */
	private static async insertTextToNote(text: string, position: 'cursor' | 'append'): Promise<void> {
		if (position === 'append') {
			try {
				const currentBody = await joplin.commands.execute('editor.getText');
				const updatedBody = (currentBody || '') + '\n\n' + text;
				await joplin.commands.execute('editor.setText', updatedBody);
			} catch (e) {
				console.warn('[Joplin AI Chat] Błąd dołączania tekstu:', e);
			}
		} else {
			try {
				await joplin.commands.execute('insertText', text);
			} catch (e) {
				await joplin.commands.execute('editor.execCommand', { name: 'replaceSelection', value: text });
			}
		}
	}
}
