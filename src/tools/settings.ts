import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { WordPressClient } from '../wordpress/client.js';

export function registerSettingsTools(server: McpServer, getClient: () => WordPressClient) {
  // Get site info
  server.tool(
    'get_site_info',
    'Get basic information about your WordPress site including name, description, and URL.',
    {},
    async () => {
      const client = getClient();
      const site = await client.getSiteInfo();

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(site, null, 2)
        }]
      };
    }
  );

  // Get site settings
  server.tool(
    'get_site_settings',
    'Get detailed site settings including name, tagline, timezone, date/time formats, and reading settings.',
    {},
    async () => {
      const client = getClient();
      const settings = await client.getSettings();

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(settings, null, 2)
        }]
      };
    }
  );

  // Update site settings
  server.tool(
    'update_site_settings',
    'Update site settings like name, tagline, timezone, and other configuration options. Only provide fields you want to change.',
    {
      title: z.string().optional()
        .describe('Site title/name'),
      description: z.string().optional()
        .describe('Site tagline/description'),
      timezone: z.string().optional()
        .describe('Timezone (e.g., "America/New_York", "Europe/London")'),
      date_format: z.string().optional()
        .describe('Date format (e.g., "F j, Y" for "January 1, 2024")'),
      time_format: z.string().optional()
        .describe('Time format (e.g., "g:i a" for "12:00 pm")'),
      start_of_week: z.number().min(0).max(6).optional()
        .describe('First day of week: 0=Sunday, 1=Monday, etc.'),
      posts_per_page: z.number().min(1).max(100).optional()
        .describe('Number of posts to show per page'),
      default_comment_status: z.enum(['open', 'closed']).optional()
        .describe('Default comment status for new posts'),
      default_ping_status: z.enum(['open', 'closed']).optional()
        .describe('Default ping/trackback status for new posts'),
    },
    async (args) => {
      const client = getClient();

      // Filter out undefined values
      const cleanData = Object.fromEntries(
        Object.entries(args).filter(([, v]) => v !== undefined)
      );

      if (Object.keys(cleanData).length === 0) {
        return {
          content: [{
            type: 'text',
            text: 'Error: No settings to update were provided.'
          }]
        };
      }

      const settings = await client.updateSettings(cleanData);

      return {
        content: [{
          type: 'text',
          text: `Site settings updated successfully!\n\nTitle: ${settings.title}\nDescription: ${settings.description}\nTimezone: ${settings.timezone}`
        }]
      };
    }
  );

  // List categories
  server.tool(
    'list_categories',
    'List all categories on your WordPress site. Categories are used to organize posts into topics.',
    {
      per_page: z.number().min(1).max(100).default(100)
        .describe('Number of categories to return'),
      hide_empty: z.boolean().default(false)
        .describe('Whether to hide categories with no posts'),
    },
    async (args) => {
      const client = getClient();
      const response = await client.listCategories({
        per_page: args.per_page,
        hide_empty: args.hide_empty,
      });

      const summary = response.data.map(cat => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description || null,
        parent: cat.parent || null,
        count: cat.count,
      }));

      return {
        content: [{
          type: 'text',
          text: `Found ${response.total} categories:\n\n${JSON.stringify(summary, null, 2)}`
        }]
      };
    }
  );

  // Create category
  server.tool(
    'create_category',
    'Create a new category for organizing posts.',
    {
      name: z.string().describe('Name of the category'),
      description: z.string().optional()
        .describe('Description of the category'),
      parent: z.number().optional()
        .describe('Parent category ID to create a child category'),
    },
    async (args) => {
      const client = getClient();
      const category = await client.createCategory(args.name, args.description, args.parent);

      return {
        content: [{
          type: 'text',
          text: `Category created successfully!\n\nID: ${category.id}\nName: ${category.name}\nSlug: ${category.slug}`
        }]
      };
    }
  );

  // Delete category
  server.tool(
    'delete_category',
    'Delete a category. Posts in this category will be moved to the default category.',
    {
      category_id: z.number().describe('The ID of the category to delete'),
    },
    async (args) => {
      const client = getClient();
      const category = await client.deleteCategory(args.category_id);

      return {
        content: [{
          type: 'text',
          text: `Category "${category.name}" (ID: ${category.id}) has been deleted.`
        }]
      };
    }
  );

  // List tags
  server.tool(
    'list_tags',
    'List all tags on your WordPress site. Tags are keywords used to describe posts.',
    {
      per_page: z.number().min(1).max(100).default(100)
        .describe('Number of tags to return'),
      hide_empty: z.boolean().default(false)
        .describe('Whether to hide tags with no posts'),
      search: z.string().optional()
        .describe('Search term to filter tags'),
    },
    async (args) => {
      const client = getClient();
      const response = await client.listTags({
        per_page: args.per_page,
        hide_empty: args.hide_empty,
        search: args.search,
      });

      const summary = response.data.map(tag => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        description: tag.description || null,
        count: tag.count,
      }));

      return {
        content: [{
          type: 'text',
          text: `Found ${response.total} tags:\n\n${JSON.stringify(summary, null, 2)}`
        }]
      };
    }
  );

  // Create tag
  server.tool(
    'create_tag',
    'Create a new tag for labeling posts.',
    {
      name: z.string().describe('Name of the tag'),
      description: z.string().optional()
        .describe('Description of the tag'),
    },
    async (args) => {
      const client = getClient();
      const tag = await client.createTag(args.name, args.description);

      return {
        content: [{
          type: 'text',
          text: `Tag created successfully!\n\nID: ${tag.id}\nName: ${tag.name}\nSlug: ${tag.slug}`
        }]
      };
    }
  );

  // Delete tag
  server.tool(
    'delete_tag',
    'Delete a tag. The tag will be removed from all posts.',
    {
      tag_id: z.number().describe('The ID of the tag to delete'),
    },
    async (args) => {
      const client = getClient();
      const tag = await client.deleteTag(args.tag_id);

      return {
        content: [{
          type: 'text',
          text: `Tag "${tag.name}" (ID: ${tag.id}) has been deleted.`
        }]
      };
    }
  );

  // Get current user
  server.tool(
    'get_current_user',
    'Get information about the currently authenticated WordPress user.',
    {},
    async () => {
      const client = getClient();
      const user = await client.getCurrentUser();

      const userInfo = {
        id: user.id,
        name: user.name,
        slug: user.slug,
        description: user.description || null,
        url: user.url || null,
        link: user.link,
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(userInfo, null, 2)
        }]
      };
    }
  );

  // List users
  server.tool(
    'list_users',
    'List all users on your WordPress site.',
    {},
    async () => {
      const client = getClient();
      const response = await client.listUsers();

      const summary = response.data.map(user => ({
        id: user.id,
        name: user.name,
        slug: user.slug,
        url: user.url || null,
      }));

      return {
        content: [{
          type: 'text',
          text: `Found ${response.total} users:\n\n${JSON.stringify(summary, null, 2)}`
        }]
      };
    }
  );
}
