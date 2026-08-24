import React, { useState, useEffect } from 'react';
import { getOrganizations } from '../../../api/admin';
import { Loader2, Building } from 'lucide-react';
import { StatusBadge } from '../../../components/ui/StatusBadge';

const OrganizationSettings = () => {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const oRes = await getOrganizations();
      setOrgs(oRes);
    } catch (err) {
      setError('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading && orgs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div className="border-b border-border/50 pb-2">
        <h3 className="text-medium font-semibold text-text">Organization Settings</h3>
        <p className="text-small text-text-muted">Manage business entities and tenants (Read Only)</p>
      </div>

      {error && <div className="text-status-error text-small bg-status-error/10 p-3 rounded">{error}</div>}

      <div className="border border-border bg-surface rounded overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-border/20 text-text-muted text-[10px] uppercase tracking-wider">
              <th className="py-3 px-4 font-medium border-b border-border">Organization Name</th>
              <th className="py-3 px-4 font-medium border-b border-border text-center">ID</th>
              <th className="py-3 px-4 font-medium border-b border-border text-center">Status</th>
              <th className="py-3 px-4 font-medium border-b border-border text-center">Configured</th>
            </tr>
          </thead>
          <tbody>
            {orgs.map((o, i) => (
              <tr key={o.id} className={`border-b border-border/30 hover:bg-border/10 transition-colors ${i % 2 === 0 ? '' : 'bg-border/5'}`}>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-text-muted" />
                    <span className="text-small text-text font-medium">{o.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-center text-small font-mono text-text-muted">{o.id}</td>
                <td className="py-3 px-4 text-center">
                  <StatusBadge status={o.status || 'ACTIVE'} />
                </td>
                <td className="py-3 px-4 text-center text-[10px] text-text-muted">
                  {new Date(o.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {orgs.length === 0 && (
              <tr><td colSpan="4" className="py-8 text-center text-small text-text-muted">No organizations found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div className="text-[11px] text-text-muted bg-border/10 p-3 rounded border border-border/50">
        Note: Multi-tenant organization creation is currently restricted to backend provisioning only in this deployment.
      </div>
    </div>
  );
};

export default OrganizationSettings;
