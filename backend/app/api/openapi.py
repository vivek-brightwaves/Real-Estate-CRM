from __future__ import annotations

from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi


ERROR_SCHEMA = {
    "type": "object",
    "required": ["success", "error", "request_id"],
    "properties": {
        "success": {"type": "boolean", "example": False},
        "error": {
            "type": "object",
            "required": ["code", "message"],
            "properties": {
                "code": {"type": "string", "example": "VALIDATION_ERROR"},
                "message": {
                    "type": "string",
                    "example": "Request validation failed.",
                },
                "details": {"nullable": True},
            },
        },
        "request_id": {
            "type": "string",
            "example": "b8d2fae985ef44a9a83fd5ed19a4bd68",
        },
    },
}


def install_openapi(app: FastAPI) -> None:
    def custom_openapi():
        if app.openapi_schema:
            return app.openapi_schema
        schema = get_openapi(
            title=app.title,
            version=app.version,
            description=app.description,
            routes=app.routes,
            tags=app.openapi_tags,
        )
        schema.setdefault("components", {}).setdefault("schemas", {})[
            "StandardError"
        ] = ERROR_SCHEMA
        standard_error = {
            "description": "Standard error response",
            "content": {
                "application/json": {
                    "schema": {
                        "$ref": "#/components/schemas/StandardError"
                    }
                }
            },
        }
        for path_item in schema.get("paths", {}).values():
            for operation in path_item.values():
                if not isinstance(operation, dict) or "responses" not in operation:
                    continue
                parameters = operation.setdefault("parameters", [])
                existing = {parameter.get("name") for parameter in parameters}
                if "X-Correlation-ID" not in existing:
                    parameters.append(
                        {
                            "name": "X-Correlation-ID",
                            "in": "header",
                            "required": False,
                            "schema": {"type": "string", "maxLength": 128},
                            "description": "End-to-end trace identifier.",
                            "example": "booking-checkout-20260729",
                        }
                    )
                for code in ("400", "401", "403", "404", "409", "422", "429", "500"):
                    operation["responses"].setdefault(code, standard_error)
        app.openapi_schema = schema
        return schema

    app.openapi = custom_openapi
