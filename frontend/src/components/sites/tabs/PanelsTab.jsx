import React, { useState, useEffect } from 'react';
import { getSitePanels } from '../../../api/panels';
import { Loader2, Plus, MoreVertical, Edit2, Trash2, Eye } from 'lucide-react';
import { Button } from '../../ui/Button';
import { AddPanelModal } from './AddPanelModal';

export const PanelsTab = ({ site }) => {
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
      const data = await getSitePanels(site.id);
      setPanels(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (site?.id) fetchPanels();
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
        <h3 className="text-body font-semibold text-txt">Site Panels ({panels.length})</h3>
        <Button size="small" variant="primary" onClick={() => setIsAddModalOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Panel
        </Button>
      </div>

      <div className="card p-0 flex-1 overflow-visible">
        {panels.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-txt-muted p-4">
            <span className="text-caption mb-2">No panels registered for this site.</span>
            <Button size="small" variant="outline" onClick={() => setIsAddModalOpen(true)}>Add First Panel</Button>
          </div>
        ) : (
          <table className="w-full text-left whitespace-nowrap">
            <thead className="table-header">
              <tr>
                <th className="py-2 px-3 w-[25%]">Panel ID</th>
                <th className="py-2 px-3 text-right">Actual</th>
                <th className="py-2 px-3 text-right">Expected</th>
                <th className="py-2 px-3 text-right">Performance</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3 text-right w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {panels.map((panel) => {
                const perf = panel.status === 'ACTIVE' ? '100%' : (panel.status === 'OFFLINE' ? '—' : '100%');
                const isOnline = panel.status === 'ACTIVE';

                return (
                  <tr key={panel.id} className="table-row text-caption">
                    <td className="table-cell font-medium text-txt">
                      {panel.panel_id_string || `P${panel.id.toString().padStart(3, '0')}`}
                    </td>
                    <td className="table-cell font-mono text-txt text-right">
                      {panel.rated_power_w} W
                    </td>
                    <td className="table-cell-muted font-mono text-right">
                      {panel.rated_power_w} W
                    </td>
                    <td className="table-cell font-mono text-right font-medium">
                      {perf}
                    </td>
                    <td className="table-cell">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-success' : 'bg-txt-muted'}`} />
                        <span className={isOnline ? 'text-success' : 'text-txt-muted'}>{panel.status || 'UNKNOWN'}</span>
                      </span>
                    </td>
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
                        <div className="absolute right-3 top-8 w-28 bg-surface border border-border rounded-lg shadow-dropdown z-50 py-1 text-left">
                          <button className="w-full px-3 py-1.5 text-caption hover:bg-surface-hover flex items-center text-txt"><Eye className="h-3 w-3 mr-1.5 text-txt-muted" /> View</button>
                          <button className="w-full px-3 py-1.5 text-caption hover:bg-surface-hover flex items-center text-txt"><Edit2 className="h-3 w-3 mr-1.5 text-txt-muted" /> Edit</button>
                          <button className="w-full px-3 py-1.5 text-caption text-error hover:bg-error/10 flex items-center"><Trash2 className="h-3 w-3 mr-1.5" /> Delete</button>
                        </div>
                      )}
                    </td>
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
