import * as vscode from 'vscode';
import * as path from 'path';
import express from 'express';
import * as net from 'net';
import { Logger } from './logger';

/**
 * SuperdesignDevServer - Lightweight HTTP server for serving design files
 * 
 * Solves the CORS issue where designs with external CDN resources (Tailwind, Lucide, Chart.js)
 * fail to load via file:// protocol. Serves files via http://localhost with CORS headers enabled.
 */
export class SuperdesignDevServer {
    private app: any;
    private server: any;
    private port: number = 0; // Dynamic port assignment
    private isRunning: boolean = false;
    private workspaceRoot: string;
    
    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
    }
    
    /**
     * Start the dev server on an available port (range: 3456-3506)
     * @returns The port number the server is running on
     */
    async start(): Promise<number> {
        if (this.isRunning) {
            Logger.info(`Dev server already running on port ${this.port}`);
            return this.port;
        }
        
        // Create express app
        this.app = express();
        
        // Serve .superdesign folder with CORS headers
        this.app.use('/.superdesign', (req: any, res: any, next: any) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET');
            res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
            next();
        }, express.static(path.join(this.workspaceRoot, '.superdesign')));
        
        // Health check endpoint
        this.app.get('/health', (_req: any, res: any) => {
            res.json({ status: 'ok', port: this.port });
        });
        
        // Find available port (starting from 3456)
        this.port = await this.findAvailablePort(3456);
        
        return new Promise((resolve, reject) => {
            this.server = this.app.listen(this.port, () => {
                this.isRunning = true;
                Logger.info(`✅ Superdesign dev server running on http://localhost:${this.port}`);
                resolve(this.port);
            });
            
            this.server.on('error', (error: any) => {
                Logger.error(`Failed to start dev server: ${error.message}`);
                reject(error);
            });
        });
    }
    
    /**
     * Find an available port in the range 3456-3506
     */
    private async findAvailablePort(startPort: number): Promise<number> {
        for (let port = startPort; port < startPort + 50; port++) {
            if (await this.isPortAvailable(port)) {
                return port;
            }
        }
        throw new Error('No available ports found in range 3456-3506');
    }
    
    /**
     * Check if a port is available
     */
    private isPortAvailable(port: number): Promise<boolean> {
        return new Promise((resolve) => {
            const server = net.createServer();
            
            server.once('error', () => resolve(false));
            server.once('listening', () => {
                server.close();
                resolve(true);
            });
            
            server.listen(port);
        });
    }
    
    /**
     * Get the HTTP URL for a design file
     * @param fileName The name of the design file (e.g., "login_1.html")
     * @returns The full HTTP URL
     */
    getDesignUrl(fileName: string): string {
        if (!this.isRunning) {
            throw new Error('Dev server is not running. Call start() first.');
        }
        return `http://localhost:${this.port}/.superdesign/design_iterations/${fileName}`;
    }
    
    /**
     * Get the current port number
     */
    getPort(): number {
        return this.port;
    }
    
    /**
     * Check if the server is running
     */
    isServerRunning(): boolean {
        return this.isRunning;
    }
    
    /**
     * Stop the dev server
     */
    stop(): void {
        if (this.server) {
            this.server.close();
            this.isRunning = false;
            Logger.info('🛑 Superdesign dev server stopped');
        }
    }
}

