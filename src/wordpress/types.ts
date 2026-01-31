// WordPress.org REST API Types (WP REST API v2)

export interface WPPost {
  id: number;
  date: string;
  date_gmt: string;
  guid: { rendered: string };
  modified: string;
  modified_gmt: string;
  slug: string;
  status: PostStatus;
  type: string;
  link: string;
  title: { rendered: string };
  content: { rendered: string; protected: boolean };
  excerpt: { rendered: string; protected: boolean };
  author: number;
  featured_media: number;
  comment_status: 'open' | 'closed';
  ping_status: 'open' | 'closed';
  sticky: boolean;
  template: string;
  format: string;
  meta: Record<string, unknown>;
  categories: number[];
  tags: number[];
  _links: WPLinks;
  // Embedded data (when _embed is used)
  _embedded?: {
    author?: WPUser[];
    'wp:featuredmedia'?: WPMediaItem[];
    'wp:term'?: WPTerm[][];
  };
}

export type PostStatus = 'publish' | 'future' | 'draft' | 'pending' | 'private' | 'trash' | 'auto-draft' | 'inherit';

export interface WPPage extends WPPost {
  parent: number;
  menu_order: number;
}

export interface WPUser {
  id: number;
  name: string;
  url: string;
  description: string;
  link: string;
  slug: string;
  avatar_urls: Record<string, string>;
  meta: Record<string, unknown>;
  _links: WPLinks;
}

export interface WPTerm {
  id: number;
  count: number;
  description: string;
  link: string;
  name: string;
  slug: string;
  taxonomy: string;
  parent?: number;
  meta: Record<string, unknown>;
  _links: WPLinks;
}

export interface WPCategory extends WPTerm {
  parent: number;
}

export interface WPTag extends WPTerm {}

export interface WPMediaItem {
  id: number;
  date: string;
  date_gmt: string;
  guid: { rendered: string };
  modified: string;
  modified_gmt: string;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: { rendered: string };
  author: number;
  comment_status: string;
  ping_status: string;
  template: string;
  meta: Record<string, unknown>;
  description: { rendered: string };
  caption: { rendered: string };
  alt_text: string;
  media_type: string;
  mime_type: string;
  media_details: {
    width: number;
    height: number;
    file: string;
    sizes: Record<string, {
      file: string;
      width: number;
      height: number;
      mime_type: string;
      source_url: string;
    }>;
  };
  post: number | null;
  source_url: string;
  _links: WPLinks;
}

export interface WPComment {
  id: number;
  post: number;
  parent: number;
  author: number;
  author_name: string;
  author_url: string;
  author_email?: string;
  author_ip?: string;
  author_user_agent?: string;
  date: string;
  date_gmt: string;
  content: { rendered: string };
  link: string;
  status: CommentStatus;
  type: string;
  author_avatar_urls: Record<string, string>;
  meta: Record<string, unknown>;
  _links: WPLinks;
}

export type CommentStatus = 'approved' | 'hold' | 'spam' | 'trash' | '0' | '1';

export interface WPSettings {
  title: string;
  description: string;
  url: string;
  email: string;
  timezone: string;
  date_format: string;
  time_format: string;
  start_of_week: number;
  language: string;
  use_smilies: boolean;
  default_category: number;
  default_post_format: string;
  posts_per_page: number;
  default_ping_status: 'open' | 'closed';
  default_comment_status: 'open' | 'closed';
}

export interface WPLinks {
  self: { href: string }[];
  collection: { href: string }[];
  about?: { href: string }[];
  author?: { embeddable: boolean; href: string }[];
  replies?: { embeddable: boolean; href: string }[];
  'version-history'?: { count: number; href: string }[];
  'predecessor-version'?: { id: number; href: string }[];
  'wp:featuredmedia'?: { embeddable: boolean; href: string }[];
  'wp:attachment'?: { href: string }[];
  'wp:term'?: { taxonomy: string; embeddable: boolean; href: string }[];
  curies?: { name: string; href: string; templated: boolean }[];
}

// Input types for creating/updating content
export interface CreatePostInput {
  title: string;
  content: string;
  excerpt?: string;
  status?: PostStatus;
  slug?: string;
  categories?: number[];
  tags?: number[];
  format?: string;
  featured_media?: number;
  sticky?: boolean;
  password?: string;
  comment_status?: 'open' | 'closed';
  ping_status?: 'open' | 'closed';
  meta?: Record<string, unknown>;
}

