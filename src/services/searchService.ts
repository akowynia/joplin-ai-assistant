import axios from 'axios';
const joplin = require('api');
import { getTranslation } from '../utils/i18n';

export interface SearchResult {
	title: string;
	url: string;
	content: string;
}

export class SearchService {
	public static async search(query: string): Promise<SearchResult[]> {
		const provider = await joplin.settings.value('searchProvider');
		
		if (provider === 'tavily') {
			return this.searchTavily(query);
		} else {
			return this.searchSerper(query);
		}
	}

	private static async searchTavily(query: string): Promise<SearchResult[]> {
		const t = await getTranslation();
		const apiKey = await joplin.settings.value('tavilyApiKey');
		if (!apiKey) throw new Error(t.tavilyApiKeyMissing);

		try {
			const response = await axios.post('https://api.tavily.com/search', {
				api_key: apiKey,
				query: query,
				search_depth: 'basic',
				max_results: 5,
			});

			return response.data.results.map((r: any) => ({
				title: r.title,
				url: r.url,
				content: r.content,
			}));
		} catch (error: any) {
			throw new Error(`${t.tavilyErrorPrefix} ${error.message}`);
		}
	}

	private static async searchSerper(query: string): Promise<SearchResult[]> {
		const t = await getTranslation();
		const apiKey = await joplin.settings.value('serperApiKey');
		if (!apiKey) throw new Error(t.serperApiKeyMissing);

		try {
			const response = await axios.post('https://google.serper.dev/search', {
				q: query,
				num: 5,
			}, {
				headers: {
					'X-API-KEY': apiKey,
					'Content-Type': 'application/json',
				}
			});

			return response.data.organic.map((r: any) => ({
				title: r.title,
				url: r.link,
				content: r.snippet,
			}));
		} catch (error: any) {
			throw new Error(`${t.serperErrorPrefix} ${error.message}`);
		}
	}

	public static async formatResultsForLLM(results: SearchResult[]): Promise<string> {
		const t = await getTranslation();
		return results.map((r, i) => `${t.sourcePrefix(i + 1, r.url)}\n${r.title}\n${r.content}`).join('\n\n');
	}
}
