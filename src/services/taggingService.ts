const joplin = require('api');
import { AiService } from './aiService';
import { TaskLockService } from './taskLockService';
import { getTranslation } from '../utils/i18n';

export class TaggingService {
	/**
	 * Pobiera zbiorczą listę przetworzonych notatek z wewnętrznego ustawienia
	 */
	private static async getProcessedNoteIds(): Promise<Set<string>> {
		try {
			const jsonStr = await joplin.settings.value('autoTagProcessedNoteIds');
			const arr = JSON.parse(jsonStr || '[]');
			return new Set<string>(arr);
		} catch (e) {
			return new Set<string>();
		}
	}

	/**
	 * Zapisuje listę przetworzonych notatek w ustawieniach
	 */
	private static async saveProcessedNoteIds(ids: Set<string>): Promise<void> {
		const arr = Array.from(ids);
		await joplin.settings.setValue('autoTagProcessedNoteIds', JSON.stringify(arr));
	}

	/**
	 * Pobiera wszystkie notatki z Joplin uwzględniając strony (pagination)
	 */
	private static async getAllNotes(): Promise<any[]> {
		let page = 1;
		let allNotes: any[] = [];
		let hasMore = true;

		while (hasMore) {
			const response = await joplin.data.get(['notes'], {
				fields: ['id', 'title', 'body', 'user_created_time', 'created_time', 'is_conflict', 'deleted_time'],
				page: page,
				limit: 50,
			});

			const items = response.items || [];
			allNotes = allNotes.concat(items.filter((n: any) => !n.is_conflict && !n.deleted_time));
			hasMore = response.has_more;
			page++;
		}

		return allNotes;
	}

	/**
	 * Pobiera mapę wszystkich istniejących tagów (nazwa_małe_litery -> id)
	 */
	private static async getExistingTagsMap(): Promise<Map<string, string>> {
		let page = 1;
		let hasMore = true;
		const tagMap = new Map<string, string>();

		while (hasMore) {
			const response = await joplin.data.get(['tags'], {
				fields: ['id', 'title'],
				page: page,
				limit: 50,
			});

			const items = response.items || [];
			for (const t of items) {
				tagMap.set(t.title.toLowerCase(), t.id);
			}

			hasMore = response.has_more;
			page++;
		}

		return tagMap;
	}

