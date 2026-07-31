from app.core.config import settings
from app.core.middleware import RateLimitMiddleware


def test_request_trace_and_security_headers(client):
    response = client.get(
        "/health",
        headers={"X-Correlation-ID": "integration-health-check"},
    )
    assert response.status_code == 200
    assert response.headers["x-correlation-id"] == "integration-health-check"
    assert response.headers["x-request-id"]
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"


def test_validation_errors_use_standard_envelope(client):
    response = client.get("/scheduler/executions?page=0")
    assert response.status_code == 401

    # Public auth endpoint allows validation behavior to be inspected without
    # conflating authentication and request validation.
    response = client.post("/auth/forgot-password", json={"email": "not-email"})
    assert response.status_code == 422
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert body["request_id"] == response.headers["x-request-id"]


def test_routing_errors_use_standard_envelope(client):
    response = client.get("/not-a-real-route")
    assert response.status_code == 404
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == "RESOURCE_NOT_FOUND"
    assert body["request_id"] == response.headers["x-request-id"]


def test_rate_limit_returns_retry_metadata(client):
    settings.RATE_LIMIT_ENABLED = True
    settings.RATE_LIMIT_AUTH_REQUESTS = 1
    RateLimitMiddleware._buckets.clear()
    try:
        first = client.post(
            "/auth/forgot-password",
            json={"email": "nobody@example.com"},
        )
        second = client.post(
            "/auth/forgot-password",
            json={"email": "nobody@example.com"},
        )
        assert first.status_code == 200
        assert second.status_code == 429
        assert second.headers["retry-after"]
        assert second.json()["error"]["code"] == "RATE_LIMIT_EXCEEDED"
    finally:
        settings.RATE_LIMIT_AUTH_REQUESTS = 10
        settings.RATE_LIMIT_ENABLED = False
        RateLimitMiddleware._buckets.clear()
