import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Logger } from './logger';
import { DesignManager } from './designManager';

interface DesignFile {
    name: string;
    filePath: string;
    content?: string;
    viewport: 'mobile' | 'tablet' | 'desktop';
    status: 'draft' | 'review' | 'approved' | 'archived' | 'exported';
    timestamp: number;
    parentDesign?: string;
    originalPrompt?: string;
}

/**
 * CanvasMessageHandler - Handles messages between the new canvas webview and extension
 * 
 * Responsibilities:
 * - Send design list to webview
 * - Handle design actions (setPrimary, setStatus, etc.)
 * - Watch for file changes and notify webview
 * - Manage chat context
 */
export class CanvasMessageHandler {
    private webview: vscode.Webview;
    private workspaceRoot: string;
    private designManager: DesignManager;
    private fileWatcher: vscode.FileSystemWatcher | null = null;
    private primaryDesignId: string | null = null;

    constructor(
        webview: vscode.Webview,
        workspaceRoot: string,
        designManager: DesignManager
    ) {
        this.webview = webview;
        this.workspaceRoot = workspaceRoot;
        this.designManager = designManager;

        // Load primary design from workspace state
        this.loadPrimaryDesign();

        // Set up file watcher
        this.setupFileWatcher();
    }

    /**
     * Load primary design from workspace state
     */
    private loadPrimaryDesign(): void {
        const state = vscode.workspace.getConfiguration('superdesign');
        this.primaryDesignId = state.get('primaryDesign', null);
        Logger.debug(`Loaded primary design: ${this.primaryDesignId}`);
    }

    /**
     * Save primary design to workspace state
     */
    private async savePrimaryDesign(): Promise<void> {
        const config = vscode.workspace.getConfiguration('superdesign');
        await config.update('primaryDesign', this.primaryDesignId, vscode.ConfigurationTarget.Workspace);
        Logger.debug(`Saved primary design: ${this.primaryDesignId}`);
    }

    /**
     * Set up file watcher for design directory
     */
    private setupFileWatcher(): void {
        const designDir = path.join(this.workspaceRoot, '.superdesign', 'design_iterations');
        const pattern = new vscode.RelativePattern(designDir, '*.html');

        this.fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);

        this.fileWatcher.onDidCreate(uri => {
            Logger.debug(`Design file created: ${uri.fsPath}`);
            this.sendDesignsList();
        });

        this.fileWatcher.onDidDelete(uri => {
            Logger.debug(`Design file deleted: ${uri.fsPath}`);
            this.sendDesignsList();
        });

