import React, { useState } from 'react';
import type { DesignFile } from '../../types/canvas.types';
import { useCanvasStore } from '../../store/canvasStore';
import './CompareFrame.css';

interface CompareFrameProps {
  design: DesignFile;
  onRemove: () => void;
}

export const CompareFrame: React.FC<CompareFrameProps> = ({ design, onRemove }) => {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const { setMode, setPrimaryDesignId, primaryDesignId } = useCanvasStore();
  const isPrimary = primaryDesignId === design.name;
  
  const statusColors: Record<string, string> = {
    draft: 'var(--vscode-charts-yellow)',
    review: 'var(--vscode-charts-blue)',
    approved: 'var(--vscode-charts-green)',
    archived: 'var(--vscode-descriptionForeground)'
  };
  
  const viewportIcons: Record<string, string> = {
    mobile: '📱',
    tablet: '📱',
    desktop: '🖥️'
  };
  
  const handleOpenInStudio = () => {
    setMode('studio', design.name);
  };
  
  const handleSetPrimary = () => {
    setPrimaryDesignId(design.name);
  };
  
  return (
    <div className="compare-frame">
      {/* Header */}
      <div className="frame-header">
        <div className="header-left">
          <h3 className="frame-title" title={design.name}>
            {design.name}
          </h3>
          
          <div className="frame-meta">
            {design.status && (
              <span 
                className="status-badge"
                style={{ backgroundColor: statusColors[design.status] || statusColors.draft }}
              >
                {design.status}
              </span>
            )}
            
            {design.viewport && (
              <span className="viewport-badge">
                {viewportIcons[design.viewport] || viewportIcons.desktop}
              </span>
            )}
          </div>
        </div>
        
        <div className="header-actions">
          {isPrimary && (
            <span className="primary-indicator">
              <span className="codicon codicon-star-full"></span>
              Primary
            </span>
          )}
          
          {!isPrimary && (
            <button
              className="action-btn"
              onClick={handleSetPrimary}
              title="Set as primary"
            >
              <span className="codicon codicon-star"></span>
            </button>
          )}
          
          <button
            className="action-btn"
            onClick={handleOpenInStudio}
            title="Open in Studio"
          >
            <span className="codicon codicon-eye"></span>
          </button>
          
          <button
            className="action-btn danger"
            onClick={onRemove}
            title="Remove from comparison"
          >
            <span className="codicon codicon-close"></span>
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="frame-content">
        {!iframeLoaded && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p>Loading design...</p>
          </div>
        )}
        
        {design.filePath && (
          <iframe
            src={design.filePath}
            sandbox="allow-scripts allow-same-origin"
            onLoad={() => setIframeLoaded(true)}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: iframeLoaded ? 'block' : 'none'
            }}
          />
        )}
      </div>
      
      {/* Footer */}
      {design.parentDesign && (
        <div className="frame-footer">
          <span className="codicon codicon-git-branch"></span>
          <span className="parent-name">Variation of {design.parentDesign}</span>
        </div>
      )}
    </div>
  );
};

