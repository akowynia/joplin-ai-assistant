const joplin = require('api');
import { AiService } from '../services/aiService';
import { JoplinService } from '../services/joplinService';
import { SearchService } from '../services/searchService';
import { TaggingService } from '../services/taggingService';
import { NotebookSummaryService } from '../services/notebookSummaryService';
import { TaskLockService } from '../services/taskLockService';
import { getTranslation } from '../utils/i18n';

export class ActionHandlers {
	/**
	 * Poprawa gramatyki
	 */
	public static async handleGrammarCorrection() {
		const t = await getTranslation();
		await TaskLockService.runWithLock(t.taskNameGrammar, async () => {
			const selectedText = await joplin.commands.execute('selectedText');
			const content = selectedText || await joplin.commands.execute('editor.getText');
			
			if (!content) return;

			const note = await joplin.workspace.selectedNote();
			await JoplinService.backupNote(note.id);

			const response = await AiService.chat([
				{ role: 'system', content: t.grammarSystemPrompt },
				{ role: 'user', content: content }
			]);

			if (selectedText) {
				await joplin.commands.execute('replaceSelection', response);
			} else {
				await joplin.commands.execute('editor.setText', response);
			}
		});
	}

	/**
	 * Formatowanie Markdown
	 */
	public static async handleMarkdownFormatting() {
		const t = await getTranslation();
		await TaskLockService.runWithLock(t.taskNameMarkdown, async () => {
			const selectedText = await joplin.commands.execute('selectedText');
			const content = selectedText || await joplin.commands.execute('editor.getText');
			
			if (!content) return;

			const note = await joplin.workspace.selectedNote();
			await JoplinService.backupNote(note.id);

			const response = await AiService.chat([
				{ role: 'system', content: t.markdownSystemPrompt },
				{ role: 'user', content: content }
			]);

			if (selectedText) {
				await joplin.commands.execute('replaceSelection', response);
			} else {
				await joplin.commands.execute('editor.setText', response);
			}
		});
	}

	/**
	 * Wyszukiwanie w sieci i redagowanie
	 */
	public static async handleWebSearchAndRedact() {
		const t = await getTranslation();
		await TaskLockService.runWithLock(t.taskNameSearch, async () => {
			const query = await joplin.commands.execute('selectedText');
			if (!query) {
				await joplin.views.dialogs.showMessageBox(t.selectTextForSearch);
				return;
			}

			const note = await joplin.workspace.selectedNote();
			await JoplinService.backupNote(note.id);

			try {
				const results = await SearchService.search(query);
				const context = await SearchService.formatResultsForLLM(results);

				const response = await AiService.chat([
					{ role: 'system', content: t.webSearchSystemPrompt },
					{ role: 'user', content: t.webSearchUserPrompt(query, context) }
				]);

				await joplin.commands.execute('replaceSelection', response);
			} catch (error: any) {
				await joplin.views.dialogs.showMessageBox(`${t.searchErrorPrefix} ${error.message}`);
			}
		});
	}

	/**
	 * Generowanie podsumowania
	 */
	public static async handleSummaryGeneration() {
		const t = await getTranslation();
		await TaskLockService.runWithLock(t.taskNameSummary, async () => {
			const note = await joplin.workspace.selectedNote();
			if (!note || !note.body) return;

			const response = await AiService.chat([
				{ role: 'system', content: t.summarySystemPrompt },
				{ role: 'user', content: note.body }
			]);

			await JoplinService.createSummaryNote(note.title, response);
			await joplin.views.dialogs.showMessageBox(t.summaryGeneratedNotice(t.backupFolderName));
		});
	}

	/**
	 * Generowanie streszczenia całego notatnika
	 */
	public static async handleNotebookSummaryGeneration() {
		const t = await getTranslation();
		await TaskLockService.runWithLock(t.taskNameNotebookSummary, async () => {
			await NotebookSummaryService.generateNotebookSummary();
		});
	}

	/**
	 * Ręczne etykietowanie wszystkich notatek
	 */
	public static async handleAutoTagAllNotes() {
		const t = await getTranslation();
		const result = await joplin.views.dialogs.showMessageBox(t.autoTagConfirmRun);
		if (result === 0) {
			await TaggingService.runManualAutoTagging();
		}
	}
}
