from fastapi.testclient import TestClient
import uuid

from app.main import app
from app.services.swytchcode_exec import TOOLS


def test_three_demo_desks_login():
    with TestClient(app) as client:
        cases = [
            ("demo@soulcare.app", "user"),
            ("therapist@soulcare.app", "therapist"),
            ("b2b@soulcare.app", "b2b"),
        ]
        for email, role in cases:
            res = client.post("/api/v1/auth/login", json={"email": email, "password": "Demo@123"})
            assert res.status_code == 200, email
            user = res.json()["user"]
            assert user["role"] == role
            assert user["details_completed"] is True
            assert user["consent"] is True


def test_signup_role_skips_details_for_therapist():
    with TestClient(app) as client:
        email = f"new-therapist-{uuid.uuid4().hex[:8]}@example.com"
        res = client.post(
            "/api/v1/auth/signup",
            json={
                "email": email,
                "password": "Demo@123",
                "name": "Patel Clinic",
                "role": "therapist",
            },
        )
        assert res.status_code == 200
        user = res.json()["user"]
        assert user["role"] == "therapist"
        assert user["details_completed"] is True
        assert user["consent"] is True
        headers = {"Authorization": f"Bearer {res.json()['token']}"}
        desk = client.get("/api/v1/partners/me", headers=headers)
        assert desk.status_code == 200
        assert desk.json().get("partner")


def test_red_notify_goes_through_swytchcode():
    with TestClient(app) as client:
        guest = client.post("/api/v1/auth/guest", json={"language": "en"})
        token = guest.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        assert client.post("/api/v1/auth/consent", headers=headers, json={"accepted": True}).status_code == 200
        red = client.post(
            "/api/v1/chat/messages",
            headers=headers,
            json={"text": "I want to kill myself"},
        )
        assert red.status_code == 200
        body = red.json()
        assert body["risk"]["tier"] == "red"
        assert body["llm_used"] is False
        channel = body["risk"].get("notifiedChannel") or ""
        assert channel.startswith("swytchcode:") or channel == "ngo_inbox"
        assert "112" in body["reply"] and "14416" in body["reply"]


def test_pharmacy_list_does_not_crash():
    with TestClient(app) as client:
        res = client.get("/api/v1/pharmacy")
        assert res.status_code == 200
        rows = res.json()
        assert isinstance(rows, list)
        assert len(rows) >= 1
        assert rows[0].get("source")


def test_swytchcode_tool_map_covers_integrations():
    assert TOOLS["slack"] == "slack.chat.postmessage.create"
    assert TOOLS["youtube_search"] == "youtube.search.list"
    assert TOOLS["gcal_event"] == "calendar.event.create"
    assert TOOLS["cloudinary_upload"] == "cloudinary.upload.create"
