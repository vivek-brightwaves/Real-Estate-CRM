from __future__ import annotations

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class SchedulerJobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str
    trigger: str
    enabled: bool
    paused: bool
    status: str
    next_run_at: datetime | None = None
    running_since: datetime | None = None
    execution_count: int
    consecutive_failures: int
    max_retries: int
    last_run_at: datetime | None = None
    last_success_at: datetime | None = None
    last_failure_at: datetime | None = None
    last_error: str | None = None


class SchedulerExecutionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_id: str
    status: str
    triggered_by: str
    attempt: int
    started_at: datetime
    finished_at: datetime | None = None
    duration_seconds: float | None = None
    result: dict[str, Any] | None = None
    error: str | None = None


class ExecutionPage(BaseModel):
    items: list[SchedulerExecutionOut]
    total: int
    page: int
    size: int
    pages: int


class RunNowAccepted(BaseModel):
    message: str = "Job queued for execution"
    run_id: str
    job_id: str


class ScheduledReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    period: str
    period_start: date
    period_end: date
    data: dict[str, Any]
    generated_at: datetime
