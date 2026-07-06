"""Active Trace SDK.

Usage:
    from activetrace import ActiveTrace

    active_trace = ActiveTrace()  # reads ACTIVETRACE_* env vars

Environment variables:
    ACTIVETRACE_SECRET_KEY  — secret API key (sk-at-...)
    ACTIVETRACE_PUBLIC_KEY  — public API key (pk-at-...)
    ACTIVETRACE_BASE_URL    — base URL of your Active Trace instance
"""

import os

_ENV_MAP = {
    "ACTIVETRACE_SECRET_KEY": ("LANGFUSE_SECRET_KEY",),
    "ACTIVETRACE_PUBLIC_KEY": ("LANGFUSE_PUBLIC_KEY",),
    # Underlying transport reads HOST (v3) / BASEURL (v2) — set both.
    "ACTIVETRACE_BASE_URL": ("LANGFUSE_HOST", "LANGFUSE_BASEURL", "LANGFUSE_BASE_URL"),
}

for _src, _targets in _ENV_MAP.items():
    _value = os.environ.get(_src)
    if _value:
        for _target in _targets:
            os.environ.setdefault(_target, _value)

from langfuse import Langfuse as ActiveTrace  # noqa: E402
from langfuse import get_client, observe  # noqa: E402

__all__ = ["ActiveTrace", "get_client", "observe"]
