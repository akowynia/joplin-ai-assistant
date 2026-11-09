export interface ChatHtmlParams {
	t: any;
	currentModel: string;
	activeMode: 'ask' | 'edit';
	noteTitle: string;
	lang?: string;
}

function escapeHtml(text: string): string {
	if (!text) return '';
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

export function getChatHtml(params: ChatHtmlParams): string {
	const { t, currentModel, activeMode, noteTitle, lang = 'pl' } = params;
	const safeModel = escapeHtml(currentModel || 'LLM');
	const safeNoteTitle = escapeHtml(noteTitle || '');

	return `
<!DOCTYPE html>
<html lang="${escapeHtml(lang)}">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${escapeHtml(t.chatTitle)}</title>
	<style>
		:root {
			--bg-color: var(--joplin-background-color, #1d1e24);
			--text-color: var(--joplin-color, #dddddd);
			--border-color: var(--joplin-divider-color, #333644);
			--card-bg: var(--joplin-background-color3, #282a36);
			--user-msg-bg: #2b4c7e;
			--ai-msg-bg: #2d313f;
			--accent-color: #4b6cb7;
			--accent-hover: #182848;
			--notice-bg: #2a2d1d;
			--notice-border: #8a7300;
			--notice-text: #e6c86e;
		}

		* {
			box-sizing: border-box;
			margin: 0;
			padding: 0;
		}

		html, body {
			width: 100%;
			height: 100%;
			margin: 0;
			padding: 0;
			overflow: hidden;
			background-color: var(--bg-color);
			color: var(--text-color);
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
			font-size: 13px;
			line-height: 1.4;
		}

		/* Górna sekcja (nagłówek + powiadomienie trybu) przymocowana na stałe */
		.top-wrapper {
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			z-index: 10;
			background-color: var(--card-bg);
		}

		.chat-header {
			padding: 10px 12px;
			background-color: var(--card-bg);
			border-bottom: 1px solid var(--border-color);
			display: flex;
			flex-direction: column;
			gap: 6px;
		}

		.header-top {
			display: flex;
			justify-content: space-between;
			align-items: center;
		}

		.title-container {
			display: flex;
			align-items: center;
			gap: 6px;
			font-weight: 600;
			font-size: 13px;
		}

		.model-badge {
			font-size: 11px;
			padding: 2px 6px;
			border-radius: 4px;
			background-color: var(--border-color);
			color: var(--text-color);
			max-width: 140px;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.btn-clear {
			background: none;
			border: 1px solid var(--border-color);
			color: var(--text-color);
			padding: 3px 8px;
			border-radius: 4px;
			cursor: pointer;
			font-size: 11px;
			transition: background 0.2s;
		}

		.btn-clear:hover {
			background-color: var(--border-color);
		}

		.note-info {
			font-size: 11px;
			opacity: 0.85;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
			font-weight: 500;
		}

		/* Mode Selector Tabs */
		.mode-selector {
			display: flex;
			background: var(--bg-color);
			padding: 2px;
			border-radius: 6px;
			border: 1px solid var(--border-color);
			margin-top: 4px;
		}

		.mode-btn {
			flex: 1;
			padding: 6px 4px;
			border: none;
			background: none;
			color: var(--text-color);
			font-size: 11px;
			font-weight: 500;
			border-radius: 4px;
			cursor: pointer;
			text-align: center;
			transition: all 0.2s ease;
		}

		.mode-btn.active {
			background-color: var(--accent-color);
			color: #ffffff;
			font-weight: 600;
		}

		/* Mode Notice */
		.mode-notice {
			padding: 8px 12px;
			font-size: 11px;
			border-bottom: 1px solid var(--border-color);
			background-color: var(--card-bg);
			line-height: 1.35;
		}

		.mode-notice.edit-notice {
			background-color: var(--notice-bg);
			border-bottom-color: var(--notice-border);
			color: var(--notice-text);
		}

		/* Środkowy kontener wiadomości z własnym pakiem przewijania */
		.messages-container {
			position: absolute;
			top: 135px;
			bottom: 110px;
			left: 0;
			right: 0;
			overflow-y: auto;
			padding: 12px;
			display: flex;
			flex-direction: column;
			gap: 12px;
		}

		.message {
			display: flex;
			flex-direction: column;
			max-width: 90%;
			border-radius: 8px;
			padding: 8px 12px;
			word-wrap: break-word;
			animation: fadeIn 0.2s ease;
		}

		@keyframes fadeIn {
			from { opacity: 0; transform: translateY(4px); }
			to { opacity: 1; transform: translateY(0); }
		}

		.message.user {
			align-self: flex-end;
			background-color: var(--user-msg-bg);
			color: #ffffff;
			border-bottom-right-radius: 2px;
		}

		.message.assistant {
			align-self: flex-start;
			background-color: var(--ai-msg-bg);
			border: 1px solid var(--border-color);
			border-bottom-left-radius: 2px;
			max-width: 95%;
		}

		.msg-role {
			font-size: 10px;
			font-weight: 600;
			text-transform: uppercase;
			margin-bottom: 4px;
			opacity: 0.7;
		}

		.msg-content {
			white-space: pre-wrap;
		}

		.msg-actions {
			margin-top: 8px;
			padding-top: 6px;
			border-top: 1px solid rgba(255, 255, 255, 0.1);
			display: flex;
			gap: 6px;
			flex-wrap: wrap;
		}

		.action-btn {
			background: var(--card-bg);
			border: 1px solid var(--border-color);
			color: var(--text-color);
			padding: 3px 6px;
			border-radius: 4px;
			font-size: 10px;
			cursor: pointer;
			transition: background 0.2s;
		}

		.action-btn:hover {
			background: var(--border-color);
		}

		/* Dolna sekcja (szybkie akcje + wpisywanie wiadomości) przymocowana na stałe */
		.bottom-wrapper {
			position: absolute;
			bottom: 0;
			left: 0;
			right: 0;
			z-index: 10;
			background-color: var(--card-bg);
		}

		.quick-chips {
			padding: 6px 12px;
			display: flex;
			gap: 6px;
			overflow-x: auto;
			border-top: 1px solid var(--border-color);
			background: var(--card-bg);
		}

		.chip {
			background: var(--bg-color);
			border: 1px solid var(--border-color);
			color: var(--text-color);
			padding: 4px 8px;
			border-radius: 12px;
			font-size: 11px;
			white-space: nowrap;
			cursor: pointer;
			transition: all 0.2s;
		}

		.chip:hover {
			background: var(--accent-color);
			color: #ffffff;
			border-color: var(--accent-color);
		}

		.chip.edit-action-chip {
			border-color: var(--notice-border);
		}

		/* Loading indicator */
		.thinking-indicator {
			align-self: flex-start;
			display: flex;
			align-items: center;
			gap: 6px;
			padding: 8px 12px;
			background: var(--ai-msg-bg);
			border: 1px solid var(--border-color);
			border-radius: 8px;
			font-style: italic;
			font-size: 11px;
			opacity: 0.8;
		}

		.spinner {
			width: 12px;
			height: 12px;
			border: 2px solid var(--border-color);
			border-top-color: var(--accent-color);
			border-radius: 50%;
			animation: spin 0.8s linear infinite;
		}

		@keyframes spin {
			to { transform: rotate(360deg); }
		}

		/* Input area */
		.input-container {
			padding: 10px;
			background-color: var(--card-bg);
			border-top: 1px solid var(--border-color);
			display: flex;
			gap: 6px;
		}

		textarea {
			flex: 1;
			background-color: var(--bg-color);
			color: var(--text-color);
			border: 1px solid var(--border-color);
			border-radius: 6px;
			padding: 8px;
			font-size: 12px;
			font-family: inherit;
			resize: none;
			height: 54px;
			outline: none;
		}

		textarea:focus {
			border-color: var(--accent-color);
		}

		.btn-send {
			background-color: var(--accent-color);
			color: #ffffff;
			border: none;
			border-radius: 6px;
			padding: 0 14px;
			font-weight: 600;
			font-size: 12px;
			cursor: pointer;
			transition: background 0.2s;
		}

		.btn-send:hover {
			background-color: var(--accent-hover);
		}

		.btn-send:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	</style>
</head>
<body>

	<!-- Top pinned wrapper -->
	<div class="top-wrapper" id="top-wrapper">
		<div class="chat-header">
			<div class="header-top">
				<div class="title-container">
					<span>💬 ${escapeHtml(t.chatTitle)}</span>
					<span class="model-badge" id="model-badge" title="${safeModel}">${safeModel}</span>
				</div>
				<button type="button" class="btn-clear" id="btn-clear" title="${escapeHtml(t.chatClearHistoryBtn)}">🗑️</button>
			</div>
			<div class="note-info" id="note-info-text">
				📄 ${safeNoteTitle ? safeNoteTitle : escapeHtml(t.chatNoNoteSelected)}
			</div>

			<!-- Mode selector -->
			<div class="mode-selector">
				<button type="button" class="mode-btn ${activeMode === 'ask' ? 'active' : ''}" id="mode-ask-btn">
					${escapeHtml(t.chatModeAsk)}
				</button>
				<button type="button" class="mode-btn ${activeMode === 'edit' ? 'active' : ''}" id="mode-edit-btn">
					${escapeHtml(t.chatModeEdit)}
				</button>
			</div>
		</div>

		<!-- Mode Description / Version History Notice -->
		<div class="mode-notice ${activeMode === 'edit' ? 'edit-notice' : ''}" id="mode-notice-bar" data-ask-desc="${escapeHtml(t.chatModeAskDesc || '')}" data-edit-notice="${escapeHtml(t.chatVersionHistoryNotice || '')}">
			${escapeHtml(activeMode === 'edit' ? t.chatVersionHistoryNotice : t.chatModeAskDesc)}
		</div>
	</div>

	<!-- Center messages container -->
	<div class="messages-container" id="messages-list"
		data-text-user="${escapeHtml(t.chatUserRole || 'User')}"
		data-text-assistant="${escapeHtml(t.chatAssistantRole || 'AI Assistant')}"
		data-text-insert="${escapeHtml(t.chatInsertAtCursor || 'Insert at cursor')}"
		data-text-append="${escapeHtml(t.chatAppendNote || 'Append to end')}"
		data-text-restore="${escapeHtml(t.chatRestoreOriginalBtn || 'Restore pre-edit version')}"
		data-text-thinking="${escapeHtml(t.chatThinking || 'AI is thinking...')}"
		data-text-no-note="${escapeHtml(t.chatNoNoteSelected || 'No note open. Select a note from the list to start chatting.')}">
		<!-- Dynamic messages -->
	</div>

	<!-- Bottom pinned wrapper -->
	<div class="bottom-wrapper" id="bottom-wrapper">
		<!-- Quick Chips with attributes for Ask and Edit modes -->
		<div class="quick-chips" id="quick-chips-container" 
			data-ask-chip1="${escapeHtml(t.chatQuickSummary || '')}" 
			data-ask-prompt1="${escapeHtml(t.chatQuickSummaryPrompt || t.chatQuickSummary || '')}"
			data-ask-chip2="${escapeHtml(t.chatQuickExplain || '')}" 
			data-ask-prompt2="${escapeHtml(t.chatQuickExplainPrompt || t.chatQuickExplain || '')}"
			data-ask-chip3="${escapeHtml(t.chatQuickSources || '')}"
			data-ask-prompt3="${escapeHtml(t.chatQuickSourcesPrompt || t.chatQuickSources || '')}"
			data-edit-chip1="${escapeHtml(t.chatQuickEditRewrite || '')}"
			data-edit-prompt1="${escapeHtml(t.chatQuickEditRewritePrompt || t.chatQuickEditRewrite || '')}"
			data-edit-chip2="${escapeHtml(t.chatQuickEditTable || '')}"
			data-edit-prompt2="${escapeHtml(t.chatQuickEditTablePrompt || t.chatQuickEditTable || '')}"
			data-edit-chip3="${escapeHtml(t.chatQuickEditTitle || '')}"
			data-edit-chip4="${escapeHtml(t.chatQuickEditTags || '')}">
		</div>

		<div class="input-container">
			<textarea id="chat-input" placeholder="${escapeHtml(t.chatPlaceholder)}"></textarea>
			<button type="button" class="btn-send" id="btn-send">${escapeHtml(t.chatSendBtn)}</button>
		</div>
	</div>

</body>
</html>
	`;
}
