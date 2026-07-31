"""Scheduler administration API tests."""

from datetime import date, timedelta

from app.core.time import utcnow
from app.models.system import ScheduledReport, SchedulerExecution


def test_scheduler_job_controls_and_error_mapping(
    client, test_db, admin_token_headers, monkeypatch
):
    headers = admin_token_headers
    jobs = client.get("/scheduler/jobs", headers=headers)
    assert jobs.status_code == 200
    assert len(jobs.json()) == 12
    job_id = jobs.json()[0]["id"]

    assert client.get(
        f"/scheduler/jobs/{job_id}", headers=headers
    ).status_code == 200
    for method, suffix in (
        ("get", ""),
        ("post", "/enable"),
        ("post", "/disable"),
        ("post", "/pause"),
        ("post", "/resume"),
    ):
        response = getattr(client, method)(
            f"/scheduler/jobs/not-a-job{suffix}",
            headers=headers,
        )
        assert response.status_code == 404

    disabled = client.post(
        f"/scheduler/jobs/{job_id}/disable", headers=headers
    )
    assert disabled.status_code == 200
    assert disabled.json()["status"] == "DISABLED"
    assert client.post(
        f"/scheduler/jobs/{job_id}/pause", headers=headers
    ).status_code == 409
    assert client.post(
        f"/scheduler/jobs/{job_id}/resume", headers=headers
    ).status_code == 409

    enabled = client.post(
        f"/scheduler/jobs/{job_id}/enable", headers=headers
    )
    assert enabled.status_code == 200
    assert enabled.json()["enabled"] is True
    paused = client.post(
        f"/scheduler/jobs/{job_id}/pause", headers=headers
    )
    assert paused.status_code == 200
    assert paused.json()["status"] == "PAUSED"
    resumed = client.post(
        f"/scheduler/jobs/{job_id}/resume", headers=headers
    )
    assert resumed.status_code == 200
    assert resumed.json()["paused"] is False

    assert client.post(
        "/scheduler/jobs/not-a-job/run-now", headers=headers
    ).status_code == 404
    assert client.post(
        f"/scheduler/jobs/{job_id}/run-now", headers=headers
    ).status_code == 503

    monkeypatch.setattr(
        "app.routers.scheduler.queue_job_now",
        lambda requested_job_id, **kwargs: f"manual:{requested_job_id}:1",
    )
    queued = client.post(
        f"/scheduler/jobs/{job_id}/run-now", headers=headers
    )
    assert queued.status_code == 202
    assert queued.json()["run_id"].startswith("manual:")


def test_scheduler_execution_history_retry_and_reports(
    client, test_db, admin_token_headers, monkeypatch
):
    headers = admin_token_headers
    client.get("/scheduler/jobs", headers=headers)
    now = utcnow()
    failed = SchedulerExecution(
        job_id="delete_old_logs",
        status="FAILED",
        triggered_by="scheduled",
        attempt=2,
        started_at=now - timedelta(minutes=2),
        finished_at=now - timedelta(minutes=1),
        duration_seconds=60,
        error="database unavailable",
    )
    succeeded = SchedulerExecution(
        job_id="delete_old_logs",
        status="SUCCESS",
        triggered_by="manual",
        attempt=1,
        started_at=now,
        finished_at=now,
        duration_seconds=0.1,
        result={"deleted": 2},
    )
    report = ScheduledReport(
        period="daily",
        period_start=date.today(),
        period_end=date.today(),
        data={"bookings": 1},
    )
    test_db.add_all([failed, succeeded, report])
    test_db.commit()

    history = client.get(
        "/scheduler/executions?job_id=delete_old_logs&status=FAILED"
        "&triggered_by=scheduled&sort_order=asc&page=1&size=1",
        headers=headers,
    )
    assert history.status_code == 200
    assert history.json()["total"] == 1
    assert history.json()["pages"] == 1
    assert history.json()["items"][0]["id"] == failed.id
    assert client.get(
        f"/scheduler/executions/{failed.id}", headers=headers
    ).status_code == 200
    assert client.get(
        "/scheduler/executions/99999", headers=headers
    ).status_code == 404
    assert client.post(
        "/scheduler/executions/99999/retry", headers=headers
    ).status_code == 404
    assert client.post(
        f"/scheduler/executions/{succeeded.id}/retry", headers=headers
    ).status_code == 409

    monkeypatch.setattr(
        "app.routers.scheduler.queue_job_now",
        lambda requested_job_id, **kwargs: (
            f"retry:{requested_job_id}:{kwargs['attempt']}"
        ),
    )
    retried = client.post(
        f"/scheduler/executions/{failed.id}/retry", headers=headers
    )
    assert retried.status_code == 202
    assert retried.json()["run_id"].endswith(":3")

    def unavailable(*args, **kwargs):
        raise RuntimeError("scheduler unavailable")

    monkeypatch.setattr("app.routers.scheduler.queue_job_now", unavailable)
    assert client.post(
        f"/scheduler/executions/{failed.id}/retry", headers=headers
    ).status_code == 503

    reports = client.get(
        "/scheduler/reports?period=daily&page=1&size=1",
        headers=headers,
    )
    assert reports.status_code == 200
    assert reports.headers["x-total-count"] == "1"
    assert reports.json()[0]["id"] == report.id


def test_scheduler_api_rejects_non_admin(client, test_db, employee_token_headers):
    assert client.get(
        "/scheduler/jobs", headers=employee_token_headers
    ).status_code == 403
