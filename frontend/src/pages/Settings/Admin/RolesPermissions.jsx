import React from 'react';
import { Shield, Check, X } from 'lucide-react';

const RolesPermissions = () => {
  return (
    <div className="flex flex-col gap-6">
      <div className="border-b border-border/50 pb-2">
        <h3 className="text-body font-semibold text-txt">Roles & Permissions</h3>
        <p className="text-small text-txt-muted">Platform access control matrix</p>
      </div>

      <div className="border border-border bg-surface rounded overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-hover text-txt-muted text-caption uppercase tracking-wider">
              <th className="py-3 px-4 font-medium border-b border-border w-1/3">Feature</th>
              <th className="py-3 px-4 font-medium border-b border-border text-center">ADMIN</th>
              <th className="py-3 px-4 font-medium border-b border-border text-center">USER</th>
              <th className="py-3 px-4 font-medium border-b border-border text-center">VIEWER</th>
            </tr>
          </thead>
          <tbody>
            {[
              { name: 'Dashboard View', admin: true, user: true, viewer: true },
              { name: 'Sites Overview', admin: true, user: true, viewer: true },
              { name: 'Panels Overview', admin: true, user: true, viewer: true },
              { name: 'Performance Analytics', admin: true, user: true, viewer: true },
              { name: 'Diagnostics & Alerts View', admin: true, user: true, viewer: true },
              { name: 'IoT Devices View', admin: true, user: true, viewer: true },
              { name: 'Run Manual Diagnostics', admin: true, user: true, viewer: false },
              { name: 'Hardware Relay Control', admin: true, user: true, viewer: false },
              { name: 'User Management', admin: true, user: false, viewer: false },
              { name: 'Organization Settings', admin: true, user: false, viewer: false },
              { name: 'Site Configuration', admin: true, user: false, viewer: false },
              { name: 'Panel Configuration', admin: true, user: false, viewer: false },
            ].map((row, i) => (
              <tr key={row.name} className={`border-b border-border/30 hover:bg-surface-hover/10 transition-colors ${i % 2 === 0 ? '' : 'bg-border/5'}`}>
                <td className="py-3 px-4 text-small text-txt font-medium">{row.name}</td>
                <td className="py-3 px-4 text-center">
                  {row.admin ? <Check className="h-4 w-4 text-info mx-auto" /> : <X className="h-4 w-4 text-txt-muted mx-auto opacity-50" />}
                </td>
                <td className="py-3 px-4 text-center">
                  {row.user ? <Check className="h-4 w-4 text-info mx-auto" /> : <X className="h-4 w-4 text-txt-muted mx-auto opacity-50" />}
                </td>
                <td className="py-3 px-4 text-center">
                  {row.viewer ? <Check className="h-4 w-4 text-info mx-auto" /> : <X className="h-4 w-4 text-txt-muted mx-auto opacity-50" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="bg-primary/5 border border-primary/20 p-4 rounded flex gap-3">
        <Shield className="h-5 w-5 text-primary shrink-0" />
        <div className="flex flex-col gap-1 text-small text-txt">
          <span className="font-semibold text-primary">Role assignments are strictly enforced by the backend API.</span>
          <p className="opacity-90 leading-relaxed">
            The frontend interface will dynamically hide or disable controls based on your role, but the final authorization 
            check is always securely performed by the server using your JWT token.
          </p>
        </div>
      </div>

    </div>
  );
};

export default RolesPermissions;
