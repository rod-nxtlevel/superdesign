import React from 'react';
import { useCanvasStore, useDesignVariations, useParentDesign } from '../../store/canvasStore';
import { StudioFrame } from './StudioFrame';
import { VariationStrip } from './VariationStrip';
import { HierarchyBreadcrumb } from './HierarchyBreadcrumb';
import './StudioView.css';

export const StudioView: React.FC = () => {
  const { designs, studioDesignId, primaryDesignId, setMode } = useCanvasStore();
  
  // Use primary design if no studio design is set
  const activeDesignId = studioDesignId || primaryDesignId;
  const activeDesign = designs.find(d => d.name === activeDesignId);
  
  const variations = useDesignVariations(activeDesignId || '');
  const parentDesign = useParentDesign(activeDesignId || '');
  
  if (!activeDesign) {
    return (
      <div className="studio-empty">
        <div className="empty-state">
          <div className="empty-icon">🎨</div>
          <h2>No design selected</h2>
          <p>Select a design from the gallery to view it in Studio mode</p>
          <button 
            className="back-btn"
            onClick={() => setMode('gallery')}
          >
            <span className="codicon codicon-arrow-left"></span>
            Back to Gallery
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="studio-view">
      {/* Header */}
      <div className="studio-header">
        <button 
          className="back-btn"
          onClick={() => setMode('gallery')}
        >
          <span className="codicon codicon-arrow-left"></span>
          Gallery
        </button>
        
        <HierarchyBreadcrumb 
          design={activeDesign}
          parentDesign={parentDesign}
        />
        
        <div className="header-spacer"></div>
      </div>
      
      {/* Main content */}
      <div className="studio-content">
        <StudioFrame design={activeDesign} />
      </div>
      
      {/* Variations strip */}
      {variations.length > 0 && (
        <VariationStrip 
          variations={variations}
          activeDesignId={activeDesignId || ''}
        />
      )}
    </div>
  );
};

