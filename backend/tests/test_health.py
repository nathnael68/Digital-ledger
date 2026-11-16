from fastapi.testclient import TestClient


def test_root_endpoint(client: TestClient):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["project"] == "Delgone Digital Sales Ledger"
    assert data["version"] == "1.0.0"
    assert data["status"] == "online"
    assert "health" in data


def test_health_endpoint(client: TestClient):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["version"] == "1.0.0"
    assert "environment" in data
    assert "database_connected" in data
    assert data["timezone"] == "Africa/Addis_Ababa"
    assert data["currency"] == "ETB"
    assert "timestamp" in data
