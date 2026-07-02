def test_create_and_delete_bookmark_by_proceso_id(client, auth_headers):
    create_resp = client.post(
        "/api/bookmarks",
        json={
            "proceso_id": "CO1.REQ.10236807",
            "titulo": "Contrato de Prestación de Servicios",
            "entidad": "UNIVERSIDAD PEDAGÓGICA NACIONAL",
            "estado": "En aprobación",
            "url": "https://community.secop.gov.co/STS/Users/Login/Index",
        },
        headers=auth_headers,
    )
    assert create_resp.status_code == 201

    list_resp = client.get("/api/bookmarks", headers=auth_headers)
    assert len(list_resp.json()) == 1

    delete_resp = client.delete(
        "/api/bookmarks/CO1.REQ.10236807", headers=auth_headers
    )
    assert delete_resp.status_code == 204

    list_after = client.get("/api/bookmarks", headers=auth_headers)
    assert list_after.json() == []


def test_delete_bookmark_not_found(client, auth_headers):
    resp = client.delete("/api/bookmarks/NO-EXISTE", headers=auth_headers)
    assert resp.status_code == 404


def test_delete_bookmark_requires_auth(client):
    resp = client.delete("/api/bookmarks/CO1.REQ.10236807")
    assert resp.status_code == 401
