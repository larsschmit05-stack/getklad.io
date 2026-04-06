# Klad MCP Integration

## Overview

The Klad MCP (Model Context Protocol) server enables Claude Code users to programmatically interact with Klad projects, canvas state, and AI features directly from their Claude Code environment. This allows seamless workflows like reading a canvas, making edits, and exporting — all from within Claude while working on code.

## Why Build This

**Value for users:**
- Claude Code users can open Klad canvases without switching context
- Integrate Klad into their Claude Code workflows (e.g., "help me organize this canvas")
- Programmatic canvas manipulation — create, edit, export without UI
- Run AI skills on canvas state for ideation, summarization, organization

**Value for Klad:**
- Positions Klad as deeply integrated with Claude Code development
- Creates a distribution channel (developers discover Klad through Claude Code)
- Feeds usage data and AI interactions back to Klad
- Differentiator: "Works inside your IDE via MCP"

## Architecture

### MCP Server Structure

The MCP server is a Node.js process that implements the Model Context Protocol. It exposes three categories of API:

```
klad-mcp/
├── src/
│   ├── server.ts              # Main MCP server setup
│   ├── resources/
│   │   ├── projects.ts        # List/read user projects
│   │   ├── canvas.ts          # Get canvas state + schema
│   │   └── history.ts         # Undo/redo stack snapshots
│   ├── tools/
│   │   ├── project-tools.ts   # create, delete, rename
│   │   ├── canvas-tools.ts    # save, update nodes, export
│   │   └── ai-tools.ts        # invoke AI skills
│   ├── prompts/
│   │   └── canvas-context.ts  # System prompt for canvas reasoning
│   └── utils/
│       ├── auth.ts            # Supabase auth
│       └── api-client.ts      # HTTP calls to Klad backend
├── package.json
├── tsconfig.json
└── dist/                       # Compiled output for distribution
```

### Resource Types

**Projects Resource** — list user's projects with metadata
```
GET /canvas/projects
→ { projects: [{ id, name, createdAt, updatedAt, nodeCount }] }
```

**Canvas Resource** — full canvas state with schema info
```
GET /canvas/projects/{id}/canvas
→ { 
    projectId, 
    camera: { x, y, zoom },
    nodes: [{ id, type, x, y, ... }],
    nodeOrder: [...],
    version: 1
  }
```

**History Resource** — snapshots for undo/redo context
```
GET /canvas/projects/{id}/history
→ { snapshots: [...], currentIndex: 5 }
```

### Tool Types

**Project Tools:**
- `create_project(name, description)` → POST /api/projects
- `delete_project(projectId)` → DELETE /api/projects/[id]
- `rename_project(projectId, newName)` → PUT /api/projects/[id]

**Canvas Tools:**
- `save_canvas(projectId, canvasState)` → POST /api/canvases/[projectId]
- `create_node(projectId, nodeData)` → adds node + dispatches UPDATE_NODE, returns new state
- `update_node(projectId, nodeId, updates)` → applies UPDATE_NODE action
- `delete_node(projectId, nodeId)` → applies DELETE_NODE action
- `export_canvas(projectId, format)` → GET /api/canvases/[projectId]/export?format=png|svg

**AI Tools:**
- `invoke_ai_skill(projectId, skillName, prompt)` → POST /api/klad/chat/route.ts
- `serialize_canvas(projectId)` → calls lib/ai/serialize-canvas.ts for AI consumption

### Prompts

**Canvas Context Prompt** — injected when user asks about a canvas
```
The user's current Klad canvas has {nodeCount} nodes:
- {nodeType}: {label} (positioned at {x}, {y})
- ...

Canvas schema: (type definitions for nodes, tools, etc.)

You can edit this canvas using the provided tools.
```

## Development Plan

### Phase 1: Scaffold & Local Setup (1–2 hours)

**Goals:** Get MCP server running locally, connected to dev environment.

**Steps:**
1. Create `lib/mcp/` directory
2. Initialize MCP server with SDK
3. Implement basic auth (Supabase service role key from env)
4. Wire one resource (list projects) to test the connection
5. Register in Claude Code's `settings.json` for local testing

