from __future__ import annotations

import logging
import re
import threading
import time
import uuid
from collections import defaultdict, deque

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.core.request_context import correlation_id_context, request_id_context

logger = logging.getLogger("app.request")
ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$")


def _safe_id(value: str | None) -> str:
    if value and ID_PATTERN.fullmatch(value):
        return value
    return uuid.uuid4().hex


def _error_response(
    *,
    status_code: int,
    code: str,
    message: str,
    request_id: str,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "error": {"code": code, "message": message, "details": None},
            # Compatibility alias for existing clients. New integrations should
            # consume error.message.
            "detail": message,
            "request_id": request_id,
        },
        headers=headers,
    )


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        started = time.perf_counter()
        request_id = _safe_id(request.headers.get("X-Request-ID"))
        correlation_id = _safe_id(
            request.headers.get("X-Correlation-ID") or request_id
        )
        request.state.request_id = request_id
        request.state.correlation_id = correlation_id
        request_token = request_id_context.set(request_id)
        correlation_token = correlation_id_context.set(correlation_id)
        status_code = 500
        try:
            response = await call_next(request)
            status_code = response.status_code
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Correlation-ID"] = correlation_id
            response.headers["X-Response-Time-Ms"] = (
                f"{(time.perf_counter() - started) * 1000:.2f}"
            )
            return response
        finally:
            duration_ms = (time.perf_counter() - started) * 1000
            logger.info(
                "HTTP request completed",
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": status_code,
                    "duration_ms": round(duration_ms, 2),
                    "client_ip": request.client.host if request.client else None,
                },
            )
            request_id_context.reset(request_token)
            correlation_id_context.reset(correlation_token)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.headers.setdefault(
            "Permissions-Policy",
            "camera=(), microphone=(), geolocation=()",
        )
        if request.url.path.startswith("/docs") or request.url.path == "/redoc":
            response.headers.setdefault(
                "Content-Security-Policy",
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                "img-src 'self' data: https://fastapi.tiangolo.com; "
                "frame-ancestors 'none'; base-uri 'self'",
            )
        else:
            response.headers.setdefault(
                "Content-Security-Policy",
                "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
            )
        response.headers.setdefault("Cache-Control", "no-store")
        if request.url.scheme == "https":
            response.headers.setdefault(
                "Strict-Transport-Security",
                "max-age=31536000; includeSubDomains",
            )
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Bounded in-process fixed-window limiter.

    This provides immediate protection in a single API process. Deployments
    with multiple workers should use the same limits at the gateway as the
    distributed enforcement point.
    """

    _buckets: dict[str, deque[float]] = defaultdict(deque)
    _lock = threading.Lock()
    _last_cleanup = 0.0

    async def dispatch(self, request: Request, call_next):
        if (
            not settings.RATE_LIMIT_ENABLED
            or request.method == "OPTIONS"
            or request.url.path in {"/health", "/docs", "/redoc", "/api/v1/openapi.json"}
        ):
            return await call_next(request)

        now = time.monotonic()
        window = settings.RATE_LIMIT_WINDOW_SECONDS
        auth_route = request.url.path in {
            "/auth/login",
            "/auth/refresh",
            "/auth/forgot-password",
            "/auth/reset-password",
        }
        limit = (
            settings.RATE_LIMIT_AUTH_REQUESTS
            if auth_route
            else settings.RATE_LIMIT_REQUESTS
        )
        client = request.client.host if request.client else "unknown"
        key = f"{client}:{'auth' if auth_route else 'api'}"

        with self._lock:
            bucket = self._buckets[key]
            cutoff = now - window
            while bucket and bucket[0] <= cutoff:
                bucket.popleft()
            if len(bucket) >= limit:
                retry_after = max(1, int(window - (now - bucket[0])) + 1)
                request_id = getattr(request.state, "request_id", uuid.uuid4().hex)
                return _error_response(
                    status_code=429,
                    code="RATE_LIMIT_EXCEEDED",
                    message="Too many requests. Try again later.",
                    request_id=request_id,
                    headers={
                        "Retry-After": str(retry_after),
                        "X-RateLimit-Limit": str(limit),
                        "X-RateLimit-Remaining": "0",
                    },
                )
            bucket.append(now)
            remaining = max(0, limit - len(bucket))

            if now - self._last_cleanup > max(window, 60):
                stale_keys = [
                    bucket_key
                    for bucket_key, values in self._buckets.items()
                    if not values or values[-1] <= cutoff
                ]
                for stale_key in stale_keys:
                    self._buckets.pop(stale_key, None)
                self._last_cleanup = now

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Window"] = str(window)
        return response
