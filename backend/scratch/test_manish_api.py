import requests

def test_apis():
    # 1. Login to get token for User 9
    resp = requests.post("http://localhost:8000/api/v1/auth/login", json={"email": "dhuvaviyadhara@gmail.com", "password": "password123"})
    if resp.status_code != 200:
        print("Login failed:", resp.text)
        return
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Get active alerts for site 9
    alerts_resp = requests.get("http://localhost:8000/api/v1/alerts/history?site_id=9&status=ACTIVE", headers=headers)
    alerts = alerts_resp.json()
    print("Active Alerts via API:", [a["id"] for a in alerts["items"]])
    
    if alerts["items"]:
        alert_id = alerts["items"][0]["id"]
        # 3. Acknowledge alert 98
        ack_resp = requests.patch(f"http://localhost:8000/api/v1/alerts/{alert_id}/acknowledge", headers=headers)
        print("Acknowledge Response:", ack_resp.json())
        
        # 4. Check alerts again
        alerts_resp2 = requests.get("http://localhost:8000/api/v1/alerts/history?site_id=9&status=ACTIVE", headers=headers)
        print("Alerts after Ack:", [(a["id"], a["acknowledged_at"] is not None) for a in alerts_resp2.json()["items"]])
        
    # 5. Check Notifications
    notifs_resp = requests.get("http://localhost:8000/api/v1/notifications", headers=headers)
    print("Notifications:", [n["id"] for n in notifs_resp.json()])
    
    # 6. Mark read
    if notifs_resp.json():
        notif_id = notifs_resp.json()[0]["id"]
        read_resp = requests.patch(f"http://localhost:8000/api/v1/notifications/{notif_id}/read", headers=headers)
        print("Mark Read Response:", read_resp.json()["is_read"])

    # 7. Check Analytics
    analytics_resp = requests.get("http://localhost:8000/api/v1/alerts/analytics?site_id=9", headers=headers)
    print("Analytics:", analytics_resp.json())
    
    # 8. Check Trends
    trend_resp = requests.get("http://localhost:8000/api/v1/alerts/analytics/trend?site_id=9&days=7", headers=headers)
    print("Trends (total entries):", len(trend_resp.json()["trends"]))

if __name__ == "__main__":
    test_apis()
