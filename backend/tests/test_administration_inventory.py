"""API and integration coverage for administration and inventory."""

from fastapi.testclient import TestClient


def _create_organization(client: TestClient, headers: dict[str, str]) -> dict[str, int]:
    company = client.post(
        "/organization/companies",
        json={"name": "Acme Estates", "settings_json": {"currency": "INR"}},
        headers=headers,
    )
    assert company.status_code == 201
    branch = client.post(
        "/organization/branches",
        json={"name": "Central", "company_id": company.json()["id"]},
        headers=headers,
    )
    assert branch.status_code == 201
    project = client.post(
        "/organization/projects",
        json={
            "name": "Skyline",
            "branch_id": branch.json()["id"],
            "location": "Pune",
            "status": "ACTIVE",
        },
        headers=headers,
    )
    assert project.status_code == 201
    return {
        "company_id": company.json()["id"],
        "branch_id": branch.json()["id"],
        "project_id": project.json()["id"],
    }


def test_organization_project_crud_search_filter_and_pagination(
    client, test_db, admin_token_headers
):
    headers = admin_token_headers
    ids = _create_organization(client, headers)

    assert client.post(
        "/organization/branches",
        json={"name": "Invalid", "company_id": 99999},
        headers=headers,
    ).status_code == 404
    assert client.post(
        "/organization/projects",
        json={"name": "Invalid", "branch_id": 99999},
        headers=headers,
    ).status_code == 404

    companies = client.get(
        "/organization/companies?search=acme&sort_by=name&size=1",
        headers=headers,
    )
    assert companies.status_code == 200
    assert companies.headers["x-total-count"] == "1"
    assert companies.json()[0]["name"] == "Acme Estates"

    company = client.patch(
        f"/organization/companies/{ids['company_id']}",
        json={"name": "Acme Developers", "settings_json": {"timezone": "Asia/Kolkata"}},
        headers=headers,
    )
    assert company.status_code == 200
    assert company.json()["settings_json"]["timezone"] == "Asia/Kolkata"
    assert client.patch(
        "/organization/companies/99999",
        json={"name": "Missing"},
        headers=headers,
    ).status_code == 404

    branches = client.get(
        f"/organization/branches?company_id={ids['company_id']}&search=central",
        headers=headers,
    )
    assert branches.status_code == 200
    assert len(branches.json()) == 1
    branch = client.patch(
        f"/organization/branches/{ids['branch_id']}",
        json={"name": "Head Office"},
        headers=headers,
    )
    assert branch.status_code == 200
    assert client.patch(
        f"/organization/branches/{ids['branch_id']}",
        json={"company_id": 99999},
        headers=headers,
    ).status_code == 404
    assert client.patch(
        "/organization/branches/99999",
        json={"name": "Missing"},
        headers=headers,
    ).status_code == 404

    projects = client.get(
        f"/organization/projects?branch_id={ids['branch_id']}"
        "&status=ACTIVE&search=pune&sort_by=name&sort_order=desc",
        headers=headers,
    )
    assert projects.status_code == 200
    assert [project["name"] for project in projects.json()] == ["Skyline"]
    project = client.patch(
        f"/organization/projects/{ids['project_id']}",
        json={"name": "Skyline Phase 1", "status": "SELLING"},
        headers=headers,
    )
    assert project.status_code == 200
    assert project.json()["status"] == "SELLING"
    assert client.patch(
        f"/organization/projects/{ids['project_id']}",
        json={"branch_id": 99999},
        headers=headers,
    ).status_code == 404
    assert client.patch(
        "/organization/projects/99999",
        json={"name": "Missing"},
        headers=headers,
    ).status_code == 404


