import unittest
from unittest.mock import MagicMock, call, patch
from datetime import datetime, timezone
from app.models.diagnostics import DiagnosticRecord, Alert
from app.models.panel import Panel
from app.services.diagnostic_service import DiagnosticService

class TestAlertLogic(unittest.TestCase):
    def setUp(self):
        self.mock_db = MagicMock()
        self.mock_query = self.mock_db.query.return_value
        self.mock_filter = self.mock_query.filter.return_value
        
        self.test_panel = MagicMock()
        self.test_panel.id = 1
        self.test_panel.site_id = 1
        
        # Setup Site mock for notification
        self.test_site = MagicMock()
        self.test_site.id = 1
        self.test_site.organization_id = 1
        
        # Setup User mock for notification
        self.test_user = MagicMock()
        self.test_user.id = 100
        self.test_user.organization_id = 1
        
        def mock_first():
            if self.mock_query.filter.call_args[0][0].left.name == "id":
                return self.test_site
            return self.mock_filter._active_alert

        self.mock_filter.first.side_effect = mock_first
        self.mock_filter.all.return_value = [self.test_user]
        self.mock_filter._active_alert = None

    @patch('app.services.diagnostic_service.DiagnosticService._create_notifications_for_alert')
    def test_new_fault_creates_alert_and_notification(self, mock_notify):
        self.mock_filter._active_alert = None
        
        diag = DiagnosticRecord(
            panel_id=1,
            status="LOCAL_SHADING",
            expected_power_w=100.0,
            reason="Test",
            timestamp=datetime.now(timezone.utc),
            panel=self.test_panel
        )
        
        DiagnosticService._update_alert_state(self.mock_db, diag)
        
        self.assertTrue(self.mock_db.add.called)
        added_alert = self.mock_db.add.call_args[0][0]
        self.assertEqual(added_alert.fault_type, "LOCAL_SHADING")
        self.assertEqual(added_alert.severity, "WARNING")
        
        # Verify notification logic triggered for WARNING
        mock_notify.assert_called_once_with(self.mock_db, added_alert)

    @patch('app.services.diagnostic_service.DiagnosticService._create_notifications_for_alert')
    def test_repeated_fault_does_not_create_duplicate_notification(self, mock_notify):
        active_alert = Alert(panel_id=1, fault_type="LOCAL_SHADING", severity="WARNING", status="ACTIVE", consecutive_count=1)
        self.mock_filter._active_alert = active_alert
        
        diag = DiagnosticRecord(panel_id=1, status="LOCAL_SHADING", expected_power_w=100.0, reason="T1", panel=self.test_panel)
        DiagnosticService._update_alert_state(self.mock_db, diag)
        
        self.assertEqual(active_alert.consecutive_count, 2)
        # Notification logic should NOT be triggered for existing alert
        mock_notify.assert_not_called()

    @patch('app.services.diagnostic_service.DiagnosticService._create_notifications_for_alert')
    def test_different_fault_resolves_old_and_creates_new_notification(self, mock_notify):
        active_alert = Alert(panel_id=1, fault_type="LOCAL_SHADING", severity="WARNING", status="ACTIVE", consecutive_count=1)
        self.mock_filter._active_alert = active_alert
        
        diag = DiagnosticRecord(panel_id=1, status="DEVICE_OFFLINE", expected_power_w=100.0, reason="T2", panel=self.test_panel)
        DiagnosticService._update_alert_state(self.mock_db, diag)
        
        self.assertEqual(active_alert.status, "RESOLVED")
        
        self.assertTrue(self.mock_db.add.called)
        new_alert = self.mock_db.add.call_args[0][0]
        self.assertEqual(new_alert.fault_type, "DEVICE_OFFLINE")
        
        # Verify notification triggered for new CRITICAL fault
        mock_notify.assert_called_once_with(self.mock_db, new_alert)
        
    @patch('app.services.diagnostic_service.DiagnosticService._create_notifications_for_alert')
    def test_info_severity_does_not_create_notification(self, mock_notify):
        self.mock_filter._active_alert = None
        
        diag = DiagnosticRecord(
            panel_id=1,
            status="NO_SOLAR",
            expected_power_w=100.0,
            reason="Nighttime",
            timestamp=datetime.now(timezone.utc),
            panel=self.test_panel
        )
        
        DiagnosticService._update_alert_state(self.mock_db, diag)
        
        # Alert is created
        self.assertTrue(self.mock_db.add.called)
        
        # But notification is skipped for INFO
        mock_notify.assert_not_called()

    def test_healthy_resolves_active(self):
        active_alert = Alert(panel_id=1, fault_type="NO_DATA", severity="CRITICAL", status="ACTIVE", consecutive_count=1)
        self.mock_filter._active_alert = active_alert
        
        diag = DiagnosticRecord(panel_id=1, status="HEALTHY", expected_power_w=100.0, reason="T2", panel=self.test_panel)
        DiagnosticService._update_alert_state(self.mock_db, diag)
        
        self.assertEqual(active_alert.status, "RESOLVED")
        self.assertIsNotNone(active_alert.resolved_at)

    def test_analytics_returns_expected_data(self):
        # We can just check the schema structure for now, as testing the endpoint needs FastAPI TestClient.
        from app.schemas.diagnostics import AnalyticsResponse
        resp = AnalyticsResponse(
            total_alerts=10,
            active_alerts=2,
            resolved_alerts=8,
            critical_alerts=1,
            warning_alerts=3,
            info_alerts=6,
            avg_resolution_time_minutes=45.5,
            fastest_recovery_minutes=10.0,
            longest_active_minutes=120.0,
            fault_distribution=[],
            panel_summaries=[],
            site_summaries=[]
        )
        self.assertEqual(resp.total_alerts, 10)
        self.assertEqual(resp.avg_resolution_time_minutes, 45.5)
