import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { Button } from '../components/ui/Button';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { login, error } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    
    if (result && result.success) {
      if (result.requires_password_change) {
        navigate('/set-password', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-[400px] bg-surface border border-border rounded-lg p-7 shadow-2xl">
        {/* Logo & Title */}
        <div className="mb-6 text-center">
          <img 
            src="/logo.png" 
            alt="PanelIQ" 
            className="mx-auto mb-4 h-10 w-auto object-contain" 
          />
          <h1 className="text-[24px] font-bold text-txt tracking-tight">
            Welcome to PanelIQ
          </h1>
          <p className="text-[13px] text-txt-muted mt-1">
            Sign in to continue to your solar operations.
          </p>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="p-2.5 bg-error/10 border border-error/25 rounded-md text-caption text-error font-medium text-center">
              {error}
            </div>
          )}

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label 
              htmlFor="email" 
              className="text-caption font-semibold uppercase tracking-wider text-txt-muted"
            >
              Email
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3 h-4 w-4 text-txt-muted pointer-events-none" />
              <input 
                id="email"
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@organization.com"
                required
                autoComplete="email"
                className="input-base pl-9 w-full"
              />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label 
                htmlFor="password" 
                className="text-caption font-semibold uppercase tracking-wider text-txt-muted"
              >
                Password
              </label>
            </div>
            <div className="relative flex items-center">
              <Lock className="absolute left-3 h-4 w-4 text-txt-muted pointer-events-none" />
              <input 
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="input-base pl-9 pr-10 w-full font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-txt-muted hover:text-txt cursor-pointer p-0.5"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            variant="primary"
            size="medium"
            disabled={loading}
            className="w-full mt-2 h-[40px] text-small font-semibold cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Signing in...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                Sign In <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-border flex items-center justify-center gap-1.5 text-caption text-txt-muted">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Encrypted Solar Platform Session</span>
        </div>
      </div>
    </div>
  );
};
