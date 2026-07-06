# Active Trace SDKs

White-label wrapper SDKs published under the Active Trace brand. Customers
install these instead of the underlying tracing packages; the wrappers map
`ACTIVETRACE_*` environment variables to the underlying engine's configuration
at import time and re-export the full API.

| Package | Registry | Wraps |
| --- | --- | --- |
| `activetrace` | PyPI | `langfuse` (v3) |
| `@activetrace/client` | npm | `@langfuse/client` (v4) |

These directories are intentionally **outside** the pnpm workspace — they are
standalone publishable packages, not part of the platform build.

## Publish

- Python: `cd activetrace-python && python -m build && twine upload dist/*`
- JS: `cd activetrace-js && npm install && npm run build && npm publish --access public`

## Concealment caveat

Both packages declare the underlying engine as a dependency, so it is visible
in `pip show` / `npm ls` dependency trees. Full concealment requires vendoring
the engine's source into the wrapper (higher maintenance). The in-app setup
snippets (API key dialog, prompt detail page) reference these package names —
keep names/env vars in sync if you rename anything.
