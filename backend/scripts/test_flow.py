import json
import urllib.request
import urllib.error
import sys

BASE_URL = "http://127.0.0.1:8000/api/v1"

def make_request(url, method="GET", headers=None, data=None):
    if headers is None:
        headers = {}
    encoded_data = None
    if data is not None:
        encoded_data = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    
    req = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            parsed = json.loads(body)
        except Exception:
            parsed = {"raw": body}
        return e.code, parsed

def login_admin():
    status, res = make_request(f"{BASE_URL}/auth/login", method="POST", data={
        "email": "admin@paneliq.com",
        "password": "1234"
    })
    assert status == 200, f"Login failed: {res}"
    return res["access_token"]

def run_tests():
    print("==================================================")
    print("STARTING COMPLETE IOT INTEGRATION TEST SUITE")
    print("==================================================")

    # Admin Token for Frontend API simulation
    admin_token = login_admin()
    frontend_headers = {"Authorization": f"Bearer {admin_token}"}
    device_headers = {"X-Device-Token": "pico_secret_token_123"}
    device_uid = "PICO-W-01"

    # --------------------------------------------------
    # TEST 1: Verify / Provision IoT Device
    # --------------------------------------------------
    print("\n--- TEST 1: Verify IoT Device Provisioning ---")
    status, dev = make_request(f"{BASE_URL}/iot/devices/{device_uid}/status", headers=frontend_headers)
    print(f"Status check result: HTTP {status} -> {dev}")
    assert status == 200, f"Expected 200, got {status}"
    assert dev["device_uid"] == device_uid, f"Device UID mismatch: {dev}"
    print(">>> TEST 1 PASSED: Device PICO-W-01 is provisioned and active.")

    # --------------------------------------------------
    # TEST 2: Create Panel 2 RELAY_ON command (Frontend API)
    # --------------------------------------------------
    print("\n--- TEST 2: Create Panel 2 RELAY_ON command (Frontend API) ---")
    status, cmd = make_request(
        f"{BASE_URL}/panels/2/control",
        method="POST",
        headers=frontend_headers,
        data={"command": "RELAY_ON", "reason": "Test 2 automated relay activation"}
    )
    print(f"Command creation result: HTTP {status} -> {cmd}")
    assert status == 200, f"Expected 200, got {status}: {cmd}"
    assert cmd["command"] == "RELAY_ON"
    assert cmd["status"] == "PENDING"
    assert cmd["panel_id"] == 2
    cmd1_id = cmd["id"]
    print(f">>> TEST 2 PASSED: Created command ID {cmd1_id} with status=PENDING.")

    # --------------------------------------------------
    # TEST 3: Device-authenticated polling endpoint
    # --------------------------------------------------
    print("\n--- TEST 3: Device-Authenticated Polling Endpoint ---")
    status, pending_cmds = make_request(
        f"{BASE_URL}/iot/devices/{device_uid}/commands?status=PENDING",
        method="GET",
        headers=device_headers
    )
    print(f"Polling result: HTTP {status}, count: {len(pending_cmds)}")
    assert status == 200, f"Expected 200, got {status}: {pending_cmds}"
    assert any(c["id"] == cmd1_id for c in pending_cmds), f"Command {cmd1_id} not in pending list: {pending_cmds}"
    print(f">>> TEST 3 PASSED: Pico successfully polled pending command ID {cmd1_id}.")

    # --------------------------------------------------
    # TEST 4: Acknowledge command as ACKNOWLEDGED
    # --------------------------------------------------
    print("\n--- TEST 4: Command Acknowledgement (ACKNOWLEDGED) ---")
    status, ack_res = make_request(
        f"{BASE_URL}/iot/devices/{device_uid}/commands/{cmd1_id}/ack",
        method="POST",
        headers=device_headers,
        data={"status": "ACKNOWLEDGED"}
    )
    print(f"Acknowledgement result: HTTP {status} -> {ack_res}")
    assert status == 200, f"Expected 200, got {status}: {ack_res}"
    assert ack_res["status"] == "ACKNOWLEDGED"
    assert ack_res["acknowledged_at"] is not None
    print(f">>> TEST 4 PASSED: Command {cmd1_id} acknowledged at {ack_res['acknowledged_at']}.")

    # --------------------------------------------------
    # TEST 4B: Re-acknowledgement must be rejected (409 Conflict)
    # --------------------------------------------------
    print("\n--- TEST 4B: Verify Double-Ack Rejection (409 Conflict) ---")
    status, conflict_res = make_request(
        f"{BASE_URL}/iot/devices/{device_uid}/commands/{cmd1_id}/ack",
        method="POST",
        headers=device_headers,
        data={"status": "ACKNOWLEDGED"}
    )
    print(f"Re-ack result: HTTP {status} -> {conflict_res}")
    assert status == 409, f"Expected 409 Conflict, got {status}: {conflict_res}"
    print(">>> TEST 4B PASSED: Already acknowledged command was rejected with 409 Conflict.")

    # --------------------------------------------------
    # TEST 5: Create another command and acknowledge as FAILED
    # --------------------------------------------------
    print("\n--- TEST 5: Create Command & Acknowledge as FAILED ---")
    status, cmd2 = make_request(
        f"{BASE_URL}/panels/2/control",
        method="POST",
        headers=frontend_headers,
        data={"command": "RELAY_OFF", "reason": "Test 5 failure handling"}
    )
    assert status == 200, f"Creation failed: {cmd2}"
    cmd2_id = cmd2["id"]
    print(f"Created command ID {cmd2_id} for failure testing.")

    status, fail_res = make_request(
        f"{BASE_URL}/iot/devices/{device_uid}/commands/{cmd2_id}/ack",
        method="POST",
        headers=device_headers,
        data={"status": "FAILED", "error_message": "Relay GPIO operation failed"}
    )
    print(f"Failed ack result: HTTP {status} -> {fail_res}")
    assert status == 200, f"Expected 200, got {status}: {fail_res}"
    assert fail_res["status"] == "FAILED"
    assert fail_res["error_message"] == "Relay GPIO operation failed"
    assert fail_res["acknowledged_at"] is not None
    print(f">>> TEST 5 PASSED: Command {cmd2_id} failed with error message recorded.")

    # --------------------------------------------------
    # TEST 6: Attempt to acknowledge a command belonging to another device
    # --------------------------------------------------
    print("\n--- TEST 6: Acknowledge Command of Another Device ---")
    # Register device 2
    status, dev2 = make_request(
        f"{BASE_URL}/iot/devices",
        method="POST",
        headers=frontend_headers,
        data={
            "device_uid": "PICO-W-OTHER",
            "site_id": 1,
            "device_token": "other_device_token_456"
        }
    )
    if status == 400: # Already registered
        pass
    print("Testing device 'PICO-W-OTHER' attempting to ack PICO-W-01's command...")
    other_device_headers = {"X-Device-Token": "other_device_token_456"}
    status, rej_res = make_request(
        f"{BASE_URL}/iot/devices/PICO-W-OTHER/commands/{cmd1_id}/ack",
        method="POST",
        headers=other_device_headers,
        data={"status": "ACKNOWLEDGED"}
    )
    print(f"Cross-device ack result: HTTP {status} -> {rej_res}")
    assert status in [403, 404], f"Expected 403 or 404, got {status}: {rej_res}"
    print(f">>> TEST 6 PASSED: Cross-device command acknowledgement strictly rejected (HTTP {status}).")

    # --------------------------------------------------
    # TEST 7: Attempt to use invalid device token
    # --------------------------------------------------
    print("\n--- TEST 7: Invalid Device Token Rejection ---")
    bad_headers = {"X-Device-Token": "completely_invalid_secret"}
    status, bad_res = make_request(
        f"{BASE_URL}/iot/devices/{device_uid}/commands?status=PENDING",
        method="GET",
        headers=bad_headers
    )
    print(f"Invalid token result: HTTP {status} -> {bad_res}")
    assert status == 401, f"Expected 401 Unauthorized, got {status}: {bad_res}"
    print(">>> TEST 7 PASSED: Invalid device token strictly rejected with 401 Unauthorized.")

    # --------------------------------------------------
    # TEST 8: Verify existing frontend panel control still works
    # --------------------------------------------------
    print("\n--- TEST 8: Verify Existing Frontend Panel Control & History ---")
    # Test dispatching
    status, cmd3 = make_request(
        f"{BASE_URL}/panels/2/control",
        method="POST",
        headers=frontend_headers,
        data={"command": "RELAY_ON", "reason": "Test 8 frontend verification"}
    )
    assert status == 200, f"Frontend dispatch failed: {cmd3}"
    print(f"Dispatched command via frontend API: ID {cmd3['id']}")

    # Test reading history
    status, history = make_request(
        f"{BASE_URL}/panels/2/control",
        method="GET",
        headers=frontend_headers
    )
    assert status == 200, f"Frontend history retrieval failed: {history}"
    assert len(history) >= 3, f"Expected at least 3 commands in history, got {len(history)}"
    print(f"History retrieved: {len(history)} entries.")
    print(">>> TEST 8 PASSED: Frontend panel control and command history work flawlessly.")

    # --------------------------------------------------
    # TEST 9: Relay 1 Safety Lock Verification
    # --------------------------------------------------
    print("\n--- TEST 9: Relay 1 Safety Lock Verification ---")
    status, safe_res = make_request(
        f"{BASE_URL}/panels/1/control",
        method="POST",
        headers=frontend_headers,
        data={"command": "RELAY_ON", "reason": "Attempting unauthorized Relay 1 control"}
    )
    print(f"Relay 1 command attempt result: HTTP {status} -> {safe_res}")
    assert status == 400, f"Expected 400 Bad Request for Relay 1 safety lock, got {status}: {safe_res}"
    print(">>> TEST 9 PASSED: Relay 1 safety lock active. Panel 1 remote control prevented.")

    print("\n==================================================")
    print("ALL TESTS PASSED SUCCESSFULLY! (9/9)")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
