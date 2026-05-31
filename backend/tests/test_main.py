"""Tests de integración para el endpoint POST / de la API."""
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

# Parchear firebase_admin antes de importar main para evitar inicialización real
with patch("firebase_admin.initialize_app"), patch("firebase_admin._apps", [True]):
    from main import app

client = TestClient(app, raise_server_exceptions=False)

# Destinos válidos dentro de Guatemala (< 100 km entre sí)
VALID_PLACES = [
    {"name": "Parque Central",       "lat": 14.6349, "lng": -90.5069},
    {"name": "Aeropuerto La Aurora", "lat": 14.5833, "lng": -90.5275},
    {"name": "Zona Viva",            "lat": 14.6010, "lng": -90.5120},
]


def auth_headers(token: str = "valid-token") -> dict:
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Restricción de IP
# ---------------------------------------------------------------------------

class TestIPRestriction:
    def test_allowed_ip_passes(self):
        """Con ALLOWED_IPS vacío (sin restricción) cualquier IP pasa."""
        with patch.dict("os.environ", {"ALLOWED_IPS": ""}):
            with patch("firebase_admin.auth.verify_id_token"):
                res = client.post("/", json={"places": VALID_PLACES, "closed": True},
                                  headers=auth_headers())
        assert res.status_code == 200

    def test_blocked_ip_returns_403(self):
        """Una IP no en la allowlist debe recibir 403."""
        with patch.dict("os.environ", {"ALLOWED_IPS": "1.2.3.4"}):
            res = client.post("/", json={"places": VALID_PLACES, "closed": True},
                              headers=auth_headers())
        assert res.status_code == 403
        assert "IP" in res.json()["error"]


# ---------------------------------------------------------------------------
# Autenticación
# ---------------------------------------------------------------------------

class TestAuthentication:
    def test_missing_token_returns_401(self):
        with patch.dict("os.environ", {"ALLOWED_IPS": ""}):
            res = client.post("/", json={"places": VALID_PLACES, "closed": True})
        assert res.status_code == 401

    def test_invalid_token_returns_401(self):
        with patch.dict("os.environ", {"ALLOWED_IPS": ""}):
            with patch("firebase_admin.auth.verify_id_token", side_effect=Exception("invalid")):
                res = client.post("/", json={"places": VALID_PLACES, "closed": True},
                                  headers=auth_headers("bad-token"))
        assert res.status_code == 401

    def test_valid_token_passes_auth(self):
        with patch.dict("os.environ", {"ALLOWED_IPS": ""}):
            with patch("firebase_admin.auth.verify_id_token", return_value={"uid": "user1"}):
                res = client.post("/", json={"places": VALID_PLACES, "closed": True},
                                  headers=auth_headers())
        assert res.status_code == 200


# ---------------------------------------------------------------------------
# Validación de inputs
# ---------------------------------------------------------------------------

class TestInputValidation:
    def _post(self, body):
        with patch.dict("os.environ", {"ALLOWED_IPS": ""}):
            with patch("firebase_admin.auth.verify_id_token", return_value={"uid": "u"}):
                return client.post("/", json=body, headers=auth_headers())

    def test_too_few_destinations_returns_400(self):
        res = self._post({"places": [VALID_PLACES[0]], "closed": True})
        assert res.status_code == 400
        assert "2" in res.json()["error"]

    def test_too_many_destinations_returns_400(self):
        place = {"name": "X", "lat": 14.63, "lng": -90.50}
        res = self._post({"places": [place] * 16, "closed": True})
        assert res.status_code == 400

    def test_destinations_exceeding_100km_returns_400(self):
        """Destinos en Guatemala y México superan 100 km → 400."""
        far_places = [
            {"name": "Guatemala", "lat": 14.6349, "lng": -90.5069},
            {"name": "México DF",  "lat": 19.4326, "lng": -99.1332},
        ]
        res = self._post({"places": far_places, "closed": True})
        assert res.status_code == 400
        assert "100" in res.json()["error"]

    def test_invalid_body_returns_400(self):
        with patch.dict("os.environ", {"ALLOWED_IPS": ""}):
            with patch("firebase_admin.auth.verify_id_token", return_value={"uid": "u"}):
                res = client.post("/", content="not-json",
                                  headers={**auth_headers(), "Content-Type": "application/json"})
        assert res.status_code == 400


# ---------------------------------------------------------------------------
# Respuesta correcta
# ---------------------------------------------------------------------------

class TestResponse:
    def _optimize(self, places, closed=True):
        with patch.dict("os.environ", {"ALLOWED_IPS": ""}):
            with patch("firebase_admin.auth.verify_id_token", return_value={"uid": "u"}):
                return client.post("/", json={"places": places, "closed": closed},
                                   headers=auth_headers())

    def test_response_contains_route_and_distance(self):
        res = self._optimize(VALID_PLACES)
        assert res.status_code == 200
        data = res.json()
        assert "route" in data
        assert "total_distance_km" in data

    def test_route_length_matches_input(self):
        res = self._optimize(VALID_PLACES)
        assert len(res.json()["route"]) == len(VALID_PLACES)

    def test_route_is_valid_permutation(self):
        """Cada destino debe aparecer exactamente una vez en la respuesta."""
        res = self._optimize(VALID_PLACES)
        orders = sorted(item["order"] for item in res.json()["route"])
        assert orders == list(range(1, len(VALID_PLACES) + 1))

    def test_total_distance_is_positive(self):
        res = self._optimize(VALID_PLACES)
        assert res.json()["total_distance_km"] > 0

    def test_closed_flag_reflected_in_response(self):
        res = self._optimize(VALID_PLACES, closed=False)
        assert res.json()["closed"] is False

    def test_two_destinations_minimum(self):
        res = self._optimize(VALID_PLACES[:2])
        assert res.status_code == 200
        assert len(res.json()["route"]) == 2
