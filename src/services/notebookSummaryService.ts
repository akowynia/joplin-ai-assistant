const joplin = require('api');
import { AiService } from './aiService';
import { getTranslation } from '../utils/i18n';

interface FolderNode {
	id: string;
	title: string;
	parent_id: string;
	children: FolderNode[];
	notes: NoteNode[];
}

interface NoteNode {
	id: string;
	title: string;
	body: string;
	parent_id: string;
}

export class NotebookSummaryService {
	/**
	 * Pobiera wszystkie foldery z Joplin API
	 */
	private static async getAllFolders(): Promise<any[]> {
		let page = 1;
		let allFolders: any[] = [];
		let hasMore = true;

		while (hasMore) {
			const response = await joplin.data.get(['folders'], {
				fields: ['id', 'title', 'parent_id'],
				page: page,
				limit: 50,
			});
			const items = response.items || [];
			allFolders = allFolders.concat(items);
			hasMore = response.has_more;
			page++;
		}

		return allFolders;
	}

	/**
	 * Pobiera wszystkie notatki w danym folderze
	 */
	private static async getNotesInFolder(folderId: string): Promise<NoteNode[]> {
		let page = 1;
		let allNotes: NoteNode[] = [];
		let hasMore = true;

		while (hasMore) {
			const response = await joplin.data.get(['folders', folderId, 'notes'], {
				fields: ['id', 'title', 'body', 'parent_id', 'is_conflict', 'deleted_time'],
				page: page,
				limit: 50,
			});
			const items = response.items || [];
			const validNotes = items.filter((n: any) => !n.is_conflict && !n.deleted_time);
			allNotes = allNotes.concat(validNotes);
			hasMore = response.has_more;
			page++;
		}

		return allNotes;
	}

	/**
	 * Zapewnia istnienie dokładnie JEDNEJ kategorii (folderu) "Spis zawartości notatek".
	 * Jeśli jest ich więcej, łączy je i usuwa duplikaty.
	 */
	private static async ensureSingleIndexFolder(categoryTitle: string): Promise<string> {
		const allFolders = await this.getAllFolders();
		const matches = allFolders.filter(f => 
			f.title === categoryTitle || 
			f.title === 'Spis zawartości notatek' || 
			f.title === 'Spis treści' || 
			f.title === 'Index of Notes Content'
		);

		if (matches.length === 0) {
			const newFolder = await joplin.data.post(['folders'], null, { title: categoryTitle });
			return newFolder.id;
		}

		const keeper = matches[0];

		// Gdyby nazwa keepera się różniła, aktualizujemy na aktualny język
		if (keeper.title !== categoryTitle) {
			try {
				await joplin.data.put(['folders', keeper.id], null, { title: categoryTitle });
			} catch (e) {
				console.warn('Nie udało się zaktualizować tytułu folderu spisu:', e);
			}
		}

		// Łączenie i usuwanie duplikatów folderów
		for (let i = 1; i < matches.length; i++) {
			const dupFolder = matches[i];
			try {
				const dupNotes = await this.getNotesInFolder(dupFolder.id);
				for (const note of dupNotes) {
					await joplin.data.put(['notes', note.id], null, { parent_id: keeper.id });
				}
				await joplin.data.delete(['folders', dupFolder.id]);
			} catch (err) {
				console.warn(`Nie udało się połączyć duplikatu folderu spisu ${dupFolder.id}:`, err);
			}
		}

		return keeper.id;
	}

	/**
	 * Buduje drzewo folderów dla podanych folderów podrzędnych
	 */
	private static buildFolderTree(parentFolderId: string, availableFolders: any[]): FolderNode[] {
		const childFolders = availableFolders.filter(f => f.parent_id === parentFolderId);
		return childFolders.map(folder => ({
			id: folder.id,
			title: folder.title,
			parent_id: folder.parent_id,
			children: this.buildFolderTree(folder.id, availableFolders),
			notes: [],
		}));
	}

