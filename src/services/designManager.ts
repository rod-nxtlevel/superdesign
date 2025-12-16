import * as vscode from 'vscode';
import * as path from 'path';
import { Logger } from './logger';
import {
    DesignMetadata,
    DesignMetadataStore,
    DesignStatus,
    createDefaultMetadata,
    isValidMetadataStore
} from '../types/designMetadata';

/**
 * DesignManager - Manages design lifecycle metadata and operations
 * 
 * Handles:
 * - Metadata storage and retrieval
 * - Status management (draft, review, approved, archived)
 * - Tags and notes
 * - Archive operations
 */
export class DesignManager {
    private metadataFile: vscode.Uri;
    private cache: DesignMetadataStore | null = null;
    private workspaceRoot: string;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
        this.metadataFile = vscode.Uri.file(
            path.join(workspaceRoot, '.superdesign', 'design_metadata.json')
        );
    }

    /**
     * Load metadata from disk (with caching)
     */
    async loadMetadata(): Promise<DesignMetadataStore> {
        // Return cached version if available
        if (this.cache) {
            return this.cache;
        }

        try {
            const content = await vscode.workspace.fs.readFile(this.metadataFile);
            const data = JSON.parse(content.toString());

            if (isValidMetadataStore(data)) {
                // Convert date strings back to Date objects
                for (const key in data.designs) {
                    data.designs[key].createdAt = new Date(data.designs[key].createdAt);
                    data.designs[key].updatedAt = new Date(data.designs[key].updatedAt);
                }
                data.lastUpdated = new Date(data.lastUpdated);
                
                this.cache = data;
                return data;
            } else {
                Logger.warn('Invalid metadata store format, creating new one');
                return this.createEmptyStore();
            }
        } catch (error) {
            // File doesn't exist or is invalid, create empty store
            Logger.info('Metadata file not found, creating new one');
            return this.createEmptyStore();
        }
    }

    /**
     * Save metadata to disk
     */
    async saveMetadata(store: DesignMetadataStore): Promise<void> {
        try {
            store.lastUpdated = new Date();
            const content = JSON.stringify(store, null, 2);
            await vscode.workspace.fs.writeFile(
                this.metadataFile,
                Buffer.from(content, 'utf8')
            );
            this.cache = store;
            Logger.debug('Metadata saved successfully');
        } catch (error) {
            Logger.error(`Failed to save metadata: ${error}`);
            throw error;
        }
    }

    /**
     * Get metadata for a specific design file
     */
    async getDesignMetadata(fileName: string): Promise<DesignMetadata | null> {
        const store = await this.loadMetadata();
        return store.designs[fileName] || null;
    }

    /**
     * Set metadata for a design file
     */
    async setDesignMetadata(fileName: string, metadata: DesignMetadata): Promise<void> {
        const store = await this.loadMetadata();
        metadata.updatedAt = new Date();
        store.designs[fileName] = metadata;
        await this.saveMetadata(store);
    }

    /**
     * Update design status
     */
    async updateStatus(fileName: string, status: DesignStatus): Promise<void> {
        const store = await this.loadMetadata();
        
        if (!store.designs[fileName]) {
            store.designs[fileName] = createDefaultMetadata(fileName);
        }
        
        store.designs[fileName].status = status;
        store.designs[fileName].updatedAt = new Date();
        
        await this.saveMetadata(store);
        Logger.info(`Updated status for ${fileName}: ${status}`);
    }

    /**
     * Add tag to design
     */
    async addTag(fileName: string, tag: string): Promise<void> {
        const store = await this.loadMetadata();
        
        if (!store.designs[fileName]) {
            store.designs[fileName] = createDefaultMetadata(fileName);
        }
        
        if (!store.designs[fileName].tags) {
            store.designs[fileName].tags = [];
        }
        
        if (!store.designs[fileName].tags!.includes(tag)) {
            store.designs[fileName].tags!.push(tag);
            store.designs[fileName].updatedAt = new Date();
            await this.saveMetadata(store);
            Logger.info(`Added tag '${tag}' to ${fileName}`);
        }
    }

    /**
     * Remove tag from design
     */
    async removeTag(fileName: string, tag: string): Promise<void> {
        const store = await this.loadMetadata();
        
        if (store.designs[fileName]?.tags) {
            store.designs[fileName].tags = store.designs[fileName].tags!.filter(t => t !== tag);
            store.designs[fileName].updatedAt = new Date();
            await this.saveMetadata(store);
            Logger.info(`Removed tag '${tag}' from ${fileName}`);
        }
    }

    /**
     * Update notes for design
     */
    async updateNotes(fileName: string, notes: string): Promise<void> {
        const store = await this.loadMetadata();
        
        if (!store.designs[fileName]) {
            store.designs[fileName] = createDefaultMetadata(fileName);
        }
        
        store.designs[fileName].notes = notes;
        store.designs[fileName].updatedAt = new Date();
        
        await this.saveMetadata(store);
        Logger.info(`Updated notes for ${fileName}`);
    }

    /**
     * Archive a design (move to archive folder)
     */
    async archiveDesign(fileName: string): Promise<void> {
        const sourcePath = vscode.Uri.file(
            path.join(this.workspaceRoot, '.superdesign', 'design_iterations', fileName)
        );
        
        const archivePath = vscode.Uri.file(
            path.join(this.workspaceRoot, '.superdesign', 'design_archive', fileName)
        );
        
        // Create archive folder if needed
        const archiveDir = vscode.Uri.file(
            path.join(this.workspaceRoot, '.superdesign', 'design_archive')
        );
        
        try {
            await vscode.workspace.fs.stat(archiveDir);
        } catch {
            await vscode.workspace.fs.createDirectory(archiveDir);
            Logger.info('Created design_archive directory');
        }
        
        // Move file
        try {
            await vscode.workspace.fs.copy(sourcePath, archivePath, { overwrite: true });
            await vscode.workspace.fs.delete(sourcePath);
            
            // Update metadata
            await this.updateStatus(fileName, 'archived');
            
            Logger.info(`Archived design: ${fileName}`);
        } catch (error) {
            Logger.error(`Failed to archive design ${fileName}: ${error}`);
            throw error;
        }
    }

    /**
     * Restore design from archive
     */
    async restoreFromArchive(fileName: string): Promise<void> {
        const archivePath = vscode.Uri.file(
            path.join(this.workspaceRoot, '.superdesign', 'design_archive', fileName)
        );
        
        const targetPath = vscode.Uri.file(
            path.join(this.workspaceRoot, '.superdesign', 'design_iterations', fileName)
        );
        
        try {
            await vscode.workspace.fs.copy(archivePath, targetPath, { overwrite: true });
            await vscode.workspace.fs.delete(archivePath);
            
            // Update metadata
            await this.updateStatus(fileName, 'draft');
            
            Logger.info(`Restored design from archive: ${fileName}`);
        } catch (error) {
            Logger.error(`Failed to restore design ${fileName}: ${error}`);
            throw error;
        }
    }

    /**
     * Delete a design permanently
     */
    async deleteDesign(fileName: string, fromArchive: boolean = false): Promise<void> {
        const folder = fromArchive ? 'design_archive' : 'design_iterations';
        const filePath = vscode.Uri.file(
            path.join(this.workspaceRoot, '.superdesign', folder, fileName)
        );
        
        try {
            await vscode.workspace.fs.delete(filePath);
            
            // Remove from metadata
            const store = await this.loadMetadata();
            delete store.designs[fileName];
            await this.saveMetadata(store);
            
            Logger.info(`Deleted design: ${fileName} from ${folder}`);
        } catch (error) {
            Logger.error(`Failed to delete design ${fileName}: ${error}`);
            throw error;
        }
    }

    /**
     * Get all designs by status
     */
    async getDesignsByStatus(status: DesignStatus): Promise<DesignMetadata[]> {
        const store = await this.loadMetadata();
        return Object.values(store.designs).filter(d => d.status === status);
    }

    /**
     * Get all designs with a specific tag
     */
    async getDesignsByTag(tag: string): Promise<DesignMetadata[]> {
        const store = await this.loadMetadata();
        return Object.values(store.designs).filter(d => d.tags?.includes(tag));
    }

    /**
     * Get all unique tags
     */
    async getAllTags(): Promise<string[]> {
        const store = await this.loadMetadata();
        const tags = new Set<string>();
        
        Object.values(store.designs).forEach(design => {
            design.tags?.forEach(tag => tags.add(tag));
        });
        
        return Array.from(tags).sort();
    }

    /**
     * Bulk archive old designs (older than specified days and not approved)
     */
    async archiveOldDesigns(daysOld: number): Promise<number> {
        const store = await this.loadMetadata();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        
        let archived = 0;
        
        for (const [fileName, metadata] of Object.entries(store.designs)) {
            if (
                metadata.status !== 'approved' &&
                metadata.status !== 'archived' &&
                metadata.createdAt < cutoffDate
            ) {
                try {
                    await this.archiveDesign(fileName);
                    archived++;
                } catch (error) {
                    Logger.error(`Failed to archive ${fileName}: ${error}`);
                }
            }
        }
        
        return archived;
    }

    /**
     * Delete all archived designs
     */
    async deleteAllArchived(): Promise<number> {
        const store = await this.loadMetadata();
        const archived = Object.entries(store.designs).filter(
            ([_, metadata]) => metadata.status === 'archived'
        );
        
        let deleted = 0;
        
        for (const [fileName] of archived) {
            try {
                await this.deleteDesign(fileName, true);
                deleted++;
            } catch (error) {
                Logger.error(`Failed to delete archived design ${fileName}: ${error}`);
            }
        }
        
        return deleted;
    }

    /**
     * Initialize metadata for existing designs that don't have it
     */
    async syncWithFileSystem(): Promise<void> {
        const designFolder = vscode.Uri.file(
            path.join(this.workspaceRoot, '.superdesign', 'design_iterations')
        );
        
        try {
            const files = await vscode.workspace.fs.readDirectory(designFolder);
            const designFiles = files
                .filter(([name, type]) => 
                    type === vscode.FileType.File && 
                    (name.endsWith('.html') || name.endsWith('.svg'))
                )
                .map(([name]) => name);
            
            const store = await this.loadMetadata();
            let added = 0;
            
            for (const fileName of designFiles) {
                if (!store.designs[fileName]) {
                    store.designs[fileName] = createDefaultMetadata(fileName);
                    added++;
                }
            }
            
            if (added > 0) {
                await this.saveMetadata(store);
                Logger.info(`Initialized metadata for ${added} existing designs`);
            }
        } catch (error) {
            Logger.error(`Failed to sync with filesystem: ${error}`);
        }
    }

    /**
     * Create empty metadata store
     */
    private createEmptyStore(): DesignMetadataStore {
        return {
            designs: {},
            lastUpdated: new Date(),
            version: '1.0.0'
        };
    }

    /**
     * Clear cache (useful after external changes)
     */
    clearCache(): void {
        this.cache = null;
    }
}


