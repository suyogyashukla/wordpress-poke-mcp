# WordPress MCP Server for Poke.com's AI Assistant.

An MCP (Model Context Protocol) server that connects AI agents to your WordPress site, enabling natural language management of posts, pages, comments, media, and settings.

Built for use with [Poke.com](https://poke.com) and other MCP-compatible AI clients.

## Features

**34 tools** for complete WordPress management:

- **Posts** - Create, read, update, delete, and search blog posts
- **Pages** - Manage static pages with hierarchy support
- **Comments** - View, moderate (approve/spam/trash), reply, and bulk actions
- **Media** - Browse library, upload from URL, update metadata, delete
- **Settings** - Site configuration, categories, tags, and user management

## Prerequisites

- Node.js 20+
- A self-hosted WordPress site or a WordPress.com site on Business/eCommerce plan. (WordPress 5.6+ for Application Passwords)
- Admin or Editor access to your WordPress site

## Quick Start

### 1. Create a WordPress Application Password

1. Log in to your WordPress admin dashboard
2. Go to **Users → Profile**
3. Scroll to **Application Passwords**
4. Enter a name (e.g., `MCP Server`) and click **Add New Application Password**
5. Copy the password immediately - it won't be shown again
   - Format: `xxxx xxxx xxxx xxxx xxxx xxxx`

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and set your values:

```bash
cp .env.example .env
```

| Variable | Description | Example |
|----------|-------------|---------|
| `WORDPRESS_SITE_URL` | Your WordPress site URL | `https://example.com` |
| `WORDPRESS_USERNAME` | Your WordPress username | `admin` |
| `WORDPRESS_APP_PASSWORD` | Application password (with spaces) | `xxxx xxxx xxxx xxxx xxxx xxxx` |
| `API_KEY` | Secret key to protect MCP endpoints | `your-secret-key` |

Generate a secure API key:
```bash
openssl rand -hex 32
```

### 3. Install and Run

```bash
# Install dependencies
npm install

# Development
npm run dev

# Production
npm run build && npm start
```

### 4. Verify

Visit `http://localhost:3000/health` to confirm the server is running:
```json
{"status":"ok","server":"wordpress-mcp","version":"1.0.0","hasCredentials":true,"apiKeyProtected":true}
```

## Deployment

This server can be deployed to any Node.js hosting platform. Below are instructions for common options.

### Environment Variables (All Platforms)

Set these environment variables in your hosting platform's dashboard:

| Variable | Required | Description |
|----------|----------|-------------|
| `WORDPRESS_SITE_URL` | Yes | Your WordPress site URL |
| `WORDPRESS_USERNAME` | Yes | WordPress username |
| `WORDPRESS_APP_PASSWORD` | Yes | WordPress application password |
| `API_KEY` | Yes | Secret key to protect endpoints |
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | Set to `production` for production |

### Render

1. Push code to a Git repository (GitHub, GitLab, etc.)
2. Create a new **Web Service** on [Render](https://render.com)
3. Connect your repository
4. Configure build settings:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. Add environment variables in the dashboard
6. Deploy

### Railway

1. Connect your repository to [Railway](https://railway.app)
2. Railway auto-detects Node.js and sets build/start commands
3. Add environment variables in the dashboard
4. Deploy

### Fly.io

1. Install the [Fly CLI](https://fly.io/docs/hands-on/install-flyctl/)
2. Run `fly launch` and follow prompts
3. Set secrets:
   ```bash
   fly secrets set WORDPRESS_SITE_URL=https://example.com
   fly secrets set WORDPRESS_USERNAME=admin
   fly secrets set WORDPRESS_APP_PASSWORD="xxxx xxxx xxxx xxxx xxxx xxxx"
   fly secrets set API_KEY=your-secret-key
   ```
4. Deploy with `fly deploy`

### Heroku

1. Create a new app on [Heroku](https://heroku.com)
2. Connect your repository or use Heroku CLI
3. Add environment variables in Settings → Config Vars
4. Deploy

### Self-Hosted / VPS

1. Clone the repository to your server
2. Install dependencies: `npm install`
3. Build: `npm run build`
4. Set environment variables
5. Run with a process manager like PM2:
   ```bash
   pm2 start dist/index.js --name wordpress-mcp
   ```
6. Configure a reverse proxy (nginx/caddy) with HTTPS

## Connecting to Poke.com

1. Go to **Settings → Connections** in Poke.com
2. Click **New Integration**
3. Configure:
   - **Name**: WordPress (or any name)
   - **Server URL**: `https://your-server.com/sse`
   - **API Key**: Your `API_KEY` value
4. Click **Create Integration**

Test by asking Poke: *"Get my WordPress site info"*

## Available Tools

### Posts (6 tools)
| Tool | Description |
|------|-------------|
| `list_posts` | List posts with filters (status, category, search) |
| `get_post` | Get post by ID |
| `get_post_by_slug` | Get post by URL slug |
| `create_post` | Create new post |
| `update_post` | Update existing post |
| `delete_post` | Delete or trash post |

### Pages (5 tools)
| Tool | Description |
|------|-------------|
| `list_pages` | List pages with hierarchy |
| `get_page` | Get page by ID |
| `create_page` | Create new page |
| `update_page` | Update existing page |
| `delete_page` | Delete or trash page |

### Comments (6 tools)
| Tool | Description |
|------|-------------|
| `list_comments` | List comments with filters |
| `get_comment` | Get comment by ID |
| `moderate_comment` | Approve, spam, or trash comment |
| `create_comment` | Reply to post or comment |
| `delete_comment` | Delete comment |
| `bulk_moderate_comments` | Moderate multiple comments |

### Media (6 tools)
| Tool | Description |
|------|-------------|
| `list_media` | List media library items |
| `list_images` | List only images |
| `get_media` | Get media item details |
| `upload_media_from_url` | Upload file from URL |
| `update_media` | Update title, caption, alt text |
| `delete_media` | Delete media item |

### Settings & Taxonomies (11 tools)
| Tool | Description |
|------|-------------|
| `get_site_info` | Get basic site information |
| `get_site_settings` | Get detailed site settings |
| `update_site_settings` | Update site title, tagline, timezone, etc. |
| `list_categories` | List all categories |
| `create_category` | Create new category |
| `delete_category` | Delete category |
| `list_tags` | List all tags |
| `create_tag` | Create new tag |
| `delete_tag` | Delete tag |
| `get_current_user` | Get authenticated user info |
| `list_users` | List all users |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Server information |
| `/health` | GET | Health check |
| `/sse` | GET | MCP SSE endpoint |
| `/messages` | POST | SSE message handler |

## Security

- **API Key Protection**: All MCP endpoints require authentication via the `API_KEY` environment variable
- **Application Passwords**: Uses WordPress application passwords instead of your main password
- **HTTPS Required**: Always use HTTPS in production for both your WordPress site and MCP server
- **Environment Variables**: All secrets are stored as environment variables, never in code
- **Revocation**: Revoke WordPress app passwords from your profile anytime; rotate `API_KEY` if compromised

### Authentication Methods

The server accepts API keys via:
- `X-API-Key` header
- `Authorization: Bearer <token>` header
- `Authorization` header (without Bearer prefix)

## Troubleshooting

### "rest_cannot_create" errors
- Ensure your WordPress user has Editor or Admin role
- Verify the REST API is enabled on your site

### "rest_forbidden" errors
- Check the Application Password is correct (include spaces)
- Verify the username is correct

### Connection refused
- Confirm `WORDPRESS_SITE_URL` is correct and publicly accessible
- Ensure your site has HTTPS enabled

### MCP client can't connect
- Verify the server is running and accessible
- Check that `API_KEY` matches between server and client
- Confirm you're using the `/sse` endpoint

## License

GPL 3.0
