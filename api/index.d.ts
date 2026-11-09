import { SettingItemType } from './types';

interface Joplin {
	plugins: {
		register(plugin: any): Promise<void>;
	};
	settings: {
		registerSection(name: string, section: any): Promise<void>;
		registerSettings(settings: any): Promise<void>;
		value(name: string): Promise<any>;
		setValue?(name: string, value: any): Promise<void>;
		globalValue?(name: string): Promise<any>;
		globalValues?(names: string[]): Promise<any[]>;
		onChange?(handler: (event: { keys: string[] }) => void | Promise<void>): Promise<void>;
	};
	commands: {
		register(command: any): Promise<void>;
		execute(name: string, ...args: any[]): Promise<any>;
	};
	data: {
		get(path: string[], query?: any): Promise<any>;
		post(path: string[], query: any, body?: any): Promise<any>;
	};
	workspace: {
		selectedNote(): Promise<any>;
	};
	views: {
		toolbarButtons: {
			create(id: string, commandName: string, location: string): Promise<void>;
		};
		menuItems: {
			create(id: string, commandName: string, location: string): Promise<void>;
		};
		dialogs: {
			showMessageBox(message: string): Promise<void>;
		};
	};
}

const joplin: Joplin;
export default joplin;
export { SettingItemType };
