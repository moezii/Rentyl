"""
Auth entrypoints (login/refresh/register), refresh-token revocation and
tenant isolation of document/user/car endpoints.
"""
import importlib
from io import BytesIO
from unittest.mock import patch

import jwt as pyjwt
import pytest
from fastapi import HTTPException, UploadFile
from starlette.datastructures import Headers

from backend.routes.tests.fakes import FakeSupabase
from backend.services.jwt_service import JWTService
from backend.utils.aes_utils import encrypt_id
from backend.utils.errors import server_error

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64


def upload(name, content, content_type):
    return UploadFile(file=BytesIO(content), filename=name,
                      headers=Headers({"content-type": content_type}))


class TestLoginAndRefresh:
    @pytest.mark.asyncio
    async def test_login_sets_http_only_cookies_and_hides_tokens(self, client):
        result = {"access_token": "a.b.c", "refresh_token": "d.e.f",
                  "user": {"id": "u1", "email": "x@example.com"}, "company": None}
        with patch("backend.routes.auth.login_user", return_value=result):
            response = await client.post("/auth/login", json={"email": "x@example.com", "password": "password123"})
        assert response.status_code == 200
        body = response.json()
        assert "access_token" not in body and "refresh_token" not in body
        cookies = response.headers.get_list("set-cookie")
        assert any(c.startswith("access_token=a.b.c") and "HttpOnly" in c for c in cookies)
        assert any(c.startswith("refresh_token=d.e.f") and "HttpOnly" in c for c in cookies)

    @pytest.mark.asyncio
    async def test_login_internal_error_is_generic(self, client):
        with patch("backend.routes.auth.login_user", side_effect=RuntimeError("db password=hunter2")):
            response = await client.post("/auth/login", json={"email": "x@example.com", "password": "password123"})
        assert response.status_code == 500
        assert "hunter2" not in response.text

    @pytest.mark.asyncio
    async def test_refresh_without_cookie_is_401(self, client):
        response = await client.post("/auth/refresh")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_refresh_rotates_cookies(self, client):
        with patch("backend.routes.auth.refresh_access_token",
                   return_value={"access_token": "new-a", "refresh_token": "new-r"}):
            client.cookies.set("refresh_token", "old-r")
            response = await client.post("/auth/refresh")
        assert response.status_code == 200
        assert any(c.startswith("access_token=new-a") for c in response.headers.get_list("set-cookie"))


class TestRefreshTokenRevocation:
    def _service_with(self, sessions):
        fake = FakeSupabase(lambda q: sessions if q.table == "user_sessions" and q.action == "select" else [{"ok": 1}])
        return fake

    def test_refresh_token_of_deleted_session_is_rejected(self):
        # regression: a missing session (logout / revoke-session / logout-all) used to be accepted
        fake = self._service_with([])
        with patch("backend.services.jwt_service.supabase", fake), \
             patch("backend.services.jwt_service.threading.Thread"):
            service = JWTService()
            token = service.generate_refresh_token({"user_id": "u1", "email": "x@example.com"})
            with pytest.raises(pyjwt.InvalidTokenError, match="Session not found"):
                service.verify_refresh_token(token)

    def test_refresh_token_without_session_id_is_rejected(self):
        service = JWTService()
        token = pyjwt.encode({"user_id": "u1", "type": "refresh", "exp": 9999999999},
                             service.secret_key, algorithm=service.algorithm)
        with pytest.raises(pyjwt.InvalidTokenError, match="no session"):
            service.verify_refresh_token(token)

    def test_live_session_is_accepted(self):
        sessions = []
        fake = self._service_with(sessions)
        with patch("backend.services.jwt_service.supabase", fake), \
             patch("backend.services.jwt_service.threading.Thread"):
            service = JWTService()
            token = service.generate_refresh_token({"user_id": "u1"})
            payload = pyjwt.decode(token, service.secret_key, algorithms=[service.algorithm])
            sessions.append({"session_id": payload["session_id"], "user_id": "u1",
                             "refresh_token_hash": service._hash_token(token)})
            assert service.verify_refresh_token(token)["user_id"] == "u1"


class TestAdminOnlyEndpoints:
    @pytest.mark.asyncio
    async def test_register_requires_authentication(self, client):
        response = await client.post("/auth/register", json={
            "email": "evil@example.com", "password": "password123", "username": "evil",
            "first_name": "E", "last_name": "V", "role": "admin", "created_by": "x"})
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_users_list_rejects_non_admin(self, client):
        agent = {"user_id": "u1", "company_id": 7, "role": "agent"}
        with patch("backend.dependencies.get_current_user_with_company", return_value=agent):
            response = await client.get("/users/users/")
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_users_list_for_admin(self, client):
        admin = {"user_id": "u1", "company_id": 7, "role": "admin"}
        fake = FakeSupabase(lambda q: [{"user_id": "u2", "username": "a", "first_name": "A",
                                        "last_name": "B", "email": "a@example.com", "role": "agent"}])
        with patch("backend.dependencies.get_current_user_with_company", return_value=admin), \
             patch("backend.services.user_service.supabase", fake):
            response = await client.get("/users/users/")
        assert response.status_code == 200
        assert response.json()[0]["user_id"] == "u2"

    @pytest.mark.asyncio
    async def test_legacy_image_upload_requires_authentication(self, client):
        response = await client.post("/upload/image", files={"file": ("a.png", PNG, "image/png")})
        assert response.status_code == 401


