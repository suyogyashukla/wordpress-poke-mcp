import type {
  WPPost,
  WPPage,
  WPComment,
  WPMediaItem,
  WPSettings,
  WPCategory,
  WPTag,
  WPUser,
  CreatePostInput,
  CreatePageInput,
  CreateCommentInput,
  UpdateCommentInput,
  UpdateSettingsInput,
  ListPostsParams,
  ListPagesParams,
  ListCommentsParams,
  ListMediaParams,
  ListTermsParams,
  CommentStatus,
} from './types.js';

export interface WPListResponse<T> {
  data: T[];
  total: number;
  totalPages: number;
}

export class WordPressClient {
  private siteUrl: string;
  private username: string;
  private appPassword: string;
  private apiBase: string;

  constructor(siteUrl: string, username: string, appPassword: string) {
    // Ensure site URL doesn't have trailing slash
    this.siteUrl = siteUrl.replace(/\/+$/, '');
    this.username = username;
    this.appPassword = appPassword;
    this.apiBase = `${this.siteUrl}/wp-json/wp/v2`;
  }

  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.username}:${this.appPassword}`).toString('base64');
    return `Basic ${credentials}`;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.apiBase}${endpoint}`;

    const headers: Record<string, string> = {
      'Authorization': this.getAuthHeader(),
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage: string;
      try {
        const errorJson = JSON.parse(errorBody);
        errorMessage = errorJson.message || errorJson.code || errorBody;
      } catch {
        errorMessage = errorBody;
      }
      throw new Error(`WordPress API error (${response.status}): ${errorMessage}`);
    }

    return response.json() as Promise<T>;
  }

  private async requestWithHeaders<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data: T; total: number; totalPages: number }> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.apiBase}${endpoint}`;

    const headers: Record<string, string> = {
      'Authorization': this.getAuthHeader(),
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage: string;
      try {
        const errorJson = JSON.parse(errorBody);
        errorMessage = errorJson.message || errorJson.code || errorBody;
      } catch {
        errorMessage = errorBody;
      }
      throw new Error(`WordPress API error (${response.status}): ${errorMessage}`);
    }

    const data = await response.json() as T;
    const total = parseInt(response.headers.get('x-wp-total') || '0', 10);
    const totalPages = parseInt(response.headers.get('x-wp-totalpages') || '0', 10);

    return { data, total, totalPages };
  }

  private buildQueryString<T extends object>(params: T): string {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          // WordPress REST API uses comma-separated values for arrays
          searchParams.set(key, value.join(','));
        } else if (typeof value === 'boolean') {
          searchParams.set(key, value ? 'true' : 'false');
        } else {
          searchParams.set(key, String(value));
        }
      }
    }
    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  }

  // ==================== Posts ====================

  async listPosts(params: ListPostsParams = {}): Promise<WPListResponse<WPPost>> {
    const query = this.buildQueryString({ per_page: 20, ...params });
    return this.requestWithHeaders<WPPost[]>(`/posts${query}`);
  }

  async getPost(postId: number): Promise<WPPost> {
    return this.request<WPPost>(`/posts/${postId}`);
  }

  async getPostBySlug(slug: string): Promise<WPPost | null> {
    const result = await this.requestWithHeaders<WPPost[]>(`/posts?slug=${encodeURIComponent(slug)}`);
    return result.data[0] || null;
  }

  async createPost(input: CreatePostInput): Promise<WPPost> {
    return this.request<WPPost>('/posts', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updatePost(postId: number, input: Partial<CreatePostInput>): Promise<WPPost> {
    return this.request<WPPost>(`/posts/${postId}`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async deletePost(postId: number, force: boolean = false): Promise<WPPost> {
    const query = force ? '?force=true' : '';
    return this.request<WPPost>(`/posts/${postId}${query}`, {
      method: 'DELETE',
    });
  }

  // ==================== Pages ====================

  async listPages(params: ListPagesParams = {}): Promise<WPListResponse<WPPage>> {
    const query = this.buildQueryString({ per_page: 20, ...params });
    return this.requestWithHeaders<WPPage[]>(`/pages${query}`);
  }

  async getPage(pageId: number): Promise<WPPage> {
    return this.request<WPPage>(`/pages/${pageId}`);
  }

  async getPageBySlug(slug: string): Promise<WPPage | null> {
    const result = await this.requestWithHeaders<WPPage[]>(`/pages?slug=${encodeURIComponent(slug)}`);
    return result.data[0] || null;
  }

  async createPage(input: CreatePageInput): Promise<WPPage> {
    return this.request<WPPage>('/pages', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updatePage(pageId: number, input: Partial<CreatePageInput>): Promise<WPPage> {
    return this.request<WPPage>(`/pages/${pageId}`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async deletePage(pageId: number, force: boolean = false): Promise<WPPage> {
    const query = force ? '?force=true' : '';
    return this.request<WPPage>(`/pages/${pageId}${query}`, {
      method: 'DELETE',
    });
  }

  // ==================== Comments ====================

  async listComments(params: ListCommentsParams = {}): Promise<WPListResponse<WPComment>> {
    const query = this.buildQueryString({ per_page: 20, ...params });
    return this.requestWithHeaders<WPComment[]>(`/comments${query}`);
  }

  async getComment(commentId: number): Promise<WPComment> {
    return this.request<WPComment>(`/comments/${commentId}`);
  }

  async createComment(input: CreateCommentInput): Promise<WPComment> {
    return this.request<WPComment>('/comments', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateComment(commentId: number, input: UpdateCommentInput): Promise<WPComment> {
    return this.request<WPComment>(`/comments/${commentId}`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async deleteComment(commentId: number, force: boolean = false): Promise<WPComment> {
    const query = force ? '?force=true' : '';
    return this.request<WPComment>(`/comments/${commentId}${query}`, {
      method: 'DELETE',
    });
  }

  // ==================== Media ====================

  async listMedia(params: ListMediaParams = {}): Promise<WPListResponse<WPMediaItem>> {
    const query = this.buildQueryString({ per_page: 20, ...params });
    return this.requestWithHeaders<WPMediaItem[]>(`/media${query}`);
  }

  async getMedia(mediaId: number): Promise<WPMediaItem> {
    return this.request<WPMediaItem>(`/media/${mediaId}`);
  }

  async uploadMedia(
    file: Buffer | Blob,
    filename: string,
    contentType: string,
    options: { title?: string; caption?: string; description?: string; alt_text?: string; post?: number } = {}
  ): Promise<WPMediaItem> {
    const formData = new FormData();

    // Create a Blob from Buffer if needed
    const blob = file instanceof Blob ? file : new Blob([new Uint8Array(file)], { type: contentType });
    formData.append('file', blob, filename);

    if (options.title) formData.append('title', options.title);
    if (options.caption) formData.append('caption', options.caption);
    if (options.description) formData.append('description', options.description);
    if (options.alt_text) formData.append('alt_text', options.alt_text);
    if (options.post) formData.append('post', String(options.post));

    const response = await fetch(`${this.apiBase}/media`, {
      method: 'POST',
      headers: {
        'Authorization': this.getAuthHeader(),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`WordPress API error (${response.status}): ${errorBody}`);
    }

    return response.json() as Promise<WPMediaItem>;
  }

  async updateMedia(
    mediaId: number,
    options: { title?: string; caption?: string; description?: string; alt_text?: string }
  ): Promise<WPMediaItem> {
    return this.request<WPMediaItem>(`/media/${mediaId}`, {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  async deleteMedia(mediaId: number, force: boolean = true): Promise<WPMediaItem> {
    // Media requires force=true to actually delete
    return this.request<WPMediaItem>(`/media/${mediaId}?force=${force}`, {
      method: 'DELETE',
    });
  }

  // ==================== Categories ====================

  async listCategories(params: ListTermsParams = {}): Promise<WPListResponse<WPCategory>> {
    const query = this.buildQueryString({ per_page: 100, ...params });
    return this.requestWithHeaders<WPCategory[]>(`/categories${query}`);
  }

  async getCategory(categoryId: number): Promise<WPCategory> {
    return this.request<WPCategory>(`/categories/${categoryId}`);
  }

  async createCategory(name: string, description?: string, parent?: number): Promise<WPCategory> {
    return this.request<WPCategory>('/categories', {
      method: 'POST',
      body: JSON.stringify({ name, description, parent }),
    });
  }

  async updateCategory(categoryId: number, data: { name?: string; description?: string; parent?: number }): Promise<WPCategory> {
    return this.request<WPCategory>(`/categories/${categoryId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteCategory(categoryId: number): Promise<WPCategory> {
    return this.request<WPCategory>(`/categories/${categoryId}?force=true`, {
      method: 'DELETE',
    });
  }

  // ==================== Tags ====================

  async listTags(params: ListTermsParams = {}): Promise<WPListResponse<WPTag>> {
    const query = this.buildQueryString({ per_page: 100, ...params });
    return this.requestWithHeaders<WPTag[]>(`/tags${query}`);
  }

  async getTag(tagId: number): Promise<WPTag> {
    return this.request<WPTag>(`/tags/${tagId}`);
  }

  async createTag(name: string, description?: string): Promise<WPTag> {
    return this.request<WPTag>('/tags', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  async updateTag(tagId: number, data: { name?: string; description?: string }): Promise<WPTag> {
    return this.request<WPTag>(`/tags/${tagId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteTag(tagId: number): Promise<WPTag> {
    return this.request<WPTag>(`/tags/${tagId}?force=true`, {
      method: 'DELETE',
    });
  }

  // ==================== Users ====================

  async listUsers(): Promise<WPListResponse<WPUser>> {
    return this.requestWithHeaders<WPUser[]>('/users');
  }

  async getUser(userId: number): Promise<WPUser> {
    return this.request<WPUser>(`/users/${userId}`);
  }

  async getCurrentUser(): Promise<WPUser> {
    return this.request<WPUser>('/users/me');
  }

  // ==================== Settings ====================

  async getSettings(): Promise<WPSettings> {
    return this.request<WPSettings>('/settings');
  }

  async updateSettings(settings: UpdateSettingsInput): Promise<WPSettings> {
    return this.request<WPSettings>('/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  }

  // ==================== Site Info ====================

  async getSiteInfo(): Promise<{ name: string; description: string; url: string; home: string; gmt_offset: number; timezone_string: string }> {
    return this.request(`${this.siteUrl}/wp-json`);
  }
}

export function createWordPressClient(): WordPressClient {
  const siteUrl = process.env.WORDPRESS_SITE_URL;
  const username = process.env.WORDPRESS_USERNAME;
  const appPassword = process.env.WORDPRESS_APP_PASSWORD;

  if (!siteUrl) {
    throw new Error('WORDPRESS_SITE_URL environment variable is required');
  }

  if (!username) {
    throw new Error('WORDPRESS_USERNAME environment variable is required');
  }

  if (!appPassword) {
    throw new Error('WORDPRESS_APP_PASSWORD environment variable is required');
  }

  return new WordPressClient(siteUrl, username, appPassword);
}
