# PanelIQ Hardware Control Mechanism Audit

This document serves as a comprehensive technical audit of the **Hardware Control** module within the PanelIQ system, detailing its mechanisms, safety features, and data flow.

## 1. Core Purpose
The Hardware Control page (`HardwareControl.jsx`) bridges the gap between the cloud dashboard and the physical solar arrays. It allows authorized operators to dispatch manual commands (e.g., `RELAY_ON`, `RELAY_OFF`) to specific IoT microcontrollers attached to the solar panels, bypassing automated systems for maintenance or emergency overrides.

## 2. Security and Access Control (RBAC)
Hardware manipulation is highly sensitive. The UI natively enforces strict Role-Based Access Control (RBAC):
- **Admins & Users (`canControl = true`)**: Are permitted to submit hardware commands.
- **Viewers (`canControl = false`)**: The interface degrades gracefully into a **Read-Only** mode. Inputs are disabled, and command buttons are locked, ensuring viewers can observe the hardware status and command history without the ability to manipulate the physical relays.

## 3. Real-Time Hardware Context
Before any command can be sent, the system establishes a secure context with the physical device.
- **Device Registration**: The system looks up the `device_uid` mapped to the selected solar panel. If no IoT hardware is provisioned, the controls remain locked.
- **Live Status Polling**: The frontend aggressively polls the backend every **5 seconds** to check if the IoT device is `ONLINE` or `OFFLINE` based on its last MQTT heartbeat (`last_seen`).
- **Offline Safeguard**: If the device drops offline, the UI instantly throws a prominent `DEVICE IS OFFLINE` warning. It warns the operator that while commands can still be queued by the backend, they will likely time out or remain pending until the hardware reconnects.

## 4. Command Dispatch Mechanism
The command dispatch pipeline is heavily fortified against accidental or rapid-fire actions:
1. **Reason Requirement**: Operators are encouraged to provide a text-based reason (e.g., "Scheduled maintenance") before triggering a relay change.
2. **Pending Lockout**: If the backend reports that a command is currently `PENDING` for a panel, the UI immediately surfaces a warning. This prevents operators from flooding the MQTT queues with contradictory ON/OFF states while waiting for a physical acknowledgement.
3. **Double Confirmation**: Clicking `RELAY_ON` or `RELAY_OFF` does not immediately fire the API. It mounts a localized confirmation screen, forcing the operator to review their action, the target UID, and the reason before confirming the final dispatch.
4. **Backend API**: The verified command is pushed to `POST /api/v1/hardware/{panelId}/command`.

## 5. Command History & Audit Trail
Every interaction is permanently logged and visualized in the right-hand **Command History** column.
- **Synchronization**: It automatically synchronizes with the 5-second live polling interval to show real-time changes in command states.
- **State Tracking**: 
  - `PENDING`: Command dispatched by the cloud, awaiting hardware pickup.
  - `ACKNOWLEDGED`: The physical microcontroller confirmed successful relay execution.
  - `FAILED`: Command timed out or the hardware rejected the state change.
- **Accountability**: The table strictly logs the exact timestamp, the command, the provided reason, and the email address of the operator who requested it, guaranteeing total system auditability.
