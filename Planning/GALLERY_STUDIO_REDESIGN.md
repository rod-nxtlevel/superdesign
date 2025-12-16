# Canvas Redesign: Gallery → Compare → Studio

**Date:** December 15, 2025  
**Status:** Planning Phase - Approved Architecture  
**Author:** AI Assistant  

**Architecture in One Sentence:**  
A **Gallery → Compare → Studio** flow, where **only the selected (or compared 2–3) designs run as live iframes**, and everything else is lightweight metadata/thumbnail cards.

---

## Executive Summary

This document outlines a complete redesign of the Superdesign Canvas, moving away from the "infinite canvas" concept to a workflow-focused three-mode system:

1. **Gallery Mode**: Browse all designs as lightweight cards (no live iframes)
2. **Compare Mode**: View 2-3 designs side-by-side with live iframes
3. **Studio Mode**: Deep work on a single "Primary" design with full tooling

**Why This Approach:**
- ✅ Matches actual user workflow: "design quickly, pick one, iterate"
- ✅ Dramatically simpler implementation (no transform libraries)
- ✅ Better performance (max 1-3 iframes at any time)
- ✅ Clearer UX (each mode has a single purpose)
- ✅ Eliminates all coordinate/transform complexity
- ✅ Faster to implement (1.5-2 weeks vs 3-4 weeks)

---

## Table of Contents

