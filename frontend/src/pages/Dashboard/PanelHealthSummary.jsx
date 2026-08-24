import React from 'react';
import { Badge } from '../../components/ui/Badge';

const PanelHealthSummary = ({ data }) => {
  if (!data) return null;

  return (
    <div className="flex flex-col sm:flex-row gap-4 p-3 border border-border bg-surface rounded items-center mb-4 shadow-sm">
      <span className="text-small font-semibold text-text whitespace-nowrap">
        PANELS ({data.total_panels})
      </span>
      
      <div className="h-4 w-px bg-border hidden sm:block"></div>
      
      <div className="flex flex-wrap gap-2">
        {data.healthy_panels > 0 && (
          <Badge variant="outline" className="text-status-healthy border-status-healthy/30 bg-status-healthy/5">
            Healthy: {data.healthy_panels}
          </Badge>
        )}
        
        {data.attention_panels > 0 && (
          <Badge variant="outline" className="text-status-attention border-status-attention/30 bg-status-attention/5">
            Attention: {data.attention_panels}
          </Badge>
        )}
        
        {data.underperforming_panels > 0 && (
          <Badge variant="outline" className="text-status-warning border-status-warning/30 bg-status-warning/5">
            Underperforming: {data.underperforming_panels}
          </Badge>
        )}
        
        {data.no_data_panels > 0 && (
          <Badge variant="outline" className="text-status-neutral border-status-neutral/30 bg-status-neutral/5">
            No Data: {data.no_data_panels}
          </Badge>
        )}
        
        {data.no_solar_panels > 0 && (
          <Badge variant="outline" className="text-status-neutral border-status-neutral/30 bg-status-neutral/5">
            No Solar: {data.no_solar_panels}
          </Badge>
        )}
      </div>
    </div>
  );
};

export default PanelHealthSummary;
