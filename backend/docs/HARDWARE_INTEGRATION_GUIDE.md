# PanelIQ: Hardware Integration & Testing Guide

This guide provides step-by-step instructions for testing physical Raspberry Pi Pico W hardware against a locally running PanelIQ backend. 

> [!IMPORTANT]
> **New Architecture Changes**
> The hardware firmware no longer dictates database IDs. It should not contain hardcoded `panel_id` or `site_id`. It only needs its unique `X-Device-Token` and the physical `channel_number` (e.g. 1, 2, 3) it is reading from. 

---

## 1. Start the Local Environment
You must have the PanelIQ database, backend, and frontend running on your local machine.

1. Ensure **PostgreSQL** is running.
2. **Start Backend**: Run `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
   > [!WARNING]
   > You must include `--host 0.0.0.0` so the Pico W can reach the backend over your local WiFi network. 
3. **Start Frontend**: Run `npm run dev` in the frontend directory.
4. **Get your Local IP**: Find your laptop's IPv4 address on the WiFi network (e.g., `192.168.1.55`). The Pico W must be connected to the exact same WiFi network.

---

## 2. Provision the Device via Admin UI
Before the hardware can send data, you must provision it in the software.

1. Open `http://localhost:5173` and log in as `admin@paneliq.com / 1234`.
2. Go to **Sites** and create a Test Site.
3. Go to **Panels** and create a Test Panel under your new Test Site.
4. Go to **IoT Devices** and click **Register Device**. Give it a UID (e.g. `PICO-W-DESK-01`).
5. Open your PostgreSQL database (using pgAdmin, DBeaver, etc.) and look at the `iot_devices` table. Copy the `device_token` that was automatically generated for your new device. 
6. Back in the Admin UI, click your device in the table, click **Assign Site**, and select your Test Site.
7. Click **+ Add Mapping** to map physical `CH1` to your new logical Test Panel.

---

## 3. Flash the Pico W (MicroPython Reference)
Use the following reference code for the Raspberry Pi Pico W. Update the `WIFI_SSID`, `WIFI_PASS`, `SERVER_URL`, and `DEVICE_TOKEN`.

```python
import network
import urequests
import time

# ==========================================
# 1. Configuration
# ==========================================
WIFI_SSID = "YOUR_WIFI_NAME"
WIFI_PASS = "YOUR_WIFI_PASSWORD"

# Replace 192.168.1.55 with your laptop's actual Local IP Address
SERVER_URL = "http://192.168.1.55:8000/api/v1/iot/readings"
HEARTBEAT_URL = "http://192.168.1.55:8000/api/v1/iot/heartbeat"

# Paste the device_token you copied from the database
DEVICE_TOKEN = "paste_your_token_here"

HEADERS = {
    "X-Device-Token": DEVICE_TOKEN,
    "Content-Type": "application/json"
}

# ==========================================
# 2. Network Connection
# ==========================================
wlan = network.WLAN(network.STA_IF)
wlan.active(True)
wlan.connect(WIFI_SSID, WIFI_PASS)

print("Connecting to WiFi...")
while not wlan.isconnected():
    time.sleep(1)
print("Connected! IP:", wlan.ifconfig()[0])

# ==========================================
# 3. Main Telemetry Loop
# ==========================================
while True:
    # --- A. Send Heartbeat ---
    # This tells the backend the device is online
    try:
        urequests.post(HEARTBEAT_URL, headers=HEADERS, json={})
    except Exception as e:
        print("Heartbeat failed", e)
        
    # --- B. Read Sensors ---
    # Replace these mock values with actual INA219/DHT22 reads
    voltage = 12.5 
    current = 1.0  
    power = voltage * current
    
    # --- C. Send Telemetry ---
    payload = {
        "channel_number": 1, # This must match the channel you mapped in the UI!
        "voltage": voltage,
        "current": current,
        "power": power,
        "temperature": 25.0,
        "humidity": 50.0,
        "light_intensity": 1000.0
    }
    
    try:
        res = urequests.post(SERVER_URL, headers=HEADERS, json=payload)
        print(f"Sent CH1 Data! Server replied: {res.status_code}")
        res.close()
    except Exception as e:
        print("Telemetry failed", e)
        
    # Wait 10 seconds before next cycle
    time.sleep(10)
```

---

## 4. Verify on Dashboard
If the Pico W console prints `Server replied: 200`, the data was successfully ingested and routed. Open the PanelIQ frontend and navigate to your Test Panel's performance page to watch the data graph update in real-time.
