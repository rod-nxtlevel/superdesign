import React, { useState } from 'react';
import { useCanvasStore, useFilteredDesigns } from '../../store/canvasStore';
import { DesignCard } from './DesignCard';
import { GalleryToolbar } from './GalleryToolbar';
import './GalleryView.css';

export const GalleryView: React.FC = () => {
  const filteredDesigns = useFilteredDesigns();
  const { isLoading, error, setMode, addToCompare, setPrimaryDesignId } = useCanvasStore();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const handleCardClick = (designId: string, event: React.MouseEvent) => {
    if (event.metaKey || event.ctrlKey) {
      // Multi-select with cmd/ctrl
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(designId)) {
          next.delete(designId);
        } else {
          next.add(designId);
        }
        return next;
      });
    } else {
      // Single click - go to studio
      setMode('studio', designId);
    }
  };
  
  const handleCompareSelected = () => {
    selectedIds.forEach(id => addToCompare(id));
    setSelectedIds(new Set());
  };
  
  const handleSetPrimary = (designId: string) => {
    setPrimaryDesignId(designId);
  };
  
  if (isLoading) {
    return (
      <div className="gallery-loading">
        <div className="loading-spinner"></div>
        <p>Loading designs...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="gallery-error">
        <div className="error-icon">⚠️</div>
        <p>{error}</p>
      </div>
    );
  }
  
  if (filteredDesigns.length === 0) {
    return (
      <div className="gallery-empty">
        <div className="empty-state">
          <div className="empty-icon">🎨</div>
          <h2>No designs yet</h2>
          <p>Start a conversation with the AI to create your first design</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="gallery-view">
      <GalleryToolbar 
        selectedCount={selectedIds.size}
        onCompareSelected={handleCompareSelected}
        onClearSelection={() => setSelectedIds(new Set())}
      />
      
      <div className="gallery-grid">
        {filteredDesigns.map(design => (
          <DesignCard
            key={design.name}
            design={design}
            isSelected={selectedIds.has(design.name)}
            onClick={(e) => handleCardClick(design.name, e)}
            onSetPrimary={() => handleSetPrimary(design.name)}
          />
        ))}
      </div>
    </div>
  );
};

