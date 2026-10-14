import io
import json
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

from deploy import real_runtime_proxy as proxy


class RuntimeAdapterUnitTest(unittest.TestCase):
    """The installed unit must survive a stray kill of the development preview.

    docs/plugin-development.md tells developers to run (and then stop)
    deploy/real_runtime_proxy.py by hand. That is the same script the packaged
    unit executes, so a `pkill -f real_runtime_proxy.py` reaches the unit's
    process as SIGTERM. systemd counts SIGTERM as a clean exit, which
    `Restart=on-failure` does not recover from: every Runtime page in Bi-bit
    then reports the service as offline until someone restarts the unit.
    """

    def setUp(self):
        self.unit = (
            Path(__file__).resolve().parents[1] / "deploy" / "bibit-runtime-adapter.service"
        ).read_text()

    def test_restarts_after_a_stray_sigterm(self):
        self.assertIn("Restart=always", self.unit)
        self.assertNotIn("Restart=on-failure", self.unit)

    def test_runs_the_packaged_adapter_on_the_documented_port(self):
        self.assertIn(
            "ExecStart=/usr/bin/python3 /usr/lib/bibit-runtime-plugin/real_runtime_proxy.py",
            self.unit,
        )
        self.assertIn("Environment=PORT=5186", self.unit)

    def test_depends_on_the_single_instance_runtime_service(self):
        # The Runtime is a system-wide single-instance unit (bianbu-agent-runtime.service),
        # not a per-user @.service template. The adapter must order after it so it starts
        # only once the device user and control plane exist.
        self.assertIn("After=network.target bianbu-agent-runtime.service", self.unit)
        self.assertIn("Wants=bianbu-agent-runtime.service", self.unit)
        self.assertNotIn("bianbu-agent-runtime@%i.service", self.unit)


