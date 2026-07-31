import pytest


@pytest.mark.api
@pytest.mark.parametrize(
    ("path", "required_key"),
    [
        ("/analytics/revenue", "today_revenue"),
        ("/analytics/leads", "total_leads"),
        ("/analytics/bookings", "total_bookings"),
        ("/analytics/payments", "total_payments_count"),
        ("/analytics/inventory", "available_units"),
    ],
)
def test_all_analytics_resources_return_typed_empty_results(
    client, admin_token_headers, path, required_key
):
    response = client.get(path, headers=admin_token_headers)

    assert response.status_code == 200
    assert required_key in response.json()


@pytest.mark.api
def test_employee_analytics_and_query_validation(client, test_db, admin_token_headers):
    admin_id = int(
        client.get("/auth/me", headers=admin_token_headers).json()["id"]
    )

    response = client.get(
        f"/analytics/employees?employee_id={admin_id}",
        headers=admin_token_headers,
    )
    assert response.status_code == 200
    assert response.json()["assigned_leads"] == 0

    invalid_range = client.get(
        "/analytics/bookings?start_date=2026-02-01&end_date=2026-01-01",
        headers=admin_token_headers,
    )
    assert invalid_range.status_code == 422


@pytest.mark.api
def test_analytics_requires_authorization(client, employee_token_headers):
    response = client.get("/analytics/revenue", headers=employee_token_headers)

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"
