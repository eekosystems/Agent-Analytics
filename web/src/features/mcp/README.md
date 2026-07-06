# Active Trace MCP Server

Model Context Protocol (MCP) server for Active Trace, enabling AI assistants to interact with Active Trace programmatically.

> ⚠️ **API stability**:
> This MCP server is self-describing. Clients should dynamically inspect available tools and schemas rather than assuming a static interface.
> Tool availability and schemas may evolve over time, including the addition, removal, or modification of tools and fields. Clients are expected to tolerate schema changes and refresh capabilities dynamically.

## Quick Start (Local Development)

### Prerequisites

- Active Trace instance running locally
- Project-scoped API key (Public Key + Secret Key)
- Claude Code or another MCP-compatible client

### Steps

1. **Get API Keys**
   - Navigate to `http://localhost:3000/project/{project-id}/settings`
   - Create or copy a project-scoped API key (`pk-at-...` and `sk-at-...`)
   - Note: Organization-level keys are not supported

2. **Encode Credentials**

   ```bash
   echo -n "pk-at-xxx:sk-at-xxx" | base64
   ```

   Output:

   ```
   // Example. Real token will be much longer
   cGstYXQteHh4OnNrLWF0LXh4eA==
   ```

3. **Add to Claude Code**

   ```bash
   claude mcp add --transport http active-trace http://localhost:3000/api/public/mcp \
       --header "Authorization: Basic {your-base64-token}"
   ```

4. **Verify prompt access**
   In Claude Code: `List all prompts in the project`

5. **Verify observation access**
   In Claude Code: `List recent Active Trace observations`

## Architecture

### Stateless Design

The Active Trace MCP server uses a **stateless per-request architecture**:

1. **Fresh server instance per request:** Each MCP request creates a new server instance
2. **Context captured in closures:** Authentication context is captured in handler closures
3. **No session storage:** Server is discarded after request completes
4. **No state between requests:** Each request is independent

This design:

- Eliminates session management complexity
- Prevents state leaks between projects
- Simplifies authentication (project context derived from API key)

### Authentication Flow

```
1. Client sends request with Authorization header
   ↓
2. API endpoint validates BasicAuth (PUBLIC_KEY:SECRET_KEY)
   ↓
3. Verify API key has project-level scope
   ↓
4. Build ServerContext from API key metadata
   ↓
5. Create fresh MCP server with context in closure
   ↓
6. Handle request (context auto-injected to handlers)
   ↓
7. Discard server instance
```

**ServerContext:**

```typescript
{
  projectId: "proj-123",      // Auto-injected from API key
  orgId: "org-456",           // Auto-injected from API key
  apiKeyId: "key-789",        // For audit logging
  accessLevel: "project",     // Required for MCP
  publicKey: "pk-at-..."      // For reference
}
```

### Tool Annotations

Tools include hints for clients about their behavior:

- **`readOnlyHint: true`**: Safe operations that don't modify data
- **`destructiveHint: true`**: Operations that modify data in ways that are non-revertable. If an operation only creates entities, without updating existing, it can omit this.

Clients like Claude Code can use these annotations to:

- Auto-approve read-only operations
- Require user confirmation for destructive operations

### Audit Logging

All write operations should audit-log entries with before/after snapshots.

---

# Connecting Clients

## Authentication

All clients require BasicAuth authentication using your Active Trace API keys.

### 1. Generate Basic Auth Token

Encode your Active Trace API keys (Public Key:Secret Key) to base64:

```bash
echo -n "pk-at-your-public-key:sk-at-your-secret-key" | base64
```

This outputs your BasicAuth token (e.g., `cGstYXQt...`).

### 2. Choose Your Active Trace URL

**Hosted Instance:**

- Use your instance host with HTTPS: `https://<your-instance-host>`
- If a reverse proxy forwards a different `Host` header than `NEXTAUTH_URL`,
  either preserve the public host at the proxy or set
  `LANGFUSE_MCP_ALLOWED_HOSTS` to a comma-separated list of exact additional
  hostnames/origins accepted by the MCP endpoint. Wildcards and paths are not
  supported.

**Local Development:**

- `http://localhost:3000`

---

## Claude Code

Register the Active Trace MCP server:

```bash
# Hosted Instance (HTTPS required)
claude mcp add --transport http active-trace https://<your-instance-host>/api/public/mcp \
    --header "Authorization: Basic {your-base64-token}"

# Local Development
claude mcp add --transport http active-trace http://localhost:3000/api/public/mcp \
    --header "Authorization: Basic {your-base64-token}"
```

---

## Cursor

Add to your Cursor MCP settings:

```json
{
  "mcp": {
    "servers": {
      "active-trace": {
        "url": "https://<your-instance-host>/api/public/mcp",
        "headers": {
          "Authorization": "Basic {your-base64-token}"
        }
      }
    }
  }
}
```

Replace `https://<your-instance-host>` with your Active Trace URL (see [Choose Your Active Trace URL](#2-choose-your-active-trace-url)).
