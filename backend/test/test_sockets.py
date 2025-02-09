from doppelkopf.sockets import socketio
from doppelkopf.db import db
from doppelkopf.game import Game
import json
import datetime
import uuid


def test_should_connect_unknown_player(socket_client):
    received_events = socket_client.get_received()
    assert received_events[0]["name"] == "session"


def test_should_emit_error_when_joining_unknown_game(socket_client):
    payload = _join_payload(42)

    socket_client.emit("join", payload)

    received_events = socket_client.get_received()
    assert len(received_events) == 2
    assert received_events[0]["name"] == "session"
    assert received_events[1]["name"] == "error"
    assert received_events[1]["args"][0] == "Game with id 42 not found"


def test_should_emit_joined_event_when_joining_successfully(client, socket_client):
    game_id = _create_game(client)
    payload = _join_payload(game_id)

    socket_client.emit("join", payload)

    expected_payload = {
        "game": {"id": game_id, "players": [{"id": 1, "name": "April", "online": True}]}
    }
    received_events = socket_client.get_received()
    assert len(received_events) == 2
    assert received_events[0]["name"] == "session"
    assert received_events[1]["name"] == "joined"
    assert received_events[1]["args"][0] == json.dumps(expected_payload)


def test_should_update_game_on_join(client, socket_client):
    game_id = _create_game(client)
    payload = _join_payload(game_id)

    socket_client.emit("join", payload)

    g = Game.query.get(game_id)
    assert len(g.players) == 1
    assert g.players[0].session_id is not None


def test_should_not_let_more_than_4_players_join(app, client, socket_client):
    game_id = _create_game(client)

    client_2 = socketio.test_client(app, flask_test_client=client)
    client_3 = socketio.test_client(app, flask_test_client=client)
    client_4 = socketio.test_client(app, flask_test_client=client)
    client_5 = socketio.test_client(app, flask_test_client=client)

    socket_client.emit("join", _join_payload(game_id))
    client_2.emit("join", _join_payload(game_id))
    client_3.emit("join", _join_payload(game_id))
    client_4.emit("join", _join_payload(game_id))

    client_5.emit("join", _join_payload(game_id))

    received_events = client_5.get_received()
    g = Game.query.get(game_id)
    assert len(received_events) == 2
    assert received_events[1]["name"] == "error"
    assert (
        received_events[1]["args"][0]
        == "error-room-full"
    )
    assert len(g.players) == 4
    client_2.disconnect()
    client_3.disconnect()
    client_4.disconnect()
    client_5.disconnect()


def test_should_reconnect_when_game_has_started(client, socket_client):
    game_id = _create_game(client)
    _start_game(game_id)
    socket_client.emit("join", _join_payload(game_id))
    received_events = socket_client.get_received()
    socket_client.disconnect()
    player_id = Game.query.get(game_id).players[0].uuid

    session_id = json.loads(received_events[0]["args"][0])["sessionId"]
    socket_client.connect(auth={"sessionId": session_id})

    g = Game.query.get(game_id)
    assert len(g.players) == 1
    assert str(g.players[0].session_id) == session_id
    assert g.players[0].uuid == player_id


def test_should_send_left_event_on_disconnect(client, socket_client):
    game_id = _create_game(client)
    socket_client.emit("join", _join_payload(game_id))

    socket_client.emit("disconnect")

    received_events = socket_client.get_received()
    assert received_events[0]["name"] == "session"
    assert received_events[1]["name"] == "joined"
    assert received_events[2]["name"] == "left"


def test_should_mark_player_as_disconnected_on_disconnect_if_game_is_started(
    client, socket_client
):
    game_id = _create_game(client)
    _start_game(game_id)
    socket_client.emit("join", _join_payload(game_id))

    socket_client.emit("disconnect")

    g = Game.query.get(game_id)
    assert len(g.players) == 1
    assert g.players[0].disconnected_at is not None
    received_events = socket_client.get_received()
    expected_payload = {
        "game": {
            "id": game_id,
            "players": [{"id": 1, "name": "April", "online": False}],
        }
    }
    assert received_events[2]["name"] == "left"
    assert received_events[2]["args"][0] == json.dumps(expected_payload)


def test_remove_player_on_disconnect_if_game_is_not_started_yet(client, socket_client):
    game_id = _create_game(client)
    socket_client.emit("join", _join_payload(game_id))

    socket_client.emit("disconnect")

    g = Game.query.get(game_id)
    assert len(g.players) == 0
    received_events = socket_client.get_received()
    expected_payload = {"game": {"id": game_id, "players": []}}
    assert received_events[2]["name"] == "left"
    assert received_events[2]["args"][0] == json.dumps(expected_payload)


def _create_game(client) -> int:
    response = client.post("/api/game")
    return response.get_json()["game"]["id"]


def _start_game(game_id):
    g = Game.query.get(game_id)
    g.started_at = datetime.datetime.utcnow()
    db.session.add(g)
    db.session.commit()


def _join_payload(game_id):
    return {"game": {"id": game_id}, "player": {"id": str(uuid.uuid4()), "name": "April"}}
