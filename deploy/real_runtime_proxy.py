#!/usr/bin/env python3
"""Expose Bianbu Agent Runtime management APIs through Bibit external service.

Bibit calls POST /bibit/v1/invoke. This adapter maps stable Runtime plugin
operation IDs to the Runtime's current /api/v1 HTTP contract.
"""
from __future__ import annotations

import base64
import binascii
import uuid
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

_HERE = Path(__file__).resolve().parent
ROOT = _HERE / "dist"
if not ROOT.is_dir():
    ROOT = _HERE.parent / "dist"

RUNTIME_BASE_URL = os.environ.get("RUNTIME_BASE_URL", "http://127.0.0.1:9899").rstrip("/")
SECURITY_BRIDGE_URL = os.environ.get("SECURITY_BRIDGE_URL", RUNTIME_BASE_URL + "/security-api/invoke")
# A catalog change makes the Runtime rebuild the Worker generation, which restarts
# every MCP server, and one server may spend its whole 120s startup budget inside a
# single install or delete. The old 30s budget here turned those mutations into
# "Runtime service request timed out" while the Runtime was still working, so Bi-bit
# pages kept the pre-action catalog until the user refreshed by hand.
RUNTIME_TIMEOUT_SECONDS = float(os.environ.get("RUNTIME_TIMEOUT_SECONDS", "180"))
MAX_REQUEST_BYTES = 3 * 1024 * 1024
MAX_AVATAR_BYTES = 2 * 1024 * 1024
AVATAR_MEDIA_TYPES = {"image/png", "image/jpeg", "image/webp", "image/gif"}


def _json_request(path: str, method: str = "GET", payload=None):
    body = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request(
        RUNTIME_BASE_URL + path,
        data=body,
        method=method,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=RUNTIME_TIMEOUT_SECONDS) as response:
        if response.status == 204:
            return {}
        data = response.read()
        return {} if not data else json.loads(data)


def _text_request(path: str):
    req = urllib.request.Request(RUNTIME_BASE_URL + path, method="GET")
    with urllib.request.urlopen(req, timeout=RUNTIME_TIMEOUT_SECONDS) as response:
        return response.read().decode("utf-8", errors="replace")


