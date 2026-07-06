# Active Trace Python SDK

Observability and analytics for AI applications.

## Install

```bash
pip install activetrace
```

## Configure

```bash
ACTIVETRACE_SECRET_KEY="sk-at-..."
ACTIVETRACE_PUBLIC_KEY="pk-at-..."
ACTIVETRACE_BASE_URL="https://your-instance.example.com"
```

## Use

```python
from activetrace import ActiveTrace, observe

active_trace = ActiveTrace()

@observe()
def my_ai_function():
    ...
```

## Publishing (maintainer notes — remove before publishing)

- `pip install build twine && python -m build && twine upload dist/*`
- The package wraps the underlying tracing engine as a dependency; the
  dependency tree (`pip show activetrace`) will list it. To fully conceal the
  engine, vendor it into this package instead of depending on it (higher
  maintenance: re-vendor on every upstream release).
- Keep the `_ENV_MAP` in `activetrace/__init__.py` in sync with the env var
  names shown in the platform UI (`useLangfuseEnvCode.ts`).
