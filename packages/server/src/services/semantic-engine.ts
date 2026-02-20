/**
 * Semantic Engine
 * 
 * Parses and resolves semantic keys like:
 * - intent:greeting+context:app_entry
 * - action:submit+form:login
 * - error:validation_failed+field:email
 */

export interface ParsedKey {
  intent: string;
  context: string;
  raw: string;
}

export interface ContextMatch {
  key: string;
  intent: string;
  context: string;
  score: number;
}

export class SemanticEngine {
  private readonly keyPattern = /^([a-z]+):([a-z_]+)(?:\+context:([a-z_]+))?$/i;
  private readonly intentSeparator = ':';
  private readonly contextSeparator = '+context:';

  /**
   * Parse a semantic key into its components
   * @param key - e.g., "intent:greeting+context:app_entry"
   */
  parseKey(key: string): ParsedKey {
    const match = key.match(this.keyPattern);
    
    if (match) {
      return {
        intent: match[1].toLowerCase(),
        context: match[3]?.toLowerCase() || 'default',
        raw: key,
      };
    }

    // Fallback: treat entire key as intent with default context
    const parts = key.split(this.intentSeparator);
    return {
      intent: parts[0].toLowerCase(),
      context: parts[1]?.toLowerCase() || 'default',
      raw: key,
    };
  }

  /**
   * Generate a semantic key from components
   */
  generateKey(intent: string, context?: string): string {
    if (context) {
      return `intent:${intent}+context:${context}`;
    }
    return `intent:${intent}`;
  }

  /**
   * Find best matching translation key for given intent and context
   */
  findBestMatch(
    availableKeys: ParsedKey[],
    targetIntent: string,
    targetContext: string
  ): ParsedKey | null {
    let bestMatch: ParsedKey | null = null;
    let highestScore = 0;

    for (const key of availableKeys) {
      const score = this.calculateMatchScore(
        key.intent,
        key.context,
        targetIntent,
        targetContext
      );

      if (score > highestScore) {
        highestScore = score;
        bestMatch = key;
      }
    }

    return bestMatch;
  }

  /**
   * Calculate match score between keys
   * Higher score = better match
   */
  private calculateMatchScore(
    keyIntent: string,
    keyContext: string,
    targetIntent: string,
    targetContext: string
  ): number {
    let score = 0;

    // Exact intent match
    if (keyIntent === targetIntent) {
      score += 10;
    }

    // Context matching
    if (keyContext === targetContext) {
      score += 5;
    } else if (keyContext === 'default') {
      // Default context is fallback - lower priority
      score += 1;
    } else if (this.isContextRelated(keyContext, targetContext)) {
      // Related contexts (e.g., "app" related to "app_entry")
      score += 2;
    }

    return score;
  }

  /**
   * Check if contexts are related
   */
  private isContextRelated(ctx1: string, ctx2: string): boolean {
    // Check for prefix/suffix relationship
    return (
      ctx1.startsWith(ctx2) ||
      ctx2.startsWith(ctx1) ||
      ctx1.includes(ctx2) ||
      ctx2.includes(ctx1)
    );
  }

  /**
   * Validate semantic key format
   */
  isValidKey(key: string): boolean {
    return this.keyPattern.test(key) || key.includes(':');
  }

  /**
   * Extract all intents from a set of keys
   */
  extractIntents(keys: string[]): string[] {
    const intents = new Set<string>();
    
    for (const key of keys) {
      const parsed = this.parseKey(key);
      intents.add(parsed.intent);
    }

    return Array.from(intents);
  }

  /**
   * Group keys by intent
   */
  groupByIntent(keys: ParsedKey[]): Map<string, ParsedKey[]> {
    const groups = new Map<string, ParsedKey[]>();

    for (const key of keys) {
      const existing = groups.get(key.intent) || [];
      existing.push(key);
      groups.set(key.intent, existing);
    }

    return groups;
  }
}
