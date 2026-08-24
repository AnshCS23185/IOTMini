import React, { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser, deleteUser, getOrganizations } from '../../../api/admin';
import { Loader2, Users, Plus, Edit2, Trash2, Shield, X, Check } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  
  const [formData, setFormData] = useState({ name: '', email: '', role: 'USER', password: '', organization_id: '' });
  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [uRes, oRes] = await Promise.all([getUsers(), getOrganizations()]);
      setUsers(uRes);
      setOrgs(oRes);
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenEdit = (user) => {
    if (user) {
      setFormData({ name: user.name, email: user.email, role: user.role, organization_id: user.organization_id || '', password: '' });
      setEditingUser(user);
    } else {
      setFormData({ name: '', email: '', role: 'USER', password: '', organization_id: orgs.length > 0 ? orgs[0].id : '' });
      setEditingUser(null);
    }
    setIsEditing(true);
    setSubmitError(null);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingUser(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      const payload = { ...formData };
      if (!payload.password) delete payload.password; // Don't send empty password on update
      payload.organization_id = payload.organization_id ? parseInt(payload.organization_id) : null;

      if (editingUser) {
        await updateUser(editingUser.id, payload);
      } else {
        if (!payload.password) throw new Error("Password is required for new users");
        await createUser(payload);
      }
      
      await fetchData();
      setIsEditing(false);
    } catch (err) {
      setSubmitError(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setIsSubmitting(true);
    try {
      await deleteUser(confirmDelete.id);
      setConfirmDelete(null);
      await fetchData();
    } catch (err) {
      setSubmitError(err.message || 'Failed to delete user');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-end border-b border-border/50 pb-2">
        <div>
          <h3 className="text-medium font-semibold text-text">User Management</h3>
          <p className="text-small text-text-muted">Manage platform access and roles</p>
        </div>
        {!isEditing && (
          <Button variant="primary" onClick={() => handleOpenEdit(null)} className="h-8 text-[11px]">
            <Plus className="h-3 w-3 mr-1" /> Add User
          </Button>
        )}
      </div>

      {error && <div className="text-status-error text-small bg-status-error/10 p-3 rounded">{error}</div>}

      {isEditing ? (
        <div className="bg-surface border border-border p-6 rounded shadow-sm max-w-xl">
          <div className="flex items-center gap-2 mb-4 border-b border-border/50 pb-2">
            <Shield className="h-4 w-4 text-primary" />
            <span className="font-semibold text-text">{editingUser ? 'Edit User' : 'Create New User'}</span>
          </div>
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase tracking-wider font-semibold text-text-muted">Full Name</label>
              <input required type="text" className="bg-background border border-border rounded px-3 py-2 text-small text-text focus:outline-none focus:border-primary" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase tracking-wider font-semibold text-text-muted">Email</label>
              <input required type="email" className="bg-background border border-border rounded px-3 py-2 text-small text-text focus:outline-none focus:border-primary" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase tracking-wider font-semibold text-text-muted">Role</label>
              <select className="bg-background border border-border rounded px-3 py-2 text-small text-text focus:outline-none focus:border-primary" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                <option value="VIEWER">VIEWER (Read Only)</option>
                <option value="USER">USER (Operator)</option>
                <option value="ADMIN">ADMIN (Full Access)</option>
              </select>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase tracking-wider font-semibold text-text-muted">Organization</label>
              <select required className="bg-background border border-border rounded px-3 py-2 text-small text-text focus:outline-none focus:border-primary" value={formData.organization_id} onChange={e => setFormData({...formData, organization_id: e.target.value})}>
                <option value="">Select Organization</option>
                {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase tracking-wider font-semibold text-text-muted">Password {editingUser && '(Leave blank to keep current)'}</label>
              <input type="password" required={!editingUser} className="bg-background border border-border rounded px-3 py-2 text-small text-text focus:outline-none focus:border-primary" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            </div>
            
            {submitError && <span className="text-[11px] text-status-error">{submitError}</span>}
            
            <div className="flex gap-3 mt-2">
              <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={isSubmitting} className="flex-1">Cancel</Button>
              <Button type="submit" variant="primary" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? 'Saving...' : 'Save User'}
              </Button>
            </div>
          </form>
        </div>
      ) : confirmDelete ? (
        <div className="bg-surface border border-status-error/50 p-6 rounded shadow-sm max-w-xl">
           <div className="flex flex-col gap-2 mb-4">
             <span className="text-medium font-bold text-text">Delete User?</span>
             <span className="text-small text-text-muted">Are you sure you want to permanently delete {confirmDelete.email}? They will immediately lose access to PanelIQ.</span>
           </div>
           {submitError && <span className="text-[11px] text-status-error block mb-3">{submitError}</span>}
           <div className="flex gap-3">
             <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={isSubmitting} className="flex-1">Cancel</Button>
             <Button variant="primary" onClick={handleDelete} disabled={isSubmitting} className="flex-1 bg-status-error hover:bg-status-error/80 text-background">
               {isSubmitting ? 'Deleting...' : 'Confirm Delete'}
             </Button>
           </div>
        </div>
      ) : (
        <div className="border border-border bg-surface rounded overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-border/20 text-text-muted text-[10px] uppercase tracking-wider">
                <th className="py-3 px-4 font-medium border-b border-border">Name</th>
                <th className="py-3 px-4 font-medium border-b border-border">Email</th>
                <th className="py-3 px-4 font-medium border-b border-border text-center">Role</th>
                <th className="py-3 px-4 font-medium border-b border-border text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} className={`border-b border-border/30 hover:bg-border/10 transition-colors ${i % 2 === 0 ? '' : 'bg-border/5'}`}>
                  <td className="py-3 px-4 text-small text-text font-medium">{u.name}</td>
                  <td className="py-3 px-4 text-small text-text-muted">{u.email}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-[9px] font-bold uppercase font-mono bg-border/40 text-text-muted px-2 py-0.5 rounded">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleOpenEdit(u)} className="p-1.5 text-text-muted hover:text-primary hover:bg-primary/10 rounded transition-colors"><Edit2 className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setConfirmDelete(u)} className="p-1.5 text-text-muted hover:text-status-error hover:bg-status-error/10 rounded transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan="4" className="py-8 text-center text-small text-text-muted">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
