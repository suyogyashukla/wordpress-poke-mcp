import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { WordPressClient } from '../wordpress/client.js';

// WordPress.org uses different status values than WordPress.com
const CommentStatusSchema = z.enum(['approved', 'hold', 'spam', 'trash']);

export function registerCommentTools(server: McpServer, getClient: () => WordPressClient) {
  // List comments
  server.tool(
    'list_comments',
    'List comments from your WordPress site. Can filter by status, post, and date. Useful for moderation and review.',
    {
      status: z.enum(['approved', 'hold', 'spam', 'trash', 'all']).optional()
        .describe('Filter by comment status. "hold" shows comments awaiting moderation.'),
      post: z.number().optional()
        .describe('Filter comments for a specific post ID'),
      per_page: z.number().min(1).max(100).default(20)
        .describe('Number of comments to return (1-100, default 20)'),
      page: z.number().min(1).optional()
        .describe('Page number for pagination'),
      order: z.enum(['asc', 'desc']).default('desc')
        .describe('Sort order by date'),
      search: z.string().optional()
        .describe('Search term to filter comments'),
    },
    async (args) => {
      const client = getClient();
      const params: Record<string, unknown> = {
        per_page: args.per_page,
        order: args.order,
      };

      if (args.status && args.status !== 'all') {
        params.status = args.status;
      }
      if (args.post) params.post = args.post;
      if (args.page) params.page = args.page;
      if (args.search) params.search = args.search;

      const response = await client.listComments(params);

      const summary = response.data.map(comment => ({
        id: comment.id,
        post: comment.post,
        author_name: comment.author_name,
        author_url: comment.author_url || null,
        date: comment.date,
        status: comment.status,
        content: comment.content.rendered.replace(/<[^>]*>/g, '').substring(0, 200),
        parent: comment.parent || null,
      }));

      return {
        content: [{
          type: 'text',
          text: `Found ${response.total} comments (page shows ${summary.length}):\n\n${JSON.stringify(summary, null, 2)}`
        }]
      };
    }
  );

  // Get single comment
  server.tool(
    'get_comment',
    'Get detailed information about a specific comment by its ID.',
    {
      comment_id: z.number().describe('The ID of the comment to retrieve'),
    },
    async (args) => {
      const client = getClient();
      const comment = await client.getComment(args.comment_id);

      const commentDetails = {
        id: comment.id,
        post: comment.post,
        author_name: comment.author_name,
        author_email: comment.author_email || null,
        author_url: comment.author_url || null,
        date: comment.date,
        status: comment.status,
        content: comment.content.rendered,
        link: comment.link,
        parent: comment.parent || null,
        type: comment.type,
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(commentDetails, null, 2)
        }]
      };
    }
  );

  // Moderate comment (change status)
  server.tool(
    'moderate_comment',
    'Change the status of a comment. Use this to approve pending comments, mark as spam, or trash inappropriate comments.',
    {
      comment_id: z.number().describe('The ID of the comment to moderate'),
      status: CommentStatusSchema
        .describe('New status: approved, hold (pending), spam, or trash'),
    },
    async (args) => {
      const client = getClient();
      const comment = await client.updateComment(args.comment_id, { status: args.status });

      const statusMessages: Record<string, string> = {
        approved: 'Comment has been approved and is now visible.',
        hold: 'Comment has been set to pending moderation.',
        spam: 'Comment has been marked as spam.',
        trash: 'Comment has been moved to trash.',
      };

      return {
        content: [{
          type: 'text',
          text: `${statusMessages[args.status]}\n\nComment ID: ${comment.id}\nPost ID: ${comment.post}\nAuthor: ${comment.author_name}\nNew Status: ${comment.status}`
        }]
      };
    }
  );

  // Create comment (reply)
  server.tool(
    'create_comment',
    'Create a new comment on a post. Can be used to reply to existing comments by specifying a parent.',
    {
      post: z.number().describe('The ID of the post to comment on'),
      content: z.string().describe('The content of the comment (supports HTML)'),
      parent: z.number().optional()
        .describe('Parent comment ID if this is a reply'),
    },
    async (args) => {
      const client = getClient();
      const comment = await client.createComment({
        post: args.post,
        content: args.content,
        parent: args.parent,
      });

      return {
        content: [{
          type: 'text',
          text: `Comment posted successfully!\n\nComment ID: ${comment.id}\nPost ID: ${comment.post}\nStatus: ${comment.status}\nLink: ${comment.link}`
        }]
      };
    }
  );

  // Delete comment
  server.tool(
    'delete_comment',
    'Delete a comment. Use force=true to permanently delete, otherwise moves to trash.',
    {
      comment_id: z.number().describe('The ID of the comment to delete'),
      force: z.boolean().default(false)
        .describe('Set to true to permanently delete instead of trashing'),
    },
    async (args) => {
      const client = getClient();
      const comment = await client.deleteComment(args.comment_id, args.force);

      const action = args.force ? 'permanently deleted' : 'moved to trash';
      return {
        content: [{
          type: 'text',
          text: `Comment (ID: ${comment.id}) has been ${action}.`
        }]
      };
    }
  );

  // Bulk moderate comments
  server.tool(
    'bulk_moderate_comments',
    'Moderate multiple comments at once. Useful for approving several pending comments or clearing spam.',
    {
      comment_ids: z.array(z.number()).min(1).max(50)
        .describe('Array of comment IDs to moderate (max 50)'),
      status: CommentStatusSchema
        .describe('New status to apply to all comments'),
    },
    async (args) => {
      const client = getClient();
      const results: { id: number; success: boolean; error?: string }[] = [];

      for (const commentId of args.comment_ids) {
        try {
          await client.updateComment(commentId, { status: args.status });
          results.push({ id: commentId, success: true });
        } catch (error) {
          results.push({
            id: commentId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      return {
        content: [{
          type: 'text',
          text: `Bulk moderation complete.\n\nSuccessful: ${successful}\nFailed: ${failed}\n\nDetails:\n${JSON.stringify(results, null, 2)}`
        }]
      };
    }
  );
}