	/**
	 * Główna metoda generująca spis zawartości wszystkich notatników
	 */
	public static async generateNotebookSummary(): Promise<void> {
		const t = await getTranslation();

		try {
			// 1. Gwarancja istnienia dokładnie jednej kategorii "Spis zawartości notatek"
			const indexFolderId = await this.ensureSingleIndexFolder(t.notebookSummaryCategoryTitle);

			// 2. Pobieramy wszystkie foldery i filtrujemy z wykluczeniem kategorii spisu oraz Kosza
			const allFolders = await this.getAllFolders();
			const validFolders = allFolders.filter(f => 
				f.id !== indexFolderId && 
				f.title !== t.notebookSummaryCategoryTitle && 
				f.title !== 'Spis zawartości notatek' && 
				f.title !== 'Index of Notes Content' && 
				f.title.toLowerCase() !== 'kosz' && 
				f.title.toLowerCase() !== 'trash'
			);

			// 3. Budujemy drzewo folderów głównych (parent_id jest pusty lub nie wskazuje na żaden istniejący folder w validFolders)
			const validFolderIds = new Set(validFolders.map(f => f.id));
			const rootFolders = validFolders.filter(f => !f.parent_id || !validFolderIds.has(f.parent_id));

			const folderTree: FolderNode[] = rootFolders.map(f => ({
				id: f.id,
				title: f.title,
				parent_id: f.parent_id,
				children: this.buildFolderTree(f.id, validFolders),
				notes: [],
			}));

			// Funkcja do zasilania folderów notatkami i wyliczania łącznej liczby notatek
			let totalNotesCount = 0;
			let totalNotebooksCount = validFolders.length;

			const populateNotes = async (nodes: FolderNode[]) => {
				for (const node of nodes) {
					const notesInF = await this.getNotesInFolder(node.id);
					// Zabezpieczenie: odrzucamy notatki należące do kategorii spisu
					node.notes = notesInF.filter(n => n.parent_id !== indexFolderId);
					totalNotesCount += node.notes.length;
					await populateNotes(node.children);
				}
			};
			await populateNotes(folderTree);

			// Status początkowy w Ustawieniach
			await joplin.settings.setValue('notebookSummaryStatus', t.notebookSummaryStatusInProgress(0, totalNotesCount));

			let processedCount = 0;
			let markdownOutput = '';
			const now = new Date();
			const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

			markdownOutput += t.notebookSummaryMainHeader(dateStr);

			// Rekurencyjny render Markdown dla folderu i jego notatek
			const renderFolderNode = async (node: FolderNode, depth: number = 1) => {
				const headerHashes = '#'.repeat(Math.min(depth, 6));
				const indent = '  '.repeat(depth - 1);
				markdownOutput += `${headerHashes} 📁 Notatnik: ${node.title}\n\n`;

				if (node.notes.length === 0 && node.children.length === 0) {
					markdownOutput += `${indent}*(Notatnik jest pusty)*\n\n`;
				}

				for (const note of node.notes) {
					processedCount++;
					await joplin.settings.setValue('notebookSummaryStatus', t.notebookSummaryStatusInProgress(processedCount, totalNotesCount));

					let summary = '';
					if (note.body && note.body.trim().length > 0) {
						try {
							summary = await AiService.chat([
								{ role: 'system', content: t.notebookSummarySystemPrompt },
								{ role: 'user', content: `Tytuł: ${note.title}\n\nTreść:\n${note.body}` }
							]);
						} catch (e: any) {
							console.error(`Błąd podczas generowania opisu dla notatki ${note.id}:`, e);
							summary = `(Nie udało się wygenerować opisu: ${e.message || String(e)})`;
						}
					} else {
						summary = '(Notatka jest pusta)';
					}

					markdownOutput += `${indent}- **${note.title || 'Bez tytułu'}**\n`;
					const lines = summary.trim().split('\n');
					for (const line of lines) {
						markdownOutput += `${indent}  > ${line}\n`;
					}
					markdownOutput += '\n';
				}

				for (const child of node.children) {
					await renderFolderNode(child, depth + 1);
				}
			};

			// Renderujemy całe drzewo notatników
			for (const rootNode of folderTree) {
				await renderFolderNode(rootNode, 1);
			}

			if (totalNotesCount === 0) {
				markdownOutput += `*${t.emptyNotebookNotice}*\n`;
			}

			// 4. Zapisujemy skonsolidowany spis w JEDNEJ notatce wewnątrz kategorii "Spis zawartości notatek"
			const existingIndexNotes = await this.getNotesInFolder(indexFolderId);
			if (existingIndexNotes.length > 0) {
				// Nadpisujemy pierwszą notatkę spisu, a ewentualne pozostałe duplikaty notatek wewnątrz tej kategorii usuwamy
				const mainIndexNote = existingIndexNotes[0];
				await joplin.data.put(['notes', mainIndexNote.id], null, {
					title: t.notebookSummaryNoteTitle,
					body: markdownOutput,
				});

				for (let i = 1; i < existingIndexNotes.length; i++) {
					try {
						await joplin.data.delete(['notes', existingIndexNotes[i].id]);
					} catch (e) {
						console.warn('Błąd usuwania duplikatu notatki spisu:', e);
					}
				}
			} else {
				await joplin.data.post(['notes'], null, {
					title: t.notebookSummaryNoteTitle,
					body: markdownOutput,
					parent_id: indexFolderId,
				});
			}

			// Status sukcesu w Ustawieniach
			await joplin.settings.setValue(
				'notebookSummaryStatus',
				t.notebookSummaryStatusCompleted(totalNotesCount, totalNotebooksCount, dateStr)
			);

			await joplin.views.dialogs.showMessageBox(t.notebookSummaryCategoryNotice(t.notebookSummaryCategoryTitle));
		} catch (error: any) {
			console.error('Błąd podczas generowania spisu zawartości notatników:', error);
			await joplin.settings.setValue(
				'notebookSummaryStatus',
				t.notebookSummaryStatusError(error.message || String(error))
			);
			throw error;
		}
	}
}
