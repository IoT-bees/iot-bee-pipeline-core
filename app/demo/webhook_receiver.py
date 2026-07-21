"""Receptor HTTP mínimo para observar las entregas de la demo local."""

from __future__ import annotations

import json
import os
from datetime import UTC, datetime
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


EVENTS: list[dict[str, object]] = []
DELIVERY_FAILURES: list[dict[str, object]] = []
MAX_EVENTS = 100
TRACE_PATH = Path(os.environ.get("DEMO_TRACE_PATH", "/demo-trace/events.ndjson"))
FAIL_NEXT_DELIVERIES = 0


def validation_rejections() -> list[dict[str, object]]:
    if not TRACE_PATH.exists():
        return []
    try:
        lines = TRACE_PATH.read_text().splitlines()
    except OSError:
        return []
    entries: list[dict[str, object]] = []
    for line in lines[-MAX_EVENTS:]:
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(entry, dict):
            entries.append(entry)
    return entries


class DemoWebhookHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        if self.path == "/health":
            self._respond(HTTPStatus.OK, {"ok": True})
            return
        if self.path == "/events":
            rejections = validation_rejections()
            self._respond(
                HTTPStatus.OK,
                {
                    "summary": {
                        "delivered": len(EVENTS),
                        "rejected": len(rejections),
                        "delivery_failures": len(DELIVERY_FAILURES),
                        "fail_next_deliveries": FAIL_NEXT_DELIVERIES,
                    },
                    "events": EVENTS,
                    "rejections": rejections,
                    "delivery_failures": DELIVERY_FAILURES,
                },
            )
            return
        if self.path == "/":
            self._html()
            return
        self._respond(HTTPStatus.NOT_FOUND, {"error": "not found"})

    def do_POST(self) -> None:
        if self.path == "/control":
            self._configure_failure_mode()
            return
        if self.path != "/events":
            self._respond(HTTPStatus.NOT_FOUND, {"error": "not found"})
            return

        try:
            size = int(self.headers.get("content-length", "0"))
            event = json.loads(self.rfile.read(size))
        except (ValueError, json.JSONDecodeError):
            self._respond(HTTPStatus.BAD_REQUEST, {"error": "invalid JSON"})
            return

        if not isinstance(event, dict):
            self._respond(HTTPStatus.BAD_REQUEST, {"error": "JSON object required"})
            return

        global FAIL_NEXT_DELIVERIES
        attempt = {
            "attempted_at": datetime.now(UTC).isoformat(),
            "event": event,
        }
        if FAIL_NEXT_DELIVERIES > 0:
            FAIL_NEXT_DELIVERIES -= 1
            attempt["status"] = HTTPStatus.SERVICE_UNAVAILABLE
            attempt["error"] = "fallo de destino activado desde la consola demo"
            DELIVERY_FAILURES.append(attempt)
            del DELIVERY_FAILURES[:-MAX_EVENTS]
            self._respond(
                HTTPStatus.SERVICE_UNAVAILABLE,
                {"error": "demo destination unavailable", "remaining_failures": FAIL_NEXT_DELIVERIES},
            )
            return

        EVENTS.append(event)
        del EVENTS[:-MAX_EVENTS]
        print(f"[demo-sink] recibido: {json.dumps(event, ensure_ascii=False)}", flush=True)
        self._respond(HTTPStatus.ACCEPTED, {"accepted": True})

    def _configure_failure_mode(self) -> None:
        global FAIL_NEXT_DELIVERIES
        try:
            size = int(self.headers.get("content-length", "0"))
            settings = json.loads(self.rfile.read(size))
            fail_next = int(settings.get("fail_next_deliveries", 0))
        except (ValueError, json.JSONDecodeError, AttributeError):
            self._respond(HTTPStatus.BAD_REQUEST, {"error": "fail_next_deliveries must be an integer"})
            return
        if fail_next < 0 or fail_next > 20:
            self._respond(HTTPStatus.BAD_REQUEST, {"error": "fail_next_deliveries must be between 0 and 20"})
            return
        FAIL_NEXT_DELIVERIES = fail_next
        self._respond(HTTPStatus.OK, {"fail_next_deliveries": FAIL_NEXT_DELIVERIES})

    def _html(self) -> None:
        html = """<!doctype html><html lang='es'><meta charset='utf-8'><title>iot bees · Destino demo</title>
<style>body{font:16px system-ui;margin:2rem;max-width:760px;background:#fbfaf7;color:#20231f}input{width:90px;padding:8px}button{padding:9px 12px;background:#dd8b20;color:#17120b;border:0;font-weight:700;cursor:pointer}code{background:#eee;padding:2px 4px}p{line-height:1.5}</style>
<h1>Destino webhook de demo</h1><p>Consulta el resultado completo en <a href='/events'><code>/events</code></a>. Para probar el tramo final, responde <code>503</code> a las próximas entregas; el pipeline reintentará cada una tres veces y expondrá el error operativo.</p>
<label>Próximas entregas que deben fallar <input id='failures' type='number' min='0' max='20' value='0'></label> <button onclick='configureFailures()'>Aplicar fallo de destino</button><pre id='result'></pre>
<script>async function configureFailures(){let result=document.querySelector('#result');let body={fail_next_deliveries:Number(document.querySelector('#failures').value)};let response=await fetch('/control',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});result.textContent=JSON.stringify(await response.json(),null,2)}</script></html>"""
        body = html.encode()
        self.send_response(HTTPStatus.OK)
        self.send_header("content-type", "text/html; charset=utf-8")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, _format: str, *_args: object) -> None:
        return

    def _respond(self, status: HTTPStatus, body: dict[str, object]) -> None:
        payload = json.dumps(body, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


if __name__ == "__main__":
    print("[demo-sink] escuchando en :8090", flush=True)
    ThreadingHTTPServer(("0.0.0.0", 8090), DemoWebhookHandler).serve_forever()
