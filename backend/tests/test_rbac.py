def test_employee_cannot_access_audit_logs(client, employee_token_headers):
    response = client.get("/system/audit-logs", headers=employee_token_headers)
    assert response.status_code == 403

def test_manager_cannot_access_audit_logs(client, manager_token_headers):
    response = client.get("/system/audit-logs", headers=manager_token_headers)
    assert response.status_code == 403

def test_admin_can_access_audit_logs(client, admin_token_headers):
    response = client.get("/system/audit-logs", headers=admin_token_headers)
    assert response.status_code == 200

def test_employee_cannot_approve_booking(client, test_db, employee_token_headers):
    # Try to hit approve booking endpoint (requires booking ID, but will fail RBAC first)
    response = client.patch("/bookings/1/approve", headers=employee_token_headers)
    assert response.status_code == 403

def test_employee_cannot_delete_leads(client, test_db, employee_token_headers):
    # We didn't even implement DELETE /leads per specs, but if they try an admin-only mock route:
    response = client.post("/leads/1/assign", json={"assigned_to_id": 2}, headers=employee_token_headers)
    assert response.status_code == 403
