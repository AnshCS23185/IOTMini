import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User as UserIcon, Mail, Shield, Building } from 'lucide-react';

const ProfileSettings = () => {
  const { user } = useAuth();

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="border-b border-border/50 pb-2">
        <h3 className="text-medium font-semibold text-text">Profile Information</h3>
        <p className="text-small text-text-muted">Read-only view of your account details</p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] uppercase tracking-wider font-semibold text-text-muted flex items-center gap-2">
            <UserIcon className="h-3 w-3" /> Full Name
          </label>
          <div className="bg-surface border border-border rounded px-3 py-2 text-small text-text opacity-80">
            {user?.name || 'Not provided'}
          </div>
        </div>
        
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] uppercase tracking-wider font-semibold text-text-muted flex items-center gap-2">
            <Mail className="h-3 w-3" /> Email Address
          </label>
          <div className="bg-surface border border-border rounded px-3 py-2 text-small text-text opacity-80">
            {user?.email || 'Not provided'}
          </div>
        </div>

        <div className="flex flex-col gap-1.5 mt-4">
          <label className="text-[11px] uppercase tracking-wider font-semibold text-text-muted flex items-center gap-2">
            <Shield className="h-3 w-3" /> Platform Role
          </label>
          <div className="bg-surface border border-border rounded px-3 py-2 flex items-center">
            <span className="text-[11px] font-bold uppercase font-mono bg-primary/20 text-primary px-2 py-0.5 rounded">
              {user?.role || 'UNKNOWN'}
            </span>
          </div>
          <span className="text-[10px] text-text-muted">Roles are managed by platform administrators.</span>
        </div>
        
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] uppercase tracking-wider font-semibold text-text-muted flex items-center gap-2">
            <Building className="h-3 w-3" /> Organization ID
          </label>
          <div className="bg-surface border border-border rounded px-3 py-2 text-small text-text opacity-80">
            {user?.organization_id || 'None'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
