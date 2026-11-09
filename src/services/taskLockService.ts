const joplin = require('api');
import { getTranslation } from '../utils/i18n';

export class TaskLockService {
	private static isBusy: boolean = false;
	private static currentTaskName: string | null = null;

	/**
	 * Sprawdza, czy jakiekolwiek zadanie AI jest obecnie wykonywane.
	 */
	public static isLocked(): boolean {
		return this.isBusy;
	}

	/**
	 * Pobiera nazwę aktualnie wykonywanego zadania (jeśli istnieje).
	 */
	public static getCurrentTaskName(): string | null {
		return this.currentTaskName;
	}

	/**
	 * Uruchamia zadanie AI z blokadą współbieżności.
	 * Jeśli inne zadanie jest już w trakcie, wyświetla komunikat użytkownikowi (lub pomija dla zadań w tle).
	 */
	public static async runWithLock<T>(
		taskName: string,
		taskFn: () => Promise<T>,
		isBackground: boolean = false
	): Promise<T | null> {
		if (this.isBusy) {
			if (!isBackground) {
				const t = await getTranslation();
				await joplin.views.dialogs.showMessageBox(
					t.taskAlreadyRunningNotice(this.currentTaskName || '')
				);
			} else {
				console.info(`Joplin AI Assistant: Zadanie "${taskName}" zostało pominięte, ponieważ trwa już zadanie "${this.currentTaskName}".`);
			}
			return null;
		}

		this.isBusy = true;
		this.currentTaskName = taskName;

		try {
			return await taskFn();
		} finally {
			this.isBusy = false;
			this.currentTaskName = null;
		}
	}
}
