import React, { useState, useEffect } from 'react';
import { X, Mail, Shield, CheckCircle2, AlertCircle, RefreshCw, Lock, UserCheck, UserX, UserPlus } from 'lucide-react';
import { getUsers, createUser, updateUser, resendInvitation } from '../../api/admin';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';

export const ManageAccessModal = ({ isOpen, onClose, site, organization, onSuccess }) => {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [customerUser, setCustomerUser] = useState(null);

  // New user form state if no user exists
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');

  const fetchCustomerUser = async () => {
    if (!site) return;
    try {
      setLoading(true);
      setError('');
      const allUsers = await getUsers();
      // Find user belonging to this site's organization with role USER
      const user = allUsers.find(u => 
        u.organization_id === site.organization_id && 
        (u.role === 'USER' || (u.role_rel && u.role_rel.name === 'USER') || !u.role_rel)
      );
      setCustomerUser(user || null);
    } catch (err) {
      console.error(err);
      setError('Unable to fetch access details from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && site) {
      setSuccessMessage('');
      setError('');
      fetchCustomerUser();
    }
  }, [isOpen, site]);

  if (!isOpen || !site) return null;

  const orgName = organization?.name || site.orgName || 'Client';

  const handleResendInvitation = async () => {
    if (!customerUser) return;
    setActionLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      await resendInvitation(customerUser.id);
      setSuccessMessage(`Invitation email with access PIN successfully sent to ${customerUser.email}`);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to send invitation email.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleAccess = async () => {
    if (!customerUser) return;
    setActionLoading(true);
    setError('');
    setSuccessMessage('');
    const newStatus = customerUser.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const updated = await updateUser(customerUser.id, { status: newStatus });
      setCustomerUser(prev => ({ ...prev, status: newStatus }));
      setSuccessMessage(`Portal access for ${customerUser.name} has been ${newStatus === 'ACTIVE' ? 'enabled' : 'disabled'}.`);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to update access status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUserEmail.trim()) {
      setError('Email address is required.');
      return;
    }

    setActionLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const created = await createUser({
        name: newUserName.trim() || orgName,
        email: newUserEmail.trim(),
        role: 'USER',
        organization_id: site.organization_id,
        site_id: site.id
      });
      setCustomerUser(created);
      setSuccessMessage(`User account created and invitation email sent to ${created.email}`);
      setNewUserName('');
      setNewUserEmail('');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to create user account.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-in">
      <div 
        className="bg-surface-elevated rounded-lg shadow-2xl w-full max-w-[520px] flex flex-col max-h-[90vh] overflow-hidden border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-elevated shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-md bg-[rgba(213,157,128,0.12)] flex items-center justify-center">
              <Shield className="h-4 w-4 text-[#D59D80]" />
            </div>
            <div>
              <span className="text-caption text-txt-muted uppercase tracking-wider font-semibold">Security & Access</span>
              <h2 className="text-[20px] font-bold text-txt leading-snug mt-0.5">Manage Access</h2>
            </div>
          </div>
          <button 
            onClick={onClose} 
            disabled={actionLoading}
            className="text-txt-muted hover:text-txt p-1.5 rounded-md hover:bg-surface-hover transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 bg-error/10 border border-error/20 rounded-md flex items-center gap-2 text-error text-small">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-success/10 border border-success/20 rounded-md flex items-center gap-2 text-success text-small">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <div className="h-5 w-5 rounded-full border-2 border-[#B86F50] border-t-transparent animate-spin" />
              <span className="text-small text-txt-muted">Loading access records...</span>
            </div>
          ) : customerUser ? (
            /* User Exists View */
            <div className="space-y-4">
              <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center text-small">
                  <span className="text-txt-muted">Customer Organization</span>
                  <span className="font-semibold text-txt">{orgName}</span>
                </div>

                <div className="flex justify-between items-center text-small">
                  <span className="text-txt-muted">Contact / Name</span>
                  <span className="font-medium text-txt">{customerUser.name}</span>
                </div>

                <div className="flex justify-between items-center text-small">
                  <span className="text-txt-muted">Email</span>
                  <span className="font-mono text-txt">{customerUser.email}</span>
                </div>

                <div className="flex justify-between items-center text-small">
                  <span className="text-txt-muted">Role</span>
                  <span className="font-semibold text-[#D59D80]">USER</span>
                </div>

                <div className="flex justify-between items-center text-small pt-2 border-t border-border">
                  <span className="text-txt-muted">Portal Access</span>
                  <span className={`font-semibold ${customerUser.status === 'ACTIVE' ? 'text-success' : 'text-error'}`}>
                    {customerUser.status === 'ACTIVE' ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-small">
                  <span className="text-txt-muted">Account Status</span>
                  <StatusBadge status={customerUser.status || 'ACTIVE'} />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                <Button
                  variant="outline"
                  size="medium"
                  className="flex-1"
                  onClick={handleResendInvitation}
                  disabled={actionLoading}
                >
                  <Mail className="h-4 w-4" />
                  <span>{actionLoading ? 'Sending...' : 'Resend Invitation'}</span>
                </Button>

                <Button
                  variant={customerUser.status === 'ACTIVE' ? 'destructive' : 'primary'}
                  size="medium"
                  className="flex-1"
                  onClick={handleToggleAccess}
                  disabled={actionLoading}
                >
                  {customerUser.status === 'ACTIVE' ? (
                    <>
                      <UserX className="h-4 w-4" />
                      <span>{actionLoading ? 'Updating...' : 'Disable Access'}</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4" />
                      <span>{actionLoading ? 'Updating...' : 'Enable Access'}</span>
                    </>
                  )}
                </Button>
              </div>

              <p className="text-caption text-txt-muted">
                Note: Passwords are encrypted and never shown. Customers set their own permanent password via the invitation email.
              </p>
            </div>
          ) : (
            /* No user found -> Quick Invite Flow */
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="bg-surface border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <UserPlus className="h-4 w-4 text-[#D59D80]" />
                  <span className="text-small font-semibold text-txt">Create Customer Account</span>
                </div>
                <p className="text-caption text-txt-muted mb-4">
                  No customer portal account is currently registered for <strong>{orgName}</strong>. You can create an account and send an SMTP invitation below.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-caption font-medium text-txt mb-1">Contact Name</label>
                    <input 
                      type="text"
                      className="input-base w-full"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="e.g. John Doe"
                      disabled={actionLoading}
                    />
                  </div>

                  <div>
                    <label className="block text-caption font-medium text-txt mb-1">
                      Email Address <span className="text-error">*</span>
                    </label>
                    <input 
                      type="email"
                      className="input-base w-full"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="customer@domain.com"
                      required
                      disabled={actionLoading}
                    />
                  </div>

                  <div className="flex justify-between items-center text-caption text-txt-muted pt-2 border-t border-border">
                    <span>Assigned Role</span>
                    <span className="font-semibold text-[#D59D80]">USER (Customer)</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="primary" size="medium" type="submit" disabled={actionLoading}>
                  <Mail className="h-4 w-4" />
                  <span>{actionLoading ? 'Sending Invitation...' : 'Create & Send Invitation'}</span>
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center px-6 py-4 border-t border-border bg-surface-elevated shrink-0">
          <Button variant="secondary" size="medium" onClick={onClose} disabled={actionLoading}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
