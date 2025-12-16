/**
 * Design Metadata Type Definitions
 * 
 * Tracks the lifecycle of design files including status, tags, notes, and export information.
 */

export type DesignStatus = 'draft' | 'review' | 'approved' | 'archived' | 'exported';

export interface DesignMetadata {
    fileName: string;
    status: DesignStatus;
    createdAt: Date;
    updatedAt: Date;
    parentDesign?: string;      // Reference to parent design file (e.g., login_3.html for login_3_1.html)
    tags?: string[];            // Custom tags (e.g., ['login', 'mobile', 'dark-mode', 'v2'])
    notes?: string;             // User notes about the design
    exportedTo?: string;        // Path where it was exported (e.g., 'src/components/Login.tsx')
    version?: number;           // Version number for tracking iterations
}

/**
 * Design Metadata Store - Persisted to .superdesign/design_metadata.json
 */
export interface DesignMetadataStore {
    designs: Record<string, DesignMetadata>;  // Key: fileName
    lastUpdated: Date;
    version: string;
}

/**
 * Default metadata for new designs
 */
export function createDefaultMetadata(fileName: string): DesignMetadata {
    return {
        fileName,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: [],
        notes: ''
    };
}

/**
 * Check if metadata store needs migration/initialization
 */
export function isValidMetadataStore(data: any): data is DesignMetadataStore {
    return (
        data &&
        typeof data === 'object' &&
        typeof data.designs === 'object' &&
        typeof data.version === 'string'
    );
}


