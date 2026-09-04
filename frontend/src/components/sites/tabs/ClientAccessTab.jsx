import React, { useState, useEffect } from 'react';
import { getUsers } from '../../../api/admin';
import { Mail, Shield, User, MoreVertical, RefreshCw } from 'lucide-react';
import { Button } from '../../ui/Button';

export const ClientAccessTab = ({ site, org }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchOrgUsers = async () => {
      try {
        setLoading(true);
        const allUsers = await getUsers();
        const orgUsers = allUsers.filter(u => u.organization_id === site.organization_id);
        setUsers(orgUsers);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (site?.organization_id) fetchOrgUsers();
  }, [site]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between shrink-0">
        <h3 className="text-body font-semibold text-txt">Client Portal Access</h3>
        <Button size="small" variant="outline">
          <User className="h-3.5 w-3.5 mr-1" /> Invite User
        </Button>
      </div>

      <div className="card p-0 flex-1 overflow-visible">
        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-44 text-txt-muted p-4">
            <Shield className="h-6 w-6 mb-2 opacity-30" />
            <span className="text-caption font-medium text-txt">No portal users</span>
            <span className="text-[11px] text-txt-muted mt-0.5">This client does not have any users configured for portal access.</span>
          </div>
        ) : (
          <table className="w-full text-left whitespace-nowrap">
            <thead className="table-header">
              <tr>
                <th className="py-2 px-3 w-[35%]">Portal User</th>
                <th className="py-2 px-3">Role</th>
                <th className="py-2 px-3">Account Status</th>
                <th className="py-2 px-3">Invitation</th>
                <th className="py-2 px-3 text-right w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id} className="table-row text-caption">
                  <td className="table-cell">
                    <div className="flex flex-col">
                      <span className="font-medium text-txt">{user.name}</span>
                      <span className="text-[11px] text-txt-muted flex items-center gap-1">
                        <Mail className="h-2.5 w-2.5" /> {user.email}
                      </span>
                    </div>
                  </td>
                  <td className="table-cell font-mono text-txt-secondary text-[11px]">
                    {user.role === 'USER' ? 'Client User' : user.role}
                  </td>
                  <td className="table-cell">
                    <span className="inline-flex items-center gap-1.5 font-medium text-success">
                      <span className="h-1.5 w-1.5 rounded-full bg-success"></span> Active
                    </span>
                  </td>
                  <td className="table-cell text-txt-muted text-[11px]">
                    <span className="bg-surface-secondary border border-border px-1.5 py-0.5 rounded text-txt-muted font-medium">Synced</span>
                  </td>
                  <td className="table-cell text-right relative">
                    <button 
                      className="p-1 text-txt-muted hover:text-txt hover:bg-surface-hover rounded transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === user.id ? null : user.id);
                      }}
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </button>
                    {openMenuId === user.id && (
                      <div 
                        className="absolute right-3 top-8 w-36 bg-surface border border-border rounded-lg shadow-dropdown z-50 py-1 text-left"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button className="w-full px-3 py-1.5 text-caption hover:bg-surface-hover flex items-center text-txt"><RefreshCw className="h-3 w-3 mr-1.5 text-txt-muted" /> Resend Invite</button>
                        <button className="w-full px-3 py-1.5 text-caption hover:bg-surface-hover flex items-center text-txt"><Shield className="h-3 w-3 mr-1.5 text-txt-muted" /> Permissions</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
