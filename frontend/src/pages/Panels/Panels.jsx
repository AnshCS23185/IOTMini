import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getSites } from '../../api/sites';
import { getAllPanels, getPanelsSummary, createPanel, updatePanel, updatePanelStatus, deletePanel } from '../../api/panels';
import { 
  Search, Plus, MoreVertical, Grid2X2, Zap, 
  CheckCircle2, AlertCircle, Edit3, Power, Trash2, Info, X 
} from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';

// ─── Reusable Modal Shell ────────────────────────────────────────
const Modal = ({ isOpen, onClose, title, children, width = 'max-w-md' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-surface-elevated border border-border rounded-xl shadow-2xl w-full ${width} mx-4 max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-[16px] font-semibold text-txt">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-surface-hover text-txt-muted hover:text-txt cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
};

// ─── Add/Edit Panel Modal ────────────────────────────────────────
const PanelFormModal = ({ isOpen, onClose, onSuccess, panel, sites }) => {
  const isEdit = !!panel;
  const [form, setForm] = useState({
    name: '', rated_power_w: '', technology: '', tilt: '', azimuth: '', system_losses: '14.0', site_id: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isEdit && panel) {
      setForm({
        name: panel.name || '',
        rated_power_w: String(panel.rated_power_w || ''),
        technology: panel.technology || '',
        tilt: panel.tilt != null ? String(panel.tilt) : '',
        azimuth: panel.azimuth != null ? String(panel.azimuth) : '',
        system_losses: panel.system_losses != null ? String(panel.system_losses) : '14.0',
        site_id: String(panel.site_id || ''),
      });
    } else {
      setForm({ name: '', rated_power_w: '', technology: '', tilt: '', azimuth: '', system_losses: '14.0', site_id: sites.length > 0 ? String(sites[0].id) : '' });
    }
    setError(null);
  }, [isEdit, panel, isOpen, sites]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.rated_power_w || !form.site_id) {
      setError('Name, rated power, and site are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        rated_power_w: parseFloat(form.rated_power_w),
        technology: form.technology.trim() || null,
        tilt: form.tilt ? parseFloat(form.tilt) : null,
        azimuth: form.azimuth ? parseFloat(form.azimuth) : null,
        system_losses: form.system_losses ? parseFloat(form.system_losses) : 14.0,
        site_id: parseInt(form.site_id),
      };
      if (isEdit) {
        await updatePanel(panel.id, payload);
      } else {
        payload.status = 'ACTIVE';
        await createPanel(parseInt(form.site_id), payload);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const fieldClass = "input-base w-full";
  const labelClass = "text-caption uppercase tracking-wider font-semibold text-txt-muted mb-1";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Panel' : 'Add Panel'} width="max-w-lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        {error && <div className="text-small text-error bg-error/10 border border-error/25 rounded-lg px-3 py-2">{error}</div>}

        <div>
          <label className={labelClass}>Site *</label>
          <select className={fieldClass} value={form.site_id} onChange={e => setForm({...form, site_id: e.target.value})} disabled={isEdit}>
            <option value="">Select a site</option>
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div>
          <label className={labelClass}>Panel Name *</label>
          <input className={fieldClass} value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Panel A1" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Rated Power (W) *</label>
            <input className={fieldClass} type="number" step="0.1" value={form.rated_power_w} onChange={e => setForm({...form, rated_power_w: e.target.value})} placeholder="e.g. 400" />
          </div>
          <div>
            <label className={labelClass}>Technology</label>
            <input className={fieldClass} value={form.technology} onChange={e => setForm({...form, technology: e.target.value})} placeholder="e.g. Mono-Si" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Tilt (°)</label>
            <input className={fieldClass} type="number" step="0.1" value={form.tilt} onChange={e => setForm({...form, tilt: e.target.value})} placeholder="30" />
          </div>
          <div>
            <label className={labelClass}>Azimuth (°)</label>
            <input className={fieldClass} type="number" step="0.1" value={form.azimuth} onChange={e => setForm({...form, azimuth: e.target.value})} placeholder="180" />
          </div>
          <div>
            <label className={labelClass}>Losses (%)</label>
            <input className={fieldClass} type="number" step="0.1" value={form.system_losses} onChange={e => setForm({...form, system_losses: e.target.value})} placeholder="14" />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border mt-1">
          <Button type="button" variant="outline" size="small" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" size="small" disabled={saving}>
            {saving ? 'Saving...' : (isEdit ? 'Save Changes' : 'Add Panel')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// ─── Confirm Modal (deactivate / delete) ─────────────────────────
const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmLabel, variant = 'primary', loading }) => (
  <Modal isOpen={isOpen} onClose={onClose} title={title}>
    <p className="text-small text-txt-muted mb-5 leading-relaxed">{message}</p>
    <div className="flex justify-end gap-2">
      <Button variant="outline" size="small" onClick={onClose}>Cancel</Button>
      <Button variant={variant} size="small" onClick={onConfirm} disabled={loading}>
        {loading ? 'Processing...' : confirmLabel}
      </Button>
    </div>
  </Modal>
);


// ═══════════════════════════════════════════════════════════════════
// PANELS PAGE
// ═══════════════════════════════════════════════════════════════════
const Panels = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

  const [panels, setPanels] = useState([]);
  const [sites, setSites] = useState([]);
  const [summary, setSummary] = useState({ total_panels: 0, active_panels: 0, inactive_panels: 0, total_rated_power_w: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [siteFilter, setSiteFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [showAddEdit, setShowAddEdit] = useState(false);
  const [editPanel, setEditPanel] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'deactivate'|'delete', panel }
  const [actionLoading, setActionLoading] = useState(false);

  // Action menu
  const [openMenuId, setOpenMenuId] = useState(null);

  // Toast
  const [feedback, setFeedback] = useState(null);

  const showFeedback = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const siteId = siteFilter !== 'ALL' ? parseInt(siteFilter) : null;
      const [panelsList, sitesList, summaryData] = await Promise.all([
        getAllPanels(siteId),
        getSites().catch(() => []),
        getPanelsSummary(siteId).catch(() => ({ total_panels: 0, active_panels: 0, inactive_panels: 0, total_rated_power_w: 0 })),
      ]);
      setPanels(panelsList);
      setSites(sitesList);
      setSummary(summaryData);
    } catch (err) {
      console.error(err);
      setError('Unable to load panels.');
    } finally {
      setLoading(false);
    }
  }, [siteFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Close menu on outside click
  useEffect(() => {
    const handler = () => setOpenMenuId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // Filter logic
  const filteredPanels = panels.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.site_name || '').toLowerCase().includes(q) || (p.technology || '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // ─── Action handlers ──────────────────────────────────────────
  const handleStatusToggle = async () => {
    if (!confirmAction?.panel) return;
    setActionLoading(true);
    try {
      const newStatus = confirmAction.panel.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await updatePanelStatus(confirmAction.panel.id, newStatus);
      showFeedback(`Panel ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'} successfully.`);
      setConfirmAction(null);
      fetchData();
    } catch (err) {
      showFeedback(err.message || 'Failed to update status.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmAction?.panel) return;
    setActionLoading(true);
    try {
      await deletePanel(confirmAction.panel.id);
      showFeedback('Panel deleted successfully.');
      setConfirmAction(null);
      fetchData();
    } catch (err) {
      showFeedback(err.message || 'Failed to delete panel.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Summary stat cards config ────────────────────────────────
  const formattedPower = summary.total_rated_power_w >= 1000
    ? `${(summary.total_rated_power_w / 1000).toFixed(1)} kW`
    : `${summary.total_rated_power_w.toFixed(0)} W`;

  const stats = [
    { label: 'Total Panels', value: summary.total_panels, icon: Grid2X2, iconColor: 'text-[#C6C0D0]', iconBg: 'bg-[rgba(198,192,208,0.10)]' },
    { label: 'Active', value: summary.active_panels, icon: CheckCircle2, iconColor: 'text-success', iconBg: 'bg-success/10' },
    { label: 'Inactive', value: summary.inactive_panels, icon: AlertCircle, iconColor: 'text-txt-muted', iconBg: 'bg-surface-secondary' },
    { label: 'Total Rated', value: formattedPower, icon: Zap, iconColor: 'text-[#D59D80]', iconBg: 'bg-[rgba(213,157,128,0.10)]' },
  ];

  // ─── Loading / Error states ───────────────────────────────────
  if (loading && panels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full gap-2 bg-background">
        <div className="h-5 w-5 rounded-full border-2 border-[#B86F50] border-t-transparent animate-spin" />
        <span className="text-small text-txt-muted">Loading panels...</span>
      </div>
    );
  }

  if (error && panels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full gap-3 bg-background">
        <AlertCircle className="h-6 w-6 text-error" />
        <span className="text-small text-error font-medium">{error}</span>
        <Button variant="outline" size="small" onClick={fetchData}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">

      {/* Toast */}
      {feedback && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg border shadow-xl text-small font-medium animate-in ${
          feedback.type === 'error'
            ? 'bg-error/15 text-error border-error/30'
            : 'bg-success/15 text-success border-success/30'
        }`}>
          {feedback.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* 1. Header */}
      <div className="flex justify-between items-center mb-5 shrink-0">
        <div>
          <h1 className="text-[26px] sm:text-[28px] font-bold text-txt leading-tight tracking-tight">Panels</h1>
          <p className="text-[13px] sm:text-[14px] text-txt-muted mt-0.5 font-normal">
            Manage solar panel assets across all sites.
          </p>
        </div>
        {isAdmin && (
          <Button variant="primary" size="medium" onClick={() => { setEditPanel(null); setShowAddEdit(true); }}>
            <Plus className="h-4 w-4" />
            <span>Add Panel</span>
          </Button>
        )}
      </div>

      {/* 2. Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 shrink-0">
        {stats.map(s => (
          <div key={s.label} className="bg-surface border border-border rounded-lg p-3 flex items-center justify-between transition-colors">
            <div className="flex items-center gap-2.5">
              <div className={`h-8 w-8 rounded-md flex items-center justify-center ${s.iconBg}`}>
                <s.icon className={`h-4 w-4 ${s.iconColor}`} strokeWidth={1.8} />
              </div>
              <span className="text-caption font-medium text-txt-muted">{s.label}</span>
            </div>
            <span className="text-[20px] sm:text-[22px] font-bold text-txt tracking-tight font-mono">{s.value}</span>
          </div>
        ))}
      </div>

      {/* 3. Filters */}
      <div className="flex flex-wrap items-center gap-2.5 mb-4 shrink-0">
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-txt-muted" />
          <input
            type="text"
            placeholder="Search panels..."
            className="input-base pl-9 w-full"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          className="input-base px-3 w-44 cursor-pointer"
          value={siteFilter}
          onChange={e => setSiteFilter(e.target.value)}
        >
          <option value="ALL">Site: All</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        <select
          className="input-base px-3 w-36 cursor-pointer"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="ALL">Status: All</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {/* 4. Table */}
      <div className="flex-1 min-h-0 overflow-auto border border-border rounded-lg bg-surface">
        {filteredPanels.length === 0 ? (
          <div className="p-12 text-center text-txt-muted text-small">
            {searchQuery ? 'No panels match your search.' : 'No panels registered. Add your first panel.'}
          </div>
        ) : (
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="table-header sticky top-0 z-10">
                <th className="py-3 px-3.5 font-semibold" style={{ width: '22%' }}>Panel</th>
                <th className="py-3 px-3.5 font-semibold" style={{ width: '18%' }}>Site</th>
                <th className="py-3 px-3.5 font-semibold text-right" style={{ width: '12%' }}>Rated Power</th>
                <th className="py-3 px-3.5 font-semibold" style={{ width: '12%' }}>Technology</th>
                <th className="py-3 px-3.5 font-semibold text-right" style={{ width: '8%' }}>Tilt</th>
                <th className="py-3 px-3.5 font-semibold text-right" style={{ width: '8%' }}>Azimuth</th>
                <th className="py-3 px-3.5 font-semibold" style={{ width: '10%' }}>Status</th>
                {isAdmin && <th className="py-3 px-3.5 text-center" style={{ width: '5%' }}></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredPanels.map(panel => (
                <tr
                  key={panel.id}
                  onClick={() => navigate(`/panels/${panel.id}`)}
                  className="table-row cursor-pointer group h-[54px]"
                >
                  <td className="table-cell">
                    <span className="text-[13px] font-semibold text-txt leading-snug">{panel.name}</span>
                  </td>
                  <td className="table-cell-muted truncate max-w-[180px]" title={panel.site_name}>
                    {panel.site_name || `Site ${panel.site_id}`}
                  </td>
                  <td className="table-cell text-right font-mono font-medium text-txt">
                    {panel.rated_power_w} W
                  </td>
                  <td className="table-cell-muted">
                    {panel.technology || '—'}
                  </td>
                  <td className="table-cell-muted text-right font-mono">
                    {panel.tilt != null ? `${panel.tilt}°` : '—'}
                  </td>
                  <td className="table-cell-muted text-right font-mono">
                    {panel.azimuth != null ? `${panel.azimuth}°` : '—'}
                  </td>
                  <td className="table-cell">
                    <StatusBadge status={panel.status || 'ACTIVE'} />
                  </td>

                  {/* Admin-only actions column */}
                  {isAdmin && (
                    <td className="table-cell text-center relative">
                      <button
                        className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                          openMenuId === panel.id ? 'text-txt bg-surface-hover' : 'text-txt-muted group-hover:text-txt hover:bg-surface-hover'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === panel.id ? null : panel.id);
                        }}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {openMenuId === panel.id && (
                        <div
                          className="absolute right-6 top-1/2 -translate-y-1/2 w-44 bg-surface-elevated border border-border rounded-lg shadow-2xl z-50 py-1"
                          onClick={e => e.stopPropagation()}
                        >
                          {/* Details */}
                          <button
                            className="w-full text-left px-3 py-2 text-small hover:bg-surface-hover flex items-center gap-2 text-txt cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); navigate(`/panels/${panel.id}`); }}
                          >
                            <Info className="h-3.5 w-3.5 text-txt-muted" /> Details
                          </button>

                          {/* Edit */}
                          <button
                            className="w-full text-left px-3 py-2 text-small hover:bg-surface-hover flex items-center gap-2 text-txt cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); setEditPanel(panel); setShowAddEdit(true); }}
                          >
                            <Edit3 className="h-3.5 w-3.5 text-txt-muted" /> Edit
                          </button>

                          {/* Activate / Deactivate */}
                          <button
                            className="w-full text-left px-3 py-2 text-small hover:bg-surface-hover flex items-center gap-2 text-txt cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); setConfirmAction({ type: 'deactivate', panel }); }}
                          >
                            <Power className="h-3.5 w-3.5 text-txt-muted" />
                            {panel.status === 'INACTIVE' ? 'Activate' : 'Deactivate'}
                          </button>

                          <div className="h-px bg-border my-1" />

                          {/* Delete */}
                          <button
                            className="w-full text-left px-3 py-2 text-small text-error hover:bg-error/10 flex items-center gap-2 cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); setConfirmAction({ type: 'delete', panel }); }}
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ─── Modals ───────────────────────────────────────────────── */}
      <PanelFormModal
        isOpen={showAddEdit}
        onClose={() => { setShowAddEdit(false); setEditPanel(null); }}
        onSuccess={fetchData}
        panel={editPanel}
        sites={sites}
      />

      {/* Deactivate / Activate confirmation */}
      {confirmAction?.type === 'deactivate' && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setConfirmAction(null)}
          onConfirm={handleStatusToggle}
          title={confirmAction.panel.status === 'INACTIVE' ? 'Activate Panel' : 'Deactivate Panel'}
          message={
            confirmAction.panel.status === 'INACTIVE'
              ? `Are you sure you want to activate "${confirmAction.panel.name}"? It will resume normal monitoring.`
              : `Are you sure you want to deactivate "${confirmAction.panel.name}"? This panel will be excluded from performance calculations.`
          }
          confirmLabel={confirmAction.panel.status === 'INACTIVE' ? 'Activate' : 'Deactivate'}
          variant="primary"
          loading={actionLoading}
        />
      )}

      {/* Delete confirmation */}
      {confirmAction?.type === 'delete' && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setConfirmAction(null)}
          onConfirm={handleDelete}
          title="Delete Panel"
          message={`Are you sure you want to permanently delete "${confirmAction.panel.name}"? This action cannot be undone. All associated performance data and diagnostics will be lost.`}
          confirmLabel="Delete"
          variant="danger"
          loading={actionLoading}
        />
      )}

    </div>
  );
};

export default Panels;
