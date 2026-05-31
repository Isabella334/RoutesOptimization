"""Tests para distance_matrix.py — construcción de la matriz NxN."""
import pytest
from unittest.mock import patch, MagicMock
from domain import Place, Coordinates


def make_place(i: int) -> Place:
    return Place(str(i), f"Lugar {i}", Coordinates(14.63 + i * 0.01, -90.50 + i * 0.01))


class TestConstruirMatriz:
    def _mock_api_response(self, n: int, distance_m: int = 5000):
        """Genera una respuesta simulada de la Distance Matrix API."""
        element = {"status": "OK", "distance": {"value": distance_m}}
        return {
            "status": "OK",
            "rows": [{"elements": [element] * n} for _ in range(n)],
        }

    def test_returns_nxn_matrix(self):
        places = [make_place(i) for i in range(3)]
        mock_resp = MagicMock()
        mock_resp.json.return_value = self._mock_api_response(3)
        mock_resp.raise_for_status = MagicMock()

        with patch.dict("os.environ", {"GOOGLE_MAPS_API_KEY": "fake-key"}):
            with patch("requests.get", return_value=mock_resp):
                from distance_matrix import construir_matriz
                matrix = construir_matriz(places)

        assert len(matrix) == 3
        assert all(len(row) == 3 for row in matrix)

    def test_converts_meters_to_km(self):
        places = [make_place(i) for i in range(2)]
        mock_resp = MagicMock()
        mock_resp.json.return_value = self._mock_api_response(2, distance_m=10000)
        mock_resp.raise_for_status = MagicMock()

        with patch.dict("os.environ", {"GOOGLE_MAPS_API_KEY": "fake-key"}):
            with patch("requests.get", return_value=mock_resp):
                from distance_matrix import construir_matriz
                matrix = construir_matriz(places)

        assert matrix[0][1] == pytest.approx(10.0)

    def test_raises_when_no_api_key(self):
        places = [make_place(i) for i in range(2)]
        with patch.dict("os.environ", {"GOOGLE_MAPS_API_KEY": ""}):
            from distance_matrix import construir_matriz
            with pytest.raises(RuntimeError, match="GOOGLE_MAPS_API_KEY"):
                construir_matriz(places)

    def test_raises_on_api_error_status(self):
        places = [make_place(i) for i in range(2)]
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"status": "REQUEST_DENIED"}
        mock_resp.raise_for_status = MagicMock()

        with patch.dict("os.environ", {"GOOGLE_MAPS_API_KEY": "fake-key"}):
            with patch("requests.get", return_value=mock_resp):
                from distance_matrix import construir_matriz
                with pytest.raises(RuntimeError, match="REQUEST_DENIED"):
                    construir_matriz(places)

    def test_falls_back_to_haversine_for_zero_results(self):
        """Si un elemento de la API tiene status != OK, usa haversine."""
        places = [make_place(i) for i in range(2)]
        mock_resp = MagicMock()
        mock_resp.json.return_value = {
            "status": "OK",
            "rows": [
                {"elements": [
                    {"status": "OK", "distance": {"value": 5000}},
                    {"status": "ZERO_RESULTS"},
                ]},
                {"elements": [
                    {"status": "ZERO_RESULTS"},
                    {"status": "OK", "distance": {"value": 5000}},
                ]},
            ],
        }
        mock_resp.raise_for_status = MagicMock()

        with patch.dict("os.environ", {"GOOGLE_MAPS_API_KEY": "fake-key"}):
            with patch("requests.get", return_value=mock_resp):
                from distance_matrix import construir_matriz
                matrix = construir_matriz(places)

        # El elemento [0][1] falló → usa haversine (distancia > 0)
        assert matrix[0][1] > 0