export interface CreatePageInput extends CreatePostInput {
  parent?: number;
  menu_order?: number;
  template?: string;
}

export interface CreateCommentInput {
  post: number;
  content: string;
  parent?: number;
  author_name?: string;
  author_email?: string;
  author_url?: string;
}

export interface UpdateCommentInput {
  content?: string;
  status?: CommentStatus;
}

export interface UpdateSettingsInput {
  title?: string;
  description?: string;
  timezone?: string;
  date_format?: string;
  time_format?: string;
  start_of_week?: number;
  posts_per_page?: number;
  default_category?: number;
  default_post_format?: string;
  default_ping_status?: 'open' | 'closed';
  default_comment_status?: 'open' | 'closed';
}

export interface CreateMediaInput {
  title?: string;
  caption?: string;
  description?: string;
  alt_text?: string;
  post?: number;
}

// Query parameters
export interface ListPostsParams {
  context?: 'view' | 'embed' | 'edit';
  page?: number;
  per_page?: number;
  search?: string;
  after?: string;
  before?: string;
  author?: number | number[];
  author_exclude?: number | number[];
  exclude?: number[];
  include?: number[];
  offset?: number;
  order?: 'asc' | 'desc';
  orderby?: 'author' | 'date' | 'id' | 'include' | 'modified' | 'parent' | 'relevance' | 'slug' | 'include_slugs' | 'title';
  slug?: string | string[];
  status?: PostStatus | PostStatus[];
  categories?: number | number[];
  categories_exclude?: number | number[];
  tags?: number | number[];
  tags_exclude?: number | number[];
  sticky?: boolean;
  _embed?: boolean;
}

export interface ListPagesParams {
  context?: 'view' | 'embed' | 'edit';
  page?: number;
  per_page?: number;
  search?: string;
  after?: string;
  before?: string;
  author?: number | number[];
  author_exclude?: number | number[];
  exclude?: number[];
  include?: number[];
  offset?: number;
  order?: 'asc' | 'desc';
  orderby?: 'author' | 'date' | 'id' | 'include' | 'modified' | 'parent' | 'relevance' | 'slug' | 'include_slugs' | 'title' | 'menu_order';
  slug?: string | string[];
  status?: PostStatus | PostStatus[];
  parent?: number | number[];
  parent_exclude?: number | number[];
  menu_order?: number;
  _embed?: boolean;
}

export interface ListCommentsParams {
  context?: 'view' | 'embed' | 'edit';
  page?: number;
  per_page?: number;
  search?: string;
  after?: string;
  before?: string;
  author?: number | number[];
  author_exclude?: number | number[];
  author_email?: string;
  exclude?: number[];
  include?: number[];
  offset?: number;
  order?: 'asc' | 'desc';
  orderby?: 'date' | 'date_gmt' | 'id' | 'include' | 'post' | 'parent' | 'type';
  parent?: number | number[];
  parent_exclude?: number | number[];
  post?: number | number[];
  status?: string;
  type?: string;
  password?: string;
}

export interface ListMediaParams {
  context?: 'view' | 'embed' | 'edit';
  page?: number;
  per_page?: number;
  search?: string;
  after?: string;
  before?: string;
  author?: number | number[];
  author_exclude?: number | number[];
  exclude?: number[];
  include?: number[];
  offset?: number;
  order?: 'asc' | 'desc';
  orderby?: 'author' | 'date' | 'id' | 'include' | 'modified' | 'parent' | 'relevance' | 'slug' | 'include_slugs' | 'title';
  parent?: number | number[];
  parent_exclude?: number | number[];
  slug?: string | string[];
  status?: string;
  media_type?: 'image' | 'video' | 'text' | 'application' | 'audio';
  mime_type?: string;
}

export interface ListTermsParams {
  context?: 'view' | 'embed' | 'edit';
  page?: number;
  per_page?: number;
  search?: string;
  exclude?: number[];
  include?: number[];
  offset?: number;
  order?: 'asc' | 'desc';
  orderby?: 'id' | 'include' | 'name' | 'slug' | 'include_slugs' | 'term_group' | 'description' | 'count';
  hide_empty?: boolean;
  parent?: number;
  post?: number;
  slug?: string | string[];
}

// API Response headers info
export interface WPResponseHeaders {
  'x-wp-total'?: string;
  'x-wp-totalpages'?: string;
}