def test_user_lifecycle_relationship_validation_and_rbac(
    client, test_db, admin_token_headers
):
    headers = admin_token_headers
    ids = _create_organization(client, headers)

    assert client.post(
        "/users",
        json={
            "name": "Bad Branch",
            "email": "bad-branch@example.com",
            "password": "StrongPass1!",
            "role": "EMPLOYEE",
            "branch_id": 99999,
        },
        headers=headers,
    ).status_code == 404

    manager = client.post(
        "/users",
        json={
            "name": "Branch Manager",
            "email": "MANAGER@EXAMPLE.COM",
            "phone": "+91 9876543210",
            "password": "StrongPass1!",
            "role": "MANAGER",
            "branch_id": ids["branch_id"],
        },
        headers=headers,
    )
    assert manager.status_code == 201
    manager_id = manager.json()["id"]
    assert manager.json()["email"] == "manager@example.com"

    employee = client.post(
        "/users",
        json={
            "name": "Sales Executive",
            "email": "sales@example.com",
            "password": "StrongPass1!",
            "role": "EMPLOYEE",
            "branch_id": ids["branch_id"],
            "manager_id": manager_id,
        },
        headers=headers,
    )
    assert employee.status_code == 201
    employee_id = employee.json()["id"]

    duplicate = client.post(
        "/users",
        json={
            "name": "Duplicate",
            "email": "SALES@example.com",
            "password": "StrongPass1!",
            "role": "EMPLOYEE",
        },
        headers=headers,
    )
    assert duplicate.status_code == 400

    users = client.get(
        f"/users?role=EMPLOYEE&branch_id={ids['branch_id']}"
        "&is_active=true&search=sales&sort_by=name&size=1",
        headers=headers,
    )
    assert users.status_code == 200
    assert users.headers["x-total-count"] == "1"
    assert users.json()[0]["id"] == employee_id

    updated = client.patch(
        f"/users/{employee_id}",
        json={"name": "Senior Sales Executive", "email": "senior@example.com"},
        headers=headers,
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Senior Sales Executive"
    assert client.patch(
        "/users/99999", json={"name": "Missing"}, headers=headers
    ).status_code == 404

    reset = client.put(
        f"/users/{employee_id}/reset-password",
        json={"new_password": "ChangedPass2!"},
        headers=headers,
    )
    assert reset.status_code == 200
    login = client.post(
        "/auth/login",
        data={"username": "senior@example.com", "password": "ChangedPass2!"},
    )
    assert login.status_code == 200

    role = client.patch(
        f"/users/{employee_id}/role",
        json={"role": "PARTNER"},
        headers=headers,
    )
    assert role.status_code == 200
    assert role.json()["role"] == "PARTNER"
    reassigned = client.patch(
        f"/users/{employee_id}/manager",
        json={"manager_id": manager_id},
        headers=headers,
    )
    assert reassigned.status_code == 200
    assert reassigned.json()["manager_id"] == manager_id
    deactivated = client.patch(
        f"/users/{employee_id}/status",
        json={"is_active": False},
        headers=headers,
    )
    assert deactivated.status_code == 200
    assert deactivated.json()["is_active"] is False

    current_id = client.get("/auth/me", headers=headers).json()["id"]
    assert client.patch(
        f"/users/{current_id}/status",
        json={"is_active": False},
        headers=headers,
    ).status_code == 400
    assert client.patch(
        f"/users/{current_id}/role",
        json={"role": "EMPLOYEE"},
        headers=headers,
    ).status_code == 400


def test_inventory_crud_filters_holds_price_and_conflicts(
    client, test_db, admin_token_headers
):
    headers = admin_token_headers
    ids = _create_organization(client, headers)

    assert client.post(
        "/inventory/towers",
        json={"name": "Invalid", "project_id": 99999},
        headers=headers,
    ).status_code == 404
    tower = client.post(
        "/inventory/towers",
        json={"name": "Tower A", "project_id": ids["project_id"]},
        headers=headers,
    )
    assert tower.status_code == 201
    tower_id = tower.json()["id"]
    assert client.get(
        f"/inventory/towers?project_id={ids['project_id']}&search=tower",
        headers=headers,
    ).json()[0]["id"] == tower_id

    assert client.post(
        "/inventory/blocks",
        json={"name": "Invalid", "tower_id": 99999},
        headers=headers,
    ).status_code == 404
    block = client.post(
        "/inventory/blocks",
        json={"name": "Block East", "tower_id": tower_id},
        headers=headers,
    )
    assert block.status_code == 201
    block_id = block.json()["id"]
    assert client.get(
        f"/inventory/blocks?tower_id={tower_id}&search=east",
        headers=headers,
    ).json()[0]["id"] == block_id

    assert client.post(
        "/inventory/units",
        json={"unit_number": "X", "block_id": 99999, "price": 1},
        headers=headers,
    ).status_code == 404
    unit = client.post(
        "/inventory/units",
        json={
            "unit_number": "A-101",
            "block_id": block_id,
            "type": "2BHK",
            "area": 1100,
            "price": 5000000,
        },
        headers=headers,
    )
    assert unit.status_code == 201
    unit_id = unit.json()["id"]
    assert client.post(
        "/inventory/units",
        json={"unit_number": "A-101", "block_id": block_id, "price": 6000000},
        headers=headers,
    ).status_code == 409

    units = client.get(
        f"/inventory/units?block_id={block_id}&status=AVAILABLE&type=2BHK"
        "&min_price=4000000&max_price=6000000&search=A-101"
        "&sort_by=price&sort_order=desc",
        headers=headers,
    )
    assert units.status_code == 200
    assert units.headers["x-total-count"] == "1"

    held = client.post(f"/inventory/units/{unit_id}/hold", headers=headers)
    assert held.status_code == 200
    assert held.json()["status"] == "HOLD"
    assert client.post(
        f"/inventory/units/{unit_id}/hold", headers=headers
    ).status_code == 400

    released = client.post(
        f"/inventory/units/{unit_id}/release-hold", headers=headers
    )
    assert released.status_code == 200
    assert released.json()["status"] == "AVAILABLE"
    assert client.post(
        f"/inventory/units/{unit_id}/release-hold", headers=headers
    ).status_code == 400

    priced = client.patch(
        f"/inventory/units/{unit_id}/price",
        json={"price": 5250000},
        headers=headers,
    )
    assert priced.status_code == 200
    assert float(priced.json()["price"]) == 5250000
    assert client.patch(
        "/inventory/units/99999/price",
        json={"price": 1},
        headers=headers,
    ).status_code == 404
    assert client.post(
        "/inventory/units/99999/hold", headers=headers
    ).status_code == 404
    assert client.post(
        "/inventory/units/99999/release-hold", headers=headers
    ).status_code == 404
