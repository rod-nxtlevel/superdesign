import React from 'react';
import type { DesignFile } from '../../types/canvas.types';
import { useCanvasStore } from '../../store/canvasStore';
import './VariationStrip.css';

interface VariationStripProps {
  variations: DesignFile[];
  activeDesignId: string;
}

export const VariationStrip: React.FC<VariationStripProps> = ({ 
  variations, 
  activeDesignId 
}) => {
  const { setStudioDesignId, addToCompare } = useCanvasStore();
  
  const viewportIcons: Record<string, string> = {
    mobile: '📱',
    tablet: '📱',
    desktop: '🖥️'
  };
  
  const statusColors: Record<string, string> = {
    draft: 'var(--vscode-charts-yellow)',
    review: 'var(--vscode-charts-blue)',
    approved: 'var(--vscode-charts-green)',
    archived: 'var(--vscode-descriptionForeground)'
  };
  
  return (
    <div className="variation-strip">
      <div className="strip-header">
        <h3 className="strip-title">
          <span className="codicon codicon-git-branch"></span>
          Variations ({variations.length})
        </h3>
      </div>
      
      <div className="strip-content">
        {variations.map(variation => (
          <div
            key={variation.name}
            className={`variation-card ${activeDesignId === variation.name ? 'active' : ''}`}
            onClick={() => setStudioDesignId(variation.name)}
          >
            <div className="variation-preview">
              <span className="viewport-icon">{viewportIcons[variation.viewport || 'desktop']}</span>
            </div>
            
            <div className="variation-info">
              <h4 className="variation-name" title={variation.name}>
                {variation.name}
              </h4>
              
              <div className="variation-meta">
                {variation.status && (
                  <span 
                    className="status-dot"
                    style={{ backgroundColor: statusColors[variation.status] || statusColors.draft }}
                  ></span>
                )}
                {variation.viewport && (
                  <span className="viewport-text">{variation.viewport}</span>
                )}
              </div>
            </div>
            
            <div className="variation-actions">
              <button
                className="action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  addToCompare(variation.name);
                }}
                title="Add to comparison"
              >
                <span className="codicon codicon-split-horizontal"></span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

