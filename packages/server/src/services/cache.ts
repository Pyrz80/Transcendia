/**
 * Cache Service
 * 
 * Redis-based caching for translations
 * Provides in-memory fallback when Redis is unavailable
 */

import Redis from 'ioredis';
import { prisma } from '../index.js';

const CACHE_TTL = 3600; // 1 hour in seconds

export class CacheService {
  private redis: Redis | null = null;
  private memoryCache: Map<string, { value: string; expiresAt: number }> = new Map();

  constructor() {
    this.initRedis();
  }

  private async initRedis() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      this.redis = new Redis(redisUrl);
      
      this.redis.on('error', (err) => {
        console.warn('Redis connection error, falling back to memory cache:', err.message);
        this.redis = null;
      });

      this.redis.on('connect', () => {
        console.log('Redis connected');
      });
    } catch (error) {
      console.warn('Failed to initialize Redis, using memory cache');
    }
  }

  /**
   * Get cached translation
   */
  async get(key: string, lang: string): Promise<string | null> {
    const cacheKey = this.getCacheKey(key, lang);

    // Try Redis first
    if (this.redis) {
      try {
        const value = await this.redis.get(cacheKey);
        if (value) return value;
      } catch (error) {
        console.warn('Redis get error:', error);
      }
    }

    // Fallback to memory cache
    const cached = this.memoryCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    return null;
  }

  /**
   * Set cached translation
   */
  async set(key: string, lang: string, value: string): Promise<void> {
    const cacheKey = this.getCacheKey(key, lang);

    // Try Redis first
    if (this.redis) {
      try {
        await this.redis.setex(cacheKey, CACHE_TTL, value);
        return;
      } catch (error) {
        console.warn('Redis set error:', error);
      }
    }

    // Fallback to memory cache
    this.memoryCache.set(cacheKey, {
      value,
      expiresAt: Date.now() + CACHE_TTL * 1000,
    });
  }

  /**
   * Delete cached translation
   */
  async delete(key: string, lang: string): Promise<void> {
    const cacheKey = this.getCacheKey(key, lang);

    if (this.redis) {
      try {
        await this.redis.del(cacheKey);
      } catch (error) {
        console.warn('Redis delete error:', error);
      }
    }

    this.memoryCache.delete(cacheKey);
  }

  /**
   * Clear all cache for a language
   */
  async clearLanguage(lang: string): Promise<void> {
    if (this.redis) {
      try {
        const keys = await this.redis.keys(`*:${lang}`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch (error) {
        console.warn('Redis clear language error:', error);
      }
    }

    // Clear memory cache entries for this language
    for (const cacheKey of this.memoryCache.keys()) {
      if (cacheKey.endsWith(`:${lang}`)) {
        this.memoryCache.delete(cacheKey);
      }
    }
  }

  /**
   * Clear all cache
   */
  async clearAll(): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.flushdb();
      } catch (error) {
        console.warn('Redis flushdb error:', error);
      }
    }

    this.memoryCache.clear();
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ redis: boolean; memorySize: number }> {
    return {
      redis: this.redis !== null,
      memorySize: this.memoryCache.size,
    };
  }

  /**
   * Generate cache key
   */
  private getCacheKey(key: string, lang: string): string {
    return `${key}:${lang}`;
  }
}
