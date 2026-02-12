import React, { useState } from 'react';
import type { DesignFile } from '../../types/canvas.types';
import { useCanvasStore } from '../../store/canvasStore';
import './StudioFrame.css';

interface StudioFrameProps {
  design: DesignFile;
}

export const StudioFrame: React.FC<StudioFrameProps> = ({ design }) => {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const { setPrimaryDesignId, primaryDesignId, updateDesign, addToCompare } = useCanvasStore();
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

  const handleSetPrimary = () => {
    setPrimaryDesignId(design.name);
  };

  const handleSetStatus = (status: 'draft' | 'review' | 'approved' | 'archived') => {
    // Note: status is optional in DesignFile, so we can't use updateDesign directly
    // We need to send a message to the extension instead

    // Send message to extension
    if (typeof acquireVsCodeApi !== 'undefined') {
      const vscode = acquireVsCodeApi();
      vscode.postMessage({
        command: 'design:action',
        designId: design.name,
        action: 'setStatus',
        value: status
      });
    }
  };

  const handleCopyPrompt = () => {
    if (typeof acquireVsCodeApi !== 'undefined') {
      const vscode = acquireVsCodeApi();
      vscode.postMessage({
        command: 'design:action',
        designId: design.name,
        action: 'copyPrompt'
      });
    }
  };

  const handleCopyPath = () => {
    if (typeof acquireVsCodeApi !== 'undefined') {
      const vscode = acquireVsCodeApi();
      vscode.postMessage({
        command: 'design:action',
        designId: design.name,
        action: 'copyPath'
      });
    }
  };

  const handleOpenExternal = () => {
    if (typeof acquireVsCodeApi !== 'undefined') {
      const vscode = acquireVsCodeApi();
      vscode.postMessage({
        command: 'design:action',
        designId: design.name,
        action: 'openExternal'
      });
    }
  };

  const handleIterate = () => {
    if (typeof acquireVsCodeApi !== 'undefined' && design.filePath) {
      const vscode = acquireVsCodeApi();
      vscode.postMessage({
        command: 'chat:setContext',
        fileUri: design.filePath
      });
    }
  };

  return (
    <div className="studio-frame">
      {/* Toolbar */}
      <div className="studio-toolbar">
        <div className="toolbar-left">
          <h2 className="design-title" title={design.name}>
            {design.name}
          </h2>

          <div className="design-meta">
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
          </div>
        </div>

        <div className="toolbar-right">
          {!isPrimary && (
            <button
              className="toolbar-btn"
              onClick={handleSetPrimary}
              title="Set as primary"
            >
              <span className="codicon codicon-star"></span>
              Set Primary
            </button>
          )}

          {isPrimary && (
            <span className="primary-indicator">
              <span className="codicon codicon-star-full"></span>
              Primary
            </span>
          )}

          <div className="status-dropdown">
            <button className="toolbar-btn">
              <span className="codicon codicon-tag"></span>
              Status
            </button>
            <div className="dropdown-menu">
              <button onClick={() => handleSetStatus('draft')}>Draft</button>
              <button onClick={() => handleSetStatus('review')}>Review</button>
              <button onClick={() => handleSetStatus('approved')}>Approved</button>
              <button onClick={() => handleSetStatus('archived')}>Archived</button>
            </div>
          </div>

          <button
            className="toolbar-btn"
            onClick={() => addToCompare(design.name)}
            title="Add to comparison"
          >
            <span className="codicon codicon-split-horizontal"></span>
          </button>

          <div className="toolbar-divider"></div>

          <button
            className="toolbar-btn"
            onClick={handleCopyPrompt}
            title="Copy prompt"
          >
            <span className="codicon codicon-comment"></span>
          </button>

          <button
            className="toolbar-btn"
            onClick={handleCopyPath}
            title="Copy file path"
          >
            <span className="codicon codicon-file"></span>
          </button>

          <button
            className="toolbar-btn"
            onClick={handleOpenExternal}
            title="Open in browser"
          >
            <span className="codicon codicon-link-external"></span>
          </button>

          <button
            className="toolbar-btn primary"
            onClick={handleIterate}
            title="Iterate with AI"
          >
            <span className="codicon codicon-sparkle"></span>
            Iterate
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="studio-content">
        {!iframeLoaded && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p>Loading design...</p>
          </div>
        )}

        {design.content ? (
          (() => {
            // Same approach as old DesignFrame - inject CSP into content
            let modifiedContent = design.content;

            // Permissive CSP that allows external resources
            const iframeCSP = `<meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https: http:; img-src 'self' data: blob: https: http: *; style-src 'self' 'unsafe-inline' data: https: http: *; script-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https: http: *; connect-src 'self' https: http: *; font-src 'self' data: https: http: *; frame-src 'self' data: blob: https: http: *;">`;

            // Inject CSP into head
            if (modifiedContent.includes('<head>')) {
              modifiedContent = modifiedContent.replace('<head>', `<head>\n${iframeCSP}`);
            } else if (modifiedContent.includes('<html>')) {
              modifiedContent = modifiedContent.replace('<html>', `<html><head>\n${iframeCSP}\n</head>`);
            } else {
              modifiedContent = `<head>\n${iframeCSP}\n</head>\n${modifiedContent}`;
            }

            console.log('🎯 StudioFrame rendering with srcDoc, content length:', modifiedContent.length);

            return (
              <iframe
                srcDoc={modifiedContent}
                title={`${design.name} - Studio View`}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  background: 'white',
                  display: iframeLoaded ? 'block' : 'none'
                }}
                onLoad={() => {
                  console.log('✅ Studio iframe loaded:', design.name);
                  setIframeLoaded(true);
                }}
                onError={(e) => {
                  console.error('❌ Studio iframe error:', e);
                }}
              />
            );
          })()
        ) : (
          <div style={{ padding: '20px', color: 'red' }}>
            ⚠️ No content available for this design (design.content is empty)
          </div>
        )}
      </div>
    </div>
  );
};
