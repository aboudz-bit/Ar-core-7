# AR-CORE-7 Automation Bridge

Safe, isolated automation + visualization + memory + document tools bridge for AR-CORE-7.

**Live execution is disabled by default.** All features run in SAFE MODE / DRY RUN only.

---

## Architecture

```
automation/
├── config/              Master configuration (all flags disabled)
├── types/               Shared type definitions
├── agents/              Agent registry (mock)
├── workflows/           Workflow engine (mock)
├── queue/               Task queue + job manager (in-memory)
├── scripts/             Bridge orchestrator, workflow loader, logger
├── integrations/        Provider adapters + integration manager
├── visual-explainer/    Flow diagram generator + templates + renderer
├── memory-agent/        Key-value memory store + query engine
├── document-tools/      PDF, image, text adapters (mock)
└── samples/             Sample workflows, memory data, explainer templates
```

---

## Safe Mode Behavior

| Flag | Default | Effect |
|------|---------|--------|
| `enabled` | `false` | Master kill switch. All API routes return 503. |
| `safeMode` | `true` | All tasks skip execution, return mock results. |
| `allowAutomation` | `false` | Bridge task submission disabled. |
| `allowVisualExplainer` | `false` | Explainer API returns 503. |
| `allowMemoryAgent` | `false` | Memory API returns 503. |
| `allowBrowserAdapter` | `false` | Browser API returns 503. |
| `allowDocumentTools` | `false` | Document processing disabled. |

All flags must be explicitly set to `true` to enable any real behavior.

---

## Supported Providers

| Provider | Adapter | Purpose |
|----------|---------|---------|
| Claude | `claudeAdapter.ts` | AI analysis + recommendations |
| n8n | `n8nAdapter.ts` | Workflow automation webhooks |
| Paperclip | `paperclipAdapter.ts` | Document/asset management |
| PinchTab | `pinchtabAdapter.ts` | Browser automation |
| Dash | `dashAdapter.ts` | Knowledge-graph memory |
| OpenAI | `openaiAdapter.ts` | Optional AI provider |
| Custom | `customAdapter.ts` | User-defined provider template |

All adapters return mock responses in safe mode. No real API calls are made.

---

## Layers

### Automation Bridge (`scripts/automationBridge.ts`)
Central orchestrator connecting agents, workflows, queue, and providers.

### Workflow Engine (`workflows/workflowEngine.ts`)
Register and simulate multi-step workflows. All steps skipped in safe mode.

### Queue Manager (`queue/queueManager.ts`)
Priority-based job queue with full lifecycle: enqueueJob, dequeueJob, getJobById, updateJobStatus, cancelJob.

### Integration Manager (`integrations/integrationManager.ts`)
Central registry for adapters. Routes events to matching hooks.

### Visual Explainer (`visual-explainer/`)
Generates structured explanations of platform architecture and automation flows.
- **Config**: Feature flags and limits
- **Types**: ExplainerTemplate, RenderFormat
- **Templates**: Pre-built explanations (AR architecture, bridge, provider flow, browser test)
- **Service**: Generate from templates or custom requests
- **Renderer**: Output as text, JSON, or markdown

### Memory Agent (`memory-agent/`)
In-memory key-value store with TTL, tags, and structured queries (Dash ready).
- **Config**: Feature flags, capacity limits
- **Store**: Low-level set/get/del operations
- **Index**: Secondary indexes by tag and source
- **Query**: Structured query engine with filtering
- **Agent**: High-level remember/recall/search API
- **Logger**: Separate memory-layer logging

### Document Tools (`document-tools/`)
Mock adapters for document processing. No real file I/O.
- **PDF Adapter**: loadPDF, splitPDF, mergePDF, extractText, extractPages
- **Image Adapter**: readImage, convertImage, getImageMetadata
- **Text Adapter**: parseText, extractLines, searchText
- **Parser**: Type detection + mock parse results
- **Store**: In-memory document registry

---

## API Routes (disabled by default)

All routes return `503 Service Unavailable` when `automationConfig.enabled` is `false`.

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/automation/health` | Bridge health check |
| GET | `/api/automation/providers` | List provider adapters |
| GET | `/api/automation/queue` | List queued jobs |
| POST | `/api/automation/run` | Submit a task |
| GET | `/api/automation/job/:id` | Get job by ID |
| GET | `/api/automation/browser/health` | Browser adapter health |
| POST | `/api/automation/browser/run` | Submit browser task |
| GET | `/api/automation/visual-explainer/health` | Explainer health |
| POST | `/api/automation/visual-explainer/generate` | Generate explanation |
| GET/POST | `/api/automation/memory` | Query/store memory |

---

## Mock-Only Behavior

Every adapter, service, and route in this module operates in mock-only mode:

- **No real API calls** to any external provider
- **No file I/O** (all storage is in-memory)
- **No database changes** (no Prisma operations)
- **No cloud uploads** or external data transfer
- **No dependency installations** required
- **No UI changes** to the existing application
- **No modifications** to existing routes, components, or build config

---

## Enabling (for development/testing only)

To enable the automation bridge for local testing, modify `automation/config/automationConfig.ts`:

```typescript
const automationConfig: AutomationConfig = {
  enabled: true,         // Turn on the bridge
  safeMode: true,        // Keep safe mode ON — tasks return mock results
  allowAutomation: true, // Enable task submission
  // ... other flags as needed
};
```

**Never enable in production without explicit review.**
