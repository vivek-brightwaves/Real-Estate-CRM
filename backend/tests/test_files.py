import io
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.users import User, RoleEnum
from app.core.security import get_password_hash


def test_upload_file(client: TestClient, db: Session):
    """Upload a valid file."""
    admin = User(
        name="Admin Files",
        email="admin_files@example.com",
        password_hash=get_password_hash("StrongPass1!"),
        role=RoleEnum.SUPER_ADMIN,
        is_active=True
    )
    db.add(admin)
    db.commit()

    login = client.post("/auth/login", data={"username": "admin_files@example.com", "password": "StrongPass1!"})
    token = login.json()["access_token"]

    file_content = b"Test document content"
    res = client.post(
        "/files/upload",
        headers={"Authorization": f"Bearer {token}"},
        data={"module": "customer", "entity_id": "1"},
        files={"file": ("test_doc.pdf", io.BytesIO(file_content), "application/pdf")},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["original_name"] == "test_doc.pdf"
    assert data["module"] == "customer"
    assert data["size_bytes"] == len(file_content)

    legacy_url = f"/uploads/customer/{data['stored_name']}"
    assert client.get(legacy_url).status_code == 401
    protected = client.get(
        legacy_url,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert protected.status_code == 200
    assert protected.content == file_content


def test_upload_blocked_extension(client: TestClient, db: Session):
    """Uploading an executable should be blocked."""
    login = client.post("/auth/login", data={"username": "admin_files@example.com", "password": "StrongPass1!"})
    token = login.json()["access_token"]

    res = client.post(
        "/files/upload",
        headers={"Authorization": f"Bearer {token}"},
        data={"module": "customer"},
        files={"file": ("malware.exe", io.BytesIO(b"evil"), "application/octet-stream")},
    )
    assert res.status_code == 400
    assert "not allowed" in res.json()["detail"].lower()


def test_list_files(client: TestClient, db: Session):
    """List files filtered by module."""
    login = client.post("/auth/login", data={"username": "admin_files@example.com", "password": "StrongPass1!"})
    token = login.json()["access_token"]

    res = client.get("/files/list?module=customer", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert "files" in res.json()
    assert "total" in res.json()


def test_download_file(client: TestClient, db: Session):
    """Download a previously uploaded file."""
    login = client.post("/auth/login", data={"username": "admin_files@example.com", "password": "StrongPass1!"})
    token = login.json()["access_token"]

    # Get the first file
    files = client.get("/files/list?module=customer", headers={"Authorization": f"Bearer {token}"})
    file_list = files.json().get("files", [])
    if file_list:
        file_id = file_list[0]["id"]
        res = client.get(f"/files/download/{file_id}", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200


def test_delete_file(client: TestClient, db: Session):
    """Delete a file."""
    login = client.post("/auth/login", data={"username": "admin_files@example.com", "password": "StrongPass1!"})
    token = login.json()["access_token"]

    # Upload, then delete
    file_content = b"Delete me"
    upload = client.post(
        "/files/upload",
        headers={"Authorization": f"Bearer {token}"},
        data={"module": "kyc"},
        files={"file": ("deleteme.pdf", io.BytesIO(file_content), "application/pdf")},
    )
    file_id = upload.json()["id"]

    res = client.delete(f"/files/{file_id}", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["message"] == "File deleted successfully"


def test_replace_file(client: TestClient, db: Session):
    """Replace an existing file."""
    login = client.post("/auth/login", data={"username": "admin_files@example.com", "password": "StrongPass1!"})
    token = login.json()["access_token"]

    # Upload first
    upload = client.post(
        "/files/upload",
        headers={"Authorization": f"Bearer {token}"},
        data={"module": "booking"},
        files={"file": ("original.pdf", io.BytesIO(b"original"), "application/pdf")},
    )
    file_id = upload.json()["id"]

    # Replace
    res = client.put(
        f"/files/{file_id}/replace",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("replacement.pdf", io.BytesIO(b"replaced"), "application/pdf")},
    )
    assert res.status_code == 200
    assert res.json()["original_name"] == "replacement.pdf"


def test_upload_multiple_files(client: TestClient, db: Session):
    """Upload multiple files at once."""
    login = client.post("/auth/login", data={"username": "admin_files@example.com", "password": "StrongPass1!"})
    token = login.json()["access_token"]

    res = client.post(
        "/files/upload-multiple",
        headers={"Authorization": f"Bearer {token}"},
        data={"module": "site-visits"},
        files=[
            ("files", ("photo1.jpg", io.BytesIO(b"image1"), "image/jpeg")),
            ("files", ("photo2.png", io.BytesIO(b"image2"), "image/png")),
        ],
    )
    assert res.status_code == 201
    assert len(res.json()["uploaded"]) == 2
