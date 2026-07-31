from datetime import date

import pytest

from app.core.security import get_password_hash
from app.models.users import Branch, Company, RoleEnum, User


def _headers(client, email: str) -> dict[str, str]:
    response = client.post(
        "/auth/login",
        data={"username": email, "password": "StrongPass1!"},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def _staff(test_db):
    company = Company(name="Work Company")
    test_db.add(company)
    test_db.flush()
    branch = Branch(name="Work Branch", company_id=company.id)
    other_branch = Branch(name="Other Branch", company_id=company.id)
    test_db.add_all([branch, other_branch])
    test_db.flush()
    manager = User(
        name="Work Manager",
        email="work.manager@example.com",
        password_hash=get_password_hash("StrongPass1!"),
        role=RoleEnum.MANAGER,
        branch_id=branch.id,
        is_active=True,
    )
    employee = User(
        name="Work Employee",
        email="work.employee@example.com",
        password_hash=get_password_hash("StrongPass1!"),
        role=RoleEnum.EMPLOYEE,
        branch_id=branch.id,
        is_active=True,
    )
    outsider = User(
        name="Other Employee",
        email="other.employee@example.com",
        password_hash=get_password_hash("StrongPass1!"),
        role=RoleEnum.EMPLOYEE,
        branch_id=other_branch.id,
        is_active=True,
    )
    test_db.add_all([manager, employee, outsider])
    test_db.commit()
    return manager, employee, outsider


@pytest.mark.integration
def test_task_crud_assignment_filtering_and_permissions(client, test_db):
    manager, employee, outsider = _staff(test_db)
    manager_headers = _headers(client, manager.email)
    employee_headers = _headers(client, employee.email)

    created = client.post(
        "/tasks",
        headers=manager_headers,
        json={
            "title": "Call qualified buyer",
            "description": "Confirm tomorrow's site visit",
            "assigned_to_id": employee.id,
            "priority": "HIGH",
            "due_date": date.today().isoformat(),
        },
    )
    assert created.status_code == 201
    task_id = created.json()["id"]
    assert created.json()["assigned_to_id"] == employee.id

    listing = client.get(
        "/tasks?status=PENDING&priority=HIGH&search=buyer",
        headers=employee_headers,
    )
    assert listing.status_code == 200
    assert listing.headers["x-total-count"] == "1"
    assert listing.json()[0]["id"] == task_id

    completed = client.patch(
        f"/tasks/{task_id}",
        headers=employee_headers,
        json={"status": "COMPLETED"},
    )
    assert completed.status_code == 200
    assert completed.json()["completed_at"] is not None

    forbidden_delete = client.delete(
        f"/tasks/{task_id}",
        headers=employee_headers,
    )
    assert forbidden_delete.status_code == 403

    cross_branch = client.post(
        "/tasks",
        headers=manager_headers,
        json={"title": "Forbidden", "assigned_to_id": outsider.id},
    )
    assert cross_branch.status_code == 403

    deleted = client.delete(f"/tasks/{task_id}", headers=manager_headers)
    assert deleted.status_code == 200


@pytest.mark.integration
def test_internal_message_inbox_sent_read_delete_and_scope(client, test_db):
    manager, employee, outsider = _staff(test_db)
    manager_headers = _headers(client, manager.email)
    employee_headers = _headers(client, employee.email)

    sent = client.post(
        "/messages",
        headers=manager_headers,
        json={
            "recipient_id": employee.id,
            "subject": "Visit assignment",
            "body": "Please take the 3 PM property visit.",
        },
    )
    assert sent.status_code == 201
    message_id = sent.json()["id"]
    assert sent.json()["sender_name"] == manager.name

    inbox = client.get(
        "/messages?folder=inbox&unread_only=true&search=Visit",
        headers=employee_headers,
    )
    assert inbox.status_code == 200
    assert inbox.headers["x-total-count"] == "1"
    assert inbox.json()[0]["id"] == message_id

    unread = client.get("/messages/unread-count", headers=employee_headers)
    assert unread.json() == {"count": 1}

    marked = client.patch(
        f"/messages/{message_id}/read",
        headers=employee_headers,
    )
    assert marked.status_code == 200
    assert marked.json()["is_read"] is True

    sent_folder = client.get("/messages?folder=sent", headers=manager_headers)
    assert [item["id"] for item in sent_folder.json()] == [message_id]

    self_message = client.post(
        "/messages",
        headers=employee_headers,
        json={"recipient_id": employee.id, "subject": "Self", "body": "No"},
    )
    assert self_message.status_code == 400

    cross_branch = client.post(
        "/messages",
        headers=manager_headers,
        json={"recipient_id": outsider.id, "subject": "No", "body": "No"},
    )
    assert cross_branch.status_code == 403

    deleted = client.delete(
        f"/messages/{message_id}",
        headers=employee_headers,
    )
    assert deleted.status_code == 200
    assert client.get(
        f"/messages/{message_id}",
        headers=employee_headers,
    ).status_code == 404
    assert client.get(
        f"/messages/{message_id}",
        headers=manager_headers,
    ).status_code == 200