**Output:** MCP server starts, Claude Code can query projects.

### Phase 2: Core Resources (2–3 hours)

**Goals:** Expose all data resources (projects, canvas state, history).

**Steps:**
1. Implement `projects` resource (read from `/api/projects`)
2. Implement `canvas` resource (read from `/api/canvases/[projectId]`)
3. Implement `history` resource (mock initially, wire to actual undo stack later)
4. Add resource schemas (TypeScript types exported as JSON schema)

**Output:** Claude Code can read any user's projects and canvas state.

### Phase 3: Canvas Mutation Tools (3–4 hours)

**Goals:** Let Claude Code create/edit canvas nodes.

**Steps:**
1. Implement `create_node(projectId, nodeData)` → dispatches ACTION, calls save endpoint
2. Implement `update_node(projectId, nodeId, updates)` → patches node properties
3. Implement `delete_node(projectId, nodeId)` → removes from nodeOrder
4. Implement `save_canvas(projectId, state)` → direct state upsert
5. Test create→update→delete workflow

**Output:** Claude Code can fully manipulate canvas state programmatically.

### Phase 4: Export & AI Tools (1–2 hours)

**Goals:** Export and AI integration.

**Steps:**
1. Implement `export_canvas(projectId, format)` → calls canvas render logic
2. Implement `serialize_canvas(projectId)` → wraps lib/ai/serialize-canvas.ts
3. Implement `invoke_ai_skill(projectId, skillName, prompt)` → routes to /api/klad/chat

**Output:** Claude Code can export canvases and run AI skills.

### Phase 5: Polish & Distribution (1–2 hours)

**Goals:** Error handling, type safety, npm publish.

**Steps:**
1. Add error boundaries (auth failures, network errors, validation)
2. Write JSDoc/comments for all tools and resources
3. Create `package.json` entry: `@klad/mcp`
4. Build dist/ directory
5. Write setup guide for users

**Output:** Production-ready npm package.

## Implementation Details

### Authentication Flow

**Option A: Service Role Key (Recommended for MVP)**
- MCP server runs as a trusted backend service
- Uses `SUPABASE_SERVICE_ROLE_KEY` from env (admin access)
- All user data is trusted (no further RLS checks needed)
- Simple, but requires securing the env var on user's machine

**Option B: User Session Token Passthrough (More Secure)**
- Claude Code passes user's Supabase session token to MCP
- MCP uses token in Authorization header for all API calls
- RLS still enforces per-user access on backend
- More complex but no shared credentials

**Decision:** Start with Option A for MVP (simpler), migrate to Option B if MCP becomes public distribution.

### Connecting to Existing APIs

All resources/tools route through existing Klad endpoints:

| MCP Tool | Backend Endpoint | Auth |
|----------|------------------|------|
| list_projects | GET /api/projects | RLS filter by user_id |
| create_project | POST /api/projects | RLS insert check |
| save_canvas | POST /api/canvases/[id] | RLS upsert check |
| invoke_ai_skill | POST /api/klad/chat | RLS project ownership |

**Key detail:** All backend endpoints already enforce RLS via `supabase.auth.getUser()`. The MCP server just needs to pass through auth headers or use service role key.

### Canvas State Mutations

When Claude Code calls `update_node()`, the MCP:
1. Reads current canvas state via GET /api/canvases/[projectId]
2. Applies the mutation (dispatch action)
3. Calls lib/canvas/reducer.ts locally to compute new state
4. POSTs the new state to /api/canvases/[projectId]

This mirrors the frontend's flow but server-side, ensuring consistency.

### Error Handling

```typescript
// Structured error responses for Claude Code to interpret
{
  code: "INVALID_NODE_TYPE",
  message: "Node type 'foo' is not supported",
  details: { supported: ["text", "sticky", "rect", ...] }
}

// Network/auth errors
{
  code: "UNAUTHORIZED",
  message: "Invalid or expired token"
}

// Validation errors
{
  code: "VALIDATION_ERROR",
  message: "Node must have x, y, width, height",
  details: { missing: ["width"] }
}
```

