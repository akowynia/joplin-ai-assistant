const joplin = require('api');
import { registerAllSettings } from './settings';
import { ActionHandlers } from './handlers/actionHandlers';
import { AiService } from './services/aiService';
import { TaggingService } from './services/taggingService';
import { ChatPanel } from './views/chatPanel';
import { getTranslation } from './utils/i18n';

console.info('Joplin AI Assistant: Script file loaded');

joplin.plugins.register({
	onStart: async function() {
		console.info('Joplin AI Assistant plugin starting...');
		try {
			// Register settings
			await registerAllSettings();

			// Listen for settings changes
			await joplin.settings.onChange(async (event: { keys: string[] }) => {
				if (event.keys.includes('appLanguage') || event.keys.includes('locale')) {
					await registerAllSettings();
					await ChatPanel.refresh();
				} else if (event.keys.includes('selectedModel')) {
					await ChatPanel.refresh();
				}
			});

			const t = await getTranslation();

			// Initialize chat panel
			await ChatPanel.init();

			// Toggle chat command
			await joplin.commands.register({
				name: 'aiToggleChat',
				label: t.cmdToggleChatLabel,
				iconName: 'fas fa-comments',
				execute: async () => {
					await ChatPanel.toggle();
				},
			});

			// Register commands
			await joplin.commands.register({
				name: 'aiGrammar',
				label: t.cmdGrammarLabel,
				iconName: 'fas fa-magic',
				execute: async () => {
					await ActionHandlers.handleGrammarCorrection();
				},
			});

			await joplin.commands.register({
				name: 'aiMarkdown',
				label: t.cmdMarkdownLabel,
				iconName: 'fas fa-file-code',
				execute: async () => {
					await ActionHandlers.handleMarkdownFormatting();
				},
			});

			await joplin.commands.register({
				name: 'aiSearch',
				label: t.cmdSearchLabel,
				execute: async () => {
					await ActionHandlers.handleWebSearchAndRedact();
				},
			});

			await joplin.commands.register({
				name: 'aiSummary',
				label: t.cmdSummaryLabel,
				execute: async () => {
					await ActionHandlers.handleSummaryGeneration();
				},
			});

			await joplin.commands.register({
				name: 'aiNotebookSummary',
				label: t.cmdNotebookSummaryLabel,
				iconName: 'fas fa-book-open',
				execute: async () => {
					await ActionHandlers.handleNotebookSummaryGeneration();
				},
			});

			await joplin.commands.register({
				name: 'aiAutoTagAll',
				label: t.cmdAutoTagAllLabel,
				iconName: 'fas fa-tags',
				execute: async () => {
					await ActionHandlers.handleAutoTagAllNotes();
				},
			});

			await joplin.commands.register({
				name: 'aiRefreshModels',
				label: t.cmdRefreshModelsLabel,
				execute: async () => {
					const langT = await getTranslation();
					const models = await AiService.getLocalModels();
					if (models.length > 0) {
						const result = await joplin.views.dialogs.showMessageBox(`${langT.availableModelsTitle(models.join(', '))}\n\n${langT.setFirstModelPrompt(models[0])}`);
						if (result === 0) {
							await joplin.settings.setValue('selectedModel', models[0]);
						}
					} else {
						await joplin.views.dialogs.showMessageBox(langT.noModelsFound);
					}
				},
			});

			// Register command for model selection button in settings
			await joplin.commands.register({
				name: 'selectModelButton',
				execute: async () => {
					const langT = await getTranslation();
					const models = await AiService.getLocalModels();
					if (models.length === 0) {
						await joplin.views.dialogs.showMessageBox(langT.cannotFetchModelsError);
						return;
					}

					const buttons = models.slice(0, 5); // Max 5 models as buttons for UI safety
					const result = await joplin.views.dialogs.showMessageBox(langT.selectModelDialogTitle, {
						buttons: buttons,
					});

					if (result >= 0) {
						const selected = buttons[result];
						await joplin.settings.setValue('selectedModel', selected);
						await joplin.views.dialogs.showMessageBox(langT.modelSetNotice(selected));
					}
				},
			});

			// Register command for manual tagging button in settings
			await joplin.commands.register({
				name: 'runAutoTaggingButton',
				execute: async () => {
					await ActionHandlers.handleAutoTagAllNotes();
				},
			});

			// UI - Main menu (Tools)
			await joplin.views.menus.create('aiMenu', 'AI Assistant', [
				{ commandName: 'aiToggleChat', label: t.menuToggleChatLabel },
				{ commandName: 'aiGrammar', label: t.menuGrammarLabel },
				{ commandName: 'aiMarkdown', label: t.menuMarkdownLabel },
				{ commandName: 'aiSearch', label: t.menuSearchLabel },
				{ commandName: 'aiSummary', label: t.menuSummaryLabel },
				{ commandName: 'aiNotebookSummary', label: t.menuNotebookSummaryLabel },
				{ commandName: 'aiAutoTagAll', label: t.menuAutoTagAllLabel },
				{ commandName: 'aiRefreshModels', label: t.menuRefreshModelsLabel },
			], 'tools');

			// UI - Toolbar buttons
			await joplin.views.toolbarButtons.create('aiToggleChatBtn', 'aiToggleChat', 'editor');
			await joplin.views.toolbarButtons.create('aiGrammarBtn', 'aiGrammar', 'editor');
			await joplin.views.toolbarButtons.create('aiMarkdownBtn', 'aiMarkdown', 'editor');

			// UI - Context menu
			await joplin.views.menuItems.create('aiContextGrammar', 'aiGrammar', 'canvas');
			await joplin.views.menuItems.create('aiContextSearch', 'aiSearch', 'canvas');

			// Background timer for auto-tagging new notes after 24h
			setTimeout(() => {
				TaggingService.checkAndTagNewNotes24h();
			}, 10000); // Initial check 10s after startup

			setInterval(() => {
				TaggingService.checkAndTagNewNotes24h();
			}, 15 * 60 * 1000); // Check every 15 minutes

			console.info('Joplin AI Assistant plugin started successfully');
		} catch (error) {
			console.error('Error starting Joplin AI Assistant plugin:', error);
		}
	},
});
