# PanelIQ Alerts Page Mechanism Audit

This document serves as a complete technical audit of the mechanisms, data flow, and architecture powering the **PanelIQ Alerts Page**.

## 1. Core Architectural Flow

The Alerts module is driven by a linear, stateful pipeline where **Diagnostics is the single source of truth**, and **Alerts is the system of record** for operator awareness.

```mermaid
flowchart TD
    A[IoT Telemetry & Weather Data] --> B[DiagnosticService (Scheduler)]
    B --> C{Diagnostic Status}
    C -- "HEALTHY" --> D[Resolve Active Alerts]
    C -- "FAULT / WARNING" --> E[Evaluate Alert State Engine]
    E --> F[Database: alerts table]
    F --> G[Alerts UI / Notification Center]
```

## 2. Triggering Mechanism (The Source)

Alerts are **never created randomly**. They are strictly tied to the `DiagnosticService`.

- **5-Minute Cron Job:** A background scheduler (APScheduler) runs every 5 minutes across all active panels.
- **Evaluation:** It compares the latest `SensorReading` against the expected `PVGIS` calculations.
- **Output:** It generates a `DiagnosticRecord` containing a status (e.g., `HEALTHY`, `DEVICE_OFFLINE`, `PANEL_UNDERPERFORMANCE`).

## 3. Alert State Engine (`DiagnosticService._update_alert_state`)

When a diagnostic run completes, the result is immediately passed to the Alert State Engine, which follows strict state transition rules to prevent duplicate alerts.

> [!IMPORTANT]
> The engine guarantees exactly **one active alert** per panel at any given time.

### State Transitions:
1. **New Fault Detected:** If no active alert exists for the panel, a new `Alert` is created with status `ACTIVE`, a specific severity level, and `consecutive_count = 1`.
2. **Duplicate Fault Detected:** If an active alert already exists for the *same* fault type, the engine **does not create a new alert**. Instead, it increments the `consecutive_count` and updates the `last_detected_at` timestamp.
3. **Recovery / Healthy Detected:** If the diagnostic evaluates to `HEALTHY`, any `ACTIVE` alert is automatically transitioned to `RESOLVED`, logging the `resolved_at` timestamp.

## 4. Security & Tenant Isolation (RBAC)

The Alerts UI is heavily protected by Role-Based Access Control (RBAC). The mechanism ensures users only see data belonging to their organization.

- **Non-Admins (Users/Viewers):** The backend API intercepts the request, looks up the `organization_id` tied to the user's JWT token, and explicitly forces a SQL `JOIN` on the `solar_sites` table. They can strictly only query alerts where `Site.organization_id == current_user.organization_id`.
- **Admins:** The system dynamically bypasses this tenant restriction, allowing Admins to view alerts across the entire ecosystem, controlled via a frontend Site Filter dropdown.

## 5. User Interface (Frontend Mechanisms)

The frontend Alerts Page (`Alerts.jsx`) relies on three primary mechanisms to visualize the backend data.

### A. The "Active Alerts" View
- Polls the `GET /api/v1/alerts/history?status=ACTIVE` endpoint.
- Displays a real-time list of ongoing issues.
- **Action:** Operators can click "Details" to open the **Alert Detail Drawer**, revealing the exact time the fault started and its current consecutive occurrence count.

### B. The Acknowledgement System
- Operators can manually click "Acknowledge" on an active alert.
- This fires a `PATCH /api/v1/alerts/{id}/acknowledge` request.
- **Result:** The system locks in the current UTC timestamp and the ID of the user who acknowledged it, indicating to other operators that the fault is currently being investigated. 

### C. Analytics & Trend Dashboards
- The UI invokes `GET /alerts/analytics` and `GET /alerts/analytics/trend`.
- These endpoints perform heavy aggregation operations in Python (not raw SQL groupings) to compute:
  - **Mean Time to Resolution (MTTR):** Average time between `first_detected_at` and `resolved_at`.
  - **Fault Frequency:** A grouped count of the most common fault types.
  - **Trend Data:** A 7-day rolling window classifying historical faults by severity (Critical, Warning, Info) mapped flawlessly to Recharts UI elements.

## 6. Real-Time Notification Pipeline

Every time a **new** alert is instantiated (Transition 1 above), the backend hooks into the Notification model.
- A discrete `Notification` record is created for every user who shares the `organization_id` of the affected site.
- The frontend `NotificationCenter.jsx` polls every 60 seconds (`GET /api/v1/notifications/unread-count`).
- A red badge appears in the UI header. When clicked, it renders the notifications and allows the user to navigate directly to the specific alert drawer and mark the notification as read.