1. [Core Concept](#core-concept)
2. [User Workflow](#user-workflow)
3. [Architecture Overview](#architecture-overview)
4. [Gallery Mode](#gallery-mode)
5. [Compare Mode](#compare-mode)
6. [Studio Mode](#studio-mode)
7. [Extension-Side Implementation](#extension-side-implementation)
8. [Webview-Side Implementation](#webview-side-implementation)
9. [Message Protocol](#message-protocol)
10. [Security & CSP](#security--csp)
11. [Migration Strategy](#migration-strategy)
12. [Implementation Plan](#implementation-plan)
13. [Timeline & Resources](#timeline--resources)

---

## Core Concept

### The Problem with "Canvas"

The current implementation tries to be everything at once:
- A gallery (view all designs)
- A comparison tool (see multiple designs)
- A workspace (interact with designs)
- A spatial organizer (drag frames around)

This creates:
- ❌ Performance issues (10+ live iframes)
- ❌ Complex coordinate transformations
- ❌ Confusing UX (too many simultaneous capabilities)
- ❌ Difficult maintenance (860 lines, 11 state variables)

### The Solution: Separate Modes

**Each mode has ONE clear purpose:**

| Mode | Purpose | Rendering | Iframes |
|------|---------|-----------|---------|
| **Gallery** | Browse & filter | Metadata cards | 0 (or 1 on hover) |
| **Compare** | Side-by-side comparison | Grid layout | 2-3 max |
| **Studio** | Deep work & iteration | Single workspace | 1 |

**Key Insight:** Users don't need to see 10+ designs simultaneously. They need to:
1. Browse options quickly (Gallery)
2. Compare finalists (Compare)
3. Iterate on the winner (Studio)

---

## User Workflow

### Scenario 1: Initial Design Exploration

1. User prompts AI: "Design a login screen"
2. AI generates 5 variations → saved to `.superdesign/design_iterations/`
3. **Gallery Mode**: User sees 5 cards with metadata
4. User clicks first card → switches to **Studio Mode**
5. User reviews design in full size
6. User clicks "Compare" → adds to comparison set
7. User returns to Gallery, selects 2 more designs to compare
8. **Compare Mode**: User sees 3 designs side-by-side
9. User picks winner → clicks "Make Primary"
10. **Studio Mode**: Winner becomes Primary design
11. User clicks "Iterate with feedback" → sends to chat with context

**Key:** User never manually positions frames or manages coordinate space.

### Scenario 2: Iterative Refinement

1. User has Primary design in **Studio Mode**
2. User requests variations: "Make it darker"
3. AI generates 3 variations
4. Variations appear in Studio's "Variation Strip"
5. User clicks variation → swaps into Studio main view
6. User clicks "Compare with Primary" → switches to **Compare Mode**
7. User compares new vs Primary side-by-side
8. User approves new design → becomes new Primary
9. Old Primary moves to variations list

**Key:** Primary design concept creates a clear "working version" vs "alternatives" distinction.

### Scenario 3: Managing Many Designs

1. User has 20+ design iterations
2. **Gallery Mode**: User filters by status (approved/draft)
3. User archives old iterations
4. User searches by name
5. User sorts by date or viewport
6. User views hierarchy breadcrumb (which design spawned this?)
7. User opens external browser for full-fidelity preview

**Key:** Gallery provides organization tools without spatial complexity.

---

## Architecture Overview

### High-Level Structure

```
CanvasView (Mode Container)
├─ ViewModeSwitcher (Gallery | Compare | Studio)
├─ GalleryView
│   └─ DesignCard[] (metadata only, no iframes)
├─ CompareView
│   └─ CompareColumn[] (2-3 live iframes max)
└─ StudioView
    ├─ StudioSidebar
    │   ├─ DesignInfo
    │   ├─ ActionButtons
    │   ├─ VariationStrip
    │   └─ HierarchyBreadcrumb
    └─ StudioCanvas (1 live iframe)
```

### State Management

**Simple, flat state (no complex transforms):**

```typescript
interface CanvasState {
  // View mode
  currentMode: 'gallery' | 'compare' | 'studio';
  
  // Designs
  designs: DesignFile[];
  primaryDesignId: string | null;
  
  // Compare mode
  compareSet: string[]; // max 3 IDs
  
  // Studio mode
  studioDesignId: string | null; // Currently viewed in Studio
  
  // Filters
  statusFilter: 'all' | 'draft' | 'review' | 'approved' | 'archived';
  viewportFilter: 'all' | 'mobile' | 'tablet' | 'desktop';
  searchQuery: string;
}
```

**No more:**
- ❌ `currentZoom`
- ❌ `dragState`
- ❌ `customPositions`
- ❌ `transformRef`
- ❌ `hierarchyTree` (replaced with simple breadcrumb)

---

## Gallery Mode

### Purpose

Browse all designs quickly. Make high-level decisions about which designs to explore further.

### UI Layout

**Card Grid:**
- Responsive CSS Grid (3-5 columns depending on viewport)
- Each card shows metadata (no live iframe)
- Hover effects for interactivity
- Badges for status/viewport/primary

### Design Card Structure

```typescript
interface DesignCard {
  id: string;
  name: string;
  path: string;
  status: 'draft' | 'review' | 'approved' | 'archived' | 'exported';
  viewport: 'mobile' | 'tablet' | 'desktop';
  modified: Date;
  size: number;
  isPrimary: boolean;
  parentDesign?: string; // For hierarchy
  thumbnailUri?: string; // Optional
}
```

### Card Display

```
┌─────────────────────────────┐
│ 🖼️ [Thumbnail or Placeholder] │
├─────────────────────────────┤
│ login_1_2.html              │
│ 📱 Mobile · ⭐ Primary       │
│ 12.5 KB · 2 mins ago        │
├─────────────────────────────┤
│ [View] [Compare] [...]      │
└─────────────────────────────┘
```

### Card Actions

**Quick Actions:**
- **View**: Switch to Studio Mode with this design
- **Compare**: Add to comparison set (max 3)
- **Menu**: More actions (approve, archive, delete, copy path)

**Hover Behavior (Optional):**
- On hover, briefly mount iframe preview
- Unmount on mouse leave (after 100ms delay)
- Provides "peek" at design without full load

### Toolbar

```
[Gallery] [Compare] [Studio]    Search: [_______]    Filter: [All Status ▼] [All Viewports ▼]    Sort: [Date ▼]
```

### Features

1. **Search**: Filter by filename
2. **Status Filter**: Show only draft/approved/archived
3. **Viewport Filter**: Show only mobile/tablet/desktop
4. **Sort**: By date, name, size
5. **Bulk Actions**: Select multiple → approve/archive/delete
6. **Primary Badge**: Visual indicator for primary design

### Empty State

```
No designs found in .superdesign/design_iterations/

Prompt Superdesign to design UI:
  "Help me design a calculator UI"

Or use Cursor/Windsurf/Claude Code and preview here.
```

---

## Compare Mode

### Purpose

View 2-3 designs side-by-side with live iframes for detailed comparison.

### UI Layout

**Side-by-Side Grid:**
```
┌──────────────┬──────────────┬──────────────┐
│  Design A    │  Design B    │  Design C    │
│  [Header]    │  [Header]    │  [Header]    │
│              │              │              │
│  [iframe]    │  [iframe]    │  [iframe]    │
│              │              │              │
│              │              │              │
│              │              │              │
└──────────────┴──────────────┴──────────────┘
```

- **2 designs**: 50/50 split
- **3 designs**: 33/33/33 split
- Synchronized scrolling (optional)
- Independent viewport controls per design

### Compare Column

```typescript
interface CompareColumn {
  designId: string;
  viewport: 'mobile' | 'tablet' | 'desktop';
  showMetadata: boolean;
}
```

### Column Header

```
┌────────────────────────────┐
│ login_1.html        [×]    │
│ 📱 Mobile          ⚙️      │
│ [Make Primary] [View]      │
└────────────────────────────┘
```

**Actions:**
- **Remove**: Remove from comparison (×)
- **Settings**: Change viewport (⚙️)
- **Make Primary**: Set as primary design
- **View**: Switch to Studio Mode with this design

### Toolbar

```
[Gallery] [Compare] [Studio]    Comparing 3 designs    [Clear All]    [Sync Scroll: ☑️]
```

### Features

1. **Max 3 Designs**: Prevent comparison overload
2. **Quick Add**: "Add to Compare" from Gallery
3. **Viewport Control**: Per-design viewport sizing
4. **Sync Scroll**: Optional synchronized scrolling
5. **Quick Actions**: Make primary, approve, archive
6. **Return to Gallery**: Easy exit back to browsing

---

## Studio Mode

### Purpose

Deep work on a single design. Full tooling for iteration, feedback, and production handoff.

### UI Layout

**Sidebar + Canvas:**
```
┌──────────┬─────────────────────────────┐
│          │                             │
│ Sidebar  │     Studio Canvas           │
│          │                             │
│ - Info   │     [Single iframe]         │
│ - Actions│                             │
│ - Vars   │                             │
│ - History│                             │
│          │                             │
└──────────┴─────────────────────────────┘
```

- **Left Sidebar**: 250-300px fixed width
- **Canvas**: Remaining space, single iframe
- Responsive: Sidebar collapses on mobile

### Sidebar Components

#### 1. Design Info

```
┌────────────────────────────┐
│ ⭐ PRIMARY DESIGN           │
│ login_final.html           │
│ 📱 Tablet · 15.2 KB        │
│ Modified: 5 mins ago       │
│ Status: [Approved ✓]      │
└────────────────────────────┘
```

#### 2. Action Buttons

```
┌────────────────────────────┐
│ [🎨 Create Variations]     │
│ [🔄 Iterate with Feedback] │
│ [✨ Copy Prompt ▼]         │
│   ├─ Cursor                │
│   ├─ Windsurf              │
│   ├─ Claude Code           │
│   └─ ...                   │
│ [🌐 Open in Browser]       │
│ [📋 Copy Design Path]      │
└────────────────────────────┘
```

#### 3. Variation Strip

```
┌────────────────────────────┐
│ Variations (3)             │
│                            │
│ [Thumb] login_1_2.html     │
│         [View] [Compare]   │
│                            │
│ [Thumb] login_1_3.html     │
│         [View] [Compare]   │
│                            │
│ [Thumb] login_1_4.html     │
│         [View] [Compare]   │
└────────────────────────────┘
```

Shows:
- Child designs (variations)
- Quick actions per variation
- Click to swap into main canvas
- Click "Compare" to compare with current

#### 4. Hierarchy Breadcrumb

```
┌────────────────────────────┐
│ Design Lineage             │
│ login_1 → login_1_2 → THIS │
│ (Click to view parent)     │
└────────────────────────────┘
```

Simple text-based lineage. No complex tree visualization.

### Studio Canvas

**Single iframe** taking up remaining space:
- Centered in canvas area
- Viewport controls (mobile/tablet/desktop)
- Zoom controls (optional, CSS transform only)
- Loading/error states

### Toolbar

```
[Gallery] [Compare] [Studio]    Primary: login_final.html    📱 [Mobile] [Tablet] [Desktop]
```

### Features

1. **Primary Design Concept**: Single "working version"
2. **Variations Sidebar**: Easy access to alternatives
3. **Quick Swap**: Click variation → becomes main view
4. **Lineage**: See where design came from
5. **Full Tooling**: All actions in one place
6. **External Preview**: Open in browser for full fidelity
7. **Viewport Switching**: Preview at different sizes

---

## Extension-Side Implementation

### Technology Stack

**Language:** TypeScript  
**Core API:** VS Code Webview API ([docs](https://code.visualstudio.com/api/extension-guides/webview))

### Responsibilities

#### 1. File System Management

```typescript
class DesignFileManager {
  private designRoot: vscode.Uri;
  private watcher: vscode.FileSystemWatcher;
  
  constructor(workspaceRoot: vscode.Uri) {
    this.designRoot = vscode.Uri.joinPath(workspaceRoot, '.superdesign/design_iterations');
    this.watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(this.designRoot, '**/*.{html,svg}')
    );
  }
  
  async loadDesigns(): Promise<DesignFileMeta[]> {
    const files = await vscode.workspace.fs.readDirectory(this.designRoot);
    return files
      .filter(([name, type]) => type === vscode.FileType.File)
      .map(([name]) => this.getDesignMeta(name));
  }
  
  private async getDesignMeta(filename: string): Promise<DesignFileMeta> {
    const uri = vscode.Uri.joinPath(this.designRoot, filename);
    const stat = await vscode.workspace.fs.stat(uri);
    
    return {
      id: filename,
      name: filename,
      path: uri.fsPath,
      webviewUri: this.panel.webview.asWebviewUri(uri).toString(),
      size: stat.size,
      modified: new Date(stat.mtime),
      // ... other metadata
    };
  }
}
```

#### 2. State Persistence

```typescript
class CanvasStateManager {
  constructor(private context: vscode.ExtensionContext) {}
  
  getPrimaryDesign(): string | null {
    return this.context.workspaceState.get('superdesign.primaryDesign', null);
  }
  
  setPrimaryDesign(designId: string): void {
    this.context.workspaceState.update('superdesign.primaryDesign', designId);
  }
  
  getDesignStatus(designId: string): DesignStatus {
    const statuses = this.context.workspaceState.get<Record<string, DesignStatus>>(
      'superdesign.designStatuses',
      {}
    );
    return statuses[designId] || 'draft';
  }
  
  setDesignStatus(designId: string, status: DesignStatus): void {
    const statuses = this.context.workspaceState.get<Record<string, DesignStatus>>(
      'superdesign.designStatuses',
      {}
    );
    statuses[designId] = status;
    this.context.workspaceState.update('superdesign.designStatuses', statuses);
  }
}
```

#### 3. Message Handler

```typescript
class CanvasMessageHandler {
  constructor(
    private webview: vscode.Webview,
    private fileManager: DesignFileManager,
    private stateManager: CanvasStateManager
  ) {}
  
  async handleMessage(message: WebviewMessage): Promise<void> {
    switch (message.command) {
      case 'design:setPrimary':
        this.stateManager.setPrimaryDesign(message.designId);
        this.sendMessage({ 
          command: 'design:primary', 
          designId: message.designId 
        });
        break;
        
      case 'design:action':
        await this.handleDesignAction(message.designId, message.action);
        break;
        
      case 'chat:setContext':
        await this.setChatContext(message.fileUri);
        break;
        
      case 'design:openExternal':
        await this.openInBrowser(message.designId);
        break;
    }
  }
  
  private async handleDesignAction(
    designId: string, 
    action: DesignAction
  ): Promise<void> {
    switch (action) {
      case 'approve':
        this.stateManager.setDesignStatus(designId, 'approved');
        break;
      case 'archive':
        this.stateManager.setDesignStatus(designId, 'archived');
        break;
      case 'delete':
        await this.fileManager.deleteDesign(designId);
        break;
      // ... other actions
    }
  }
}
```

#### 4. Resource URI Security

```typescript
class WebviewSetup {
  static createPanel(context: vscode.ExtensionContext): vscode.WebviewPanel {
    const panel = vscode.window.createWebviewPanel(
      'superdesignCanvas',
      'Superdesign Canvas',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, 'dist'),
          vscode.Uri.joinPath(
            vscode.workspace.workspaceFolders![0].uri,
            '.superdesign'
          )
        ]
      }
    );
    
    return panel;
  }
}
```

---

## Webview-Side Implementation

### Technology Stack

**Framework:** React 19.1.0 + TypeScript  
**State:** React state + Zustand (lightweight store)  
**Icons:** `@vscode/codicons` (replaces deprecated `vscode-codicons`)  
**UI:** Custom components with VS Code CSS variables  
**Styling:** CSS Modules or Styled Components

### Core Components

#### 1. CanvasView (Main Container)

```typescript
import { useState, useEffect } from 'react';
import { useCanvasStore } from './store/canvasStore';

type ViewMode = 'gallery' | 'compare' | 'studio';

export const CanvasView: React.FC = () => {
  const { mode, designs, primaryDesignId } = useCanvasStore();
  
  const renderView = () => {
    switch (mode) {
      case 'gallery':
        return <GalleryView designs={designs} />;
      case 'compare':
        return <CompareView />;
      case 'studio':
        return <StudioView />;
    }
  };
  
  return (
    <div className="canvas-container">
      <ViewModeSwitcher />
      {renderView()}
    </div>
  );
};
```

#### 2. GalleryView

```typescript
interface GalleryViewProps {
  designs: DesignFile[];
}

export const GalleryView: React.FC<GalleryViewProps> = ({ designs }) => {
  const { filters, setMode } = useCanvasStore();
  const filteredDesigns = useFilters(designs, filters);
  
  return (
    <div className="gallery-view">
      <GalleryToolbar />
      <div className="gallery-grid">
        {filteredDesigns.map(design => (
          <DesignCard
            key={design.id}
            design={design}
            onView={() => setMode('studio', design.id)}
            onCompare={() => addToCompare(design.id)}
          />
        ))}
      </div>
    </div>
  );
};
```

#### 3. DesignCard

```typescript
interface DesignCardProps {
  design: DesignFile;
  onView: () => void;
  onCompare: () => void;
}

export const DesignCard: React.FC<DesignCardProps> = ({ 
  design, 
  onView, 
  onCompare 
}) => {
  const [showPreview, setShowPreview] = useState(false);
  
  return (
    <div 
      className="design-card"
      onMouseEnter={() => setShowPreview(true)}
      onMouseLeave={() => setShowPreview(false)}
    >
      <div className="card-preview">
        {showPreview ? (
          <iframe 
            src={design.webviewUri}
            sandbox="allow-same-origin" // No scripts in preview
            className="preview-iframe"
          />
        ) : (
          <div className="placeholder">
            {design.thumbnailUri ? (
              <img src={design.thumbnailUri} alt={design.name} />
            ) : (
              <div className="icon">🎨</div>
            )}
          </div>
        )}
      </div>
      
      <div className="card-header">
        <h3>{design.name}</h3>
        <div className="card-badges">
          {design.isPrimary && <Badge variant="primary">Primary</Badge>}
          <Badge variant="viewport">{design.viewport}</Badge>
          <Badge variant="status">{design.status}</Badge>
        </div>
      </div>
      
      <div className="card-meta">
        <span>{formatSize(design.size)}</span>
        <span>{formatDate(design.modified)}</span>
      </div>
      
      <div className="card-actions">
        <button onClick={onView}>View</button>
        <button onClick={onCompare}>Compare</button>
        <DropdownMenu design={design} />
      </div>
    </div>
  );
};
```

#### 4. CompareView

```typescript
export const CompareView: React.FC = () => {
  const { compareSet, designs } = useCanvasStore();
  const compareDesigns = compareSet.map(id => 
    designs.find(d => d.id === id)!
  );
  
  return (
    <div className="compare-view">
      <CompareToolbar designCount={compareSet.length} />
      <div className="compare-grid">
        {compareDesigns.map(design => (
          <CompareColumn 
            key={design.id}
            design={design}
          />
        ))}
      </div>
    </div>
  );
};
```

#### 5. CompareColumn

```typescript
interface CompareColumnProps {
  design: DesignFile;
}

export const CompareColumn: React.FC<CompareColumnProps> = ({ design }) => {
  const [viewport, setViewport] = useState<ViewportMode>(design.viewport);
  const { removeFromCompare, makePrimary } = useCanvasStore();
  
  return (
    <div className="compare-column">
      <div className="column-header">
        <h3>{design.name}</h3>
        <button onClick={() => removeFromCompare(design.id)}>×</button>
      </div>
      
      <div className="column-controls">
        <ViewportSelector 
          value={viewport}
          onChange={setViewport}
        />
        <button onClick={() => makePrimary(design.id)}>
          Make Primary
        </button>
      </div>
      
      <iframe
        src={design.webviewUri}
        sandbox="allow-scripts allow-same-origin"
        className="compare-iframe"
        style={{
          width: getViewportWidth(viewport),
          height: getViewportHeight(viewport)
        }}
      />
    </div>
  );
};
```

#### 6. StudioView

```typescript
export const StudioView: React.FC = () => {
  const { studioDesignId, designs } = useCanvasStore();
  const design = designs.find(d => d.id === studioDesignId);
  
  if (!design) return <EmptyStudio />;
  
  return (
    <div className="studio-view">
      <StudioSidebar design={design} />
      <StudioCanvas design={design} />
    </div>
  );
};
```

#### 7. StudioSidebar

```typescript
interface StudioSidebarProps {
  design: DesignFile;
}

export const StudioSidebar: React.FC<StudioSidebarProps> = ({ design }) => {
  const variations = useVariations(design.id);
  
  return (
    <aside className="studio-sidebar">
      <DesignInfo design={design} />
      <ActionButtons design={design} />
      <VariationStrip variations={variations} />
      <HierarchyBreadcrumb design={design} />
    </aside>
  );
};
```

#### 8. State Store (Zustand)

```typescript
import create from 'zustand';

interface CanvasStore {
  // View mode
  mode: ViewMode;
  setMode: (mode: ViewMode, designId?: string) => void;
  
  // Designs
  designs: DesignFile[];
  setDesigns: (designs: DesignFile[]) => void;
  
  // Primary
  primaryDesignId: string | null;
  setPrimaryDesignId: (id: string) => void;
  
  // Compare
  compareSet: string[];
  addToCompare: (id: string) => void;
  removeFromCompare: (id: string) => void;
  clearCompare: () => void;
  
  // Studio
  studioDesignId: string | null;
  
  // Filters
  filters: Filters;
  setFilters: (filters: Partial<Filters>) => void;
}

export const useCanvasStore = create<CanvasStore>((set) => ({
  mode: 'gallery',
  designs: [],
  primaryDesignId: null,
  compareSet: [],
  studioDesignId: null,
  filters: {
    status: 'all',
    viewport: 'all',
    search: ''
  },
  
  setMode: (mode, designId) => set((state) => ({
    mode,
    studioDesignId: mode === 'studio' ? designId || state.studioDesignId : null
  })),
  
  setDesigns: (designs) => set({ designs }),
  
  setPrimaryDesignId: (id) => {
    set({ primaryDesignId: id });
    postMessage({ command: 'design:setPrimary', designId: id });
  },
  
  addToCompare: (id) => set((state) => ({
    compareSet: [...state.compareSet, id].slice(0, 3) // Max 3
  })),
  
  removeFromCompare: (id) => set((state) => ({
    compareSet: state.compareSet.filter(cid => cid !== id)
  })),
  
  // ... other methods
}));
```

### State Persistence

```typescript
// Persist view state across webview teardown/revive
const vscode = acquireVsCodeApi();

// Save state
useEffect(() => {
  vscode.setState({
    mode,
    primaryDesignId,
    compareSet,
    studioDesignId,
    filters
  });
}, [mode, primaryDesignId, compareSet, studioDesignId, filters]);

// Restore state on mount
useEffect(() => {
  const previousState = vscode.getState();
  if (previousState) {
    // Restore state to store
    useCanvasStore.setState(previousState);
  }
}, []);
```

---

## Message Protocol

### Type Definitions

```typescript
// Extension → Webview
type ExtensionMessage =
  | { command: 'designs:list'; designs: DesignFileMeta[] }
  | { command: 'designs:changed'; changes: DesignChange[] }
  | { command: 'design:primary'; designId: string }
  | { command: 'design:status'; designId: string; status: DesignStatus };

// Webview → Extension
type WebviewMessage =
  | { command: 'design:setPrimary'; designId: string }
  | { command: 'design:action'; designId: string; action: DesignAction }
  | { command: 'chat:setContext'; fileUri: string }
  | { command: 'design:openExternal'; designId: string }
  | { command: 'design:copyPath'; designId: string };

// Data types
interface DesignFileMeta {
  id: string;
  name: string;
  path: string;
  webviewUri: string; // Pre-converted for webview
  size: number;
  modified: Date;
  status: DesignStatus;
  viewport: ViewportMode;
  parentDesign?: string;
  thumbnailUri?: string;
}

interface DesignChange {
  type: 'added' | 'removed' | 'updated';
  design: DesignFileMeta;
}

type DesignAction = 
  | 'approve' 
  | 'archive' 
  | 'delete' 
  | 'openExternal' 
  | 'copyPath'
  | 'iterate';

type DesignStatus = 
  | 'draft' 
  | 'review' 
  | 'approved' 
  | 'archived' 
  | 'exported';
```

### Message Flow Examples

#### Load Designs

```typescript
// Extension → Webview
{
  command: 'designs:list',
  designs: [
    {
      id: 'login_1.html',
      name: 'login_1.html',
      path: '/workspace/.superdesign/design_iterations/login_1.html',
      webviewUri: 'vscode-webview://123/login_1.html',
      size: 12500,
      modified: '2025-12-15T10:30:00Z',
      status: 'draft',
      viewport: 'tablet'
    },
    // ... more designs
  ]
}
```

#### Set Primary Design

```typescript
// Webview → Extension
{
  command: 'design:setPrimary',
  designId: 'login_1.html'
}

// Extension → Webview (confirmation)
{
  command: 'design:primary',
  designId: 'login_1.html'
}
```

#### Design Action

```typescript
// Webview → Extension
{
  command: 'design:action',
  designId: 'login_1.html',
  action: 'approve'
}

// Extension → Webview (status update)
{
  command: 'design:status',
  designId: 'login_1.html',
  status: 'approved'
}
```

#### File System Change

```typescript
// Extension → Webview
{
  command: 'designs:changed',
  changes: [
    {
      type: 'added',
      design: { /* new design metadata */ }
    },
    {
      type: 'removed',
      design: { id: 'old_design.html', /* ... */ }
    }
  ]
}
```

---

## Security & CSP

### Iframe Sandbox Attributes

**Critical Security Note:** Combining `allow-scripts` and `allow-same-origin` is unsafe—it allows iframe escape. ([GitHub issue](https://github.com/w3c/webappsec-csp/issues/8))

**Recommended Sandbox Configurations:**

#### Gallery/Compare (Restrictive)

```html
<!-- Most restrictive: no scripts -->
<iframe
  sandbox="allow-same-origin"
  src={designUri}
/>
```

Use this when:
- User just needs to see design visually
- No interactivity required
- Maximum security

#### Studio (Interactive, but risky)

```html
<!-- Allows scripts, but not same-origin (safer) -->
<iframe
  sandbox="allow-scripts"
  src={designUri}
/>
```

**Problem:** This breaks some features (localStorage, etc.)

**Better Alternative:**
```typescript
// Don't loosen iframe sandbox
// Instead, offer "Open in Browser" for full fidelity
<button onClick={() => openInExternalBrowser(designUri)}>
  Open in Browser (Full Fidelity)
</button>
```

This gives users:
- ✅ Full JavaScript execution
- ✅ External resources loaded
- ✅ DevTools access
- ✅ No webview CSP restrictions
- ✅ Safe (not in webview context)

### CSP Meta Tag

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'none';
  script-src ${cspSource} 'nonce-${nonce}';
  style-src ${cspSource} 'unsafe-inline';
  img-src ${cspSource} https: data:;
  font-src ${cspSource};
  connect-src ${cspSource};
  frame-src ${cspSource};
">
```

**Key points:**
- Use nonces for inline scripts
- Whitelist only extension resources and workspace `.superdesign/` folder
- Don't use `srcdoc` (same-origin footgun)

### Avoiding srcdoc

❌ **Don't:**
```typescript
<iframe srcdoc={htmlContent} /> // Same-origin with parent!
```

✅ **Do:**
```typescript
// Use vscode.Webview.asWebviewUri
const webviewUri = webview.asWebviewUri(fileUri);
<iframe src={webviewUri} />
```

This ensures:
- Iframe is not same-origin with webview
- Proper resource isolation
- CSP can restrict capabilities

---

## Migration Strategy

### Phase 1: Build New Views (Parallel Implementation)

**Goal:** Build new Gallery/Compare/Studio views alongside existing canvas

**Approach:**
- Keep existing `CanvasView.tsx` as `CanvasView.legacy.tsx`
- Build new `CanvasView.tsx` with mode system
- Feature flag to switch between old/new

```typescript
// App.tsx
const USE_NEW_CANVAS = vscode.workspace
  .getConfiguration('superdesign')
  .get('useNewCanvas', false);

{currentView === 'canvas' && (
  USE_NEW_CANVAS 
    ? <CanvasView vscode={vscode} />
    : <CanvasViewLegacy vscode={vscode} />
)}
```

**Tasks:**
1. Create new component structure
2. Build Gallery view
3. Build Compare view
4. Build Studio view
5. Implement mode switcher
6. Test with feature flag

### Phase 2: Data Migration

**Goal:** Migrate existing data/state to new system

**State Mapping:**
```typescript
// Old state → New state
{
  selectedFrames: ['design1.html'] // Single selection
} 
→
{
  mode: 'studio',
  studioDesignId: 'design1.html'
}

// Custom positions → Not needed (removed feature)

// Hierarchy tree → Simplified to breadcrumb
```

**No data loss:**
- All design files remain in same location
- No file format changes
- Workspace state keys different (no conflicts)

### Phase 3: Feature Parity Check

**Must-Have Features:**
- ✅ View all designs
- ✅ Select/view single design
- ✅ Compare multiple designs
- ✅ Copy prompt for platforms
- ✅ Copy design path
- ✅ Open in browser
- ✅ Approve/archive/delete
- ✅ Status badges
- ✅ Viewport switching
- ✅ Chat integration

**Removed Features:**
- ❌ Infinite pan/zoom (replaced with modes)
- ❌ Drag-and-drop positioning (not needed)
- ❌ Connection lines (replaced with breadcrumb)
- ❌ Custom spatial layouts (not needed)

### Phase 4: Beta Testing

**Rollout:**
1. Enable for internal testing (setting)
2. Collect feedback for 1 week
3. Fix critical issues
4. Enable by default for new users
5. Provide "Use Legacy Canvas" option
6. Monitor error reports

**Success Criteria:**
- No critical bugs
- Performance equal or better
- User feedback positive
- All features working

### Phase 5: Deprecate Legacy

**Timeline:** After 2 stable releases

**Steps:**
1. Remove legacy code
2. Remove feature flag
3. Update documentation
4. Close related issues

---

## Implementation Plan

### Week 1: Core Views

**Day 1-2: Gallery View**
- [ ] Create `GalleryView.tsx` component
- [ ] Build `DesignCard` component
- [ ] Implement card grid layout (CSS Grid)
- [ ] Add status/viewport badges
- [ ] Implement hover preview (optional iframe)
- [ ] Add quick actions (View, Compare, Menu)
- [ ] Test with 10+ designs

**Day 3: Compare View**
- [ ] Create `CompareView.tsx` component
- [ ] Build `CompareColumn` component
- [ ] Implement 2-3 column grid layout
- [ ] Add column headers with controls
- [ ] Mount live iframes in columns
- [ ] Add viewport controls per column
- [ ] Test side-by-side rendering

**Day 4-5: Studio View**
- [ ] Create `StudioView.tsx` component
- [ ] Build `StudioSidebar` component
- [ ] Build `StudioCanvas` component
- [ ] Implement sidebar layout
- [ ] Add design info section
- [ ] Add action buttons
- [ ] Add variation strip
- [ ] Add hierarchy breadcrumb
- [ ] Mount single iframe in canvas
- [ ] Test all Studio features

### Week 2: Integration & Polish

**Day 1: Mode Switching**
- [ ] Create `ViewModeSwitcher` component
- [ ] Implement mode transitions
- [ ] Add state persistence (vscode API)
- [ ] Test mode switching flows
- [ ] Add keyboard shortcuts

**Day 2: State Management**
- [ ] Setup Zustand store
- [ ] Implement all store actions
- [ ] Connect components to store
- [ ] Add state persistence
- [ ] Test state updates

**Day 3: Extension Integration**
- [ ] Update message protocol
- [ ] Implement message handlers
- [ ] Add workspace state persistence
- [ ] Test extension ↔ webview communication
- [ ] Handle file system changes

**Day 4: Features & Actions**
- [ ] Implement "Make Primary"
- [ ] Implement design actions (approve/archive/delete)
- [ ] Add filters (status/viewport/search)
- [ ] Add sorting
- [ ] Implement copy prompt dropdown
- [ ] Implement copy path
- [ ] Implement open in browser
- [ ] Test all actions

**Day 5: Polish & Testing**
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add empty states
- [ ] Responsive design
- [ ] Cross-browser testing
- [ ] VS Code theme integration
- [ ] Performance testing
- [ ] Accessibility improvements

### Week 3: Beta & Refinement (Optional)

**Day 1-2: Beta Testing**
- [ ] Enable feature flag
- [ ] Internal testing
- [ ] Collect feedback
- [ ] Document issues

**Day 3-5: Refinement**
- [ ] Fix critical bugs
- [ ] Polish UX issues
- [ ] Performance optimization
- [ ] Documentation updates

---

## Timeline & Resources

### Estimated Timeline

**Total Duration:** 1.5-2 weeks (vs 3-4 weeks for canvas approach)

| Phase | Duration | Description |
|-------|----------|-------------|
| Week 1 | 5 days | Build all three views |
| Week 2 | 5 days | Integration, polish, testing |
| Week 3 | 3-5 days | Beta testing (optional) |

**Critical Path:**
- Gallery view (required for browsing)
- Studio view (required for working)
- Compare view (nice-to-have for v1)

**Minimum Viable Product (MVP):**
- Gallery + Studio = 1 week
- Add Compare later if needed

### Resource Requirements

**Engineering:**
- 1 frontend engineer (React/TypeScript)
- 1 VS Code extension engineer (TypeScript)

**Design:**
- UI mockups for 3 views
- Interaction design for mode switching

**Testing:**
- Manual QA for all features
- Cross-browser testing
- Performance benchmarking

### Success Metrics

**Quantitative:**
- [ ] Max 3 iframes mounted at any time
- [ ] Initial render < 300ms
- [ ] Mode switching < 100ms
- [ ] Memory usage < 100MB
- [ ] Smooth 60 FPS interactions

**Qualitative:**
- [ ] Users can find designs quickly (Gallery)
- [ ] Comparison is intuitive (Compare)
- [ ] Workflow is clear (Studio)
- [ ] Positive user feedback
- [ ] Fewer support issues

### Bundle Size

**Before (old canvas):**
- react-zoom-pan-pinch: ~15KB
- Custom code: ~30KB
- **Total:** ~45KB

**After (new views):**
- No transform library needed
- Zustand: ~3KB
- Custom code: ~25KB (simpler)
- **Total:** ~28KB

**Savings:** -17KB (~38% reduction)

---

## Dependencies & Configuration

### Package Changes

```json
{
  "dependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "zustand": "^4.4.7",
    "@vscode/codicons": "^0.0.35"
  },
  "remove": {
    "react-zoom-pan-pinch": "^3.7.0"
  }
}
```

### VS Code Configuration

```json
{
  "superdesign.useNewCanvas": {
    "type": "boolean",
    "default": false,
    "description": "Use the new Gallery/Studio canvas (experimental)"
  },
  "superdesign.galleryColumns": {
    "type": "number",
    "default": 4,
    "description": "Number of columns in Gallery view"
  },
  "superdesign.enableHoverPreview": {
    "type": "boolean",
    "default": true,
    "description": "Show iframe preview on hover in Gallery"
  }
}
```

---

## Open Questions & Decisions

### Technical Decisions

1. **Thumbnail Generation**
   - [ ] Generate thumbnails automatically?
   - [ ] Use placeholder icons?
   - [ ] Use hover preview only?

2. **State Persistence**
   - [ ] Store in workspace state?
   - [ ] Store in file metadata?
   - [ ] Store in separate `.superdesign/state.json`?

3. **Compare Mode**
   - [ ] Required for MVP?
   - [ ] Can be added later?
   - [ ] Alternative: Quick preview in Gallery?

4. **Studio Sidebar**
   - [ ] Collapsible?
   - [ ] Fixed width or resizable?
   - [ ] Mobile layout strategy?

### Product Decisions

1. **Primary Design Concept**
   - [ ] Single primary per workspace?
   - [ ] Multiple primaries (per project)?
   - [ ] Auto-set on approval?

2. **Hierarchy Display**
   - [ ] Breadcrumb sufficient?
   - [ ] Need tree view somewhere?
   - [ ] Show in Gallery cards?

3. **Feature Parity**
   - [ ] 100% parity required?
   - [ ] OK to ship without drag/zoom?
   - [ ] Which features are essential?

---

## Next Steps

### Immediate Actions

1. **Review & Approve Architecture**
   - [ ] Stakeholder sign-off
   - [ ] Technical review
   - [ ] UX review

2. **Create UI Mockups**
   - [ ] Gallery view mockup
   - [ ] Compare view mockup
   - [ ] Studio view mockup
   - [ ] Mode transitions

3. **Setup Development Environment**
   ```bash
   npm install zustand @vscode/codicons --save
   npm uninstall react-zoom-pan-pinch
   ```

4. **Create Feature Branch**
   ```bash
   git checkout -b feature/gallery-studio-redesign
   ```

5. **Start with Gallery View**
   - Build minimal Gallery first
   - Test with real designs
   - Iterate based on feedback

### Follow-up Actions

- [ ] Create GitHub issues for each view
- [ ] Setup feature flag configuration
- [ ] Document migration plan for users
- [ ] Prepare beta testing group

---

## References

### Documentation
- [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview)
- [VS Code Webview Security](https://code.visualstudio.com/api/extension-guides/webview#security)
- [CSP Sandbox Issues](https://github.com/w3c/webappsec-csp/issues/8)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [VS Code Codicons](https://microsoft.github.io/vscode-codicons/dist/codicon.html)

### Similar Implementations
- Figma (thumbnail grid + focus view)
- Sketch Cloud (gallery + detail view)
- InVision (project boards + inspect mode)

---

## Document Control

**Version:** 1.0  
**Last Updated:** December 15, 2025  
**Status:** Ready for review  

**Change Log:**
- v1.0 (2025-12-15): Initial Gallery → Studio redesign document

**Approved By:** Pending  
**Implementation Start:** Upon approval  
**Point of Contact:** Development team

---

**Ready for Review:** ✅ Yes  
**Ready for Implementation:** Pending approval  
**Estimated Delivery:** 1.5-2 weeks from start

