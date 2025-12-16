import React from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import type { StatusFilter, ViewportFilter } from '../../store/canvasStore';
import './GalleryToolbar.css';

interface GalleryToolbarProps {
  selectedCount: number;
  onCompareSelected: () => void;
  onClearSelection: () => void;
}

export const GalleryToolbar: React.FC<GalleryToolbarProps> = ({
  selectedCount,
  onCompareSelected,
  onClearSelection
}) => {
  const { filters, setFilters, designs } = useCanvasStore();
  
  const statusOptions: StatusFilter[] = ['all', 'draft', 'review', 'approved', 'archived'];
  const viewportOptions: ViewportFilter[] = ['all', 'mobile', 'tablet', 'desktop'];
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ search: e.target.value });
  };
  
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters({ status: e.target.value as StatusFilter });
  };
  
  const handleViewportChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters({ viewport: e.target.value as ViewportFilter });
  };
  
  return (
    <div className="gallery-toolbar">
      <div className="toolbar-left">
        <div className="search-box">
          <span className="codicon codicon-search"></span>
          <input
            type="text"
            placeholder="Search designs..."
            value={filters.search}
            onChange={handleSearchChange}
          />
        </div>
        
        <select 
          className="filter-select"
          value={filters.status}
          onChange={handleStatusChange}
        >
          {statusOptions.map(status => (
            <option key={status} value={status}>
              {status === 'all' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1)}
            </option>
          ))}
        </select>
        
        <select 
          className="filter-select"
          value={filters.viewport}
          onChange={handleViewportChange}
        >
          {viewportOptions.map(viewport => (
            <option key={viewport} value={viewport}>
              {viewport === 'all' ? 'All Viewports' : viewport.charAt(0).toUpperCase() + viewport.slice(1)}
            </option>
          ))}
        </select>
      </div>
      
      <div className="toolbar-right">
        {selectedCount > 0 && (
          <>
            <span className="selection-count">
              {selectedCount} selected
            </span>
            
            {selectedCount >= 2 && selectedCount <= 3 && (
              <button 
                className="toolbar-btn primary"
                onClick={onCompareSelected}
              >
                <span className="codicon codicon-split-horizontal"></span>
                Compare
              </button>
            )}
            
            <button 
              className="toolbar-btn"
              onClick={onClearSelection}
            >
              Clear
            </button>
          </>
        )}
        
        <span className="design-count">
          {designs.length} design{designs.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
};

