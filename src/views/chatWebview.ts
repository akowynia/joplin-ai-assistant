declare const webviewApi: any;

function initChatWebview() {
	const topWrapper = document.getElementById('top-wrapper');
	const bottomWrapper = document.getElementById('bottom-wrapper');
	const messagesList = document.getElementById('messages-list');
	const chatInput = document.getElementById('chat-input') as HTMLTextAreaElement;
	const btnSend = document.getElementById('btn-send');
	const btnClear = document.getElementById('btn-clear');
	const modeAskBtn = document.getElementById('mode-ask-btn');
	const modeEditBtn = document.getElementById('mode-edit-btn');
	const modeNoticeBar = document.getElementById('mode-notice-bar');
	const noteInfoText = document.getElementById('note-info-text');
	const modelBadge = document.getElementById('model-badge');
	const quickChipsContainer = document.getElementById('quick-chips-container');

	let currentMode: 'ask' | 'edit' = 'ask';
	let lastMessagesJson = '';
	let lastNoteTitle = '';
	let lastModel = '';

	let labels = {
		user: messagesList?.getAttribute('data-text-user') || 'User',
		assistant: messagesList?.getAttribute('data-text-assistant') || 'AI Assistant',
		insertAtCursor: messagesList?.getAttribute('data-text-insert') || 'Insert at cursor',
		appendNote: messagesList?.getAttribute('data-text-append') || 'Append to end',
		restoreOriginal: messagesList?.getAttribute('data-text-restore') || 'Restore pre-edit version',
		thinking: messagesList?.getAttribute('data-text-thinking') || 'AI is thinking...',
		noNote: messagesList?.getAttribute('data-text-no-note') || 'No note open. Select a note from the list to start chatting.',
	};

	// Adjust layout heights dynamically
	function updateLayoutHeights() {
		if (topWrapper && bottomWrapper && messagesList) {
			const topH = topWrapper.offsetHeight || 135;
			const bottomH = bottomWrapper.offsetHeight || 110;
			messagesList.style.top = topH + 'px';
			messagesList.style.bottom = bottomH + 'px';
		}
	}

	window.addEventListener('resize', updateLayoutHeights);
	updateLayoutHeights();

	const getWebviewApi = (): any => {
		if (typeof webviewApi !== 'undefined') return webviewApi;
		if (typeof (window as any).webviewApi !== 'undefined') return (window as any).webviewApi;
		return null;
	};

	const api = getWebviewApi();

	async function sendApiMessage(payload: any) {
		if (!api) return;
		try {
			const response = await api.postMessage(payload);
			if (response) {
				handleStateUpdate(response);
			}
		} catch (e) {
			console.error('Błąd wysyłania komendy z Webview:', e);
		}
	}

	function cleanMarkdownOutput(text: string): string {
		if (!text) return '';
		let cleaned = text.trim();
		if (cleaned.startsWith('```markdown')) {
			cleaned = cleaned.replace(/^```markdown\s*/i, '').replace(/\s*```$/, '');
		} else if (cleaned.startsWith('```')) {
			cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
		}
		return cleaned.trim();
	}

	function renderMarkdownToHtml(rawText: string): string {
		const text = cleanMarkdownOutput(rawText);
		
		let html = text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');

		// Nagłówki (###, ##, #)
		html = html.replace(/^### (.*$)/gim, '<h3 style="margin: 6px 0; font-size: 13px;">$1</h3>');
		html = html.replace(/^## (.*$)/gim, '<h2 style="margin: 8px 0; font-size: 14px;">$1</h2>');
		html = html.replace(/^# (.*$)/gim, '<h1 style="margin: 10px 0; font-size: 15px;">$1</h1>');

		// Pogrubienie **tekst**
		html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

		// Kursywa *tekst*
		html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

		// Listy punktowane (* tekst lub - tekst)
		html = html.replace(/^\s*[\*\-]\s+(.*$)/gim, '<li style="margin-left: 16px; margin-bottom: 2px;">$1</li>');

		// Nowe linie
		html = html.replace(/\n/g, '<br>');

		return html;
	}

	function renderQuickChips(mode: 'ask' | 'edit') {
		if (!quickChipsContainer) return;
		quickChipsContainer.innerHTML = '';

		let chips: { text: string; action: 'message' | 'generateTitle' | 'generateTags'; prompt?: string }[] = [];

		if (mode === 'ask') {
			const c1 = quickChipsContainer.getAttribute('data-ask-chip1') || '📌 Summarize note';
			const p1 = quickChipsContainer.getAttribute('data-ask-prompt1') || c1;
			const c2 = quickChipsContainer.getAttribute('data-ask-chip2') || '❓ Explain topics';
			const p2 = quickChipsContainer.getAttribute('data-ask-prompt2') || c2;
			const c3 = quickChipsContainer.getAttribute('data-ask-chip3') || '🌐 Add web information';
			const p3 = quickChipsContainer.getAttribute('data-ask-prompt3') || c3;

			chips = [
				{ text: c1, action: 'message', prompt: p1 },
				{ text: c2, action: 'message', prompt: p2 },
				{ text: c3, action: 'message', prompt: p3 },
			];
		} else {
			const e1 = quickChipsContainer.getAttribute('data-edit-chip1') || '✍️ Rewrite & improve content';
			const ep1 = quickChipsContainer.getAttribute('data-edit-prompt1') || e1;
			const e2 = quickChipsContainer.getAttribute('data-edit-chip2') || '📊 Convert to table format';
			const ep2 = quickChipsContainer.getAttribute('data-edit-prompt2') || e2;
			const e3 = quickChipsContainer.getAttribute('data-edit-chip3') || '🏷️ Generate & set note title';
			const e4 = quickChipsContainer.getAttribute('data-edit-chip4') || '🏷️ Generate & apply tags';

			chips = [
				{ text: e1, action: 'message', prompt: ep1 },
				{ text: e2, action: 'message', prompt: ep2 },
				{ text: e3, action: 'generateTitle' },
				{ text: e4, action: 'generateTags' },
			];
		}

		chips.forEach((chipData) => {
			const btn = document.createElement('button');
			btn.type = 'button';
			btn.className = 'chip' + (mode === 'edit' ? ' edit-action-chip' : '');
			btn.textContent = chipData.text;

			btn.onclick = (e) => {
				e.preventDefault();
				if (chipData.action === 'generateTitle') {
					showThinking();
					sendApiMessage({ type: 'generateTitle' });
				} else if (chipData.action === 'generateTags') {
					showThinking();
					sendApiMessage({ type: 'generateTags' });
				} else if (chipData.prompt) {
					if (chatInput) chatInput.value = chipData.prompt;
					sendMessage();
				}
			};

			quickChipsContainer.appendChild(btn);
		});

		updateLayoutHeights();
	}

	function switchModeUI(newMode: 'ask' | 'edit', notifyBackend: boolean = true) {
		currentMode = newMode;
		if (modeAskBtn && modeEditBtn && modeNoticeBar) {
			const askDesc = modeNoticeBar.getAttribute('data-ask-desc') || '';
			const editNotice = modeNoticeBar.getAttribute('data-edit-notice') || '';

			if (newMode === 'ask') {
				modeAskBtn.classList.add('active');
				modeEditBtn.classList.remove('active');
				modeNoticeBar.classList.remove('edit-notice');
				modeNoticeBar.textContent = askDesc;
			} else {
				modeEditBtn.classList.add('active');
				modeAskBtn.classList.remove('active');
				modeNoticeBar.classList.add('edit-notice');
				modeNoticeBar.textContent = editNotice;
			}
		}

		renderQuickChips(newMode);
		updateLayoutHeights();

		if (notifyBackend) {
			sendApiMessage({ type: 'switchMode', mode: newMode });
		}
	}

	if (modeAskBtn) {
		modeAskBtn.addEventListener('click', (e) => {
			e.preventDefault();
			switchModeUI('ask', true);
		});
	}

	if (modeEditBtn) {
		modeEditBtn.addEventListener('click', (e) => {
			e.preventDefault();
			switchModeUI('edit', true);
		});
	}

	if (btnClear) {
		btnClear.addEventListener('click', (e) => {
			e.preventDefault();
			sendApiMessage({ type: 'clearHistory' });
		});
	}

	function appendUserMessageLocally(text: string) {
		if (!messagesList) return;

		const msgDiv = document.createElement('div');
		msgDiv.className = 'message user';

		const roleDiv = document.createElement('div');
		roleDiv.className = 'msg-role';
		roleDiv.textContent = labels.user;

		const contentDiv = document.createElement('div');
		contentDiv.className = 'msg-content';
		contentDiv.textContent = text;

		msgDiv.appendChild(roleDiv);
		msgDiv.appendChild(contentDiv);

		messagesList.appendChild(msgDiv);
		messagesList.scrollTop = messagesList.scrollHeight;
	}

	function sendMessage() {
		if (!chatInput) return;
		const text = chatInput.value.trim();
		if (!text) return;

		appendUserMessageLocally(text);
		showThinking();

		sendApiMessage({
			type: 'sendMessage',
			text: text,
			mode: currentMode
		});

		chatInput.value = '';
	}

	if (btnSend) {
		btnSend.addEventListener('click', (e) => {
			e.preventDefault();
			sendMessage();
		});
	}

	if (chatInput) {
		chatInput.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				sendMessage();
			}
		});
	}

	function showThinking() {
		hideThinking();
		if (!messagesList) return;
		const div = document.createElement('div');
		div.id = 'thinking-indicator';
		div.className = 'thinking-indicator';
		div.innerHTML = '<div class="spinner"></div> <span>' + labels.thinking + '</span>';
		messagesList.appendChild(div);
		messagesList.scrollTop = messagesList.scrollHeight;
		if (btnSend) (btnSend as HTMLButtonElement).disabled = true;
	}

	function hideThinking() {
		const existing = document.getElementById('thinking-indicator');
		if (existing) existing.remove();
		if (btnSend) (btnSend as HTMLButtonElement).disabled = false;
	}

	function renderMessages(messages: any[]) {
		if (!messagesList) return;
		messagesList.innerHTML = '';
		if (!messages || messages.length === 0) return;

		messages.forEach((msg) => {
			if (msg.role === 'system') return;

			const msgDiv = document.createElement('div');
			msgDiv.className = 'message ' + msg.role;

			const roleDiv = document.createElement('div');
			roleDiv.className = 'msg-role';
			roleDiv.textContent = msg.role === 'user' ? labels.user : labels.assistant;

			const contentDiv = document.createElement('div');
			contentDiv.className = 'msg-content';
			
			if (msg.role === 'assistant') {
				contentDiv.innerHTML = renderMarkdownToHtml(msg.content);
			} else {
				contentDiv.textContent = msg.content;
			}

			msgDiv.appendChild(roleDiv);
			msgDiv.appendChild(contentDiv);

			if (msg.role === 'assistant') {
				const cleanedText = cleanMarkdownOutput(msg.content);
				const actionsDiv = document.createElement('div');
				actionsDiv.className = 'msg-actions';

				const btnInsert = document.createElement('button');
				btnInsert.type = 'button';
				btnInsert.className = 'action-btn';
				btnInsert.textContent = labels.insertAtCursor;
				btnInsert.onclick = () => {
					sendApiMessage({ type: 'insertText', text: cleanedText, position: 'cursor' });
				};

				const btnAppend = document.createElement('button');
				btnAppend.type = 'button';
				btnAppend.className = 'action-btn';
				btnAppend.textContent = labels.appendNote;
				btnAppend.onclick = () => {
					sendApiMessage({ type: 'insertText', text: cleanedText, position: 'append' });
				};

				actionsDiv.appendChild(btnInsert);
				actionsDiv.appendChild(btnAppend);

				// Optional restore button
				if (msg.originalBody !== undefined) {
					const btnRestore = document.createElement('button');
					btnRestore.type = 'button';
					btnRestore.className = 'action-btn restore-btn';
					btnRestore.style.borderColor = '#8a7300';
					btnRestore.style.color = '#e6c86e';
					btnRestore.textContent = labels.restoreOriginal;
					btnRestore.onclick = () => {
						sendApiMessage({ type: 'restoreOriginal', text: msg.originalBody });
					};
					actionsDiv.appendChild(btnRestore);
				}

				msgDiv.appendChild(actionsDiv);
			}

			messagesList.appendChild(msgDiv);
		});

		messagesList.scrollTop = messagesList.scrollHeight;
	}

	function handleStateUpdate(data: any) {
		if (!data) return;

		if (data.type === 'updateState') {
			if (data.labels) {
				labels = { ...labels, ...data.labels };
			}

			if (data.mode && data.mode !== currentMode) {
				switchModeUI(data.mode, false);
			}

			const newMessagesJson = JSON.stringify(data.messages || []);
			if (newMessagesJson !== lastMessagesJson) {
				lastMessagesJson = newMessagesJson;
				renderMessages(data.messages);
			}

			if (data.noteTitle !== undefined && data.noteTitle !== lastNoteTitle && noteInfoText) {
				lastNoteTitle = data.noteTitle;
				noteInfoText.textContent = '📄 ' + (data.noteTitle || labels.noNote);
			}

			if (data.model && data.model !== lastModel && modelBadge) {
				lastModel = data.model;
				modelBadge.textContent = data.model;
				modelBadge.title = data.model;
			}

			if (data.isThinking) {
				showThinking();
			} else {
				hideThinking();
			}

			updateLayoutHeights();
		}
	}

	renderQuickChips(currentMode);

	// Odpytywacz o zmianę aktywnej notatki co 1.5 sekundy
	setInterval(() => {
		sendApiMessage({ type: 'requestState' });
	}, 1500);

	// Zażądaj aktualnego stanu z wtyczki na starcie
	sendApiMessage({ type: 'requestState' });
}

// Uruchomienie inicjalizacji po załadowaniu DOM
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initChatWebview);
} else {
	initChatWebview();
}
