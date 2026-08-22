from fastapi.testclient import TestClient

from app.main import app


def test_health_and_chat_pipeline():
    with TestClient(app) as client:
        health = client.get("/health")
        assert health.status_code == 200
        assert "mongo_ready" in health.json()

        guest = client.post("/api/v1/auth/guest", json={"language": "hinglish"})
        assert guest.status_code == 200
        token = guest.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}

        blocked = client.post("/api/v1/chat/messages", headers=headers, json={"text": "hello"})
        assert blocked.status_code == 403

        assert client.post("/api/v1/auth/consent", headers=headers, json={"accepted": True}).status_code == 200

        green = client.post("/api/v1/chat/messages", headers=headers, json={"text": "I want to start meditating"})
        assert green.status_code == 200
        assert green.json()["risk"]["tier"] == "green"
        assert green.json()["llm_used"] is True

        yellow = client.post(
            "/api/v1/chat/messages",
            headers=headers,
            json={"text": "JEE exam stress is crushing me", "session_id": green.json()["session_id"]},
        )
        assert yellow.status_code == 200
        assert yellow.json()["risk"]["tier"] == "yellow"
        assert yellow.json()["therapists"]

        red = client.post(
            "/api/v1/chat/messages",
            headers=headers,
            json={"text": "I want to kill myself", "session_id": green.json()["session_id"]},
        )
        assert red.status_code == 200
        body = red.json()
        assert body["risk"]["tier"] == "red"
        assert body["llm_used"] is False
        assert "112" in body["reply"]
        assert "14416" in body["reply"]

        login = client.post("/api/v1/auth/login", json={"email": "demo@soulcare.app", "password": "Demo@123"})
        assert login.status_code == 200
        demo = login.json()["user"]
        assert demo["gender"] == "female"
        assert demo["details_completed"] is True
        therapists = client.get("/api/v1/therapists")
        assert therapists.status_code == 200
        assert len(therapists.json()) >= 6

        headers_demo = {"Authorization": f"Bearer {login.json()['token']}"}
        me = client.patch("/api/v1/auth/me", headers=headers_demo, json={"weight": 59.5, "height": 164})
        assert me.status_code == 200
        assert me.json()["weight"] == 59.5
        dash = client.get("/api/v1/surveillance")
        assert dash.status_code == 200
        assert dash.json()["static"] is True