def _avatar_request(agent_id: str, operation: str, params: dict):
    path = f"/api/v1/agents/{_quote(agent_id)}/avatar"
    if operation == "agents.avatar.delete.v1":
        try:
            _json_request(path, "DELETE")
        except urllib.error.HTTPError as exc:
            if exc.code != 404:
                raise
        return {"ok": True}
    if operation == "agents.avatar.get.v1":
        request = urllib.request.Request(RUNTIME_BASE_URL + path, method="GET")
        with urllib.request.urlopen(request, timeout=RUNTIME_TIMEOUT_SECONDS) as response:
            media_type = response.headers.get_content_type()
            payload = response.read(MAX_AVATAR_BYTES + 1)
            if media_type not in AVATAR_MEDIA_TYPES or len(payload) > MAX_AVATAR_BYTES:
                raise ValueError("Invalid or oversized Runtime avatar")
            return {"media_type": media_type, "base64": base64.b64encode(payload).decode("ascii")}
    media_type = params.get("media_type")
    encoded = params.get("base64")
    if not isinstance(media_type, str) or media_type not in AVATAR_MEDIA_TYPES:
        raise ValueError("avatar must be PNG/JPEG/WebP/GIF")
    if not isinstance(encoded, str) or len(encoded) > 4 * ((MAX_AVATAR_BYTES + 2) // 3):
        raise ValueError("avatar exceeds 2 MiB")
    try:
        payload = base64.b64decode(encoded, validate=True)
    except (ValueError, binascii.Error) as exc:
        raise ValueError("Invalid avatar base64") from exc
    if not payload or len(payload) > MAX_AVATAR_BYTES:
        raise ValueError("avatar must contain at most 2 MiB")
    boundary = "bibit-avatar-" + uuid.uuid4().hex
    suffix = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif"}[media_type]
    body = (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="avatar.{suffix}"\r\n'
            f'Content-Type: {media_type}\r\n\r\n').encode() + payload + f"\r\n--{boundary}--\r\n".encode()
    request = urllib.request.Request(RUNTIME_BASE_URL + path, data=body, method="POST", headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
    with urllib.request.urlopen(request, timeout=RUNTIME_TIMEOUT_SECONDS) as response:
        return _data(json.loads(response.read()))


def _data(response):
    return response.get("data") if isinstance(response, dict) and "data" in response else response


def invoke(operation: str, p: dict):
    if operation in {"agents.avatar.get.v1", "agents.avatar.upload.v1", "agents.avatar.delete.v1"}:
        return _avatar_request(_require_id(p, "agent_id"), operation, p)
    if operation == "workers.get.v1":
        return _data(_json_request("/api/v1/runtime/workers"))
    if operation == "status.get.v1":
        return _data(_json_request("/api/v1/runtime/status"))
    if operation == "settings.get.v1":
        return _data(_json_request("/api/v1/settings"))
    if operation == "settings.update.v1":
        return _data(_json_request("/api/v1/settings", "PATCH", p))
    if operation == "agents.list.v1":
        return {"agents": _data(_json_request("/api/v1/agents"))}
    if operation == "agents.get.v1":
        agent_id = _require_id(p, "agent_id")
        return _data(_json_request(f"/api/v1/agents/{_quote(agent_id)}"))
    if operation == "agents.create.v1":
        return _data(_json_request("/api/v1/agents", "POST", p))
    if operation == "agents.restart.v1":
        agent_id = _require_id(p, "agent_id")
        return _data(_json_request(f"/api/v1/agents/{_quote(agent_id)}/restart", "POST", {}))
    if operation == "agents.update.v1":
        agent_id = _require_id(p, "agent_id")
        payload = {key: value for key, value in p.items() if key != "agent_id"}
        return _data(_json_request(f"/api/v1/agents/{_quote(agent_id)}", "PATCH", payload))
    if operation == "agents.delete.v1":
        agent_id = _require_id(p, "agent_id")
        _json_request(f"/api/v1/agents/{_quote(agent_id)}", "DELETE")
        return {"ok": True}
    if operation == "providers.list.v1":
        return {"providers": _data(_json_request("/api/v1/providers"))}
    if operation == "providers.models.list.v1":
        provider_id = _require_id(p, "provider_id")
        return {"models": _data(_json_request(f"/api/v1/providers/{_quote(provider_id)}/models"))}
    if operation == "providers.create.v1":
        return _data(_json_request("/api/v1/providers", "POST", p))
    if operation == "providers.update.v1":
        provider_id = _require_id(p, "provider_id")
        payload = {key: value for key, value in p.items() if key != "provider_id"}
        return _data(_json_request(f"/api/v1/providers/{_quote(provider_id)}", "PATCH", payload))
    if operation == "providers.delete.v1":
        provider_id = _require_id(p, "provider_id")
        _json_request(f"/api/v1/providers/{_quote(provider_id)}", "DELETE")
        return {"ok": True}
    if operation == "capabilities.list.v1":
        kind = _require_id(p, "kind")
        return {"capabilities": _data(_json_request(f"/api/v1/capabilities/{_quote(kind)}"))}
    if operation == "packages.list.v1":
        kind = _require_id(p, "kind")
        return {"packages": _data(_json_request(f"/api/v1/packages/{_quote(kind)}"))}
    if operation == "packages.get.v1":
        kind = _require_id(p, "kind")
        package_id = _require_id(p, "package_id")
        return _data(_json_request(f"/api/v1/packages/{_quote(kind)}/{_quote(package_id)}"))
    if operation == "packages.install.v1":
        kind = _require_id(p, "kind")
        payload = {key: value for key, value in p.items() if key != "kind"}
        return _data(_json_request(f"/api/v1/packages/{_quote(kind)}", "POST", payload))
    if operation == "packages.verify.v1":
        kind = _require_id(p, "kind")
        package_id = _require_id(p, "package_id")
        return _data(_json_request(f"/api/v1/packages/{_quote(kind)}/{_quote(package_id)}/verify", "POST", {}))
    if operation == "packages.delete.v1":
        kind = _require_id(p, "kind")
        package_id = _require_id(p, "package_id")
        _json_request(f"/api/v1/packages/{_quote(kind)}/{_quote(package_id)}", "DELETE")
        return {"ok": True}
    if operation == "plugins.list.v1":
        return {"plugins": _data(_json_request("/api/v1/plugins"))}
    if operation == "plugins.effective.v1":
        return {"plugins": _data(_json_request("/api/v1/plugins/effective"))}
    if operation == "plugins.get.v1":
        plugin_id = _require_id(p, "plugin_id")
        return _data(_json_request(f"/api/v1/plugins/{_quote(plugin_id)}"))
    if operation == "plugins.install.v1":
        return _data(_json_request("/api/v1/plugins", "POST", p))
    if operation == "plugins.delete.v1":
        plugin_id = _require_id(p, "plugin_id")
        _json_request(f"/api/v1/plugins/{_quote(plugin_id)}", "DELETE")
        return {"ok": True}
    if operation == "plugins.rollback.v1":
        plugin_id = _require_id(p, "plugin_id")
        return _data(_json_request(f"/api/v1/plugins/{_quote(plugin_id)}/rollback", "POST", {}))
    if operation == "localModels.get.v1":
        # Read-only: the Runtime relays what spacemit-ai-gateway publishes.
        return _data(_json_request("/api/v1/local-models"))
    if operation == "executions.list.v1":
        return {"executions": _data(_json_request("/api/v1/executions"))}
    if operation == "executions.get.v1":
        instance_id = _require_id(p, "instance_id")
        return _data(_json_request(f"/api/v1/executions/{_quote(instance_id)}"))
    if operation == "executions.stop.v1":
        instance_id = _require_id(p, "instance_id")
        payload = {key: value for key, value in p.items() if key != "instance_id"}
        return _data(_json_request(f"/api/v1/executions/{_quote(instance_id)}/stop", "POST", payload))
    if operation == "agents.revoke.v1":
        agent_id = _require_id(p, "agent_id")
        return _data(_json_request(f"/api/v1/agents/{_quote(agent_id)}/revoke", "POST", {}))
    if operation == "agentTop.get.v1":
        return _data(_json_request("/api/v1/agent-top"))
    if operation == "logs.get.v1":
        return {"text": _logs_text(_text_request("/api/v1/logs"))}
    if operation == "mcps.list.v1":
        return {"mcps": _data(_json_request("/api/v1/mcp-servers"))}
    if operation == "mcps.install.v1":
        return _data(_json_request("/api/v1/mcp-servers", "POST", p))
    if operation == "mcps.delete.v1":
        mcp_id = _require_id(p, "id")
        _json_request("/api/v1/mcp-servers?" + urllib.parse.urlencode({"id": mcp_id}), "DELETE")
        return {"ok": True}
    if operation == "mcps.refresh.v1":
        # The Runtime rejects any body on this route (it is a health-check pass,
        # not a resource write), so the gateway must POST without a payload.
        return {"mcps": _data(_json_request("/api/v1/mcp-health-checks", "POST"))}
    raise ValueError(f"unsupported operation: {operation}")


def gateway_response(body):
    request_id = body.get("requestId", "") if isinstance(body, dict) else ""
    if not isinstance(body, dict) or not isinstance(request_id, str) or not request_id or len(request_id) > 128:
        return _gateway_error(request_id, "incompatible", "Invalid Bibit gateway request")
    if body.get("protocolVersion") != 1 or body.get("serviceId") != "runtime":
        return _gateway_error(request_id, "incompatible", "Unsupported Bibit gateway protocol")
    operation = body.get("operationId")
    params = body.get("params")
    if not _valid_operation(operation) or not isinstance(params, dict):
        return _gateway_error(request_id, "incompatible", "Invalid operation request")
    try:
        result = invoke(operation, params)
        return {"protocolVersion": 1, "requestId": request_id, "ok": True, "result": result}
    except ValueError as exc:
        return _gateway_error(request_id, "incompatible", str(exc))
    except urllib.error.HTTPError as exc:
        code = "unauthorized" if exc.code in {401, 403} else "timeout" if exc.code in {408, 504} else "unavailable" if exc.code in {502, 503} else "unknown"
        return _gateway_error(request_id, code, _runtime_error_message(exc))
    except TimeoutError:
        return _gateway_error(request_id, "timeout", "Runtime service request timed out")
    except (urllib.error.URLError, OSError):
        return _gateway_error(request_id, "offline", "Runtime service is offline")
    except Exception:
        return _gateway_error(request_id, "unavailable", "Runtime service is unavailable")


def _security_gateway_request(body: dict):
    # Bibit uses a plugin-owned service ID; Runtime retains its native bridge ID.
    request = urllib.request.Request(
        SECURITY_BRIDGE_URL,
        data=json.dumps({**body, "serviceId": "security"}).encode(),
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=RUNTIME_TIMEOUT_SECONDS) as response:
        return json.loads(response.read())


def security_gateway_response(body):
    request_id = body.get("requestId", "") if isinstance(body, dict) else ""
    if (
        not isinstance(body, dict)
        or body.get("protocolVersion") != 1
        or body.get("serviceId") != "runtime-security"
        or not isinstance(request_id, str)
        or not request_id
        or len(request_id) > 128
        or not _valid_operation(body.get("operationId"))
        or not isinstance(body.get("params"), dict)
    ):
        return _gateway_error(request_id, "incompatible", "Unsupported Bibit security protocol")
    try:
        # Preserve audit limit/cursor/snapshot and page metadata unchanged; never
        # aggregate pages or substitute an export for an interactive list query.
        return _security_gateway_request(body)
    except TimeoutError:
        return _gateway_error(request_id, "timeout", "Security service request timed out")
    except (urllib.error.URLError, OSError):
        return _gateway_error(request_id, "offline", "Security service is offline")
    except Exception:
        return _gateway_error(request_id, "unavailable", "Security service is unavailable")


def _runtime_error_message(exc: urllib.error.HTTPError) -> str:
    try:
        payload = json.loads(exc.read())
    except Exception:
        return "Runtime service request failed"
    if isinstance(payload, dict):
        error = payload.get("error")
        if isinstance(error, dict) and isinstance(error.get("message"), str):
            return error["message"]
    return "Runtime service request failed"


def _logs_text(value: str) -> str:
    lines = []
    for line in value.splitlines():
        if not line.startswith("data:"):
            continue
        payload = line.removeprefix("data:").strip()
        try:
            event = json.loads(payload)
        except json.JSONDecodeError:
            lines.append(payload)
            continue
        if isinstance(event, dict) and isinstance(event.get("content"), str):
            lines.append(event["content"])
        else:
            lines.append(payload)
    return "\n".join(lines)


def _gateway_error(request_id: str, code: str, message: str):
    return {
        "protocolVersion": 1,
        "requestId": request_id,
        "ok": False,
        "error": {
            "code": code,
            "message": message,
            "retryable": code in {"offline", "timeout", "unavailable"},
        },
    }


def _valid_operation(value):
    return (
        isinstance(value, str)
        and 0 < len(value) <= 128
        and "." in value
        and all(character.isascii() and (character.isalnum() or character in "._-") for character in value)
    )


def _require_id(values: dict, key: str) -> str:
    value = values.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{key} is required")
    return value.strip()


def _quote(value: str) -> str:
    return urllib.parse.quote(value, safe="")


class Handler(BaseHTTPRequestHandler):
    def _send(self, status, value, content_type="application/json"):
        data = value if isinstance(value, bytes) else json.dumps(value, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path
        if path == "/":
            index = ROOT / "index.html"
            if index.is_file():
                return self._send(200, index.read_bytes(), "text/html")
        if path.startswith("/assets/"):
            file = ROOT / path.removeprefix("/")
            if file.is_file():
                return self._send(200, file.read_bytes(), "text/css" if file.suffix == ".css" else "application/javascript")
        self._send(404, {"error": "not found"})

    def do_POST(self):
        if self.path not in {"/bibit/v1/invoke", "/runtime-api/invoke", "/security-api/invoke"}:
            return self._send(404, {"error": "not found"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            body = {} if length < 0 or length > MAX_REQUEST_BYTES else json.loads(self.rfile.read(length))
        except (json.JSONDecodeError, TypeError, ValueError):
            body = {}
        response = security_gateway_response(body) if self.path == "/security-api/invoke" or isinstance(body, dict) and body.get("serviceId") == "runtime-security" else gateway_response(body)
        return self._send(200, response)


if __name__ == "__main__":
    ThreadingHTTPServer((os.environ.get("BIND_HOST", "127.0.0.1"), int(os.environ.get("PORT", "5186"))), Handler).serve_forever()
