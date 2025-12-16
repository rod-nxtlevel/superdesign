import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { CompareFrame } from './CompareFrame';
import './CompareView.css';

export const CompareView: React.FC = () => {
  const { designs, compareSet, removeFromCompare, setMode } = useCanvasStore();
  
  const compareDesigns = designs.filter(d => compareSet.includes(d.name));
  
  if (compareDesigns.length === 0) {
    return (
      <div className="compare-empty">
        <div className="empty-state">
          <div className="empty-icon">⚖️</div>
          <h2>No designs to compare</h2>
          <p>Select 2-3 designs from the gallery to compare them side by side</p>
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
    <div className="compare-view">
      <div className="compare-header">
        <button 
          className="back-btn"
          onClick={() => setMode('gallery')}
        >
          <span className="codicon codicon-arrow-left"></span>
          Gallery
        </button>
        
        <h2 className="compare-title">
          Comparing {compareDesigns.length} design{compareDesigns.length !== 1 ? 's' : ''}
        </h2>
        
        <div className="header-spacer"></div>
      </div>
      
      <div className={`compare-grid compare-${compareDesigns.length}`}>
        {compareDesigns.map(design => (
          <CompareFrame
            key={design.name}
            design={design}
            onRemove={() => removeFromCompare(design.name)}
          />
        ))}
      </div>
    </div>
  );
};

