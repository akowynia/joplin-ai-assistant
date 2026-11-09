import axios from 'axios';
const joplin = require('api');
import { getTranslation, Language } from '../utils/i18n';

export interface ChatMessage {
	role: 'system' | 'user' | 'assistant';
	content: string;
	originalBody?: string;
}

export class AiService {
	/**
	 * Sanitizes note body by stripping heavy media and truncating length for LLM context
	 */
	public static sanitizeNoteBody(noteBody: string, maxLength: number = 8000): string {
		if (!noteBody) return '';
		// Strip markdown images and base64 data URIs
		let cleaned = noteBody.replace(/!\[.*?\]\(:?\/?[a-zA-Z0-9_-]+\)/g, '[Image]');
		cleaned = cleaned.replace(/data:image\/[^;]+;base64,[a-zA-Z0-9+/=]+/g, '[DataImage]');
		
		if (cleaned.length > maxLength) {
			cleaned = cleaned.substring(0, maxLength) + '\n\n...[Content truncated due to length limit]...';
		}
		return cleaned;
	}

	/**
	 * Sends chat completion request to local or remote AI provider
	 */
	public static async chat(messages: ChatMessage[]): Promise<string> {
		const aiMode = await joplin.settings.value('aiMode');
		const localUrl = await joplin.settings.value('localOllamaUrl');
		const remoteUrl = await joplin.settings.value('remoteApiUrl');
		const remoteKey = await joplin.settings.value('remoteApiKey');
		const model = await joplin.settings.value('selectedModel');

		const baseUrl = aiMode === 'local' ? (localUrl || 'http://127.0.0.1:11434') : (remoteUrl || 'https://api.openai.com/v1/chat/completions');
		const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
		
		let endpoint = cleanBaseUrl;
		if (aiMode === 'local') {
			endpoint = `${cleanBaseUrl}/v1/chat/completions`;
		} else {
			// Normalize remote API endpoint if user entered base URL
			if (!cleanBaseUrl.endsWith('/chat/completions')) {
				endpoint = cleanBaseUrl.endsWith('/v1') 
					? `${cleanBaseUrl}/chat/completions` 
					: `${cleanBaseUrl}/v1/chat/completions`;
			}
		}
		
		const headers: any = {
			'Content-Type': 'application/json',
			'Connection': 'close',
		};

		if (aiMode === 'remote' && remoteKey) {
			if (endpoint.startsWith('http://')) {
				console.warn('[Joplin AI Chat] Security warning: sending API key over unencrypted HTTP connection.');
			}
			headers['Authorization'] = `Bearer ${remoteKey}`;
		}

		console.info(`[Joplin AI Chat] Sending request to: ${endpoint}, model: ${model}`);

		try {
			const response = await axios.post(endpoint, {
				model: model,
				messages: messages.map(m => ({ role: m.role, content: m.content })),
				stream: false,
			}, { 
				headers,
				timeout: 90000,
			});

			console.info('[Joplin AI Chat] Received response from AI server');

			const data = response.data;
			let content = '';

			if (data?.choices && data.choices[0]?.message?.content) {
				content = data.choices[0].message.content;
			} else if (data?.message?.content) {
				content = data.message.content;
			} else if (data?.response) {
				content = data.response;
			} else if (typeof data === 'string') {
				content = data;
			}

			if (!content || !content.trim()) {
				throw new Error('Received empty response from AI model.');
			}

			return content.trim();
		} catch (error: any) {
			console.error('[Joplin AI Chat] Communication error:', error);
			const t = await getTranslation();
			const message = error.response?.data?.error?.message 
				|| error.response?.data?.error 
				|| error.message 
				|| 'Unknown model connection error';
			throw new Error(`${t.aiErrorPrefix} ${message}`);
		}
	}

	/**
	 * Fetches list of locally available Ollama models
	 */
	public static async getLocalModels(): Promise<string[]> {
		const localUrl = await joplin.settings.value('localOllamaUrl');
		const cleanLocalUrl = (localUrl || 'http://127.0.0.1:11434').replace(/\/+$/, '');
		try {
			const response = await axios.get(`${cleanLocalUrl}/api/tags`, { timeout: 5000 });
			return response.data.models.map((m: any) => m.name);
		} catch (error) {
			console.error('Failed to fetch Ollama models:', error);
			return [];
		}
	}

