import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSitePanels, deletePanel } from '../../../api/panels';
import { getDashboard } from '../../../api/dashboard';
import { useAuth } from '../../../context/AuthContext';
import { Loader2, Plus, MoreVertical, Edit2, Trash2, Eye } from 'lucide-react';
import { Button } from '../../ui/Button';
import { StatusBadge } from '../../ui/StatusBadge';
import { AddPanelModal } from './AddPanelModal';

export const PanelsTab = ({ site }) => {
  const { user } = useAuth();
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
  const navigate = useNavigate();

  const [panels, setPanels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchPanels = async () => {
    try {
      setLoading(true);
      const [configData, dashData] = await Promise.all([
        getSitePanels(site.id),
        getDashboard(site.id).catch(() => ({ panels: [] }))
      ]);
      
      const merged = configData.map(panel => {
        const dashPanel = dashData.panels?.find(p => p.id === panel.id);
        return {
          ...panel,
          actual_power_w: dashPanel?.actual_power_w,
          expected_power_w: dashPanel?.expected_power_w,
          performance_percentage: dashPanel?.performance_percentage,
          computed_status: dashPanel?.status || panel.status
        };
      });
      
      setPanels(merged);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (site?.id) fetchPanels();
  }, [site]);

  const handleDelete = async (panelId) => {
    if (window.confirm("Are you sure you want to delete this panel?")) {
      try {
        await deletePanel(panelId);
        fetchPanels();
      } catch (err) {
        console.error("Failed to delete panel");
      }
    }
  };

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
        <h3 className="text-body font-semibold text-txt">Site Panels ({panels.length})</h3>
        {isAdmin && (
          <Button size="small" variant="primary" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Panel
          </Button>
        )}
      </div>

      <div className="card p-0 flex-1 overflow-visible">
        {panels.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-txt-muted p-4">
            <span className="text-caption mb-2">No panels registered for this site.</span>
            {isAdmin && <Button size="small" variant="outline" onClick={() => setIsAddModalOpen(true)}>Add First Panel</Button>}
          </div>
        ) : (
          <table className="w-full text-left whitespace-nowrap">
            <thead className="table-header">
              <tr>
                <th className="py-2 px-3 w-[25%]">Panel</th>
                <th className="py-2 px-3 text-right">Actual</th>
                <th className="py-2 px-3 text-right">Expected</th>
                <th className="py-2 px-3 text-right">Performance</th>
                <th className="py-2 px-3">Status</th>
                {isAdmin && <th className="py-2 px-3 text-right w-10"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {panels.map((panel) => {
                const isNoData = panel.actual_power_w == null;
                const isNight = panel.expected_power_w === 0;
                
                let perfStr = '—';
                if (!isNoData && !isNight && panel.performance_percentage != null) {
                  perfStr = `${panel.performance_percentage.toFixed(1)}%`;
                }

                const actualStr = isNoData ? '—' : (isNight ? '0.0 W' : `${panel.actual_power_w.toFixed(1)} W`);
                const expectedStr = `${panel.expected_power_w?.toFixed(1) || 0} W`;

                return (
                  <tr key={panel.id} className="table-row text-caption cursor-pointer hover:bg-surface-hover" onClick={() => navigate(`/panels/${panel.id}`)}>
                    <td className="table-cell font-medium text-txt">
                      {panel.name || `P${panel.id.toString().padStart(3, '0')}`}
                    </td>
                    <td className="table-cell font-mono text-txt text-right">
                      {actualStr}
                    </td>
                    <td className="table-cell-muted font-mono text-right">
                      {expectedStr}
                    </td>
                    <td className="table-cell font-mono text-right font-medium">
                      {perfStr}
                    </td>
                    <td className="table-cell">
                      <StatusBadge status={panel.computed_status || panel.status} />
                    </td>
                    {isAdmin && (
                      <td className="table-cell text-right relative">
                        <button 
                          className="p-1 text-txt-muted hover:text-txt hover:bg-surface-hover rounded transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === panel.id ? null : panel.id);
                          }}
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>
                        {openMenuId === panel.id && (
                          <div className="absolute right-8 top-1 w-28 bg-surface border border-border rounded-lg shadow-dropdown z-50 py-1 text-left">
                            <button className="w-full px-3 py-1.5 text-caption hover:bg-surface-hover flex items-center text-txt" onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); navigate(`/panels/${panel.id}`); }}><Eye className="h-3 w-3 mr-1.5 text-txt-muted" /> View</button>
                            <button className="w-full px-3 py-1.5 text-caption text-error hover:bg-error/10 flex items-center" onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); handleDelete(panel.id); }}><Trash2 className="h-3 w-3 mr-1.5" /> Delete</button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <AddPanelModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        siteId={site.id} 
        onSuccess={fetchPanels} 
      />
    </div>
  );
};
