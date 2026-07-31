from __future__ import annotations

import math
from typing import Any, Iterable, Literal

from fastapi import Query, Response
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Query as SqlAlchemyQuery


class PaginationParams(BaseModel):
    page: int = 1
    size: int = 50


def pagination_params(
    page: int = Query(1, ge=1, description="One-based page number."),
    size: int = Query(50, ge=1, le=200, description="Items per page."),
) -> PaginationParams:
    return PaginationParams(page=page, size=size)


def apply_search(
    query: SqlAlchemyQuery,
    term: str | None,
    columns: Iterable[Any],
) -> SqlAlchemyQuery:
    if not term:
        return query
    normalized = term.strip()
    if not normalized:
        return query
    pattern = f"%{normalized}%"
    return query.filter(or_(*(column.ilike(pattern) for column in columns)))


def apply_sort(
    query: SqlAlchemyQuery,
    *,
    model: Any,
    sort_by: str,
    sort_order: Literal["asc", "desc"],
    allowed_fields: set[str],
    tie_breaker: Any | None = None,
) -> SqlAlchemyQuery:
    field = sort_by if sort_by in allowed_fields else "id"
    column = getattr(model, field)
    ordering = column.desc() if sort_order == "desc" else column.asc()
    if tie_breaker is not None and column is not tie_breaker:
        return query.order_by(ordering, tie_breaker.desc())
    return query.order_by(ordering)


def paginate(
    query: SqlAlchemyQuery,
    *,
    page: int,
    size: int,
    response: Response | None = None,
) -> tuple[list[Any], int]:
    total = query.order_by(None).count()
    items = query.offset((page - 1) * size).limit(size).all()
    if response is not None:
        response.headers["X-Total-Count"] = str(total)
        response.headers["X-Page"] = str(page)
        response.headers["X-Page-Size"] = str(size)
        response.headers["X-Total-Pages"] = str(math.ceil(total / size) if total else 0)
    return items, total
