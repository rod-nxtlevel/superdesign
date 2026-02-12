import React, { useState } from 'react';
import type { DesignFile } from '../../types/canvas.types';
import { useCanvasStore } from '../../store/canvasStore';
import './DesignCard.css';

interface DesignCardProps {
  design: DesignFile;
  isSelected: boolean;
  onClick: (event: React.MouseEvent) => void;
  onSetPrimary: () => void;
}

export const DesignCard: React.FC<DesignCardProps> = ({
  design,
  isSelected,
  onClick,
  onSetPrimary
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const primaryDesignId = useCanvasStore(state => state.primaryDesignId);
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

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  return (
    <div
      className={`design-card ${isSelected ? 'selected' : ''} ${isPrimary ? 'primary' : ''}`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Preview */}
      <div className="card-preview">
        {isHovered && !previewLoaded && design.filePath ? (
          <iframe
            src={design.filePath}
            // No sandbox - allow CDN resources to load
            onLoad={() => {
              console.log('✅ Card preview loaded:', design.name);
              setPreviewLoaded(true);
            }}
            onError={(e) => console.error('❌ Card preview error:', design.name, e)}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              pointerEvents: 'none',
              backgroundColor: 'white'
            }}
          />
        ) : (
          <div className="preview-placeholder">
            <span className="viewport-icon">{viewportIcons[design.viewport || 'desktop']}</span>
          </div>
        )}

        {isPrimary && (
          <div className="primary-badge">
            <span className="codicon codicon-star-full"></span>
            Primary
          </div>
        )}

        {isSelected && (
          <div className="selection-indicator">
            <span className="codicon codicon-check"></span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="card-info">
        <div className="card-header">
          <h3 className="card-title" title={design.name}>
            {design.name}
          </h3>

          <div className="card-actions">
            {!isPrimary && (
              <button
                className="action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onSetPrimary();
                }}
                title="Set as primary"
              >
                <span className="codicon codicon-star"></span>
              </button>
            )}
          </div>
        </div>

        <div className="card-meta">
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
              {viewportIcons[design.viewport] || viewportIcons.desktop} {design.viewport}
            </span>
          )}

          {design.timestamp && (
            <span className="timestamp">
              {formatDate(design.timestamp)}
            </span>
          )}
        </div>

        {design.parentDesign && (
          <div className="parent-info">
            <span className="codicon codicon-git-branch"></span>
            <span className="parent-name">from {design.parentDesign}</span>
          </div>
        )}
      </div>
    </div>
  );
};

