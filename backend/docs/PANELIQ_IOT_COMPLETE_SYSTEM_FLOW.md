# PanelIQ IoT Complete System Flow & Hardware Integration Document

This document provides a comprehensive overview of the PanelIQ backend architecture, specifically focusing on the multi-site IoT provisioning pipeline, security, data validation, and end-to-end hardware interaction.

## 1. System Architecture Principles

The architecture strictly separates physical hardware definitions from logical database entities to ensure scalability and multi-site isolation.

- **One Site = One Active IoT Device**: A physical location is managed by exactly one active Raspberry Pi Pico W. 
- **Site Isolation**: The hardware relies on a backend-managed secure `X-Device-Token`. The hardware itself is agnostic to which Site it belongs to.
- **Physical to Logical Mapping**: The firmware transmits data indexed by physical `channel_number` (e.g., `CH1`, `CH2`). The backend maps this physical channel to a logical `panel_id` in the database.
- **Source of Truth**: The backend is the absolute authority on site assignments and data routing. Hardware telemetry cannot override site ownership.

---

## 2. Admin Flow (Provisioning)

Before physical hardware can send valid telemetry, it must be provisioned by a System Administrator.

1. **Hardware Registration (`POST /api/v1/iot/devices/register`)**:
   - The device first connects to the internet and registers itself using its hardcoded MAC-based `device_uid` (e.g., `PICO-W-01`).
   - The backend registers it with status `UNASSIGNED` and issues a secure `X-Device-Token`.
2. **Site Assignment (`POST /api/v1/admin/iot/devices/{device_uid}/assign-site`)**:
   - The Admin creates a Site and assigns the registered device to this Site.
   - The device status becomes `ACTIVE`.
3. **Channel Mapping (`POST /api/v1/admin/iot/devices/{device_uid}/mappings`)**:
   - The Admin creates Panels for the site.
   - The Admin explicitly maps physical channels (e.g., `1` and `2`) on the device to logical `panel_id`s in the database.
   - This ensures the Pico W does not need to know the database's primary keys.

---

## 3. Hardware / Firmware Flow

The hardware (Raspberry Pi Pico W) strictly adheres to the following workflow:

1. **Authentication**: 
   - Uses `X-Device-Token` in the headers for every request.
2. **Telemetry (`POST /api/v1/iot/readings`)**:
   - Sends telemetry for configured physical channels periodically (every 10 seconds).
   - Payload uses `channel_number` instead of `panel_id`.
   - Firmware is completely decoupled from the SQL database structure.
3. **Heartbeat (`POST /api/v1/iot/heartbeat`)**:
   - Sent every 30 seconds to maintain an "Online" status.
4. **Command Polling (`GET /api/v1/iot/devices/commands/pending`)**:
   - Device polls for pending commands (e.g., RELAY_CONTROL) and acknowledges them via `POST /api/v1/iot/devices/commands/{cmd_id}/ack`.

---

## 4. Normal User Flow (Viewing)

Standard users interact with the system strictly through the lens of Role-Based Access Control (RBAC).

1. **Dashboard & Insights**:
   - Users view solar capacity, real-time power, and weather-driven insights (`/api/v1/sites/{site_id}/solar-insights`).
   - The backend retrieves telemetry scoped *only* to the user's assigned sites.
2. **Hardware Abstraction**:
   - Users do not see device UIDs, tokens, or channels. They only see "Panels" and their corresponding historical and real-time generation metrics.

---

## 5. Security & Isolation Rules

- **Strict Token Auth**: Telemetry endpoints require a valid `X-Device-Token`. Missing or invalid tokens result in `401 Unauthorized`.
- **Negative Value Rejection**: Telemetry containing physically impossible values (e.g., `voltage: -5.0`) is structurally rejected by Pydantic validators (`HTTP 422 Unprocessable Entity`), preventing database corruption.
- **Cross-Site Protection**: A device assigned to Site A is strictly prohibited from pushing telemetry for channels mapped to panels in Site B. Any such attempt results in `403 Forbidden`.
- **Relay Safety Lock**: The backend strictly prevents remote commands targeting Physical Relay 1 (CH1), which is reserved for hardware safety (NC default). Only CH2 is fully controllable.
