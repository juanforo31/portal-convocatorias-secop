def test_create_saved_search_returns_filters_as_dict(client, auth_headers):
    resp = client.post(
        "/api/saved-searches",
        json={
            "name": "Salud en Antioquia",
            "filters": {"q": "salud", "departamento": "Antioquia"},
        },
        headers=auth_headers,
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "Salud en Antioquia"
    assert body["filters"] == {"q": "salud", "departamento": "Antioquia"}


def test_list_saved_searches_returns_filters_as_dict(client, auth_headers):
    client.post(
        "/api/saved-searches",
        json={"name": "Test", "filters": {"estado": "Convocado"}},
        headers=auth_headers,
    )
    resp = client.get("/api/saved-searches", headers=auth_headers)
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) == 1
    assert items[0]["filters"] == {"estado": "Convocado"}


def test_delete_saved_search(client, auth_headers):
    create_resp = client.post(
        "/api/saved-searches",
        json={"name": "Borrar", "filters": {}},
        headers=auth_headers,
    )
    search_id = create_resp.json()["id"]
    delete_resp = client.delete(
        f"/api/saved-searches/{search_id}", headers=auth_headers
    )
    assert delete_resp.status_code == 204