class RuntimeAdapterTest(unittest.TestCase):
    def test_security_audit_preserves_pagination_contract(self):
        body = {"protocolVersion": 1, "requestId": "audit-page", "serviceId": "runtime-security",
                "operationId": "audit.query.v1", "params": {"agent_id": "a", "filter": "deny",
                    "limit": 100, "cursor": 151, "snapshot_seq": 250}}
        page = {"protocolVersion": 1, "requestId": "audit-page", "ok": True, "result": {
            "records": [{"seq": 150}], "snapshot_seq": 250, "has_more": True, "next_cursor": 150}}
        with patch.object(proxy.urllib.request, "urlopen", return_value=io.BytesIO(json.dumps(page).encode())) as upstream:
            self.assertEqual(proxy.security_gateway_response(body), page)
        forwarded = json.loads(upstream.call_args.args[0].data)
        self.assertEqual(forwarded, {**body, "serviceId": "security"})

    def setUp(self):
        proxy.RUNTIME_BASE_URL = "http://127.0.0.1:9899"

    def test_agent_plugin_selection_is_forwarded_without_member_expansion(self):
        payload = {"plugins": ["bianbu.bibit.intent"], "tools": [], "skills": [], "mcps": []}
        with patch.object(proxy, "_json_request", return_value={"data": payload}) as request:
            result = proxy.gateway_response(_body("agents.update.v1", {"agent_id": "expert", **payload}))
            request.assert_called_once_with("/api/v1/agents/expert", "PATCH", payload)
            self.assertEqual(result["result"]["plugins"], payload["plugins"])

    def test_gateway_maps_runtime_operations_to_versioned_api(self):
        calls = []

        def fake_request(path, method="GET", payload=None):
            calls.append((path, method, payload))
            if path == "/api/v1/runtime/status":
                return {"data": {"status": "AGENT_READY"}}
            if path == "/api/v1/settings" and method == "GET":
                return {"data": {"deployment": {"language": "zh"}, "runtime": {}}}
            if path == "/api/v1/settings" and method == "PATCH":
                return {"data": {"deployment": {"language": "en"}, "runtime": {}}}
            if path == "/api/v1/providers":
                return {"data": [{"id": "openai", "configured": True}]}
            raise AssertionError(f"unexpected request: {path} {method}")

        with patch.object(proxy, "_json_request", side_effect=fake_request):
            self.assertEqual(
                proxy.gateway_response(
                    _body("status.get.v1", {})
                )["result"],
                {"status": "AGENT_READY"},
            )
            self.assertEqual(
                proxy.gateway_response(
                    _body("settings.get.v1", {})
                )["result"]["deployment"]["language"],
                "zh",
            )
            self.assertEqual(
                proxy.gateway_response(
                    _body("settings.update.v1", {"deployment": {"language": "en"}})
                )["result"]["deployment"]["language"],
                "en",
            )
            self.assertEqual(
                proxy.gateway_response(
                    _body("providers.list.v1", {})
                )["result"]["providers"][0]["id"],
                "openai",
            )

        self.assertEqual(
            calls,
            [
                ("/api/v1/runtime/status", "GET", None),
                ("/api/v1/settings", "GET", None),
                ("/api/v1/settings", "PATCH", {"deployment": {"language": "en"}}),
                ("/api/v1/providers", "GET", None),
            ],
        )

    def test_runtime_workers_use_current_runtime_workers_endpoint(self):
        with patch.object(proxy, "_json_request", return_value={"data": {"workers": [{"agent_id": "worker"}]}}) as request:
            response = proxy.gateway_response(_body("workers.get.v1", {}))
        self.assertTrue(response["ok"])
        self.assertEqual(response["result"]["workers"][0]["agent_id"], "worker")
        request.assert_called_once_with("/api/v1/runtime/workers")

    def test_avatar_transport_validates_limits_and_builds_multipart(self):
        import base64
        from email.message import Message
        from unittest.mock import MagicMock
        response = MagicMock()
        response.__enter__.return_value = response
        response.read.return_value = b'{"data":{"id":"expert"}}'
        with patch.object(proxy.urllib.request, "urlopen", return_value=response) as urlopen:
            result = proxy.invoke("agents.avatar.upload.v1", {"agent_id":"a/b", "media_type":"image/png", "base64":base64.b64encode(b"image-bytes").decode()})
            self.assertEqual(result, {"id":"expert"})
            request = urlopen.call_args.args[0]
            self.assertTrue(request.full_url.endswith("/a%2Fb/avatar"))
            self.assertIn(b'name="file"', request.data)
            self.assertIn(b"image-bytes", request.data)
            self.assertTrue(request.get_header("Content-type").startswith("multipart/form-data; boundary="))
        for params in [{"media_type":"image/svg+xml", "base64":"YQ=="}, {"media_type":"image/png", "base64":"!"}, {"media_type":"image/png", "base64":base64.b64encode(b"x" * (proxy.MAX_AVATAR_BYTES + 1)).decode()}]:
            with self.assertRaises(ValueError):
                proxy.invoke("agents.avatar.upload.v1", {"agent_id":"expert", **params})
        headers = Message()
        headers["Content-Type"] = "image/png"
        response.headers = headers
        response.read.return_value = b"png-bytes"
        with patch.object(proxy.urllib.request, "urlopen", return_value=response):
            self.assertEqual(proxy.invoke("agents.avatar.get.v1", {"agent_id":"expert"}), {"media_type":"image/png", "base64":base64.b64encode(b"png-bytes").decode()})
            response.read.assert_called_with(proxy.MAX_AVATAR_BYTES + 1)
        with patch.object(proxy, "_json_request", return_value={}) as delete:
            self.assertEqual(proxy.invoke("agents.avatar.delete.v1", {"agent_id":"expert"}), {"ok":True})
            delete.assert_called_once_with("/api/v1/agents/expert/avatar", "DELETE")

    def test_gateway_rejects_unknown_operations(self):
        response = proxy.gateway_response(_body("unknown.operation.v1", {}))

        self.assertFalse(response["ok"])
        self.assertEqual(response["error"]["code"], "incompatible")

    def test_gateway_maps_console_inventory_operations(self):
        calls = []

        def fake_request(path, method="GET", payload=None):
            calls.append((path, method, payload))
            return {"data": {"path": path, "method": method, "payload": payload}}

        with patch.object(proxy, "_json_request", side_effect=fake_request):
            operations = [
                ("capabilities.list.v1", {"kind": "tool"}),
                ("packages.list.v1", {"kind": "agent"}),
                ("packages.get.v1", {"kind": "agent", "package_id": "pkg one"}),
                ("packages.install.v1", {"kind": "agent", "path": "/tmp/demo.agent"}),
                ("packages.verify.v1", {"kind": "agent", "package_id": "pkg one"}),
                ("packages.delete.v1", {"kind": "agent", "package_id": "pkg one"}),
                ("plugins.list.v1", {}),
                ("plugins.effective.v1", {}),
                ("plugins.get.v1", {"plugin_id": "demo.plugin"}),
                ("plugins.install.v1", {"source": "/tmp/demo-plugin.zip"}),
                ("plugins.delete.v1", {"plugin_id": "demo.plugin"}),
                ("plugins.rollback.v1", {"plugin_id": "demo.plugin"}),
                ("localModels.get.v1", {}),
                ("agents.restart.v1", {"agent_id": "worker one"}),
                ("executions.list.v1", {}),
                ("executions.get.v1", {"instance_id": "worker one"}),
                ("executions.stop.v1", {"instance_id": "worker one", "reason": "manual"}),
                ("agents.revoke.v1", {"agent_id": "demo-agent"}),
                ("agentTop.get.v1", {}),
            ]

            for operation, params in operations:
                self.assertTrue(proxy.gateway_response(_body(operation, params))["ok"])

        self.assertEqual(
            calls,
            [
                ("/api/v1/capabilities/tool", "GET", None),
                ("/api/v1/packages/agent", "GET", None),
                ("/api/v1/packages/agent/pkg%20one", "GET", None),
                ("/api/v1/packages/agent", "POST", {"path": "/tmp/demo.agent"}),
                ("/api/v1/packages/agent/pkg%20one/verify", "POST", {}),
                ("/api/v1/packages/agent/pkg%20one", "DELETE", None),
                ("/api/v1/plugins", "GET", None),
                ("/api/v1/plugins/effective", "GET", None),
                ("/api/v1/plugins/demo.plugin", "GET", None),
                ("/api/v1/plugins", "POST", {"source": "/tmp/demo-plugin.zip"}),
                ("/api/v1/plugins/demo.plugin", "DELETE", None),
                ("/api/v1/plugins/demo.plugin/rollback", "POST", {}),
                ("/api/v1/local-models", "GET", None),
                ("/api/v1/agents/worker%20one/restart", "POST", {}),
                ("/api/v1/executions", "GET", None),
                ("/api/v1/executions/worker%20one", "GET", None),
                ("/api/v1/executions/worker%20one/stop", "POST", {"reason": "manual"}),
                ("/api/v1/agents/demo-agent/revoke", "POST", {}),
                ("/api/v1/agent-top", "GET", None),
            ],
        )

    def test_mcp_health_check_is_posted_without_a_body(self):
        # Runtime 的 /api/v1/mcp-health-checks 是「现在跑一遍体检」，路由本身
        # 带 _require_empty_body：网关过去塞了 {} ，每次刷新都被 422 拒绝，
        # 界面上看起来像体检成功但没有结果。
        with patch.object(proxy, "_json_request", return_value={"data": [{"id": "demo", "status": "running"}]}) as request:
            response = proxy.gateway_response(_body("mcps.refresh.v1", {}))

        self.assertTrue(response["ok"])
        self.assertEqual(response["result"]["mcps"], [{"id": "demo", "status": "running"}])
        request.assert_called_once_with("/api/v1/mcp-health-checks", "POST")

    def test_gateway_waits_longer_than_the_host_default_for_catalog_mutations(self):
        # 装/卸/刷新 MCP 会重建整代 Worker，每台 MCP 都要重启一次：30s 的宿主预算
        # 会把「其实已经做完」的变更报成超时，页面于是停在旧快照上等用户手点刷新。
        self.assertEqual(proxy.RUNTIME_TIMEOUT_SECONDS, 180.0)
        response = MagicMock()
        response.__enter__.return_value = response
        response.read.return_value = b'{"data":[]}'
        with patch.object(proxy.urllib.request, "urlopen", return_value=response) as urlopen:
            proxy._json_request("/api/v1/mcp-servers")

        self.assertEqual(urlopen.call_args.kwargs["timeout"], 180.0)

    def test_gateway_reads_runtime_logs_as_sse_text(self):
        sse = (
            'id: 1\n'
            'data: {"type":"log","content":"Runtime started"}\n\n'
            'id: 2\n'
            'data: {"type":"log","content":"Worker ready"}\n\n'
        )

        with patch.object(proxy, "_text_request", return_value=sse) as request:
            response = proxy.gateway_response(_body("logs.get.v1", {}))

        self.assertTrue(response["ok"])
        self.assertEqual(response["result"], {"text": "Runtime started\nWorker ready"})
        request.assert_called_once_with("/api/v1/logs")

    def test_security_gateway_forwards_independent_security_service_request(self):
        body = _body("syscall-policy.get.v1", {"agent_id": "demo", "arch": "riscv64"})
        body["serviceId"] = "runtime-security"
        expected = {"protocolVersion": 1, "requestId": "test-request", "ok": True, "result": {"agent_additions": []}}

        with patch.object(proxy, "_security_gateway_request", return_value=expected) as request:
            response = proxy.security_gateway_response(body)

        self.assertEqual(response, expected)
        request.assert_called_once_with(body)

    def test_security_bridge_translates_only_the_service_id(self):
        body = _body("agents.list.v1", {})
        body["serviceId"] = "runtime-security"
        expected = {"protocolVersion": 1, "requestId": body["requestId"], "ok": True, "result": {"agents": []}}
        with patch.object(proxy.urllib.request, "urlopen") as urlopen:
            urlopen.return_value.__enter__.return_value.read.return_value = json.dumps(expected).encode()
            response = proxy.security_gateway_response(body)
        self.assertEqual(response, expected)
        sent = urlopen.call_args.args[0]
        self.assertEqual(sent.full_url, proxy.SECURITY_BRIDGE_URL)
        self.assertEqual(json.loads(sent.data), {**body, "serviceId": "security"})
        self.assertEqual(body["serviceId"], "runtime-security")

    def test_network_apply_status_is_forwarded_without_claiming_effective(self):
        body = _body("network-policy.update.v1", {"agent_id": "test", "mode": "learning", "domains": []})
        body["serviceId"] = "runtime-security"
        result = {"mode": "learning", "domains": [], "apply": {"effective": False, "restart_required": True}}
        expected = {"protocolVersion": 1, "requestId": body["requestId"], "ok": True, "result": result}
        with patch.object(proxy.urllib.request, "urlopen") as urlopen:
            urlopen.return_value.__enter__.return_value.read.return_value = json.dumps(expected).encode()
            self.assertEqual(proxy.security_gateway_response(body), expected)
            self.assertEqual(json.loads(urlopen.call_args.args[0].data)["params"], body["params"])

    def test_network_access_records_and_status_are_forwarded(self):
        for operation, result in [
            ("network-learning.events.v1", {"events": [{"event_type": "dns_query", "domain": "observed.test"}]}),
            ("network-learning.status.v1", {"state": "active"}),
        ]:
            body = _body(operation, {"agent_id": "test"})
            body["serviceId"] = "runtime-security"
            expected = {"protocolVersion": 1, "requestId": body["requestId"], "ok": True, "result": result}
            with patch.object(proxy.urllib.request, "urlopen") as urlopen:
                urlopen.return_value.__enter__.return_value.read.return_value = json.dumps(expected).encode()
                self.assertEqual(proxy.security_gateway_response(body), expected)
                self.assertEqual(json.loads(urlopen.call_args.args[0].data)["operationId"], operation)

    def test_security_gateway_rejects_shared_security_service(self):
        body = _body("agents.list.v1", {})
        body["serviceId"] = "security"
        with patch.object(proxy, "_security_gateway_request") as request:
            response = proxy.security_gateway_response(body)
        request.assert_not_called()
        self.assertEqual(response["error"]["code"], "incompatible")

    def test_security_gateway_rejects_runtime_service_without_forwarding(self):
        with patch.object(proxy, "_security_gateway_request") as request:
            response = proxy.security_gateway_response(_body("status.get.v1", {}))

        request.assert_not_called()
        self.assertEqual(response["error"]["code"], "incompatible")

    def test_http_handler_routes_isolated_security_service_on_both_entrypoints(self):
        for path in ("/bibit/v1/invoke", "/security-api/invoke"):
            with self.subTest(path=path):
                body = _body("agents.list.v1", {})
                body["serviceId"] = "runtime-security"
                data = json.dumps(body).encode()
                sent = []
                handler = type("FakeHandler", (), {
                    "path": path,
                    "headers": {"Content-Length": str(len(data))},
                    "rfile": io.BytesIO(data),
                    "_send": lambda self, status, value: sent.append((status, value)),
                })()
                expected = {"protocolVersion": 1, "requestId": body["requestId"], "ok": True, "result": {"agents": []}}
                with patch.object(proxy.urllib.request, "urlopen") as urlopen:
                    urlopen.return_value.__enter__.return_value.read.return_value = json.dumps(expected).encode()
                    proxy.Handler.do_POST(handler)
                self.assertEqual(sent, [(200, expected)])
                self.assertEqual(json.loads(urlopen.call_args.args[0].data), {**body, "serviceId": "security"})

    def test_http_handler_rejects_non_object_json_without_crashing(self):
        sent = []
        handler = type("FakeHandler", (), {
            "path": "/bibit/v1/invoke",
            "headers": {"Content-Length": "2"},
            "rfile": io.BytesIO(b"[]"),
            "_send": lambda self, status, value: sent.append((status, value)),
        })()

        proxy.Handler.do_POST(handler)

        self.assertEqual(sent[0][0], 200)
        self.assertEqual(sent[0][1]["error"]["code"], "incompatible")


def _body(operation, params):
    return {
        "protocolVersion": 1,
        "requestId": "test-request",
        "serviceId": "runtime",
        "operationId": operation,
        "params": params,
    }


if __name__ == "__main__":
    unittest.main()
