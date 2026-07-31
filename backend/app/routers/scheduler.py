from __future__ import annotations

import math
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models.system import ScheduledReport, SchedulerExecution
from app.models.users import RoleEnum, User
from app.scheduler import (
    disable_job,
    enable_job,
    get_job_status,
    list_job_statuses,
    pause_job,
    queue_job_now,
    resume_job,
)
from app.schemas.scheduler import (
    ExecutionPage,
    RunNowAccepted,
    ScheduledReportOut,
    SchedulerExecutionOut,
    SchedulerJobOut,
)
from app.services.audit import log_audit

router = APIRouter(
    dependencies=[
        Depends(require_roles([RoleEnum.SUPER_ADMIN, RoleEnum.ADMIN]))
    ]
)


def _job_not_found(job_id: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Scheduler job '{job_id}' was not found",
    )


def _audit_job_action(
    db: Session,
    current_user: User,
    job_id: str,
    action: str,
    **details,
) -> None:
    log_audit(
        db,
        current_user.id,
        "SCHEDULER_JOB",
        0,
        action,
        new_values={"job_id": job_id, **details},
        module="Scheduler",
    )


@router.get(
    "/jobs",
    response_model=list[SchedulerJobOut],
    summary="List scheduler jobs",
    description="Returns configuration, runtime state, next run time, and latest outcome.",
)
def list_jobs(db: Session = Depends(get_db)):
    return list_job_statuses(db)


@router.get(
    "/jobs/{job_id}",
    response_model=SchedulerJobOut,
    summary="Get scheduler job status",
)
def get_job(job_id: str, db: Session = Depends(get_db)):
    try:
        return get_job_status(db, job_id)
    except KeyError:
        raise _job_not_found(job_id)


@router.post("/jobs/{job_id}/enable", response_model=SchedulerJobOut)
def enable(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        result = enable_job(db, job_id)
        _audit_job_action(db, current_user, job_id, "ENABLE")
        return result
    except KeyError:
        raise _job_not_found(job_id)


@router.post("/jobs/{job_id}/disable", response_model=SchedulerJobOut)
def disable(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        result = disable_job(db, job_id)
        _audit_job_action(db, current_user, job_id, "DISABLE")
        return result
    except KeyError:
        raise _job_not_found(job_id)


@router.post("/jobs/{job_id}/pause", response_model=SchedulerJobOut)
def pause(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        result = pause_job(db, job_id)
        _audit_job_action(db, current_user, job_id, "PAUSE")
        return result
    except KeyError:
        raise _job_not_found(job_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))


@router.post("/jobs/{job_id}/resume", response_model=SchedulerJobOut)
def resume(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        result = resume_job(db, job_id)
        _audit_job_action(db, current_user, job_id, "RESUME")
        return result
    except KeyError:
        raise _job_not_found(job_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))


@router.post(
    "/jobs/{job_id}/run-now",
    response_model=RunNowAccepted,
    status_code=status.HTTP_202_ACCEPTED,
)
def run_now(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        run_id = queue_job_now(job_id)
    except KeyError:
        raise _job_not_found(job_id)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        )
    _audit_job_action(
        db,
        current_user,
        job_id,
        "RUN_NOW",
        run_id=run_id,
    )
    return RunNowAccepted(run_id=run_id, job_id=job_id)


@router.get("/executions", response_model=ExecutionPage)
def execution_history(
    job_id: str | None = None,
    execution_status: Literal["RUNNING", "SUCCESS", "FAILED", "SKIPPED"] | None = Query(
        None,
        alias="status",
    ),
    triggered_by: Literal["scheduled", "manual", "retry"] | None = None,
    sort_order: Literal["asc", "desc"] = "desc",
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(SchedulerExecution)
    if job_id:
        query = query.filter(SchedulerExecution.job_id == job_id)
    if execution_status:
        query = query.filter(SchedulerExecution.status == execution_status)
    if triggered_by:
        query = query.filter(SchedulerExecution.triggered_by == triggered_by)
    total = query.count()
    ordering = (
        SchedulerExecution.started_at.asc()
        if sort_order == "asc"
        else SchedulerExecution.started_at.desc()
    )
    items = (
        query.order_by(ordering, SchedulerExecution.id.desc())
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )
    return ExecutionPage(
        items=items,
        total=total,
        page=page,
        size=size,
        pages=math.ceil(total / size) if total else 0,
    )


@router.get("/executions/{execution_id}", response_model=SchedulerExecutionOut)
def get_execution(execution_id: int, db: Session = Depends(get_db)):
    execution = db.get(SchedulerExecution, execution_id)
    if execution is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scheduler execution was not found",
        )
    return execution


@router.post(
    "/executions/{execution_id}/retry",
    response_model=RunNowAccepted,
    status_code=status.HTTP_202_ACCEPTED,
)
def retry_execution(
    execution_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    execution = db.get(SchedulerExecution, execution_id)
    if execution is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scheduler execution was not found",
        )
    if execution.status != "FAILED":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only failed executions can be retried",
        )
    try:
        run_id = queue_job_now(
            execution.job_id,
            triggered_by="retry",
            attempt=execution.attempt + 1,
        )
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        )
    _audit_job_action(
        db,
        current_user,
        execution.job_id,
        "RETRY",
        run_id=run_id,
        execution_id=execution_id,
    )
    return RunNowAccepted(run_id=run_id, job_id=execution.job_id)


@router.get("/reports", response_model=list[ScheduledReportOut])
def list_scheduled_reports(
    response: Response,
    period: Literal["daily", "weekly", "monthly"] | None = None,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    query = db.query(ScheduledReport)
    if period:
        query = query.filter(ScheduledReport.period == period)
    total = query.count()
    items = (
        query.order_by(ScheduledReport.generated_at.desc())
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )
    response.headers["X-Total-Count"] = str(total)
    response.headers["X-Page"] = str(page)
    response.headers["X-Page-Size"] = str(size)
    return items
