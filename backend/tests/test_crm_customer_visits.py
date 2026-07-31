"""Lead, customer, KYC, and site-visit lifecycle tests."""

from datetime import datetime, timedelta, timezone

from app.models.leads import LeadActivity, LeadAssignment, LeadNote


def test_lead_customer_kyc_and_site_visit_lifecycle(
    client,
    test_db,
    employee_token_headers,
    manager_token_headers,
):
    employee_headers = employee_token_headers
    manager_headers = manager_token_headers
    employee_id = client.get("/auth/me", headers=employee_headers).json()["id"]

    lead = client.post(
        "/leads",
        json={
            "name": "Asha Buyer",
            "phone": "9876543210",
            "email": "asha@example.com",
            "source": "Website",
            "priority": "HIGH",
            "initial_note": "Interested in a two bedroom unit",
        },
        headers=employee_headers,
    )
    assert lead.status_code == 201
    lead_id = lead.json()["id"]
    assert lead.json()["status"] == "NEW"
    assert lead.json()["notes"][0]["note"].startswith("Interested")

    listed = client.get(
        f"/leads?status=NEW&assigned_to_id={employee_id}"
        "&source=Website&priority=HIGH&search=asha"
        "&sort_by=name&sort_order=asc&size=1",
        headers=employee_headers,
    )
    assert listed.status_code == 200
    assert listed.headers["x-total-count"] == "1"
    assert listed.json()[0]["id"] == lead_id
    assert client.get(f"/leads/{lead_id}", headers=employee_headers).status_code == 200
    assert client.get("/leads/99999", headers=employee_headers).status_code == 404

    contacted = client.patch(
        f"/leads/{lead_id}",
        json={"status": "CONTACTED", "remarks": "Budget confirmed"},
        headers=employee_headers,
    )
    assert contacted.status_code == 200
    assert contacted.json()["status"] == "CONTACTED"
    invalid_transition = client.patch(
        f"/leads/{lead_id}",
        json={"status": "CONVERTED"},
        headers=employee_headers,
    )
    assert invalid_transition.status_code == 400

    note = client.post(
        f"/leads/{lead_id}/notes",
        json={"note": "Follow up after the site visit"},
        headers=employee_headers,
    )
    assert note.status_code == 201

    assert client.post(
        f"/leads/{lead_id}/assign",
        json={"assigned_to_id": 99999},
        headers=manager_headers,
    ).status_code == 404
    assigned = client.post(
        f"/leads/{lead_id}/assign",
        json={"assigned_to_id": employee_id},
        headers=manager_headers,
    )
    assert assigned.status_code == 200
    assert assigned.json()["assigned_to_id"] == employee_id

    scheduled_at = datetime.now(timezone.utc) + timedelta(days=2)
    visit = client.post(
        f"/leads/{lead_id}/schedule-visit",
        json={
            "scheduled_at": scheduled_at.isoformat(),
            "employee_id": employee_id,
        },
        headers=employee_headers,
    )
    assert visit.status_code == 201
    visit_id = visit.json()["id"]

    visits = client.get(
        f"/site-visits?employee_id={employee_id}&status=SCHEDULED"
        f"&date={scheduled_at.date().isoformat()}&sort_order=desc",
        headers=employee_headers,
    )
    assert visits.status_code == 200
    assert visits.headers["x-total-count"] == "1"
    assert client.get(
        "/site-visits?date=not-a-date", headers=employee_headers
    ).status_code == 422

    invalid_photo = client.post(
        f"/site-visits/{visit_id}/check-in",
        files={"photo": ("document.pdf", b"pdf", "application/pdf")},
        headers=employee_headers,
    )
    assert invalid_photo.status_code == 400
    checked_in = client.post(
        f"/site-visits/{visit_id}/check-in",
        files={"photo": ("arrival.jpg", b"jpeg-data", "image/jpeg")},
        headers=employee_headers,
    )
    assert checked_in.status_code == 200
    assert checked_in.json()["check_in_time"] is not None
    assert checked_in.json()["photo_url"].startswith("/uploads/visit_")

    feedback = client.post(
        f"/site-visits/{visit_id}/feedback",
        json={"feedback": "Customer liked the property", "rating": 5},
        headers=employee_headers,
    )
    assert feedback.status_code == 200
    assert feedback.json()["status"] == "COMPLETED"
    approved = client.post(
        f"/site-visits/{visit_id}/approve",
        headers=manager_headers,
    )
    assert approved.status_code == 200
    assert approved.json()["is_approved"] is True

    rescheduled_at = scheduled_at + timedelta(days=3)
    result = client.post(
        f"/site-visits/{visit_id}/result",
        json={
            "status": "RESCHEDULED",
            "scheduled_at": rescheduled_at.isoformat(),
            "feedback": "Requested a second visit",
            "sales_notes": "Show a higher floor",
            "remarks": "Bring cost sheet",
            "next_follow_up_date": (scheduled_at + timedelta(days=1)).isoformat(),
        },
        headers=employee_headers,
    )
    assert result.status_code == 200
    assert result.json()["status"] == "RESCHEDULED"

    customer = client.post(
        "/customers",
        json={
            "lead_id": lead_id,
            "name": "Asha Buyer",
            "phone": "9876543210",
            "email": "asha@example.com",
        },
        headers=employee_headers,
    )
    assert customer.status_code == 201
    customer_id = customer.json()["id"]
    assert client.post(
        "/customers",
        json={"lead_id": lead_id, "name": "Duplicate Customer"},
        headers=employee_headers,
    ).status_code == 400
    assert client.post(
        "/customers",
        json={"lead_id": 99999, "name": "Missing Lead"},
        headers=employee_headers,
    ).status_code == 404

    customers = client.get(
        f"/customers?assigned_to_id={employee_id}&search=asha"
        "&sort_by=name&sort_order=asc",
        headers=employee_headers,
    )
    assert customers.status_code == 200
    assert customers.headers["x-total-count"] == "1"
    assert client.get(
        f"/customers/{customer_id}", headers=employee_headers
    ).status_code == 200
    assert client.get(
        "/customers/99999", headers=employee_headers
    ).status_code == 404

    uploaded = client.post(
        f"/customers/{customer_id}/documents",
        data={"doc_type": "IDENTITY"},
        files={"file": ("identity.pdf", b"document", "application/pdf")},
        headers=employee_headers,
    )
    assert uploaded.status_code == 201
    document_id = uploaded.json()["id"]
    assert uploaded.json()["status"] == "UPLOADED"

    verified = client.patch(
        f"/customers/documents/{document_id}/verify",
        json={"status": "VERIFIED"},
        headers=manager_headers,
    )
    assert verified.status_code == 200
    assert verified.json()["verified_by_id"] is not None
    verified_docs = client.get(
        "/customers/verified-documents?doc_type=IDENTITY",
        headers=manager_headers,
    )
    assert verified_docs.status_code == 200
    assert verified_docs.headers["x-total-count"] == "1"

    rejected = client.patch(
        f"/customers/documents/{document_id}/verify",
        json={"status": "REJECTED"},
        headers=manager_headers,
    )
    assert rejected.status_code == 200
    assert rejected.json()["verified_by_id"] is None
    assert client.patch(
        "/customers/documents/99999/verify",
        json={"status": "VERIFIED"},
        headers=manager_headers,
    ).status_code == 404

    timeline = client.get(
        f"/customers/{customer_id}/timeline",
        headers=employee_headers,
    )
    assert timeline.status_code == 200
    timeline_types = {item["type"] for item in timeline.json()["timeline"]}
    assert {"LEAD_CREATED", "NOTE", "SITE_VISIT"}.issubset(timeline_types)

    assert test_db.query(LeadNote).filter(LeadNote.lead_id == lead_id).count() >= 3
    assert test_db.query(LeadActivity).filter(
        LeadActivity.lead_id == lead_id
    ).count() >= 4
    assert test_db.query(LeadAssignment).filter(
        LeadAssignment.lead_id == lead_id
    ).count() == 1


