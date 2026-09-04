import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePassword } from '../api/auth';
import { Lock, ArrowRight, Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ThemeToggle } from '../components/ui/ThemeToggle';

export const SetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await changePassword(newPassword);
      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to set password.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-[400px] bg-surface border border-border rounded-lg p-7 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="h-10 w-10 rounded-full bg-surface-secondary border border-border flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="h-5 w-5 text-txt" />
          </div>
          <h1 className="text-[22px] font-bold text-txt tracking-tight">Set Permanent Password</h1>
          <p className="text-[13px] text-txt-muted mt-1">
            Create a permanent password for your PanelIQ account.
          </p>
        </div>

        {success ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-success mb-3" />
            <h3 className="text-subsection font-semibold text-txt">Password Updated</h3>
            <p className="text-caption text-txt-muted mt-1">Redirecting to your dashboard...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="p-2.5 bg-error/10 border border-error/25 rounded-md text-caption text-error font-medium text-center">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-caption font-semibold uppercase tracking-wider text-txt-muted">New Password</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3 h-4 w-4 text-txt-muted pointer-events-none" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="At least 6 characters"
                  className="input-base pl-9 w-full font-mono"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-caption font-semibold uppercase tracking-wider text-txt-muted">Confirm Password</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3 h-4 w-4 text-txt-muted pointer-events-none" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Repeat new password"
                  className="input-base pl-9 w-full font-mono"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              variant="primary"
              size="medium"
              disabled={loading}
              className="w-full mt-2 h-[40px] text-small font-semibold cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Updating...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  Update Password <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default SetPassword;
