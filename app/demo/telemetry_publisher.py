"""Emisor y consola local para ejercitar el pipeline de demo con datos realistas."""

from __future__ import annotations

import base64
import copy
import json
import threading
import time
from datetime import UTC, datetime
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from itertools import cycle
from urllib.error import URLError
from urllib.request import Request, urlopen
from uuid import uuid4


RABBITMQ_PUBLISH_URL = "http://rabbitmq:15672/api/exchanges/%2F/amq.default/publish"
ROUTING_KEY = "iot_bees.demo.telemetry"
PUBLISHED: list[dict[str, object]] = []
MAX_EVENTS = 100

SCENARIOS = [
    {
        "name": "Lectura correcta · cámara fría",
        "payload": {
            "device_id": "cold-room-03",
            "temperature": 4.6,
            "humidity": 67.4,
            "status": "ok",
            "note": "ciclo de compresor estable; puerta cerrada",
            "battery_pct": 82,
            "rssi_dbm": -69,
            "location": "planta-norte/camara-03",
        },
    },
    {
        "name": "Lectura correcta · transporte",
        "payload": {
            "device_id": "truck-12",
            "temperature": 6.8,
            "humidity": 61.9,
            "status": "moving",
            "note": "ruta 45, km 18.4; batería baja",
            "battery_pct": 19,
            "rssi_dbm": -98,
            "location": "route-45/km-18.4",
        },
    },
    {
        "name": "Rechazo · temperatura fuera de rango",
        "payload": {
            "device_id": "cold-room-01",
            "temperature": 74.3,
            "humidity": 71.2,
            "status": "alarm",
            "note": "simula una sonda desconectada o una lectura corrupta",
            "battery_pct": 43,
            "rssi_dbm": -83,
            "location": "planta-norte/camara-01",
        },
    },
    {
        "name": "Rechazo · campo obligatorio ausente",
        "payload": {
            "device_id": "warehouse-south-02",
            "temperature": 8.1,
            "humidity": 103.4,
            "note": "sin estado y con humedad imposible",
            "battery_pct": 71,
            "rssi_dbm": -74,
            "location": "bodega-sur/anden-02",
        },
    },
]


def publish(payload: dict[str, object], source: str) -> dict[str, object]:
    event = copy.deepcopy(payload)
    event.setdefault("event_id", f"demo-{uuid4().hex[:12]}")
    event.setdefault("observed_at", datetime.now(UTC).isoformat())
    encoded = base64.b64encode(json.dumps(event, separators=(",", ":")).encode()).decode()
    body = json.dumps(
        {
            "properties": {"content_type": "application/json"},
            "routing_key": ROUTING_KEY,
            "payload": encoded,
            "payload_encoding": "base64",
        }
    ).encode()
    request = Request(
        RABBITMQ_PUBLISH_URL,
        data=body,
        headers={"content-type": "application/json", "authorization": "Basic Z3Vlc3Q6Z3Vlc3Q="},
        method="POST",
    )
    record: dict[str, object] = {
        "event_id": event["event_id"],
        "published_at": datetime.now(UTC).isoformat(),
        "source": source,
        "payload": event,
    }
    try:
        with urlopen(request, timeout=5) as response:
            accepted = bool(json.loads(response.read()).get("routed"))
        record["status"] = "published" if accepted else "not_routed"
    except (OSError, URLError, json.JSONDecodeError) as error:
        record["status"] = "publish_error"
        record["error"] = str(error)
    PUBLISHED.append(record)
    del PUBLISHED[:-MAX_EVENTS]
    return record


def publish_continuously() -> None:
    for scenario in cycle(SCENARIOS):
        publish(scenario["payload"], scenario["name"])
        time.sleep(3)


class DemoPublisherHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        if self.path == "/health":
            self._respond(HTTPStatus.OK, {"ok": True})
            return
        if self.path == "/events":
            self._respond(HTTPStatus.OK, {"published": PUBLISHED, "scenarios": SCENARIOS})
            return
        if self.path == "/":
            self._html()
            return
        self._respond(HTTPStatus.NOT_FOUND, {"error": "not found"})

    def do_POST(self) -> None:
        if self.path != "/events":
            self._respond(HTTPStatus.NOT_FOUND, {"error": "not found"})
            return
        try:
            size = int(self.headers.get("content-length", "0"))
            payload = json.loads(self.rfile.read(size))
        except (ValueError, json.JSONDecodeError):
            self._respond(HTTPStatus.BAD_REQUEST, {"error": "invalid JSON"})
            return
        if not isinstance(payload, dict):
            self._respond(HTTPStatus.BAD_REQUEST, {"error": "JSON object required"})
            return
        record = publish(payload, "manual")
        self._respond(HTTPStatus.ACCEPTED, record)

    def _html(self) -> None:
        html = """<!doctype html><html lang='es'><meta charset='utf-8'><title>iot bees · Emisor demo</title>
<style>body{font:16px system-ui;margin:2rem;max-width:880px;background:#fbfaf7;color:#20231f}textarea{width:100%;min-height:290px;padding:12px;font:13px ui-monospace,monospace}button{margin-top:12px;padding:10px 14px;background:#dd8b20;color:#17120b;border:0;font-weight:700;cursor:pointer}code{background:#eee;padding:2px 4px}p{line-height:1.5}</style>
<h1>Emisor de telemetría de demo</h1><p>Edita un evento y publícalo en RabbitMQ. El resultado real se observa en <a href='http://localhost:8090/events'><code>localhost:8090/events</code></a>. El emisor automático también alterna lecturas válidas y rechazos.</p>
<textarea id='payload'>{"device_id":"manual-sensor-01","temperature":5.4,"humidity":66.2,"status":"ok","note":"evento publicado manualmente","battery_pct":57,"rssi_dbm":-76,"location":"planta-norte/camara-02"}</textarea><br><button onclick='publishEvent()'>Publicar evento editable</button><pre id='result'></pre>
<script>async function publishEvent(){let result=document.querySelector('#result');try{let response=await fetch('/events',{method:'POST',headers:{'content-type':'application/json'},body:document.querySelector('#payload').value});result.textContent=JSON.stringify(await response.json(),null,2)}catch(error){result.textContent=error.message}}</script></html>"""
        body = html.encode()
        self.send_response(HTTPStatus.OK)
        self.send_header("content-type", "text/html; charset=utf-8")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _respond(self, status: HTTPStatus, body: dict[str, object]) -> None:
        payload = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, _format: str, *_args: object) -> None:
        return


if __name__ == "__main__":
    threading.Thread(target=publish_continuously, daemon=True).start()
    print("[demo-publisher] consola en :8091; publicando escenarios cada 3 s", flush=True)
    ThreadingHTTPServer(("0.0.0.0", 8091), DemoPublisherHandler).serve_forever()