        this.fileWatcher.onDidChange(uri => {
            Logger.debug(`Design file changed: ${uri.fsPath}`);
            this.sendDesignsList();
        });
    }

    /**
     * Handle incoming messages from webview
     */
    async handleMessage(message: any): Promise<void> {
        Logger.debug(`Received message: ${message.command}`);

        switch (message.command) {
            case 'canvas:ready':
                await this.sendDesignsList();
                break;

            case 'design:setPrimary':
                await this.setPrimaryDesign(message.designId);
                break;

            case 'design:action':
                await this.handleDesignAction(message.designId, message.action, message.value);
                break;

            case 'chat:setContext':
                await this.setChatContext(message.fileUri);
                break;

            default:
                Logger.warn(`Unknown message command: ${message.command}`);
        }
    }

    /**
     * Send list of designs to webview
     */
    async sendDesignsList(): Promise<void> {
        try {
            const designs = await this.getDesignFiles();

            this.webview.postMessage({
                command: 'designs:list',
                designs: designs
            });

            Logger.debug(`Sent ${designs.length} designs to webview`);
        } catch (error) {
            Logger.error(`Failed to send designs list: ${error}`);
            this.webview.postMessage({
                command: 'error',
                error: 'Failed to load designs'
            });
        }
    }

    /**
     * Get all design files from the design_iterations directory
     */
    private async getDesignFiles(): Promise<DesignFile[]> {
        const designDir = path.join(this.workspaceRoot, '.superdesign', 'design_iterations');

        // Check if directory exists
        if (!fs.existsSync(designDir)) {
            return [];
        }

        const files = fs.readdirSync(designDir);
        const htmlFiles = files.filter(f => f.endsWith('.html'));

        const designs: DesignFile[] = [];

        for (const file of htmlFiles) {
            const filePath = path.join(designDir, file);
            const stats = fs.statSync(filePath);

            // Get metadata
            const metadata = await this.designManager.getDesignMetadata(file);

            // Parse viewport from filename or metadata
            let viewport: 'mobile' | 'tablet' | 'desktop' = 'desktop';
            if (file.includes('mobile')) viewport = 'mobile';
            else if (file.includes('tablet')) viewport = 'tablet';

            // Get parent design from metadata
            const parentDesign = metadata?.parentDesign;
            // Note: originalPrompt is not in DesignMetadata yet, would need to be added

            // Convert to webview URI
            const webviewUri = this.webview.asWebviewUri(vscode.Uri.file(filePath));

            // Read content and inline CSS
            let htmlContent = fs.readFileSync(filePath, 'utf8');
            htmlContent = this.inlineExternalCSS(htmlContent, designDir);

            designs.push({
                name: file.replace('.html', ''),
                filePath: webviewUri.toString(),
                content: htmlContent,
                viewport: viewport,
                status: metadata?.status === 'exported' ? 'archived' : (metadata?.status || 'draft'),
                timestamp: stats.mtimeMs,
                parentDesign: parentDesign
            });
        }

        // Sort by timestamp (newest first)
        designs.sort((a, b) => b.timestamp - a.timestamp);

        return designs;
    }

    /**
     * Inline external CSS files into HTML content
     */
    private inlineExternalCSS(htmlContent: string, designDir: string): string {
        // Match all link tags
        const linkTagRegex = /<link([^>]+)>/gi;
        let modifiedContent = htmlContent;

        // Find all link tags
        const matches = Array.from(htmlContent.matchAll(linkTagRegex));

        for (const match of matches) {
            const fullLinkTag = match[0];
            const attributes = match[1];

            // Check if it's a stylesheet
            if (!/rel=["']stylesheet["']/i.test(attributes)) {
                continue;
            }

            // Extract href
            const hrefMatch = attributes.match(/href=["']([^"']+)["']/i);
            if (!hrefMatch) {
                continue;
            }

            const cssFileName = hrefMatch[1];

            try {
                // Only process relative paths (not absolute URLs)
                if (!cssFileName.startsWith('http') && !cssFileName.startsWith('//')) {
                    const cssFilePath = path.join(designDir, cssFileName);

                    // Check if CSS file exists
                    if (fs.existsSync(cssFilePath)) {
                        const cssContent = fs.readFileSync(cssFilePath, 'utf8');

                        // Replace the link tag with a style tag containing the CSS content
                        const styleTag = `<style>\n/* Inlined from ${cssFileName} */\n${cssContent}\n</style>`;
                        modifiedContent = modifiedContent.replace(fullLinkTag, styleTag);

                        Logger.debug(`Inlined CSS file: ${cssFileName}`);
                    } else {
                        Logger.warn(`CSS file not found: ${cssFilePath}`);
                    }
                }
            } catch (error) {
                Logger.warn(`Failed to inline CSS ${cssFileName}: ${error}`);
            }
        }

        return modifiedContent;
    }

    /**
     * Transform unsupported CSS features to compatible alternatives
     * Handles: oklch() -> rgb(), rgb(from var() r g b) -> var()
     */
    private transformUnsupportedCSS(htmlContent: string): string {
        let modifiedContent = htmlContent;

        // Convert oklch() to approximate rgb - common color mappings
        const oklchToRgb: Record<string, string> = {
            // Common patterns - approximate conversions
            'oklch(0.9900 0.0050 240.0000)': 'rgb(250, 250, 252)',
            'oklch(0.1500 0.0200 240.0000)': 'rgb(30, 30, 40)',
            'oklch(1.0000 0 0)': 'rgb(255, 255, 255)',
            'oklch(0.3500 0.1200 240.0000)': 'rgb(50, 70, 150)',
            'oklch(0.5500 0.1500 160.0000)': 'rgb(60, 150, 120)',
            'oklch(0.9600 0.0100 240.0000)': 'rgb(240, 240, 245)',
            'oklch(0.5000 0.0200 240.0000)': 'rgb(100, 100, 120)',
            'oklch(0.6500 0.1800 160.0000)': 'rgb(80, 180, 140)',
            'oklch(0.5500 0.2200 15.0000)': 'rgb(200, 80, 70)',
            'oklch(0.6000 0.1800 160.0000)': 'rgb(70, 160, 120)',
            'oklch(0.7000 0.1500 60.0000)': 'rgb(200, 170, 80)',
            'oklch(0.9200 0.0100 240.0000)': 'rgb(230, 230, 235)',
            'oklch(0.9800 0.0100 240.0000)': 'rgb(248, 248, 252)',
            'oklch(0.6500 0.1500 280.0000)': 'rgb(140, 100, 180)',
        };

        // Replace known oklch values
        for (const [oklch, rgb] of Object.entries(oklchToRgb)) {
            modifiedContent = modifiedContent.split(oklch).join(rgb);
        }

        // Generic oklch pattern: convert to a neutral gray as fallback
        modifiedContent = modifiedContent.replace(
            /oklch\([0-9.]+ [0-9.]+ [0-9.]+\)/gi,
            'rgb(128, 128, 128)'
        );

        // Replace unsupported "rgb(from var(...) r g b)" with just "var(...)"
        modifiedContent = modifiedContent.replace(
            /rgb\(from var\(([^)]+)\) r g b\)/gi,
            'var($1)'
        );

        return modifiedContent;
    }

    /**
     * Set primary design
     */
    private async setPrimaryDesign(designId: string | null): Promise<void> {
        this.primaryDesignId = designId;
        await this.savePrimaryDesign();

        Logger.info(`Primary design set to: ${designId}`);

        // Optionally send confirmation back
        this.webview.postMessage({
            command: 'design:primarySet',
            designId: designId
        });
    }

    /**
     * Handle design actions
     */
    private async handleDesignAction(designId: string, action: string, value?: any): Promise<void> {
        Logger.debug(`Design action: ${action} for ${designId}`);

        const fileName = `${designId}.html`;

        switch (action) {
            case 'setStatus':
                // Update metadata with new status
                const metadata = await this.designManager.getDesignMetadata(fileName);
                if (metadata) {
                    metadata.status = value;
                    await this.designManager.setDesignMetadata(fileName, metadata);
                }
                await this.sendDesignsList(); // Refresh list
                break;

            case 'copyPrompt':
                await this.copyPromptToClipboard(fileName);
                break;

            case 'copyPath':
                await this.copyPathToClipboard(fileName);
                break;

            case 'openExternal':
                await this.openInBrowser(fileName);
                break;

            case 'archive':
                await this.designManager.archiveDesign(fileName);
                await this.sendDesignsList(); // Refresh list
                break;

            case 'delete':
                await this.deleteDesign(fileName);
                await this.sendDesignsList(); // Refresh list
                break;

            default:
                Logger.warn(`Unknown design action: ${action}`);
        }
    }

    /**
     * Copy design prompt to clipboard
     */
    private async copyPromptToClipboard(fileName: string): Promise<void> {
        const metadata = await this.designManager.getDesignMetadata(fileName);
        if (metadata?.notes) {
            // Use notes as a proxy for prompt until we add originalPrompt to metadata
            await vscode.env.clipboard.writeText(metadata.notes);
            vscode.window.showInformationMessage('Design notes copied to clipboard');
        } else {
            vscode.window.showWarningMessage('No notes found for this design');
        }
    }

    /**
     * Copy design file path to clipboard
     */
    private async copyPathToClipboard(fileName: string): Promise<void> {
        const filePath = path.join(this.workspaceRoot, '.superdesign', 'design_iterations', fileName);
        await vscode.env.clipboard.writeText(filePath);
        vscode.window.showInformationMessage('File path copied to clipboard');
    }

    /**
     * Open design in external browser
     */
    private async openInBrowser(fileName: string): Promise<void> {
        const filePath = path.join(this.workspaceRoot, '.superdesign', 'design_iterations', fileName);
        const uri = vscode.Uri.file(filePath);
        await vscode.env.openExternal(uri);
    }

    /**
     * Delete design file
     */
    private async deleteDesign(fileName: string): Promise<void> {
        const filePath = path.join(this.workspaceRoot, '.superdesign', 'design_iterations', fileName);

        const confirm = await vscode.window.showWarningMessage(
            `Delete ${fileName}?`,
            { modal: true },
            'Delete'
        );

        if (confirm === 'Delete') {
            fs.unlinkSync(filePath);

            // Remove metadata
            const store = await this.designManager.loadMetadata();
            delete store.designs[fileName];
            await this.designManager.saveMetadata(store);

            Logger.info(`Deleted design: ${fileName}`);
            vscode.window.showInformationMessage(`Deleted ${fileName}`);
        }
    }

    /**
     * Set chat context to a specific design file
     */
    private async setChatContext(fileUri: string): Promise<void> {
        // This would integrate with the chat interface
        // For now, just log it
        Logger.info(`Chat context set to: ${fileUri}`);

        // TODO: Implement chat context setting
        // This might involve:
        // 1. Switching to chat view
        // 2. Pre-filling a message like "Iterate on this design: [file]"
        // 3. Attaching the file as context
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
            this.fileWatcher = null;
        }
    }
}

