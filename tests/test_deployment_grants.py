import json
from pathlib import Path
import unittest


class DeploymentGrantsTest(unittest.TestCase):
    def test_agent_writes_declare_no_token_quota_business_object(self):
        root = Path(__file__).resolve().parents[1]
        runtime = json.loads((root / "deploy/runtime.json").read_text())["services"]["runtime"]
        # Token quotas are gone; the only narrow business-object grants left are
        # provider credentials, and agent writes must not resurrect the retired
        # /permissions/resource_limits/tokens target.
        self.assertEqual(runtime.get("businessObjectParameters"), None)

    def test_registry_grants_catalog_mutations_the_same_budget_as_the_gateway(self):
        root = Path(__file__).resolve().parents[1]
        runtime = json.loads((root / "deploy/runtime.json").read_text())["services"]["runtime"]
        # 装/卸/刷新要重建整代 Worker（每台 MCP 各花各的启动预算），宿主 30s 的默认
        # 预算会把已经做完的变更报成超时，页面于是停在旧快照上要求手点刷新。
        self.assertGreaterEqual(runtime["requestTimeoutMs"], 180000)

    def test_services_are_authorized_for_the_runtime_feature(self):
        root = Path(__file__).resolve().parents[1]
        manifest = json.loads((root / "bibit.feature.json").read_text())
        grants = json.loads((root / "deploy/feature-capability-grants-runtime.json").read_text())
        services = json.loads((root / "deploy/runtime.json").read_text())["services"]
        # Host contract: serviceOperations[featureId][serviceId], with an
        # explicit service:<id> capability for every operation grant.
        self.assertEqual(set(grants["serviceOperations"]), {manifest["id"]})
        for feature_id, operations in grants["serviceOperations"].items():
            for service_id, allowed in operations.items():
                with self.subTest(service=service_id):
                    capability = f"service:{service_id}"
                    self.assertIn(capability, grants["features"][feature_id])
                    self.assertIn(capability, manifest["requiredHostCapabilities"])
                    self.assertIn(service_id, services)
                    self.assertTrue(allowed)
                    self.assertEqual(len(allowed), len(set(allowed)))
        self.assertEqual(set(grants["serviceOperations"][manifest["id"]]), {"runtime", "runtime-security"})

    def test_grant_covers_every_capability_the_manifest_requires(self):
        root = Path(__file__).resolve().parents[1]
        manifest = json.loads((root / "bibit.feature.json").read_text())
        grants = json.loads((root / "deploy/feature-capability-grants-runtime.json").read_text())
        # The host only hands a feature the capabilities it both declares and is
        # granted. A declared-but-ungranted entry silently disables the surface
        # that needs it: host:actions was missing here, so package installs left
        # the experts page "Use expert" button greyed out.
        self.assertLessEqual(set(manifest["requiredHostCapabilities"]),
                             set(grants["features"][manifest["id"]]))
        self.assertIn("host:actions", grants["features"][manifest["id"]])

    def test_packaging_installs_the_bundle_for_the_manifest_version(self):
        root = Path(__file__).resolve().parents[1]
        rules = (root / "debian/rules").read_text()
        manifest = json.loads((root / "bibit.feature.json").read_text())
        # 0.1.31 failed in the pipeline because debian/rules still installed
        # runtime-0.2.27 while the build produced runtime-0.2.28. Deriving the
        # name from the manifest is what keeps the two from drifting apart.
        self.assertIn("artifacts/runtime-$(PLUGIN_VERSION).bibit-plugin.tgz", rules)
        self.assertNotRegex(rules, r"artifacts/runtime-\d+\.\d+\.\d+\.bibit-plugin\.tgz")
        self.assertTrue(manifest["version"])

    def test_security_plugin_registry_cannot_redirect_runtime_security(self):
        root = Path(__file__).resolve().parents[1]
        services = json.loads((root / "deploy/runtime.json").read_text())["services"]
        # The host merges sorted files: security.json follows runtime.json.
        services.update({"security": {"baseUrl": "http://127.0.0.1:5185"}})
        self.assertEqual(services["runtime-security"]["baseUrl"], "http://127.0.0.1:5186")
        self.assertEqual(services["security"]["baseUrl"], "http://127.0.0.1:5185")
