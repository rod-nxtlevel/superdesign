import { create } from 'zustand';
import type { DesignFile } from '../types/canvas.types';

export type ViewMode = 'gallery' | 'compare' | 'studio';
export type StatusFilter = 'all' | 'draft' | 'review' | 'approved' | 'archived';
export type ViewportFilter = 'all' | 'mobile' | 'tablet' | 'desktop';

interface Filters {
  status: StatusFilter;
  viewport: ViewportFilter;
  search: string;
}

// VS Code API Singleton
let vscodeApi: any;

function getVsCodeApi() {
  if (!vscodeApi && typeof acquireVsCodeApi !== 'undefined') {
    vscodeApi = acquireVsCodeApi();
  }
  return vscodeApi;
}

interface CanvasStore {
  // View mode
  mode: ViewMode;
  setMode: (mode: ViewMode, designId?: string) => void;

  // Designs
  designs: DesignFile[];
  setDesigns: (designs: DesignFile[]) => void;
  updateDesign: (designId: string, updates: Partial<DesignFile>) => void;

  // Primary design
  primaryDesignId: string | null;
  setPrimaryDesignId: (id: string | null) => void;

  // Compare mode
  compareSet: string[];
  addToCompare: (id: string) => void;
  removeFromCompare: (id: string) => void;
  clearCompare: () => void;

  // Studio mode
  studioDesignId: string | null;
  setStudioDesignId: (id: string | null) => void;

  // Filters
  filters: Filters;
  setFilters: (filters: Partial<Filters>) => void;

  // UI state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  // Initial state
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
  isLoading: true,
  error: null,

  // Actions
  setMode: (mode, designId) => {
    set({
      mode,
      studioDesignId: mode === 'studio' ? (designId || get().studioDesignId) : get().studioDesignId
    });

    // Persist state
    const vscode = getVsCodeApi();
    if (vscode) {
      vscode.setState({ ...get() });
    }
  },

  setDesigns: (designs) => set({ designs, isLoading: false }),

  updateDesign: (designId, updates) => set((state) => ({
    designs: state.designs.map(d =>
      d.name === designId ? { ...d, ...updates } : d
    )
  })),

  setPrimaryDesignId: (id) => {
    set({ primaryDesignId: id });

    // Send message to extension
    const vscode = getVsCodeApi();
    if (vscode) {
      vscode.postMessage({
        command: 'design:setPrimary',
        designId: id
      });
    }
  },

  addToCompare: (id) => set((state) => {
    // Max 3 designs in compare mode
    if (state.compareSet.includes(id)) return state;

    const newCompareSet = [...state.compareSet, id].slice(0, 3);
    return {
      compareSet: newCompareSet,
      mode: newCompareSet.length > 0 ? 'compare' : state.mode
    };
  }),

  removeFromCompare: (id) => set((state) => {
    const newCompareSet = state.compareSet.filter(cid => cid !== id);
    return {
      compareSet: newCompareSet,
      mode: newCompareSet.length === 0 ? 'gallery' : state.mode
    };
  }),

  clearCompare: () => set({ compareSet: [], mode: 'gallery' }),

  setStudioDesignId: (id) => set({ studioDesignId: id }),

  setFilters: (filters) => set((state) => ({
    filters: { ...state.filters, ...filters }
  })),

  setIsLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error, isLoading: false })
}));

// Helper to get filtered designs
export function useFilteredDesigns(): DesignFile[] {
  const designs = useCanvasStore(state => state.designs);
  const filters = useCanvasStore(state => state.filters);

  return designs.filter(design => {
    // Status filter
    if (filters.status !== 'all' && design.status !== filters.status) {
      return false;
    }

    // Viewport filter
    if (filters.viewport !== 'all' && design.viewport !== filters.viewport) {
      return false;
    }

    // Search filter
    if (filters.search && !design.name.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }

    return true;
  });
}

// Helper to get variations of a design
export function useDesignVariations(designId: string): DesignFile[] {
  const designs = useCanvasStore(state => state.designs);

  return designs.filter(d => d.parentDesign === designId);
}

// Helper to get parent design
export function useParentDesign(designId: string): DesignFile | null {
  const designs = useCanvasStore(state => state.designs);
  const design = designs.find(d => d.name === designId);

  if (!design || !design.parentDesign) return null;

  return designs.find(d => d.name === design.parentDesign) || null;
}

