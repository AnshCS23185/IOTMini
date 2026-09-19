# PanelIQ Diagnostics System - Complete Architecture & Flow Report

## Overview
The PanelIQ Diagnostics System is an automated, real-time decision engine designed to continuously monitor solar panel telemetry. It actively compares instantaneous real-world sensor readings against meteorological forecasts (PVGIS) to identify underperformance, isolate root causes, and trigger stateful alerts for maintenance teams.

---

## 1. Automated Scheduling (Background Jobs)
The system executes completely autonomously without requiring manual HTTP requests.

* **Engine:** `APScheduler` (BackgroundScheduler) integrated directly into the FastAPI application lifecycle.
* **Frequency:** Runs every **5 minutes** (`minute='*/5'`).
* **Concurrency Protection:** Uses **Redis Distributed Locking** (`diagnostic_scheduler_lock`) with a 240-second timeout. If multiple instances or workers of the backend are running, Redis ensures that the diagnostic batch job only executes exactly once per interval, preventing database deadlocks or duplicate alerts.
* **Fault Isolation:** The scheduler iterates over all active panels sequentially. If one panel crashes during evaluation (e.g., bad data), the loop catches the exception, rolls back the database transaction for that specific panel, and safely continues to the next.

---

## 2. The Decision Engine (`DiagnosticService`)
The heart of the system is the `DiagnosticService.evaluate_panel()` method, which serves as the **Single Source of Truth** for all logic.

### Phase 1: Environment & Data Validation
Before running complex fault logic, the engine filters out invalid conditions:
1. **Daylight Check (`NO_SOLAR`)**: If the forecasted Expected Power is `0` or the Light Intensity (LDR) is `< 100`, the panel is marked as offline due to nightfall.
2. **Telemetry Check (`NO_DATA`)**: The engine queries the latest `SensorReading`. If no reading exists within the last 15 minutes, the panel is flagged as missing data.

### Phase 2: Performance Evaluation
The engine calculates the **Performance Percentage**: `(Actual Power / Expected Power) * 100`.
* Expected Power is dynamically retrieved from the **PVGIS Service**, which uses the panel's specific geolocation, azimuth, and tilt.
* If Performance **>= 60%**, the panel is flagged as **`HEALTHY`**.
* If Performance **< 60%**, the panel is flagged as **`UNDERPERFORMING`**, and the root-cause analysis tree is triggered.

### Phase 3: Root-Cause Analysis (Fault Isolation)
If a panel is underperforming, the engine processes the following sequential rules to assign a specific fault state:

1. **`LOCAL_SHADING`**: 
   * The engine queries the last 10 historical LDR readings (strictly excluding the current reading to prevent data poisoning).
   * It calculates a historical LDR baseline average.
   * If the *current* LDR is `<= 70%` of the historical baseline, it means light intensity has suddenly dropped independent of the weather forecast (e.g., a tree shadow, debris).
2. **`HIGH_TEMPERATURE`**: 
   * Triggered if the panel temperature sensor reports `> 50°C`. High heat significantly reduces PV efficiency.
3. **`INVERTER_FAULT`**: 
   * Triggered if Voltage is exactly `0V` but Expected Power is `> 0W`. This indicates a catastrophic electrical break or inverter shutdown.
4. **`PANEL_UNDERPERFORMANCE`**: 
   * The fallback status. If power is low but LDR is normal, temperature is normal, and voltage exists, the system deduces intrinsic degradation (e.g., micro-cracks, severe dust buildup).

---

## 3. Stateful Alerting & Database
* **Diagnostic Records:** Every evaluation creates/updates a `DiagnosticRecord` in the database to maintain a historical log of states.
* **Alert Generation:** If a fault state (e.g., `LOCAL_SHADING`) is detected, the engine queries the `alerts` table.
  * If an unresolved alert already exists for this panel/fault combination, it updates the `last_triggered_at` timestamp.
  * If no alert exists, it creates a new `Alert` with `status='ACTIVE'`.
* **Self-Healing:** If a panel recovers and returns to `HEALTHY`, the engine automatically transitions any `ACTIVE` alerts to `RESOLVED`, eliminating the need for manual cleanup of transient issues.

---

## 4. Frontend Integration
The backend securely exposes these states to the React frontend:

1. **Performance Dashboard (`Performance.jsx`)**: 
   * Visualizes real-time power (Actual vs Expected) on a dynamic area chart.
   * Automatically clears panel selection state when navigating between sites to prevent data crossover.
   * Provides a dedicated Slide-over sidebar for viewing tabular historical telemetry logs.
2. **Diagnostics Dashboard (`Diagnostics.jsx`)**: 
   * Displays a macroscopic view of all active alerts and underperforming panels across the site network.
3. **Diagnostic Detail (`PanelDiagnosticDetail.jsx`)**: 
   * Renders the specific fault decision tree, visually highlighting exactly *why* the backend assigned a specific fault (e.g., showing the LDR baseline threshold vs the current reading).
