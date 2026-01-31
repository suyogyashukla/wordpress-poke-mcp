import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { WordPressClient } from '../wordpress/client.js';

const PostStatusSchema = z.enum(['publish', 'draft', 'pending', 'private', 'future']);

export function registerPostTools(server: McpServer, getClient: () => WordPressClient) {
  // List posts
  server.tool(
    'list_posts',
    'List all posts from your WordPress site. Returns post titles, IDs, status, dates, and excerpts. Supports filtering by status, category, tag, and search terms.',
    {
      status: z.enum(['publish', 'draft', 'pending', 'private', 'future', 'any']).optional()
        .describe('Filter by post status. Use "any" to include all statuses.'),
      search: z.string().optional()
        .describe('Search term to filter posts by title or content'),
      per_page: z.number().min(1).max(100).default(20)
        .describe('Number of posts to return (1-100, default 20)'),
      page: z.number().min(1).optional()
        .describe('Page number for pagination'),
      categories: z.array(z.number()).optional()
        .describe('Filter by category IDs'),
      tags: z.array(z.number()).optional()
        .describe('Filter by tag IDs'),
      order: z.enum(['asc', 'desc']).default('desc')
        .describe('Sort order'),
      orderby: z.enum(['date', 'modified', 'title', 'id']).default('date')
        .describe('Field to sort by'),
    },
    async (args) => {
      const client = getClient();
      const params: Record<string, unknown> = {
        per_page: args.per_page,
        order: args.order,
        orderby: args.orderby,
      };

      if (args.status && args.status !== 'any') {
        params.status = args.status;
      }
      if (args.search) params.search = args.search;
      if (args.page) params.page = args.page;
      if (args.categories) params.categories = args.categories;
      if (args.tags) params.tags = args.tags;

      const response = await client.listPosts(params);

      const summary = response.data.map(post => ({
        id: post.id,
        title: post.title.rendered,
        status: post.status,
        date: post.date,
        modified: post.modified,
        link: post.link,
        slug: post.slug,
        excerpt: post.excerpt.rendered.replace(/<[^>]*>/g, '').substring(0, 200),
        categories: post.categories,
        tags: post.tags,
      }));

      return {
        content: [{
          type: 'text',
          text: `Found ${response.total} posts (page shows ${summary.length}):\n\n${JSON.stringify(summary, null, 2)}`
        }]
      };
    }
  );

  // Get single post
  server.tool(
    'get_post',
    'Get detailed information about a specific post by its ID. Returns full content, metadata, categories, tags, and settings.',
    {
      post_id: z.number().describe('The ID of the post to retrieve'),
    },
    async (args) => {
      const client = getClient();
      const post = await client.getPost(args.post_id);

      const postDetails = {
        id: post.id,
        title: post.title.rendered,
        status: post.status,
        date: post.date,
        modified: post.modified,
        link: post.link,
        slug: post.slug,
        content: post.content.rendered,
        excerpt: post.excerpt.rendered,
        author: post.author,
        categories: post.categories,
        tags: post.tags,
        featured_media: post.featured_media,
        comment_status: post.comment_status,
        ping_status: post.ping_status,
        sticky: post.sticky,
        format: post.format,
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(postDetails, null, 2)
        }]
      };
    }
  );

  // Create post
  server.tool(
    'create_post',
    'Create a new blog post. Can create drafts or publish immediately. Supports categories, tags, featured images, and various settings.',
    {
      title: z.string().describe('The title of the post'),
      content: z.string().describe('The HTML content of the post'),
      status: PostStatusSchema.default('draft')
        .describe('Post status: publish, draft, pending, private, or future. Defaults to draft.'),
      excerpt: z.string().optional()
        .describe('Optional custom excerpt for the post'),
      categories: z.array(z.number()).optional()
        .describe('Array of category IDs to assign'),
      tags: z.array(z.number()).optional()
        .describe('Array of tag IDs to assign'),
      slug: z.string().optional()
        .describe('Custom URL slug for the post'),
      featured_media: z.number().optional()
        .describe('Media ID to use as featured image'),
      sticky: z.boolean().optional()
        .describe('Whether to make this a sticky post'),
      comment_status: z.enum(['open', 'closed']).optional()
        .describe('Whether to allow comments on this post'),
    },
    async (args) => {
      const client = getClient();

      const post = await client.createPost({
        title: args.title,
        content: args.content,
        status: args.status,
        excerpt: args.excerpt,
        categories: args.categories,
        tags: args.tags,
        slug: args.slug,
        featured_media: args.featured_media,
        sticky: args.sticky,
        comment_status: args.comment_status,
      });

      return {
        content: [{
          type: 'text',
          text: `Post created successfully!\n\nID: ${post.id}\nTitle: ${post.title.rendered}\nStatus: ${post.status}\nURL: ${post.link}`
        }]
      };
    }
  );

  // Update post
  server.tool(
    'update_post',
    'Update an existing post. Can modify title, content, status, and other properties. Only provide the fields you want to change.',
    {
      post_id: z.number().describe('The ID of the post to update'),
      title: z.string().optional().describe('New title for the post'),
      content: z.string().optional().describe('New HTML content for the post'),
      status: PostStatusSchema.optional()
        .describe('New status: publish, draft, pending, private, or future'),
      excerpt: z.string().optional().describe('New excerpt for the post'),
      categories: z.array(z.number()).optional()
        .describe('New array of category IDs (replaces existing)'),
      tags: z.array(z.number()).optional()
        .describe('New array of tag IDs (replaces existing)'),
      slug: z.string().optional().describe('New URL slug'),
      featured_media: z.number().optional()
        .describe('Media ID for new featured image'),
      sticky: z.boolean().optional().describe('Whether post should be sticky'),
      comment_status: z.enum(['open', 'closed']).optional()
        .describe('Whether to allow comments'),
    },
    async (args) => {
      const client = getClient();
      const { post_id, ...updateData } = args;

      // Filter out undefined values
      const cleanData = Object.fromEntries(
        Object.entries(updateData).filter(([, v]) => v !== undefined)
      );

      if (Object.keys(cleanData).length === 0) {
        return {
          content: [{
            type: 'text',
            text: 'Error: No fields to update were provided.'
          }]
        };
      }

      const post = await client.updatePost(post_id, cleanData);

      return {
        content: [{
          type: 'text',
          text: `Post updated successfully!\n\nID: ${post.id}\nTitle: ${post.title.rendered}\nStatus: ${post.status}\nModified: ${post.modified}\nURL: ${post.link}`
        }]
      };
    }
  );

  // Delete post
  server.tool(
    'delete_post',
    'Move a post to trash or permanently delete it. By default, posts are moved to trash.',
    {
      post_id: z.number().describe('The ID of the post to delete'),
      force: z.boolean().default(false)
        .describe('Set to true to permanently delete instead of trashing'),
    },
    async (args) => {
      const client = getClient();
      const post = await client.deletePost(args.post_id, args.force);

      const action = args.force ? 'permanently deleted' : 'moved to trash';
      return {
        content: [{
          type: 'text',
          text: `Post "${post.title.rendered}" (ID: ${post.id}) has been ${action}.`
        }]
      };
    }
  );

  // Get post by slug
  server.tool(
    'get_post_by_slug',
    'Get a post by its URL slug instead of ID. Useful when you know the post URL but not the ID.',
    {
      slug: z.string().describe('The URL slug of the post (e.g., "my-first-post")'),
    },
    async (args) => {
      const client = getClient();
      const post = await client.getPostBySlug(args.slug);

      if (!post) {
        return {
          content: [{
            type: 'text',
            text: `No post found with slug "${args.slug}"`
          }]
        };
      }

      const postDetails = {
        id: post.id,
        title: post.title.rendered,
        status: post.status,
        date: post.date,
        modified: post.modified,
        link: post.link,
        slug: post.slug,
        content: post.content.rendered,
        excerpt: post.excerpt.rendered,
        author: post.author,
        categories: post.categories,
        tags: post.tags,
        featured_media: post.featured_media,
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(postDetails, null, 2)
        }]
      };
    }
  );
}
