import unittest
from unittest.mock import MagicMock, patch
import pytest

from app.services.diagnostic_scheduler import run_diagnostics_job
from app.models.panel import Panel

class DummyResult:
    def __init__(self, status):
        self.status = status

class TestDiagnosticScheduler(unittest.TestCase):

    @patch('app.services.diagnostic_scheduler.redis')
    @patch('app.services.diagnostic_scheduler.DiagnosticService')
    @patch('app.services.diagnostic_scheduler.SessionLocal')
    @patch('app.services.diagnostic_scheduler.redis_client')
    def test_scheduler_no_active_panels(self, mock_redis_client, mock_session_local, mock_diag_service, mock_redis):
        # TEST 1: No active panels
        mock_db = MagicMock()
        mock_session_local.return_value = mock_db
        
        # Mock redis lock
        mock_lock = MagicMock()
        mock_lock.acquire.return_value = True
        mock_redis_client.lock.return_value = mock_lock
        
        mock_query = mock_db.query.return_value.filter.return_value
        mock_query.all.return_value = []
        
        run_diagnostics_job()
        
        # Verify evaluate_panel was not called
        mock_diag_service.evaluate_panel.assert_not_called()
        mock_db.close.assert_called_once()
        mock_lock.release.assert_called_once()

    @patch('app.services.diagnostic_scheduler.DiagnosticService')
    @patch('app.services.diagnostic_scheduler.SessionLocal')
    @patch('app.services.diagnostic_scheduler.redis_client')
    def test_scheduler_one_active_panel(self, mock_redis_client, mock_session_local, mock_diag_service):
        # TEST 2: One active panel
        mock_db = MagicMock()
        mock_session_local.return_value = mock_db
        
        mock_lock = MagicMock()
        mock_lock.acquire.return_value = True
        mock_redis_client.lock.return_value = mock_lock
        
        panel = Panel(id=1, status="ACTIVE")
        mock_query = mock_db.query.return_value.filter.return_value
        mock_query.all.return_value = [panel]
        
        mock_diag_service.evaluate_panel.return_value = DummyResult("HEALTHY")
        
        run_diagnostics_job()
        
        mock_diag_service.evaluate_panel.assert_called_once_with(1, mock_db)

    @patch('app.services.diagnostic_scheduler.DiagnosticService')
    @patch('app.services.diagnostic_scheduler.SessionLocal')
    @patch('app.services.diagnostic_scheduler.redis_client')
    def test_scheduler_multiple_and_inactive_panels(self, mock_redis_client, mock_session_local, mock_diag_service):
        # TEST 3 & 4: Multiple active panels, inactive not in the list (handled by query filter)
        mock_db = MagicMock()
        mock_session_local.return_value = mock_db
        
        mock_lock = MagicMock()
        mock_lock.acquire.return_value = True
        mock_redis_client.lock.return_value = mock_lock
        
        panel1 = Panel(id=1, status="ACTIVE")
        panel2 = Panel(id=2, status="ACTIVE")
        
        mock_query = mock_db.query.return_value.filter.return_value
        mock_query.all.return_value = [panel1, panel2]
        
        mock_diag_service.evaluate_panel.return_value = DummyResult("ATTENTION")
        
        run_diagnostics_job()
        
        self.assertEqual(mock_diag_service.evaluate_panel.call_count, 2)
        mock_diag_service.evaluate_panel.assert_any_call(1, mock_db)
        mock_diag_service.evaluate_panel.assert_any_call(2, mock_db)

    @patch('app.services.diagnostic_scheduler.DiagnosticService')
    @patch('app.services.diagnostic_scheduler.SessionLocal')
    @patch('app.services.diagnostic_scheduler.redis_client')
    def test_scheduler_exception_isolation(self, mock_redis_client, mock_session_local, mock_diag_service):
        # TEST 5: Exception isolation
        mock_db = MagicMock()
        mock_session_local.return_value = mock_db
        
        mock_lock = MagicMock()
        mock_lock.acquire.return_value = True
        mock_redis_client.lock.return_value = mock_lock
        
        panel1 = Panel(id=1, status="ACTIVE")
        panel2 = Panel(id=2, status="ACTIVE")
        panel3 = Panel(id=3, status="ACTIVE")
        
        mock_query = mock_db.query.return_value.filter.return_value
        mock_query.all.return_value = [panel1, panel2, panel3]
        
        def side_effect(panel_id, db):
            if panel_id == 2:
                raise Exception("Simulated Failure")
            return DummyResult("HEALTHY")
            
        mock_diag_service.evaluate_panel.side_effect = side_effect
        
        run_diagnostics_job()
        
        # evaluate_panel should still be called 3 times, despite failure on panel 2
        self.assertEqual(mock_diag_service.evaluate_panel.call_count, 3)
        # Rollback should be called once due to exception
        mock_db.rollback.assert_called_once()
        # Session should still be closed at the end
        mock_db.close.assert_called_once()

    @patch('app.services.diagnostic_scheduler.DiagnosticService')
    @patch('app.services.diagnostic_scheduler.SessionLocal')
    @patch('app.services.diagnostic_scheduler.redis_client')
    def test_scheduler_duplicate_prevention(self, mock_redis_client, mock_session_local, mock_diag_service):
        # TEST 12: Duplicate execution protection
        mock_lock = MagicMock()
        mock_lock.acquire.return_value = False # Someone else has the lock
        mock_redis_client.lock.return_value = mock_lock
        
        run_diagnostics_job()
        
        # The db session should not even be created
        mock_session_local.assert_not_called()
        mock_diag_service.evaluate_panel.assert_not_called()