	/**
	 * Pobiera ID istniejącego tagu lub tworzy nowy tag w Joplin
	 */
	private static async getOrCreateTagId(tagTitle: string, tagMap: Map<string, string>): Promise<string> {
		const cleanTitle = tagTitle.replace(/^["'#\s]+|["'\s]+$/g, '').trim();
		if (!cleanTitle) return '';

		const key = cleanTitle.toLowerCase();
		if (tagMap.has(key)) {
			return tagMap.get(key)!;
		}

		const newTag = await joplin.data.post(['tags'], null, { title: cleanTitle });
		tagMap.set(key, newTag.id);
		return newTag.id;
	}

	/**
	 * Ręczne tagowanie pojedynczej notatki na żądanie (np. z panela czatu)
	 */
	public static async tagCurrentNote(noteId: string, noteTitle: string, noteBody: string): Promise<string[]> {
		if (!noteId || !noteBody || noteBody.trim().length === 0) {
			return [];
		}

		const tagMap = await this.getExistingTagsMap();
		const t = await getTranslation();
		const response = await AiService.chat([
			{ role: 'system', content: t.taggingSystemPrompt },
			{ role: 'user', content: `Tytuł: ${noteTitle || 'Bez tytułu'}\n\nTreść:\n${noteBody}` },
		]);

		if (!response) return [];

		const rawTags = response.split(/[,;\n]/).map(s => s.trim().replace(/^#+/, '')).filter(Boolean);
		const appliedTags: string[] = [];

		for (const rawTag of rawTags) {
			const tagId = await this.getOrCreateTagId(rawTag, tagMap);
			if (tagId) {
				try {
					await joplin.data.post(['tags', tagId, 'notes'], null, { id: noteId });
					appliedTags.push(rawTag);
				} catch (err) {
					console.warn(`Nie udało się powiązać tagu ${tagId} z notatką ${noteId}:`, err);
				}
			}
		}

		return appliedTags;
	}

	/**
	 * Generuje tagi przez AI dla pojedynczej notatki i przypisuje je w Joplin
	 */
	public static async tagSingleNote(note: any, tagMap: Map<string, string>): Promise<boolean> {
		if (!note.body || note.body.trim().length === 0) {
			return false;
		}

		const t = await getTranslation();
		const response = await AiService.chat([
			{ role: 'system', content: t.taggingSystemPrompt },
			{ role: 'user', content: `Tytuł: ${note.title || 'Bez tytułu'}\n\nTreść:\n${note.body}` },
		]);

		if (!response) return false;

		const rawTags = response.split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
		for (const rawTag of rawTags) {
			const tagId = await this.getOrCreateTagId(rawTag, tagMap);
			if (tagId) {
				try {
					await joplin.data.post(['tags', tagId, 'notes'], null, { id: note.id });
				} catch (err) {
					console.warn(`Nie udało się powiązać tagu ${tagId} z notatką ${note.id}:`, err);
				}
			}
		}

		return true;
	}

	/**
	 * Ręczne tagowanie zbiorcze wszystkich notatek (z aktualizacją statusu)
	 */
	public static async runManualAutoTagging(): Promise<void> {
		const t = await getTranslation();
		await TaskLockService.runWithLock(t.taskNameAutoTagging, async () => {
			try {
				await joplin.settings.setValue('autoTaggingStatus', t.taggingStatusInProgress(0, 0));
				const notes = await this.getAllNotes();
				const total = notes.length;
				const tagMap = await this.getExistingTagsMap();
				const processedSet = await this.getProcessedNoteIds();

				let count = 0;
				for (let i = 0; i < total; i++) {
					const note = notes[i];
					await joplin.settings.setValue('autoTaggingStatus', t.taggingStatusInProgress(i + 1, total));

					if (note.body && note.body.trim().length > 0) {
						try {
							await this.tagSingleNote(note, tagMap);
						} catch (e) {
							console.error(`Błąd tagowania notatki ${note.id}:`, e);
						}
					}
					processedSet.add(note.id);
					count++;

					if (count % 5 === 0) {
						await this.saveProcessedNoteIds(processedSet);
					}
				}

				await this.saveProcessedNoteIds(processedSet);
				await joplin.settings.setValue('autoTagInitialRunDone', true);

				const now = new Date();
				const dateStr = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
				await joplin.settings.setValue('autoTaggingStatus', t.taggingStatusCompleted(total, dateStr));
			} catch (error: any) {
				console.error('Błąd podczas ręcznego tagowania notatek:', error);
				await joplin.settings.setValue('autoTaggingStatus', t.taggingStatusError(error.message || String(error)));
			}
		}, false);
	}

	/**
	 * Automatyczne tagowanie nowych notatek po 24h od utworzenia (uruchamiane w tle)
	 */
	public static async checkAndTagNewNotes24h(): Promise<void> {
		const autoTagNew = await joplin.settings.value('autoTagNewNotes');
		const initialRunDone = await joplin.settings.value('autoTagInitialRunDone');

		if (!autoTagNew || !initialRunDone) {
			return;
		}

		const t = await getTranslation();
		await TaskLockService.runWithLock(t.taskNameAutoTagging, async () => {
			try {
				const notes = await this.getAllNotes();
				const processedSet = await this.getProcessedNoteIds();
				const cutoffTime = Date.now() - 24 * 60 * 60 * 1000;

				const candidates = notes.filter((n: any) => {
					const createdTime = n.user_created_time || n.created_time || 0;
					return createdTime <= cutoffTime && !processedSet.has(n.id) && n.body && n.body.trim().length > 0;
				});

				if (candidates.length === 0) {
					return;
				}

				console.info(`Joplin AI Assistant: Odnaleziono ${candidates.length} nowych notatek (>24h) do otagowania.`);
				const tagMap = await this.getExistingTagsMap();

				for (const note of candidates) {
					try {
						await this.tagSingleNote(note, tagMap);
					} catch (err) {
						console.error(`Błąd automatycznego tagowania nowej notatki ${note.id}:`, err);
					}
					processedSet.add(note.id);
				}

				await this.saveProcessedNoteIds(processedSet);
			} catch (error) {
				console.error('Błąd podczas automatycznego tagowania nowych notatek po 24h:', error);
			}
		}, true);
	}
}
