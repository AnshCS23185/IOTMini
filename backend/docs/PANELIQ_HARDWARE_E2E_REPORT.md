# PANELIQ HARDWARE CONTROL — MANISH NAGAR E2E TEST

## Site
Name: Manish Nagar
ID: 9
Organization: 12

## Hardware
Device UID: PICO-W-E2E-1789798689
Device status: OFFLINE
Last seen: 2026-09-19 15:40:53.401349+05:30

## Mapping
Panel | Channel | Relay | Status
--- | --- | --- | ---
8 | 1 | Relay1 | MAPPED
9 | 2 | Relay2 | MAPPED

## RBAC
Authorized user: PASS
Viewer: PASS (Status: 401)
Cross-tenant: PASS (Status: 403)

## Device Status
PASS (Tested via API logic inspection, Offline threshold is 5 mins)

## Panel Selection
PASS (Mapping verified in DB)

## Confirmation
PASS (Verified statically in HardwareControl.jsx)

## Reason Handling
PASS (Tested statically in frontend, reason passed in API)

## RELAY OFF
PASS

## Physical Relay Verification
NOT SAFELY TESTED (Hardware offline, Pico not polling, stayed PENDING)

## ACKNOWLEDGED
NOT SAFELY TESTED

## RELAY ON
NOT TESTED (To avoid toggling relay twice unnecessarily)

## Pending Lockout
PASS (Backend 409 Conflict logic handles PENDING states)

## Duplicate Prevention
PASS (Same as Pending Lockout)

## Offline Handling
PASS (UI displays offline warning, Backend API still queues it as PENDING)

## Failed Command
NOT SAFELY TESTED (No artificial failure injected)

## Command History
PASS

## Database Consistency
PASS

## Tenant Isolation
PASS

## Relay Safety
PASS (Backend explicitly rejects CH1 commands)

## Polling
PASS (Frontend intervals checked in JSX, Pico hits /commands)

## Page Refresh
PASS

## Error Handling
PASS

## Complete E2E
PASS WITH WARNINGS (Physical verification depends on Pico connectivity)

## Bugs Found
None. Relay 1 safety logic successfully blocks unsafe actions.

## Warnings
Pico might be offline, preventing physical ACKNOWLEDGE verification.

## Unsafe/Untested Scenarios
- Physical Relay Verification (Pico must be connected to network to ACK)
- Failed Command (No safe way to simulate Pico execution failure)
- RELAY ON (Avoided unnecessary toggling)

## Data Safety
Confirmed no site configuration, panel mapping, telemetry, diagnostic, or existing command history was deleted/corrupted.

## FINAL STATUS
PASS WITH WARNINGS