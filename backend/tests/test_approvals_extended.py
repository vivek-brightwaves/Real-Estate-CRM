import pytest

from app.core.security import get_password_hash
from app.models.users import RoleEnum, User


def _login(client, email):
    response = client.post(
        "/auth/login",
        data={"username": email, "password": "StrongPass1!"},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest.mark.integration
def test_approval_listing_history_rejection_and_permissions(
    client, test_db, admin_token_headers
):
    employee = User(
        name="Approval Employee",
        email="approval.employee@example.com",
        password_hash=get_password_hash("StrongPass1!"),
        role=RoleEnum.EMPLOYEE,
        is_active=True,
    )
    test_db.add(employee)
    test_db.commit()
    employee_headers = _login(client, employee.email)

    created = client.post(
        "/approvals",
        headers=employee_headers,
        json={"type": "REFUND", "payload": {"amount": 1250}},
    )
    assert created.status_code == 201
    approval_id = created.json()["id"]

    listing = client.get(
        "/approvals?status=PENDING&type=REFUND&page=1&size=10",
        headers=employee_headers,
    )
    assert listing.status_code == 200
    assert listing.headers["x-total-count"] == "1"
    assert [item["id"] for item in listing.json()] == [approval_id]

    detail = client.get(f"/approvals/{approval_id}", headers=employee_headers)
    assert detail.status_code == 200

    forbidden = client.patch(
        f"/approvals/{approval_id}/reject?remarks=no",
        headers=employee_headers,
    )
    assert forbidden.status_code == 403

    rejected = client.patch(
        f"/approvals/{approval_id}/reject?remarks=insufficient+evidence",
        headers=admin_token_headers,
    )
    assert rejected.status_code == 200
    assert rejected.json()["status"] == "REJECTED"

    history = client.get(
        f"/approvals/{approval_id}/history",
        headers=employee_headers,
    )
    assert history.status_code == 200
    assert int(history.headers["x-total-count"]) >= 2
    assert {entry["action"] for entry in history.json()} >= {"CREATE", "UPDATE"}

    repeated = client.patch(
        f"/approvals/{approval_id}/reject?remarks=again",
        headers=admin_token_headers,
    )
    assert repeated.status_code == 400

    missing = client.get("/approvals/999999", headers=admin_token_headers)
    assert missing.status_code == 404


@pytest.mark.api
def test_approval_payload_validation(client, employee_token_headers):
    response = client.post(
        "/approvals",
        headers=employee_token_headers,
        json={"type": "REFUND", "payload": {"amount": -1}},
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
