import React from 'react';
import type { DesignFile } from '../../types/canvas.types';
import { useCanvasStore } from '../../store/canvasStore';
import './HierarchyBreadcrumb.css';

interface HierarchyBreadcrumbProps {
  design: DesignFile;
  parentDesign: DesignFile | null;
}

export const HierarchyBreadcrumb: React.FC<HierarchyBreadcrumbProps> = ({ 
  design, 
  parentDesign 
}) => {
  const { setStudioDesignId } = useCanvasStore();
  
  return (
    <div className="hierarchy-breadcrumb">
      {parentDesign && (
        <>
          <button
            className="breadcrumb-item"
            onClick={() => setStudioDesignId(parentDesign.name)}
            title={parentDesign.name}
          >
            {parentDesign.name}
          </button>
          
          <span className="breadcrumb-separator">
            <span className="codicon codicon-chevron-right"></span>
          </span>
        </>
      )}
      
      <span className="breadcrumb-item current" title={design.name}>
        {design.name}
      </span>
    </div>
  );
};

