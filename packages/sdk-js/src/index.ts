/**
 * Transcendia SDK
 * 
 * Dynamic Semantic Internationalization Client Library
 * 
 * @example
 * ```typescript
 * import { Transcendia } from '@transcendia/sdk';
 * 
 * const i18n = new Transcendia({
 *   apiUrl: 'https://api.transcendia.dev',
 *   defaultLang: 'tr'
 * });
 * 
 * // Single translation
 * const greeting = await i18n.t('intent:greeting+context:app_entry');
 * 
 * // Batch translations
 * const translations = await i18n.t(['intent:greeting', 'intent:goodbye']);
 * ```
 */

import { LRUCache } from 'lru-cache';

export interface TranscendiaOptions {
  apiUrl: string;
  defaultLang?: string;
  cacheSize?: number;
  cacheTTL?: number;
  fetchOptions?: RequestInit;
}

export interface TranslationResult {
  key: string;
  value: string;
  lang: string;
  cached?: boolean;
}

export interface BatchTranslationResult {
  translations: TranslationResult[];
}

export interface Language {
  code: string;
  name: string;
  nativeName: string;
}

export interface ContributeOptions {
  key: string;
  value: string;
  comment?: string;
  contributorId?: string;
}

export class TranscendiaError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'TranscendiaError';
  }
}

export class Transcendia {
  private apiUrl: string;
  private defaultLang: string;
  private cache: LRUCache<string, string>;
  private cacheTTL: number;
  private fetchOptions: RequestInit;

  constructor(options: TranscendiaOptions) {
    if (!options.apiUrl) {
      throw new TranscendiaError('API URL is required');
    }

    this.apiUrl = options.apiUrl.replace(/\/$/, ''); // Remove trailing slash
    this.defaultLang = options.defaultLang || 'en';
    this.cacheTTL = options.cacheTTL || 3600000; // 1 hour in ms
    this.fetchOptions = options.fetchOptions || {};

    // Initialize LRU cache
    this.cache = new LRUCache({
      max: options.cacheSize || 500,
      ttl: this.cacheTTL,
    });
  }

  /**
   * Translate a single key
   */
  async t(key: string, lang?: string): Promise<string> {
    const targetLang = lang || this.defaultLang;
    const cacheKey = `${key}:${targetLang}`;

    // Check local cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const url = new URL('/translate', this.apiUrl);
      url.searchParams.set('key', key);
      url.searchParams.set('lang', targetLang);

      const response = await fetch(url.toString(), {
        ...this.fetchOptions,
        method: 'GET',
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Return key as fallback for missing translations
          return key;
        }
        throw new TranscendiaError(
          `Translation request failed: ${response.statusText}`,
          'TRANSLATION_ERROR',
          response.status
        );
      }

      const data: TranslationResult = await response.json();
      
      if (data.value) {
        this.cache.set(cacheKey, data.value);
        return data.value;
      }

      return key;
    } catch (error) {
      if (error instanceof TranscendiaError) {
        throw error;
      }
      throw new TranscendiaError(
        `Network error: ${(error as Error).message}`,
        'NETWORK_ERROR'
      );
    }
  }

  /**
   * Translate multiple keys at once
   */
  async tBatch(keys: string[], lang?: string): Promise<Map<string, string>> {
    const targetLang = lang || this.defaultLang;
    const results = new Map<string, string>();

    // Check cache for each key
    const uncachedKeys: string[] = [];
    for (const key of keys) {
      const cacheKey = `${key}:${targetLang}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached) {
        results.set(key, cached);
      } else {
        uncachedKeys.push(key);
      }
    }

    // Fetch uncached keys from API
    if (uncachedKeys.length > 0) {
      try {
        const response = await fetch(`${this.apiUrl}/translate/batch`, {
          ...this.fetchOptions,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...this.fetchOptions.headers,
          },
          body: JSON.stringify({
            keys: uncachedKeys,
            lang: targetLang,
          }),
        });

        if (!response.ok) {
          throw new TranscendiaError(
            `Batch translation failed: ${response.statusText}`,
            'BATCH_ERROR',
            response.status
          );
        }

        const data: BatchTranslationResult = await response.json();
        
        for (const translation of data.translations) {
          if (translation.value) {
            const cacheKey = `${translation.key}:${targetLang}`;
            this.cache.set(cacheKey, translation.value);
            results.set(translation.key, translation.value);
          } else {
            results.set(translation.key, translation.key);
          }
        }
      } catch (error) {
        // On error, return keys as fallback
        for (const key of uncachedKeys) {
          if (!results.has(key)) {
            results.set(key, key);
          }
        }
      }
    }

    return results;
  }

  /**
   * Get available languages
   */
  async getLanguages(): Promise<Language[]> {
    try {
      const response = await fetch(`${this.apiUrl}/languages`, {
        ...this.fetchOptions,
        method: 'GET',
      });

      if (!response.ok) {
        throw new TranscendiaError(
          `Failed to fetch languages: ${response.statusText}`,
          'LANGUAGES_ERROR',
          response.status
        );
      }

      const data = await response.json();
      return data.languages;
    } catch (error) {
      throw new TranscendiaError(
        `Network error: ${(error as Error).message}`,
        'NETWORK_ERROR'
      );
    }
  }

  /**
   * Submit a translation contribution
   */
  async contribute(options: ContributeOptions): Promise<void> {
    const { key, value, comment, contributorId } = options;
    const targetLang = this.defaultLang;

    try {
      const response = await fetch(`${this.apiUrl}/contribute`, {
        ...this.fetchOptions,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.fetchOptions.headers,
        },
        body: JSON.stringify({
          key,
          lang: targetLang,
          value,
          comment,
          contributorId,
        }),
      });

      if (!response.ok) {
        throw new TranscendiaError(
          `Contribution failed: ${response.statusText}`,
          'CONTRIBUTION_ERROR',
          response.status
        );
      }
    } catch (error) {
      throw new TranscendiaError(
        `Network error: ${(error as Error).message}`,
        'NETWORK_ERROR'
      );
    }
  }

  /**
   * Clear local cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      max: this.cache.max,
    };
  }

  /**
   * Set default language
   */
  setDefaultLang(lang: string): void {
    this.defaultLang = lang;
  }
}

// Default export for convenience
export default Transcendia;
