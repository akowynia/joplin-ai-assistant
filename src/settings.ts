const joplin = require('api');
import { SettingItemType } from 'api/types';
import { SETTINGS_SECTION_ID, OLLAMA_DEFAULT_URL, REMOTE_API_DEFAULT_URL } from './utils/constants';
import { getLanguage, translations } from './utils/i18n';

function createSettingsDefinitions(t: any) {
	return {
		'appLanguage': {
			value: 'auto',
			type: SettingItemType.String,
			section: SETTINGS_SECTION_ID,
			isEnum: true,
			options: {
				'auto': t.settingLanguageAuto,
				'en': 'English',
				'pl': 'Polski',
			},
			public: true,
			label: t.settingLanguageLabel,
			description: t.settingLanguageDescription,
		},

		'aiMode': {
			value: 'local',
			type: SettingItemType.String,
			section: SETTINGS_SECTION_ID,
			isEnum: true,
			options: {
				'local': t.settingAiModeLocal,
				'remote': t.settingAiModeRemote,
			},
			public: true,
			label: t.settingAiModeLabel,
		},

		'localOllamaUrl': {
			value: OLLAMA_DEFAULT_URL,
			type: SettingItemType.String,
			section: SETTINGS_SECTION_ID,
			public: true,
			label: t.settingLocalOllamaUrlLabel,
		},

		'remoteApiUrl': {
			value: REMOTE_API_DEFAULT_URL,
			type: SettingItemType.String,
			section: SETTINGS_SECTION_ID,
			public: true,
			label: t.settingRemoteApiUrlLabel,
		},

		'remoteApiKey': {
			value: '',
			type: SettingItemType.String,
			section: SETTINGS_SECTION_ID,
			public: true,
			secure: true,
			label: t.settingRemoteApiKeyLabel,
		},

		'selectedModel': {
			value: 'llama3.3',
			type: SettingItemType.String,
			section: SETTINGS_SECTION_ID,
			public: true,
			label: t.settingSelectedModelLabel,
			description: t.settingSelectedModelDesc,
		},

		'selectModelButton': {
			type: SettingItemType.Button,
			section: SETTINGS_SECTION_ID,
			public: true,
			label: t.settingSelectModelBtnLabel,
		},

		'remoteModelsList': {
			value: '[]',
			type: SettingItemType.String,
			section: SETTINGS_SECTION_ID,
			public: false, // Hidden, used for internal storage
		},

		'searchProvider': {
			value: 'tavily',
			type: SettingItemType.String,
			section: SETTINGS_SECTION_ID,
			isEnum: true,
			options: {
				'tavily': 'Tavily',
				'serper': 'Serper.dev',
			},
			public: true,
			label: t.settingSearchProviderLabel,
		},

		'tavilyApiKey': {
			value: '',
			type: SettingItemType.String,
			section: SETTINGS_SECTION_ID,
			public: true,
			secure: true,
			label: t.settingTavilyApiKeyLabel,
		},

		'serperApiKey': {
			value: '',
			type: SettingItemType.String,
			section: SETTINGS_SECTION_ID,
			public: true,
			secure: true,
			label: t.settingSerperApiKeyLabel,
		},

		'autoTagNewNotes': {
			value: false,
			type: SettingItemType.Bool,
			section: SETTINGS_SECTION_ID,
			public: true,
			label: t.settingAutoTagNewNotesLabel,
			description: t.settingAutoTagNewNotesDesc,
		},

		'autoTaggingStatus': {
			value: t.taggingStatusNotStarted,
			type: SettingItemType.String,
			section: SETTINGS_SECTION_ID,
			public: true,
			readOnly: true,
			label: t.settingAutoTaggingStatusLabel,
		},

		'notebookSummaryStatus': {
			value: t.notebookSummaryStatusNotStarted,
			type: SettingItemType.String,
			section: SETTINGS_SECTION_ID,
			public: true,
			readOnly: true,
			label: t.settingNotebookSummaryStatusLabel,
		},

		'runAutoTaggingButton': {
			type: SettingItemType.Button,
			section: SETTINGS_SECTION_ID,
			public: true,
			label: t.settingRunAutoTaggingBtnLabel,
		},

		'autoTagProcessedNoteIds': {
			value: '[]',
			type: SettingItemType.String,
			section: SETTINGS_SECTION_ID,
			public: false,
		},

		'autoTagInitialRunDone': {
			value: false,
			type: SettingItemType.Bool,
			section: SETTINGS_SECTION_ID,
			public: false,
		},
	};
}

export async function registerAllSettings() {
	const initialLang = await getLanguage();
	let t = translations[initialLang];

	await joplin.settings.registerSection(SETTINGS_SECTION_ID, {
		label: t.settingSectionLabel,
		iconName: 'fas fa-robot',
	});

	await joplin.settings.registerSettings(createSettingsDefinitions(t));

	// Re-verify if an explicit saved user language was retrieved after schema registration
	try {
		const effectiveLang = await getLanguage();
		if (effectiveLang !== initialLang) {
			t = translations[effectiveLang];
			await joplin.settings.registerSection(SETTINGS_SECTION_ID, {
				label: t.settingSectionLabel,
				iconName: 'fas fa-robot',
			});
			await joplin.settings.registerSettings(createSettingsDefinitions(t));
		}
	} catch (e) {
		// Ignore check errors during bootstrap
	}
}