def test_reject_lead_and_visit_missing_paths(
    client,
    test_db,
    employee_token_headers,
    manager_token_headers,
):
    lead = client.post(
        "/leads",
        json={"name": "Rejected Prospect", "phone": "9876543211"},
        headers=employee_token_headers,
    )
    assert lead.status_code == 201
    rejected = client.post(
        f"/leads/{lead.json()['id']}/reject",
        headers=manager_token_headers,
    )
    assert rejected.status_code == 200
    assert rejected.json()["status"] == "LOST"

    for action in ("check-in", "feedback", "approve", "result"):
        if action == "feedback":
            response = client.post(
                f"/site-visits/99999/{action}",
                json={"feedback": "Missing", "rating": 1},
                headers=manager_token_headers,
            )
        elif action == "result":
            response = client.post(
                f"/site-visits/99999/{action}",
                json={"status": "NO_SHOW"},
                headers=manager_token_headers,
            )
        else:
            response = client.post(
                f"/site-visits/99999/{action}",
                headers=manager_token_headers,
            )
        assert response.status_code == 404


def test_duplicate_detection_and_manager_merge(
    client,
    test_db,
    employee_token_headers,
    manager_token_headers,
):
    primary = client.post(
        "/leads",
        json={
            "name": "Primary Prospect",
            "phone": "9876543290",
            "email": "duplicate@example.com",
        },
        headers=employee_token_headers,
    )
    assert primary.status_code == 201
    primary_id = primary.json()["id"]
    assert primary.json()["assigned_to_id"] is not None
    assert primary.json()["next_follow_up_at"] is not None

    duplicate = client.post(
        "/leads",
        json={
            "name": "Duplicate Prospect",
            "phone": "9876543299",
            "email": "DUPLICATE@example.com",
        },
        headers=employee_token_headers,
    )
    assert duplicate.status_code == 409
    assert duplicate.json()["error"]["details"]["existing_lead_id"] == primary_id

    merge_candidate = client.post(
        "/leads",
        json={
            "name": "Merge Candidate",
            "phone": "9876543291",
            "email": "candidate@example.com",
            "source": "Referral",
            "initial_note": "Preserve this note",
        },
        headers=employee_token_headers,
    )
    assert merge_candidate.status_code == 201
    candidate_id = merge_candidate.json()["id"]

    assert client.post(
        f"/leads/{primary_id}/merge",
        json={"duplicate_lead_id": candidate_id},
        headers=employee_token_headers,
    ).status_code == 403
    assert client.post(
        f"/leads/{primary_id}/merge",
        json={"duplicate_lead_id": primary_id},
        headers=manager_token_headers,
    ).status_code == 400

    merged = client.post(
        f"/leads/{primary_id}/merge",
        json={"duplicate_lead_id": candidate_id},
        headers=manager_token_headers,
    )
    assert merged.status_code == 200
    assert merged.json()["source"] == "Referral"
    assert any(
        note["note"] == "Preserve this note"
        for note in merged.json()["notes"]
    )
    assert client.get(
        f"/leads/{candidate_id}", headers=manager_token_headers
    ).status_code == 404
