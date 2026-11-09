const joplin = require('api');
import { BACKUP_FOLDER_NAME } from '../utils/constants';
import { getTranslation } from '../utils/i18n';

export class JoplinService {
	private static aiFolderId: string | null = null;

	/**
	 * Pobiera lub tworzy folder na notatki AI
	 */
	public static async getOrCreateAiFolder(): Promise<string> {
		if (this.aiFolderId) return this.aiFolderId;

		const t = await getTranslation();
		const targetFolderName = t.backupFolderName;

		const folders = await joplin.data.get(['folders']);
		const folder = folders.items.find((f: any) => f.title === targetFolderName || f.title === 'Notatki ai' || f.title === 'AI Notes' || f.title === BACKUP_FOLDER_NAME);

		if (folder) {
			this.aiFolderId = folder.id;
		} else {
			const newFolder = await joplin.data.post(['folders'], null, { title: targetFolderName });
			this.aiFolderId = newFolder.id;
		}

		return this.aiFolderId!;
	}

	/**
	 * Tworzy kopię zapasową aktualnej notatki
	 */
	public static async backupNote(noteId: string): Promise<void> {
		const t = await getTranslation();
		const note = await joplin.data.get(['notes', noteId], { fields: ['title', 'body', 'parent_id'] });
		const aiFolderId = await this.getOrCreateAiFolder();

		await joplin.data.post(['notes'], null, {
			title: t.backupNoteTitle(note.title),
			body: note.body,
			parent_id: aiFolderId,
		});
	}

	/**
	 * Tworzy nową notatkę z podsumowaniem
	 */
	public static async createSummaryNote(title: string, content: string): Promise<void> {
		const t = await getTranslation();
		const aiFolderId = await this.getOrCreateAiFolder();
		await joplin.data.post(['notes'], null, {
			title: t.summaryNoteTitle(title),
			body: content,
			parent_id: aiFolderId,
		});
	}
}
