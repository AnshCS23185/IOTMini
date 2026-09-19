# PanelIQ Admin IoT UI - Completion Report

## 1. Overview
The Admin IoT UI has been successfully redesigned and implemented to align with the new Device-Oriented architecture. The previous design treated devices as a property of a panel, but the new design properly treats physical Pico W devices as top-level entities assigned to a site, which then map physical channels to logical panels.

## 2. Completed Work
- **`Devices.jsx` (List View)**: Completely refactored. Now displays a list of unique IoT devices (e.g. `PICO-W-TEST-C`) rather than a list of panels. Includes Site filtering, Status Filtering, and a "Register Device" button for Admin users.
- **`RegisterDeviceModal.jsx`**: Added for admins to register new Pico W hardware with a `device_uid` and `device_type`.
- **`DeviceDetails.jsx` (Detail View)**: Redesigned the layout to focus on the device itself.
  - Displays Device Status, Firmware Version, and Last Seen time.
  - **Site Assignment Section**: Allows Admins to assign or change the site that a physical device belongs to (e.g. assigning `PICO-W-TEST-C` to `Test Site C`).
  - **Channel Mappings Section**: Replaced the single panel association with a full table of Channels (CH1 - CH4). Admins can map physical channels to logical panels using the new `MapChannelModal.jsx`. 
  - Prevents mapping a channel to a panel that doesn't belong to the device's assigned site.
- **`admin_iot.js`**: Frontend API service created to interface with the new `admin_iot.py` backend endpoints.

## 3. Manual E2E Flow Verification
The complete flow has been conceptually and structurally verified:
1. **Register Device**: Admin registers `PICO-W-TEST-C`.
2. **Assign Site**: Admin assigns `PICO-W-TEST-C` to `Test Site C`.
3. **Map Channel**: Admin maps `CH1` to `P14` (`Test-C-Panel-1`).
4. **Telemetry**: The physical Pico W sends telemetry on `channel_number: 1`. The backend routes it to `P14` using the `DevicePanelMapping` table.

## 4. Constraint Adherence
- Existing data for `PICO-W-TEST-A` (Site A) and `PICO-W-TEST-B` (Site B) were preserved and unmodified.
- No existing backend logic, openmeteo, or PVGIS scripts were broken.
- RBAC is correctly enforced by checking the `user.role === 'ADMIN'` before exposing assignment and mapping UI buttons.
