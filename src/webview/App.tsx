import React, { useState, useEffect } from 'react';
import ChatInterface from './components/Chat/ChatInterface';
import CanvasView from './components/CanvasView';
import { GalleryView } from './components/Gallery/GalleryView';
import { CompareView } from './components/Compare/CompareView';
import { StudioView } from './components/Studio/StudioView';
import { useCanvasStore } from './store/canvasStore';
import { WebviewContext } from '../types/context';
import type { DesignFile } from './types/canvas.types';

// Import CSS as string for esbuild
import styles from './App.css';
import galleryViewStyles from './components/Gallery/GalleryView.css';
import designCardStyles from './components/Gallery/DesignCard.css';
import galleryToolbarStyles from './components/Gallery/GalleryToolbar.css';
import compareViewStyles from './components/Compare/CompareView.css';
import compareFrameStyles from './components/Compare/CompareFrame.css';
import studioViewStyles from './components/Studio/StudioView.css';
import studioFrameStyles from './components/Studio/StudioFrame.css';
import variationStripStyles from './components/Studio/VariationStrip.css';
import hierarchyBreadcrumbStyles from './components/Studio/HierarchyBreadcrumb.css';

const App: React.FC = () => {
    console.log('🚀 App component starting...');

    const [vscode] = useState(() => {
        console.log('📞 Acquiring vscode API...');
        return acquireVsCodeApi();
    });

    // Error trap
    useEffect(() => {
        const handleError = (event: ErrorEvent) => {
            console.error('💥 Global error caught:', event.error);
            // Send to extension using existing instance
            vscode.postMessage({
                command: 'error',
                error: `Webview Error: ${event.message}`
            });
        };
        window.addEventListener('error', handleError);
        return () => window.removeEventListener('error', handleError);
    }, [vscode]);

    // Combine all styles
    const allStyles = [
        styles,
        galleryViewStyles,
        designCardStyles,
        galleryToolbarStyles,
        compareViewStyles,
        compareFrameStyles,
        studioViewStyles,
        studioFrameStyles,
        variationStripStyles,
        hierarchyBreadcrumbStyles
    ].join('\n');



    const [context, setContext] = useState<WebviewContext | null>(null);
    const [currentView, setCurrentView] = useState<'chat' | 'canvas'>('chat');
    const [nonce, setNonce] = useState<string | null>(null);
    const [useNewCanvas, setUseNewCanvas] = useState(false);

    const canvasMode = useCanvasStore(state => state.mode);
    const { setDesigns, setIsLoading, setError } = useCanvasStore();

    useEffect(() => {
        console.log('🔄 App useEffect running...');

        // Detect which view to render based on data-view attribute
        const rootElement = document.getElementById('root');
        console.log('📍 Root element:', rootElement);

        const viewType = rootElement?.getAttribute('data-view');
        const nonceValue = rootElement?.getAttribute('data-nonce');
        const newCanvasFlag = rootElement?.getAttribute('data-new-canvas');

        console.log('🎯 View type detected:', viewType);
        console.log('🔐 Nonce value:', nonceValue);
        console.log('🆕 New canvas flag:', newCanvasFlag);

        if (nonceValue) {
            setNonce(nonceValue);
            console.log('✅ Nonce set:', nonceValue);
        }

        if (newCanvasFlag === 'true') {
            setUseNewCanvas(true);
            console.log('✅ Using new Gallery/Studio canvas');
        }

        if (viewType === 'canvas') {
            setCurrentView('canvas');
            console.log('🎨 Switching to canvas view');
        } else {
            setCurrentView('chat');
            console.log('💬 Switching to chat view');
        }

        // Inject CSS styles
        const styleElement = document.createElement('style');
        styleElement.textContent = allStyles;
        document.head.appendChild(styleElement);
        console.log('🎨 CSS styles injected');

        // Get context from window (only needed for chat interface)
        const webviewContext = (window as any).__WEBVIEW_CONTEXT__;
        console.log('🌐 Webview context from window:', webviewContext);

        if (webviewContext) {
            setContext(webviewContext);
            console.log('✅ Context set:', webviewContext);
        } else {
            console.log('⚠️ No webview context found in window');
        }

        // Set up message listener for new canvas
        if (viewType === 'canvas' && newCanvasFlag === 'true') {
            const messageHandler = (event: MessageEvent) => {
                const message = event.data;
                console.log('📨 Received message:', message);

                switch (message.command) {
                    case 'designs:list':
                        console.log('📋 Setting designs:', message.designs);
                        setDesigns(message.designs as DesignFile[]);
                        break;
                    case 'designs:changed':
                        console.log('🔄 Designs changed:', message);
                        // Handle add/remove/update
                        break;
                    case 'error':
                        console.error('❌ Error from extension:', message.error);
                        setError(message.error);
                        break;
                }
            };

            window.addEventListener('message', messageHandler);

            // Request initial data
            vscode.postMessage({ command: 'canvas:ready' });
            console.log('📤 Sent canvas:ready message');

            return () => {
                window.removeEventListener('message', messageHandler);
                document.head.removeChild(styleElement);
            };
        }

        return () => {
            document.head.removeChild(styleElement);
        };
    }, [vscode, setDesigns, setError]);

    const renderView = () => {
        console.log('🖼️ Rendering view, currentView:', currentView, 'useNewCanvas:', useNewCanvas);

        switch (currentView) {
            case 'canvas':
                console.log('🎨 Rendering canvas, mode:', canvasMode);

                if (useNewCanvas) {
                    // New Gallery → Studio system
                    switch (canvasMode) {
                        case 'gallery':
                            return <GalleryView />;
                        case 'compare':
                            return <CompareView />;
                        case 'studio':
                            return <StudioView />;
                        default:
                            return <GalleryView />;
                    }
                } else {
                    // Legacy canvas view
                    try {
                        return <CanvasView vscode={vscode} nonce={nonce} />;
                    } catch (error) {
                        console.error('❌ Error rendering CanvasView:', error);
                        return <div>Error rendering canvas: {String(error)}</div>;
                    }
                }

            case 'chat':
            default:
                console.log('💬 Rendering ChatInterface, context:', !!context);
                // Chat interface needs context
                if (!context) {
                    console.log('⏳ Context not ready, showing loading...');
                    return <div>Loading...</div>;
                }
                try {
                    return (
                        <ChatInterface
                            layout={context.layout}
                            vscode={vscode}
                        />
                    );
                } catch (error) {
                    console.error('❌ Error rendering ChatInterface:', error);
                    return <div>Error rendering chat: {String(error)}</div>;
                }
        }
    };

    console.log('🔄 App rendering, currentView:', currentView);

    return (
        <div className={`superdesign-app ${currentView}-view ${useNewCanvas ? 'new-canvas' : ''} ${context?.layout ? `${context.layout}-layout` : ''}`}>
            {renderView()}
        </div>
    );
};

export default App;