	/**
	 * Builds system prompt for Ask Q&A mode
	 */
	public static buildAskSystemPrompt(noteTitle: string, noteBody: string, lang: Language = 'en', webContext?: string): string {
		const cleanBody = this.sanitizeNoteBody(noteBody);
		if (lang === 'pl') {
			let prompt = `Jesteś asystentem AI zintegrowanym z notatnikiem Joplin. Odpowiadasz na pytania i polecenia użytkownika dotyczące notatki pt. "${noteTitle}".\n\n`;
			prompt += `=== TREŚĆ NOTATKI ===\n${cleanBody}\n=====================\n\n`;
			if (webContext) {
				prompt += `=== KONTEKST Z SIECI (WEB SEARCH) ===\n${webContext}\n=====================================\n\n`;
				prompt += `Wykorzystaj informacje z sieci do udzielenia precyzyjnej i aktualnej odpowiedzi. Zawsze zamieszczaj w tekście przypisy źródłowe np. [1], [2] oraz umieść listę wykorzystanych źródeł (URL) na końcu wypowiedzi.\n`;
			}
			prompt += `Zawsze odpowiadaj w języku polskim (lub w języku wyraźnie wskazanym przez użytkownika). Odpowiadaj zwięźle i czytelnie w formacie Markdown. Nie otaczaj całej odpowiedzi blokami kodu typu \`\`\`markdown ani \`\`\`.`;
			return prompt;
		}

		let prompt = `You are a helpful AI assistant integrated with the Joplin note-taking app. You answer user questions and instructions regarding the note titled "${noteTitle}".\n\n`;
		prompt += `=== NOTE CONTENT ===\n${cleanBody}\n=====================\n\n`;
		if (webContext) {
			prompt += `=== WEB SEARCH CONTEXT ===\n${webContext}\n==========================\n\n`;
			prompt += `Use the web search information to provide an accurate, up-to-date response. Always include citation references in the text like [1], [2] and list the sources (URLs) at the end of your response.\n`;
		}
		prompt += `Always respond in English (or in the language explicitly requested by the user). Answer concisely and clearly in Markdown format. Do not enclose the entire response in code blocks like \`\`\`markdown or \`\`\`.`;
		return prompt;
	}

	/**
	 * Builds system prompt for Edit Note mode
	 */
	public static buildEditSystemPrompt(noteTitle: string, noteBody: string, lang: Language = 'en', webContext?: string): string {
		const cleanBody = this.sanitizeNoteBody(noteBody);
		if (lang === 'pl') {
			let prompt = `Jesteś profesjonalnym edytorem notatek AI w Joplin. Twoim zadaniem jest zmodyfikować i zredagować treść notatki pt. "${noteTitle}" zgodnie z uwagami użytkownika.\n\n`;
			prompt += `=== AKTUALNA TREŚĆ NOTATKI ===\n${cleanBody}\n==============================\n\n`;
			if (webContext) {
				prompt += `=== INFORMACJE Z SIECI (WEB SEARCH) ===\n${webContext}\n=======================================\n\n`;
				prompt += `Wzbogać treść notatki o przydatne dane z sieci. Zawsze podawaj źródła informacji w formie przypisów [1], [2] oraz dodaj sekcję z listą źródeł (URL) na samym dole notatki.\n`;
			}
			prompt += `Zwróć bezpośrednio wygenerowaną nową/zaktualizowaną treść notatki w formacie Markdown w języku polskim (lub w języku notatki). Nie otaczaj całej odpowiedzi blokami kodu typu \`\`\`markdown ani \`\`\`.`;
			return prompt;
		}

		let prompt = `You are a professional AI note editor in Joplin. Your task is to modify and revise the content of the note titled "${noteTitle}" according to user instructions.\n\n`;
		prompt += `=== CURRENT NOTE CONTENT ===\n${cleanBody}\n============================\n\n`;
		if (webContext) {
			prompt += `=== WEB SEARCH CONTEXT ===\n${webContext}\n==========================\n\n`;
			prompt += `Enrich the note content with useful web information. Always cite sources as [1], [2] and append a sources list (URLs) at the bottom.\n`;
		}
		prompt += `Output the updated note content directly in Markdown format in English (or the language of the note). Do not wrap the entire response in code blocks like \`\`\`markdown or \`\`\`.`;
		return prompt;
	}
}
