/**
 * Reaction Service
 * Handles emoji-based post reactions (WhatsApp-style)
 */
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1';

// Approved emoji reactions (locked, church-safe)
export const APPROVED_EMOJIS = {
  LIKE: '👍',
  AMEN: '🙏',
  LOVE: '❤️',
  INSIGHT: '💡',
  PRAISE: '🎉',
} as const;

export type EmojiCode = keyof typeof APPROVED_EMOJIS;
export type EmojiChar = typeof APPROVED_EMOJIS[EmojiCode];

export interface ReactionItem {
  emoji: string;
  count: number;
}

export interface ReactionStats {
  reactions: ReactionItem[];
  user_reaction: string | null;
}

class ReactionService {
  private api = axios.create({
    baseURL: API_BASE_URL,
  });

  constructor() {
    // Add request interceptor to include JWT token
    this.api.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get JWT access token from localStorage
   */
  private getToken(): string | null {
    const tokensStr = localStorage.getItem('auth_tokens');
    if (!tokensStr) return null;

    try {
      const tokens = JSON.parse(tokensStr);
      return tokens?.access || null;
    } catch {
      return null;
    }
  }

  /**
   * Get reaction statistics for a post
   */
  async getReactions(postId: string): Promise<ReactionStats> {
    const response = await this.api.get(`/posts/${postId}/reactions/`);
    return response.data;
  }

  /**
   * React to a post with emoji (create, update, or remove reaction)
   * - First click: Add reaction
   * - Same emoji: Remove reaction
   * - Different emoji: Update to new type
   */
  async reactToPost(postId: string, emoji: string): Promise<{ message: string; reaction: string | null }> {
    const response = await this.api.post(`/posts/${postId}/reaction/`, {
      emoji: emoji
    });
    return response.data;
  }

  /**
   * Get all approved emojis (for picker display)
   */
  getApprovedEmojis(): string[] {
    return Object.values(APPROVED_EMOJIS);
  }

  /**
   * Get display label for emoji
   */
  getEmojiLabel(emoji: string): string {
    const labels: Record<string, string> = {
      '👍': 'Like',
      '🙏': 'Amen',
      '❤️': 'Love',
      '💡': 'Insightful',
      '🎉': 'Praise',
    };
    return labels[emoji] || emoji;
  }
}

const reactionService = new ReactionService();
export default reactionService;