## Publishing & Distribution

### npm Package Structure

```json
{
  "name": "@klad/mcp",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "bin": {
    "klad-mcp": "dist/bin/cli.js"
  },
  "files": ["dist"],
  "engines": { "node": ">=18.0.0" }
}
```

### Claude Code Setup (For Users)

Users add to their `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "klad": {
      "command": "npx",
      "args": ["@klad/mcp"],
      "env": {
        "SUPABASE_SERVICE_ROLE_KEY": "YOUR_KEY_HERE",
        "KLAD_API_URL": "https://klad.io"
      }
    }
  }
}
```

**Setup guide** would include:
1. Get service role key from Klad dashboard
2. Paste into `settings.json`
3. Restart Claude Code
4. MCP is ready to use

## Development Workflow

### Local Testing

1. **Start dev environment:**
   ```bash
   npm run dev  # Klad frontend + API
   ```

2. **Register MCP locally:**
   ```json
   // ~/.claude/settings.json (during dev)
   "klad-local": {
     "command": "node",
     "args": ["./lib/mcp/dist/index.js"],
     "env": {
       "SUPABASE_SERVICE_ROLE_KEY": "your_local_key",
       "KLAD_API_URL": "http://localhost:3000"
     }
   }
   ```

3. **Test in Claude Code:**
   - Open a new conversation
   - "Show me my Klad projects"
   - Claude Code calls the MCP resource
   - Response is rendered in chat

4. **Iterate:**
   - Edit `lib/mcp/` code
   - Rebuild: `npm run build:mcp`
   - Claude Code reconnects automatically

### Testing Tools

Create a test script to validate each tool:

```typescript
// lib/mcp/test.ts
import { kladMCP } from './server.js';

async function testTools() {
  const projectId = 'test-project-id';
  
  // Test create_node
  const created = await kladMCP.call('create_node', {
    projectId,
    nodeData: { type: 'text', x: 100, y: 100, text: 'Hello' }
  });
  console.log('✓ create_node:', created);
  
  // Test update_node
  const updated = await kladMCP.call('update_node', {
    projectId,
    nodeId: created.id,
    updates: { text: 'Updated' }
  });
  console.log('✓ update_node:', updated);
  
  // ... etc
}
```

Run with: `npx ts-node lib/mcp/test.ts`

## Maintenance & Evolution

### Versioning

Bump version in `package.json` when:
- Adding new resources/tools (minor)
- Changing tool signatures (major)
- Bug fixes (patch)

Publish to npm:
```bash
npm publish
```

Users update automatically: `npx @klad/mcp@latest`

### Monitoring

Track MCP usage via:
- Claude Code telemetry (if available via Vercel SDK)
- API logs — count calls to /api/klad/chat from MCP origin
- Error rates — watch for auth/validation errors

### Future Enhancements

Once MVP is stable:
- **Real-time sync** — WebSocket for live canvas updates
- **Collaborative editing** — multiple Claude Code instances on same canvas
- **Custom prompts** — users define AI skills via MCP
- **Canvas templates** — quick scaffolding from MCP
- **Analytics** — track which tools are used most

## Timeline

**Realistic estimate with Claude Code:** 8–12 hours total development time.

- Phase 1 (Scaffold): 2h
- Phase 2 (Resources): 3h
- Phase 3 (Mutation Tools): 4h
- Phase 4 (Export/AI): 2h
- Phase 5 (Polish/Publish): 2h

**Can compress to 1 session with aggressive scoping** (cut Phase 5, ship MVP internally first).

## Success Metrics

- MCP server starts without errors
- Resources return correct data structure
- All tools execute and mutate canvas state
- Claude Code can read/write canvas programmatically
- No TypeScript errors
- Works end-to-end: create project → add nodes → export → in Claude Code

## References

- [MCP SDK Documentation](https://modelcontextprotocol.io)
- [Claude Code Settings](https://claude.ai/code)
- Klad APIs: `app/api/`, `lib/db.ts`
- Canvas types: `lib/canvas/types.ts`
- Reducer logic: `lib/canvas/reducer.ts`
