import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { WordPressClient } from '../wordpress/client.js';

const PageStatusSchema = z.enum(['publish', 'draft', 'pending', 'private', 'future']);

export function registerPageTools(server: McpServer, getClient: () => WordPressClient) {
  // List pages
  server.tool(
    'list_pages',
    'List all pages from your WordPress site. Pages are static content (like About, Contact) as opposed to blog posts. Returns page titles, IDs, status, and hierarchy.',
    {
      status: z.enum(['publish', 'draft', 'pending', 'private', 'future', 'any']).optional()
        .describe('Filter by page status. Use "any" to include all statuses.'),
      search: z.string().optional()
        .describe('Search term to filter pages by title or content'),
      per_page: z.number().min(1).max(100).default(20)
        .describe('Number of pages to return (1-100, default 20)'),
      page: z.number().min(1).optional()
        .describe('Page number for pagination'),
      parent: z.number().optional()
        .describe('Filter by parent page ID to get child pages'),
      order: z.enum(['asc', 'desc']).default('asc')
        .describe('Sort order'),
      orderby: z.enum(['date', 'modified', 'title', 'menu_order', 'id']).default('menu_order')
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
      if (args.parent !== undefined) params.parent = args.parent;

      const response = await client.listPages(params);

      const summary = response.data.map(page => ({
        id: page.id,
        title: page.title.rendered,
        status: page.status,
        date: page.date,
        modified: page.modified,
        link: page.link,
        slug: page.slug,
        parent: page.parent,
        menu_order: page.menu_order,
        template: page.template || 'default',
      }));

      return {
        content: [{
          type: 'text',
          text: `Found ${response.total} pages (page shows ${summary.length}):\n\n${JSON.stringify(summary, null, 2)}`
        }]
      };
    }
  );

  // Get single page
  server.tool(
    'get_page',
    'Get detailed information about a specific page by its ID. Returns full content, metadata, and settings.',
    {
      page_id: z.number().describe('The ID of the page to retrieve'),
    },
    async (args) => {
      const client = getClient();
      const page = await client.getPage(args.page_id);

      const pageDetails = {
        id: page.id,
        title: page.title.rendered,
        status: page.status,
        date: page.date,
        modified: page.modified,
        link: page.link,
        slug: page.slug,
        content: page.content.rendered,
        excerpt: page.excerpt.rendered,
        author: page.author,
        parent: page.parent,
        menu_order: page.menu_order,
        template: page.template || 'default',
        featured_media: page.featured_media,
        comment_status: page.comment_status,
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(pageDetails, null, 2)
        }]
      };
    }
  );

  // Create page
  server.tool(
    'create_page',
    'Create a new page. Pages are static content like About, Contact, or Services pages. Can set parent pages for hierarchy.',
    {
      title: z.string().describe('The title of the page'),
      content: z.string().describe('The HTML content of the page'),
      status: PageStatusSchema.default('draft')
        .describe('Page status: publish, draft, pending, private, or future. Defaults to draft.'),
      excerpt: z.string().optional()
        .describe('Optional custom excerpt for the page'),
      slug: z.string().optional()
        .describe('Custom URL slug for the page'),
      parent: z.number().optional()
        .describe('Parent page ID to create a child page'),
      menu_order: z.number().optional()
        .describe('Order in the page menu (lower numbers appear first)'),
      featured_media: z.number().optional()
        .describe('Media ID to use as featured image'),
      comment_status: z.enum(['open', 'closed']).optional()
        .describe('Whether to allow comments on this page'),
      template: z.string().optional()
        .describe('Page template to use'),
    },
    async (args) => {
      const client = getClient();

      const page = await client.createPage({
        title: args.title,
        content: args.content,
        status: args.status,
        excerpt: args.excerpt,
        slug: args.slug,
        parent: args.parent,
        menu_order: args.menu_order,
        featured_media: args.featured_media,
        comment_status: args.comment_status,
        template: args.template,
      });

      return {
        content: [{
          type: 'text',
          text: `Page created successfully!\n\nID: ${page.id}\nTitle: ${page.title.rendered}\nStatus: ${page.status}\nURL: ${page.link}`
        }]
      };
    }
  );

  // Update page
  server.tool(
    'update_page',
    'Update an existing page. Can modify title, content, status, hierarchy, and other properties. Only provide the fields you want to change.',
    {
      page_id: z.number().describe('The ID of the page to update'),
      title: z.string().optional().describe('New title for the page'),
      content: z.string().optional().describe('New HTML content for the page'),
      status: PageStatusSchema.optional()
        .describe('New status: publish, draft, pending, private, or future'),
      excerpt: z.string().optional().describe('New excerpt for the page'),
      slug: z.string().optional().describe('New URL slug'),
      parent: z.number().optional()
        .describe('New parent page ID (use 0 to make top-level)'),
      menu_order: z.number().optional()
        .describe('New menu order position'),
      featured_media: z.number().optional()
        .describe('Media ID for new featured image'),
      comment_status: z.enum(['open', 'closed']).optional()
        .describe('Whether to allow comments'),
      template: z.string().optional()
        .describe('Page template to use'),
    },
    async (args) => {
      const client = getClient();
      const { page_id, ...updateData } = args;

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

      const page = await client.updatePage(page_id, cleanData);

      return {
        content: [{
          type: 'text',
          text: `Page updated successfully!\n\nID: ${page.id}\nTitle: ${page.title.rendered}\nStatus: ${page.status}\nModified: ${page.modified}\nURL: ${page.link}`
        }]
      };
    }
  );

  // Delete page
  server.tool(
    'delete_page',
    'Move a page to trash or permanently delete it.',
    {
      page_id: z.number().describe('The ID of the page to delete'),
      force: z.boolean().default(false)
        .describe('Set to true to permanently delete instead of trashing'),
    },
    async (args) => {
      const client = getClient();
      const page = await client.deletePage(args.page_id, args.force);

      const action = args.force ? 'permanently deleted' : 'moved to trash';
      return {
        content: [{
          type: 'text',
          text: `Page "${page.title.rendered}" (ID: ${page.id}) has been ${action}.`
        }]
      };
    }
  );
}
