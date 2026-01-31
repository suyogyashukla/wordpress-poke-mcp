import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { WordPressClient } from '../wordpress/client.js';

export function registerMediaTools(server: McpServer, getClient: () => WordPressClient) {
  // List media
  server.tool(
    'list_media',
    'List media files (images, documents, etc.) from your WordPress media library. Returns file URLs, dimensions, and metadata.',
    {
      per_page: z.number().min(1).max(100).default(20)
        .describe('Number of media items to return (1-100, default 20)'),
      page: z.number().min(1).optional()
        .describe('Page number for pagination'),
      search: z.string().optional()
        .describe('Search term to filter media by title'),
      media_type: z.enum(['image', 'video', 'audio', 'application']).optional()
        .describe('Filter by media type'),
      mime_type: z.string().optional()
        .describe('Filter by MIME type (e.g., "image/jpeg", "application/pdf")'),
    },
    async (args) => {
      const client = getClient();
      const params: Record<string, unknown> = {
        per_page: args.per_page,
      };

      if (args.page) params.page = args.page;
      if (args.search) params.search = args.search;
      if (args.media_type) params.media_type = args.media_type;
      if (args.mime_type) params.mime_type = args.mime_type;

      const response = await client.listMedia(params);

      const summary = response.data.map(item => ({
        id: item.id,
        title: item.title.rendered,
        source_url: item.source_url,
        mime_type: item.mime_type,
        media_type: item.media_type,
        date: item.date,
        width: item.media_details?.width || null,
        height: item.media_details?.height || null,
        alt_text: item.alt_text || null,
        caption: item.caption?.rendered?.replace(/<[^>]*>/g, '') || null,
      }));

      return {
        content: [{
          type: 'text',
          text: `Found ${response.total} media items (page shows ${summary.length}):\n\n${JSON.stringify(summary, null, 2)}`
        }]
      };
    }
  );

  // Get single media item
  server.tool(
    'get_media',
    'Get detailed information about a specific media item by its ID. Returns full metadata, dimensions, and all available sizes.',
    {
      media_id: z.number().describe('The ID of the media item to retrieve'),
    },
    async (args) => {
      const client = getClient();
      const item = await client.getMedia(args.media_id);

      const mediaDetails = {
        id: item.id,
        title: item.title.rendered,
        source_url: item.source_url,
        link: item.link,
        mime_type: item.mime_type,
        media_type: item.media_type,
        date: item.date,
        modified: item.modified,
        author: item.author,
        alt_text: item.alt_text || null,
        caption: item.caption?.rendered || null,
        description: item.description?.rendered || null,
        media_details: {
          width: item.media_details?.width,
          height: item.media_details?.height,
          file: item.media_details?.file,
          sizes: item.media_details?.sizes ? Object.keys(item.media_details.sizes) : [],
        },
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(mediaDetails, null, 2)
        }]
      };
    }
  );

  // Upload media from URL
  server.tool(
    'upload_media_from_url',
    'Upload a media file to WordPress from a URL. Downloads the file and uploads it to your media library.',
    {
      url: z.string().url().describe('The URL of the file to upload'),
      title: z.string().optional().describe('Title for the media item'),
      caption: z.string().optional().describe('Caption for the media item'),
      description: z.string().optional().describe('Description for the media item'),
      alt_text: z.string().optional().describe('Alt text for images (important for accessibility)'),
    },
    async (args) => {
      const client = getClient();

      // Fetch the file from URL
      const response = await fetch(args.url);
      if (!response.ok) {
        return {
          content: [{
            type: 'text',
            text: `Error: Could not fetch file from URL. Status: ${response.status}`
          }]
        };
      }

      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      const buffer = Buffer.from(await response.arrayBuffer());

      // Extract filename from URL
      const urlPath = new URL(args.url).pathname;
      const filename = urlPath.split('/').pop() || 'uploaded-file';

      const media = await client.uploadMedia(buffer, filename, contentType, {
        title: args.title,
        caption: args.caption,
        description: args.description,
        alt_text: args.alt_text,
      });

      return {
        content: [{
          type: 'text',
          text: `Media uploaded successfully!\n\nID: ${media.id}\nTitle: ${media.title.rendered}\nURL: ${media.source_url}\nMIME Type: ${media.mime_type}\nDimensions: ${media.media_details?.width || 'N/A'}x${media.media_details?.height || 'N/A'}`
        }]
      };
    }
  );

  // Update media metadata
  server.tool(
    'update_media',
    'Update metadata for a media item. Can change title, caption, description, and alt text.',
    {
      media_id: z.number().describe('The ID of the media item to update'),
      title: z.string().optional().describe('New title for the media item'),
      caption: z.string().optional().describe('New caption'),
      description: z.string().optional().describe('New description'),
      alt_text: z.string().optional().describe('New alt text for images'),
    },
    async (args) => {
      const client = getClient();
      const { media_id, ...updateData } = args;

      // Filter out undefined values
      const cleanData = Object.fromEntries(
        Object.entries(updateData).filter(([, v]) => v !== undefined)
      ) as { title?: string; caption?: string; description?: string; alt_text?: string };

      if (Object.keys(cleanData).length === 0) {
        return {
          content: [{
            type: 'text',
            text: 'Error: No fields to update were provided.'
          }]
        };
      }

      const media = await client.updateMedia(media_id, cleanData);

      return {
        content: [{
          type: 'text',
          text: `Media updated successfully!\n\nID: ${media.id}\nTitle: ${media.title.rendered}\nAlt: ${media.alt_text || '(none)'}\nURL: ${media.source_url}`
        }]
      };
    }
  );

  // Delete media
  server.tool(
    'delete_media',
    'Permanently delete a media item from the media library. This action cannot be undone.',
    {
      media_id: z.number().describe('The ID of the media item to delete'),
    },
    async (args) => {
      const client = getClient();
      const media = await client.deleteMedia(args.media_id);

      return {
        content: [{
          type: 'text',
          text: `Media item "${media.title.rendered}" (ID: ${media.id}) has been permanently deleted.\n\nNote: Any posts or pages using this media will show broken images.`
        }]
      };
    }
  );

  // List images only
  server.tool(
    'list_images',
    'List only image files from your media library. Convenience tool for finding images to use as featured images.',
    {
      per_page: z.number().min(1).max(100).default(20)
        .describe('Number of images to return'),
      page: z.number().min(1).optional()
        .describe('Page number for pagination'),
      search: z.string().optional()
        .describe('Search term to filter images by title'),
    },
    async (args) => {
      const client = getClient();

      const response = await client.listMedia({
        per_page: args.per_page,
        page: args.page,
        search: args.search,
        media_type: 'image',
      });

      const summary = response.data.map(item => ({
        id: item.id,
        title: item.title.rendered,
        source_url: item.source_url,
        dimensions: `${item.media_details?.width || '?'}x${item.media_details?.height || '?'}`,
        thumbnail: item.media_details?.sizes?.thumbnail?.source_url || item.source_url,
        alt_text: item.alt_text || null,
      }));

      return {
        content: [{
          type: 'text',
          text: `Found ${response.total} images (page shows ${summary.length}):\n\n${JSON.stringify(summary, null, 2)}`
        }]
      };
    }
  );
}