class TestClientDocumentsIsolation:
    @pytest.mark.asyncio
    async def test_list_documents_requires_authentication(self, client):
        response = await client.get(f"/documents/clients/{encrypt_id(5)}/documents/")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_documents_is_company_scoped(self, client, as_company):
        as_company(7)
        fake = FakeSupabase(lambda q: [{"document_id": 1, "file_path": "client_documents/x.pdf"}])
        with patch("backend.routes.client_documents.supabase", fake):
            response = await client.get(f"/documents/clients/{encrypt_id(5)}/documents/")
        assert response.status_code == 200
        query = fake.queries_for("client_documents")[0]
        assert query.filter_value("company_id") == 7
        assert query.filter_value("client_id") == 5

    @pytest.mark.asyncio
    async def test_upload_to_other_companys_client_is_404(self, client, as_company):
        as_company(7)
        fake = FakeSupabase(lambda q: [])  # client not found within company 7
        with patch("backend.routes.client_documents.supabase", fake):
            response = await client.post("/documents/clients/documents/",
                                         data={"client_id": encrypt_id(5)},
                                         files={"files": ("id.png", PNG, "image/png")})
        assert response.status_code == 404
        assert fake.queries_for("clients")[0].filter_value("company_id") == 7
        assert fake.uploads == []

    @pytest.mark.asyncio
    async def test_upload_rejects_spoofed_content(self, client, as_company):
        as_company(7)
        fake = FakeSupabase(lambda q: [{"client_id": 5}])
        with patch("backend.routes.client_documents.supabase", fake):
            response = await client.post("/documents/clients/documents/",
                                         data={"client_id": encrypt_id(5)},
                                         files={"files": ("id.png", b"<html><script>alert(1)</script>", "image/png")})
        assert response.status_code == 400
        assert fake.uploads == []

    @pytest.mark.asyncio
    async def test_upload_uses_server_side_content_type(self, client, as_company):
        as_company(7)
        fake = FakeSupabase(lambda q: [{"client_id": 5, "document_id": 3}])
        with patch("backend.routes.client_documents.supabase", fake):
            response = await client.post("/documents/clients/documents/",
                                         data={"client_id": encrypt_id(5)},
                                         files={"files": ("id.png", PNG, "image/png")})
        assert response.status_code == 200
        assert fake.uploads[0]["path"].endswith(".png")
        assert fake.uploads[0]["options"] == {"content-type": "image/png"}


class TestCarImages:
    def test_html_disguised_as_png_is_rejected(self):
        from backend.services.car_service import _validated_car_image
        with pytest.raises(HTTPException) as exc:
            _validated_car_image(upload("evil.png", b"<html>", "image/png"))
        assert exc.value.status_code == 400

    def test_svg_is_rejected(self):
        from backend.services.car_service import _validated_car_image
        with pytest.raises(HTTPException):
            _validated_car_image(upload("x.svg", b"<svg onload=alert(1)>", "image/svg+xml"))

    def test_valid_png_gets_server_generated_name(self):
        from backend.services.car_service import _validated_car_image
        content, filename = _validated_car_image(upload("../../My Car.png", PNG, "image/png"))
        assert content == PNG
        assert filename.startswith("car_") and filename.endswith(".png") and "/" not in filename

    def test_no_image_is_fine(self):
        from backend.services.car_service import _validated_car_image
        assert _validated_car_image(None) is None

    @pytest.mark.asyncio
    async def test_invalid_car_id_does_not_echo_decrypt_error(self, client):
        from backend.main import app
        from backend.dependencies import get_current_user_with_company
        app.dependency_overrides[get_current_user_with_company] = lambda: {"user_id": "u", "company_id": 7}
        response = await client.get("/cars/not-a-valid-id")
        assert response.status_code == 400
        assert response.json()["detail"] == "Invalid car ID"


class TestServerError:
    def test_http_exception_passes_through(self):
        original = HTTPException(status_code=404, detail="Client not found")
        assert server_error(original) is original

    def test_other_errors_are_hidden(self):
        exc = server_error(RuntimeError("relation users does not exist"), "Failed to fetch")
        assert exc.status_code == 500 and exc.detail == "Failed to fetch"

    def test_custom_status(self):
        assert server_error(ValueError("x"), "Upstream", status_code=502).status_code == 502


class TestConfigEnv:
    def test_empty_render_and_optional_values_use_defaults(self, monkeypatch):
        import backend.config as config
        monkeypatch.setenv("RENDER", "")
        monkeypatch.setenv("ENVIRONMENT", "development")
        monkeypatch.setenv("SIGNED_URL_TTL_SECONDS", "")
        monkeypatch.setenv("BOOKING_DOCS_BUCKET", "")
        monkeypatch.setenv("FRONTEND_BASE_URL", "https://app.example.com/")
        try:
            reloaded = importlib.reload(config)
            assert reloaded.IS_PRODUCTION is False
            assert reloaded.SIGNED_URL_TTL_SECONDS == 3600
            assert reloaded.BOOKING_DOCS_BUCKET == "booking-documents"
            assert reloaded.FRONTEND_BASE_URL == "https://app.example.com"
            monkeypatch.setenv("RENDER", "true")
            assert importlib.reload(config).IS_PRODUCTION is True
        finally:
            monkeypatch.undo()
            importlib.reload(config)
