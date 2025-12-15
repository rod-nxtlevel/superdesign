# Superdesign Enhancement Plan

**Version:** 1.0  
**Date:** December 15, 2024  
**Purpose:** Transform Superdesign into a production-ready design tool for existing projects

---

## Executive Summary

This document outlines planned enhancements to make Superdesign deeply integrated with existing development projects. The goal is to make generated designs context-aware, matching the project's framework, styling system, and component patterns automatically.

**Core Philosophy:** Superdesign generates HTML mockups for rapid design exploration, then helps bridge the gap to production code through intelligent context awareness and tooling.

---

## Phase 1: Core Context Awareness (High Priority)

### 1. Project Context Discovery

**Status:** Not Implemented  
**Priority:** High  
**Complexity:** Medium  
**Timeline:** 1-2 weeks

#### Background
Currently, Superdesign generates designs using hardcoded defaults (Flowbite, Tailwind CDN, generic fonts). This creates friction when integrating into existing projects that use different frameworks, component libraries, or styling systems.

#### Objective
Automatically detect and understand the project's technical stack before generating any designs.

#### Implementation Details

**A. Create Project Analyzer Utility**
```typescript
// src/utils/projectAnalyzer.ts

interface ProjectContext {
  // Framework detection
  framework: 'react' | 'vue' | 'svelte' | 'angular' | 'html' | 'next' | 'nuxt' | 'unknown';
  frameworkVersion?: string;
  
  // Build tools
  bundler?: 'vite' | 'webpack' | 'parcel' | 'esbuild' | 'turbopack';
  
  // Styling
  cssFramework?: 'tailwind' | 'bootstrap' | 'bulma' | 'none';
  cssInJs?: 'styled-components' | 'emotion' | 'css-modules' | 'none';
  
  // Component library
  componentLibrary?: 'shadcn' | 'mui' | 'ant-design' | 'chakra' | 'radix' | 'none';
  
  // Design tokens
  hasDesignTokens: boolean;
  designTokensPath?: string;
  
  // Styling details
  colors: string[];
  fonts: string[];
  spacingSystem?: '4px' | '8px' | 'custom';
  
  // Component patterns
  componentPattern?: string; // e.g., "src/components/[Name]/[Name].tsx"
  fileNamingConvention?: 'PascalCase' | 'kebab-case' | 'camelCase';
  
  // Testing
  testingFramework?: 'jest' | 'vitest' | 'cypress' | 'playwright';
  
  // Paths
  srcDir: string;
  componentsDir?: string;
  stylesDir?: string;
}

export class ProjectAnalyzer {
  async analyze(workspaceRoot: string): Promise<ProjectContext> {
    const context: ProjectContext = {
      framework: 'unknown',
      hasDesignTokens: false,
      colors: [],
      fonts: [],
      srcDir: 'src'
    };
    
    // 1. Read package.json
    const packageJson = await this.readPackageJson(workspaceRoot);
    if (packageJson) {
      context.framework = this.detectFramework(packageJson);
      context.frameworkVersion = this.getFrameworkVersion(packageJson);
      context.cssFramework = this.detectCSSFramework(packageJson);
      context.componentLibrary = this.detectComponentLibrary(packageJson);
      context.bundler = this.detectBundler(packageJson);
    }
    
    // 2. Scan for config files
    context.tailwindConfig = await this.findTailwindConfig(workspaceRoot);
    context.designTokensPath = await this.findDesignTokens(workspaceRoot);
    
    // 3. Extract design tokens
    if (context.tailwindConfig) {
      const tokens = await this.extractTailwindTokens(context.tailwindConfig);
      context.colors = tokens.colors;
      context.fonts = tokens.fonts;
      context.spacingSystem = tokens.spacingSystem;
    }
    
    // 4. Analyze component patterns
    const componentAnalysis = await this.analyzeComponents(workspaceRoot);
    context.componentPattern = componentAnalysis.pattern;
    context.fileNamingConvention = componentAnalysis.namingConvention;
    context.componentsDir = componentAnalysis.directory;
    
    // 5. Find styles directory
    context.stylesDir = await this.findStylesDirectory(workspaceRoot);
    
    return context;
  }
  
  private detectFramework(packageJson: any): string {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (deps.next) return 'next';
    if (deps.nuxt) return 'nuxt';
    if (deps.react) return 'react';
    if (deps.vue) return 'vue';
    if (deps.svelte) return 'svelte';
    if (deps['@angular/core']) return 'angular';
    
    return 'html';
  }
  
  private detectComponentLibrary(packageJson: any): string | undefined {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (deps['@radix-ui/react-avatar'] || deps['@radix-ui/react-dialog']) return 'shadcn';
    if (deps['@mui/material']) return 'mui';
    if (deps.antd) return 'ant-design';
    if (deps['@chakra-ui/react']) return 'chakra';
    if (deps['@headlessui/react']) return 'headlessui';
    
    return 'none';
  }
  
  private async findTailwindConfig(workspaceRoot: string): Promise<string | null> {
    const possiblePaths = [
      'tailwind.config.js',
      'tailwind.config.ts',
      'tailwind.config.mjs',
      'tailwind.config.cjs'
    ];
    
    for (const configPath of possiblePaths) {
      const fullPath = path.join(workspaceRoot, configPath);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
    
    return null;
  }
  
  private async analyzeComponents(workspaceRoot: string): Promise<any> {
    // Use grep to find component files
    // Analyze structure and extract patterns
    // Return componentPattern, namingConvention, etc.
  }
}
```

**Usage:**
```typescript
// In CustomAgentService.setupWorkingDirectory()
this.projectContext = await this.projectAnalyzer.analyze(workspaceRoot);
```

---

### 2. Smart System Prompt Enhancement

**Status:** Not Implemented  
**Priority:** High  
**Complexity:** Medium  
**Timeline:** 1 week (depends on #1)

#### Background
The current system prompt is static and generic, making assumptions about tools (Flowbite, Tailwind CDN) that may not match the project's actual stack.

#### Objective
Generate a dynamic, context-aware system prompt that instructs the AI to match the project's existing patterns, ensuring generated designs are immediately usable.

#### Implementation Details

**A. Dynamic Prompt Builder**
```typescript
// src/services/promptBuilder.ts

export class PromptBuilder {
  constructor(private projectContext: ProjectContext) {}
  
  build(): string {
    return `# Role
You are superdesign, a senior frontend designer integrated into ${this.getProjectDescription()}.

# Project Context Analysis (CRITICAL - Follow these exactly)

## Framework & Stack
- **Framework:** ${this.projectContext.framework.toUpperCase()} ${this.projectContext.frameworkVersion || ''}
- **Bundler:** ${this.projectContext.bundler || 'Not detected'}
- **Component Library:** ${this.projectContext.componentLibrary || 'None - use vanilla HTML/CSS'}
- **CSS Framework:** ${this.projectContext.cssFramework || 'None'}
${this.projectContext.cssInJs ? `- **CSS-in-JS:** ${this.projectContext.cssInJs}` : ''}

## Design System (USE THESE VALUES)

### Color Palette
${this.formatColors()}

### Typography
${this.formatFonts()}

### Spacing System
- **System:** ${this.projectContext.spacingSystem || '8px grid (default)'}
- **Base unit:** ${this.getSpacingUnit()}
${this.formatSpacingScale()}

### Component Patterns
- **Location:** ${this.projectContext.componentsDir || 'src/components'}
- **Naming:** ${this.projectContext.fileNamingConvention || 'PascalCase'}
- **Pattern:** ${this.projectContext.componentPattern || '[Name].tsx'}

## Critical Instructions

### DO (Required)
1. **Read existing components first** - Use the 'read' tool to examine similar components in the project
2. **Match the color palette** - Only use colors from the project's palette listed above
3. **Follow spacing system** - Use ${this.getSpacingUnit()} multiples (${this.getSpacingExamples()})
4. **Use ${this.getStyleMethod()}** - ${this.getStyleInstructions()}
5. **Match component structure** - Follow the ${this.projectContext.framework} patterns found in existing components
6. **Reference existing styles** - Import or reference the project's existing CSS/theme files

### DON'T (Avoid)
1. **Don't use generic CDN libraries** unless the project already uses them
2. **Don't introduce new color palettes** without explicit user request
3. **Don't use arbitrary spacing values** (e.g., 13px, 27px) - stick to the spacing system
4. **Don't generate vanilla HTML** if the project uses a framework - match the framework
5. **Don't use placeholder images from external services** - use local assets or CSS placeholders

## Workflow

### Step 1: Analyze Context
Before designing, read:
- Similar component(s) if updating existing UI
- ${this.getStyleFilesPaths()}
- Component examples from ${this.projectContext.componentsDir}

### Step 2: Layout Design
Present ASCII wireframe matching the project's typical layouts

### Step 3: Theme Design  
Use existing design tokens. If generating new theme, ensure compatibility with:
${this.getThemeCompatibility()}

### Step 4: Generate Design
Output to: .superdesign/design_iterations/{name}_{n}.html

Include in HTML:
- Link to project's existing CSS if applicable
- Use ${this.projectContext.cssFramework} classes if project uses it
- Match the project's responsive breakpoints

### Step 5: Suggest Integration
After generating, suggest how to integrate into the ${this.projectContext.framework} codebase.

## Available Tools
- read, write, edit, multiedit, glob, grep, ls, bash, generateTheme

## Examples Based on This Project

${this.generateProjectSpecificExamples()}

---

Remember: Your goal is to generate designs that feel native to THIS specific project, not generic designs.
`;
  }
  
  private formatColors(): string {
    if (this.projectContext.colors.length === 0) {
      return '- No custom colors detected - use neutral palette (black, white, grays)';
    }
    
    return this.projectContext.colors.map((color, i) => 
      `- **Color ${i + 1}:** ${color}`
    ).join('\n');
  }
  
  private getStyleMethod(): string {
    if (this.projectContext.cssFramework === 'tailwind') {
      return 'Tailwind utility classes';
    }
    if (this.projectContext.cssInJs) {
      return `${this.projectContext.cssInJs}`;
    }
    return 'CSS or inline styles';
  }
  
  private getStyleInstructions(): string {
    if (this.projectContext.cssFramework === 'tailwind') {
      if (this.projectContext.tailwindConfig) {
        return `Reference the project's tailwind.config for custom values`;
      }
      return 'Use standard Tailwind classes';
    }
    return 'Match the existing CSS patterns in the project';
  }
  
  private generateProjectSpecificExamples(): string {
    // Generate examples based on actual project context
    // E.g., if React + Tailwind + shadcn, show that specific example
  }
}
```

**B. Integration with CustomAgentService**
```typescript
// In src/services/customAgentService.ts

private projectContext: ProjectContext | null = null;
private promptBuilder: PromptBuilder | null = null;

private async setupWorkingDirectory(): Promise<void> {
  // Existing setup...
  
  // NEW: Analyze project
  const projectAnalyzer = new ProjectAnalyzer();
  this.projectContext = await projectAnalyzer.analyze(workspaceRoot);
  this.promptBuilder = new PromptBuilder(this.projectContext);
  
  // Save context for reference
  const contextPath = path.join(superdesignDir, 'context.json');
  fs.writeFileSync(contextPath, JSON.stringify(this.projectContext, null, 2));
  
  this.outputChannel.appendLine(`Project analyzed: ${this.projectContext.framework}`);
}

private getSystemPrompt(): string {
  // NEW: Use dynamic prompt
  if (this.promptBuilder) {
    return this.promptBuilder.build();
  }
  
  // Fallback to static prompt
  return this.getStaticSystemPrompt();
}
```

#### Benefits
- AI always knows the project context
- Generated designs use correct tools and patterns
- Reduces manual adaptation needed
- Consistent with project standards

---

### 4. Style System Integration

**Status:** Not Implemented  
**Priority:** Medium  
**Complexity:** Medium  
**Timeline:** 1-2 weeks

#### Background
Projects often have established design systems via Tailwind configs, CSS variables, design token files, or component library themes. Superdesign currently ignores these.

#### Objective
Extract and use existing design tokens so generated designs maintain visual consistency with the project.

#### Implementation Details

**A. Design Token Extractors**
```typescript
// src/utils/tokenExtractors/

// tailwindExtractor.ts
export class TailwindExtractor {
  async extract(configPath: string): Promise<DesignTokens> {
    // Read tailwind.config.js/ts
    // Parse and extract:
    // - colors (extend.colors)
    // - spacing (extend.spacing)
    // - fonts (extend.fontFamily)
    // - borderRadius (extend.borderRadius)
    // - shadows (extend.boxShadow)
    
    return {
      colors: { primary: '#...', secondary: '#...', ... },
      spacing: ['4px', '8px', '16px', ...],
      fonts: { sans: 'Inter, ...', mono: 'JetBrains Mono, ...' },
      radius: { sm: '4px', md: '8px', ... },
      shadows: { sm: '0 1px 2px ...', ... }
    };
  }
}

// cssVariablesExtractor.ts
export class CSSVariablesExtractor {
  async extract(cssPath: string): Promise<DesignTokens> {
    // Read CSS file
    // Parse :root { --color-primary: ...; }
    // Extract all CSS custom properties
    // Organize into categories
  }
}

// tokenJsonExtractor.ts
export class TokenJsonExtractor {
  async extract(tokenPath: string): Promise<DesignTokens> {
    // Read tokens.json / theme.json
    // Support common formats:
    // - Style Dictionary format
    // - Design Tokens format
    // - Custom JSON structures
  }
}
```

**B. Integration**
```typescript
// In ProjectAnalyzer
private async extractDesignTokens(context: ProjectContext): Promise<void> {
  // Try Tailwind first
  if (context.tailwindConfig) {
    const extractor = new TailwindExtractor();
    context.designTokens = await extractor.extract(context.tailwindConfig);
    return;
  }
  
  // Try CSS variables
  const cssFiles = await this.findGlobalCssFiles(workspaceRoot);
  if (cssFiles.length > 0) {
    const extractor = new CSSVariablesExtractor();
    context.designTokens = await extractor.extract(cssFiles[0]);
    return;
  }
  
  // Try tokens.json
  const tokenFile = await this.findDesignTokenFile(workspaceRoot);
  if (tokenFile) {
    const extractor = new TokenJsonExtractor();
    context.designTokens = await extractor.extract(tokenFile);
  }
}
```

**C. System Prompt Integration**
Include extracted tokens in the system prompt:
```
## Your Project's Design Tokens (USE THESE)

Colors:
- Primary: #3b82f6
- Secondary: #8b5cf6
- Accent: #10b981
- Background: #ffffff
- Foreground: #1f2937

Spacing Scale: [4, 8, 12, 16, 24, 32, 48, 64]px
Fonts: Inter (sans), JetBrains Mono (mono)
Border Radius: 8px (default)
```

#### Benefits
- Generated designs use existing color palette
- Consistent spacing and typography
- No need to manually adjust tokens
- Maintains brand consistency

---

### 5. Component Pattern Learning

**Status:** Not Implemented  
**Priority:** Medium  
**Complexity:** Medium-High  
**Timeline:** 2-3 weeks

#### Background
Each project has its own component structure, prop patterns, state management, and organization. Generic HTML doesn't capture these patterns.

#### Objective
Analyze existing components to understand and replicate the project's component architecture patterns.

#### Implementation Details

**A. Component Pattern Analyzer**
```typescript
// src/utils/componentAnalyzer.ts

interface ComponentPattern {
  // File structure
  fileStructure: 'single-file' | 'folder-per-component' | 'atomic-design';
  hasTests: boolean;
  hasStories: boolean;
  
  // Component structure
  usesTypeScript: boolean;
  propPattern: 'interface' | 'type' | 'propTypes' | 'none';
  
  // Common patterns
  commonImports: string[]; // ['React', 'useState', 'cn', ...]
  commonProps: string[]; // ['className', 'children', 'variant', ...]
  
  // State management
  stateManagement?: 'useState' | 'zustand' | 'redux' | 'mobx' | 'jotai';
  
  // Styling approach
  stylingPattern: 'className' | 'styled-components' | 'emotion' | 'css-modules';
  
  // Examples
  exampleComponents: {
    path: string;
    name: string;
    code: string;
  }[];
}

export class ComponentAnalyzer {
  async analyze(componentsDir: string, framework: string): Promise<ComponentPattern> {
    // 1. Find all component files
    const componentFiles = await this.findComponentFiles(componentsDir);
    
    // 2. Read sample components (3-5 representative ones)
    const samples = await this.readSampleComponents(componentFiles.slice(0, 5));
    
    // 3. Analyze patterns
    const pattern: ComponentPattern = {
      fileStructure: this.detectFileStructure(componentFiles),
      hasTests: this.hasTestFiles(componentsDir),
      hasStories: this.hasStoryFiles(componentsDir),
      usesTypeScript: this.usesTypeScript(componentFiles),
      propPattern: this.detectPropPattern(samples),
      commonImports: this.extractCommonImports(samples),
      commonProps: this.extractCommonProps(samples),
      stateManagement: this.detectStateManagement(samples),
      stylingPattern: this.detectStylingPattern(samples),
      exampleComponents: samples.slice(0, 2) // Keep 2 examples
    };
    
    return pattern;
  }
  
  private detectFileStructure(files: string[]): string {
    // Check if components are:
    // - Single files: Button.tsx
    // - Folders: Button/Button.tsx, Button/index.tsx
    // - Atomic design: atoms/Button.tsx, molecules/Card.tsx
  }
  
  private detectPropPattern(samples: any[]): string {
    // Analyze how props are defined:
    // - TypeScript interface: interface ButtonProps { ... }
    // - TypeScript type: type ButtonProps = { ... }
    // - PropTypes: Button.propTypes = { ... }
  }
  
  private extractCommonImports(samples: any[]): string[] {
    // Find imports that appear in 80%+ of components
    // E.g., ['React', 'cn', 'clsx', ...]
  }
}
```

**B. Include in System Prompt**
```typescript
## Component Patterns in This Project

Structure: ${patterns.fileStructure}
TypeScript: ${patterns.usesTypeScript ? 'Yes' : 'No'}
Props Definition: ${patterns.propPattern}

Common Imports:
${patterns.commonImports.map(imp => `- ${imp}`).join('\n')}

Common Props:
${patterns.commonProps.map(prop => `- ${prop}`).join('\n')}

State Management: ${patterns.stateManagement || 'useState (default)'}

Example Component from this project:
\`\`\`${patterns.usesTypeScript ? 'typescript' : 'javascript'}
${patterns.exampleComponents[0]?.code}
\`\`\`

When generating designs:
1. Follow this component structure
2. Use similar prop patterns
3. Include common props like 'className' for styling flexibility
4. Match the import style
```

#### Benefits
- Generated designs feel native to the project
- AI understands project conventions
- Easier handoff to actual component implementation
- Maintains consistency with existing codebase

---

### 6. Bi-directional Sync

**Status:** Not Implemented  
**Priority:** Lower Priority, High Impact  
**Complexity:** High  
**Timeline:** 3-4 weeks

#### Background
Currently, there's a one-way flow: Superdesign generates HTML → Developer manually integrates. There's no way to sync changes back or update designs based on code changes.

#### Objective
Enable true design-code iteration where changes in either direction can be synced.

#### Implementation Details

**A. File Watchers**
```typescript
// src/services/syncService.ts

export class SyncService {
  private designFileWatcher: vscode.FileSystemWatcher;
  private componentFileWatcher: vscode.FileSystemWatcher;
  
  async startWatching(designDir: string, componentDir: string) {
    // Watch .superdesign/design_iterations/
    this.designFileWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(designDir, '**/*.{html,css}')
    );
    
    this.designFileWatcher.onDidChange(async (uri) => {
      await this.handleDesignChange(uri);
    });
    
    // Watch actual components
    this.componentFileWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(componentDir, '**/*.{tsx,jsx,vue,svelte}')
    );
    
    this.componentFileWatcher.onDidChange(async (uri) => {
      await this.handleComponentChange(uri);
    });
  }
  
  private async handleDesignChange(uri: vscode.Uri) {
    // Design file changed
    // Check if it has a linked component
    const linkedComponent = await this.findLinkedComponent(uri);
    
    if (linkedComponent) {
      // Show notification: "Design updated. Update component code?"
      const action = await vscode.window.showInformationMessage(
        `Design ${path.basename(uri.fsPath)} was updated. Sync to component?`,
        'Yes', 'No', 'View Diff'
      );
      
      if (action === 'Yes') {
        await this.syncDesignToComponent(uri, linkedComponent);
      } else if (action === 'View Diff') {
        await this.showDesignComponentDiff(uri, linkedComponent);
      }
    }
  }
  
  private async handleComponentChange(uri: vscode.Uri) {
    // Component file changed
    // Check if it has a design iteration
    const linkedDesign = await this.findLinkedDesign(uri);
    
    if (linkedDesign) {
      // Show notification: "Component updated. Update design preview?"
      const action = await vscode.window.showInformationMessage(
        `Component ${path.basename(uri.fsPath)} was updated. Sync to design preview?`,
        'Yes', 'No'
      );
      
      if (action === 'Yes') {
        await this.syncComponentToDesign(uri, linkedDesign);
      }
    }
  }
  
  private async syncDesignToComponent(designUri: vscode.Uri, componentPath: string) {
    // Use AI to convert HTML → Framework component
    // Show diff before applying
    // Update the actual component file
  }
}
```

**B. Design-Component Linking**
```typescript
// Store links in .superdesign/links.json
{
  "login_1.html": {
    "linkedComponent": "src/components/auth/Login.tsx",
    "createdFrom": "src/components/auth/Login.tsx",
    "lastSync": "2024-12-15T10:30:00Z"
  }
}
```

**C. VS Code Commands**
```typescript
// Command: "Superdesign: Link Design to Component"
// - User selects design file
// - User selects component file
// - Creates link for bi-directional sync

// Command: "Superdesign: Sync Design to Code"
// - Converts current design to framework code
// - Shows diff
// - Applies changes

// Command: "Superdesign: Update Design from Code"
// - Reads current component
// - Regenerates HTML preview
// - Updates design file
```

#### Benefits
- True iterative design workflow
- No manual sync needed
- Design stays current with code
- Code stays current with design
- Reduces friction in design → implementation loop

#### Challenges
- Complex AI parsing (code → design)
- Diff generation and conflict resolution
- Maintaining semantic meaning across conversions

---

### 7. Better Integration Commands

**Status:** Partially Implemented  
**Priority:** High  
**Complexity:** Low-Medium  
**Timeline:** 1 week

#### Background
Current commands are basic (initialize, open canvas, configure keys). Missing workflow-specific commands that match actual usage patterns.

#### Objective
Add intuitive commands that match the design → implementation workflow.

#### Implementation Details

**A. New Commands**
```typescript
// In src/extension.ts

// 1. Analyze Project Command
vscode.commands.registerCommand('superdesign.analyzeProject', async () => {
  const analyzer = new ProjectAnalyzer();
  const context = await analyzer.analyze(workspaceRoot);
  
  // Show analysis results
  const panel = vscode.window.createWebviewPanel(
    'projectAnalysis',
    'Superdesign Project Analysis',
    vscode.ViewColumn.One,
    {}
  );
  
  panel.webview.html = generateAnalysisHTML(context);
});

// 2. Import Component for Redesign
vscode.commands.registerCommand('superdesign.importComponent', async () => {
  // Quick pick to select component file
  const files = await vscode.workspace.findFiles('**/*.{tsx,jsx,vue,svelte}');
  const selected = await vscode.window.showQuickPick(
    files.map(f => f.fsPath),
    { placeHolder: 'Select component to redesign' }
  );
  
  if (selected) {
    // Send to Superdesign chat with context
    sidebarProvider.sendMessage({
      command: 'importComponent',
      componentPath: selected
    });
    
    // Auto-open sidebar and canvas
    vscode.commands.executeCommand('superdesign.showChatSidebar');
    SuperdesignCanvasPanel.createOrShow(context.extensionUri, sidebarProvider);
  }
});

// 3. Export Design to Framework
vscode.commands.registerCommand('superdesign.exportToFramework', async (designPath: string) => {
  const projectContext = await getCurrentProjectContext();
  
  const options = [
    `Export to ${projectContext.framework}`,
    'Export to React',
    'Export to Vue',
    'Export to Svelte',
    'Export as HTML'
  ];
  
  const choice = await vscode.window.showQuickPick(options);
  
  if (choice) {
    // Use AI to convert
    const converter = new FrameworkConverter(projectContext);
    const convertedCode = await converter.convert(designPath, choice);
    
    // Show in new editor
    const doc = await vscode.workspace.openTextDocument({
      content: convertedCode,
      language: getLanguageForFramework(choice)
    });
    
    await vscode.window.showTextDocument(doc);
  }
});

// 4. Apply Design to Component
vscode.commands.registerCommand('superdesign.applyDesignToComponent', async () => {
  // Select design file
  const designFiles = await this.getDesignFiles();
  const design = await vscode.window.showQuickPick(designFiles);
  
  if (!design) return;
  
  // Select target component
  const componentFiles = await vscode.workspace.findFiles('**/*.{tsx,jsx}');
  const component = await vscode.window.showQuickPick(
    componentFiles.map(f => f.fsPath)
  );
  
  if (!component) return;
  
  // Show diff and apply
  await this.showDiffAndApply(design, component);
});

// 5. Create Design from Selection
vscode.commands.registerCommand('superdesign.designFromSelection', async () => {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;
  
  const selection = editor.document.getText(editor.selection);
  
  if (selection) {
    // Send to Superdesign with context
    sidebarProvider.sendMessage({
      command: 'redesignSelection',
      code: selection,
      language: editor.document.languageId,
      filePath: editor.document.uri.fsPath
    });
    
    vscode.commands.executeCommand('superdesign.showChatSidebar');
  }
});

// 6. Generate Design System
vscode.commands.registerCommand('superdesign.generateDesignSystem', async () => {
  // Analyze all designs in .superdesign/design_iterations/
  // Extract common patterns
  // Generate design system files
  // Options: tailwind.config.js, CSS variables, tokens.json
});

// 7. Refresh Project Context
vscode.commands.registerCommand('superdesign.refreshContext', async () => {
  // Re-analyze project
  // Update context.json
  // Reload AI with new context
  vscode.window.showInformationMessage('Project context refreshed!');
});
```

**B. Context Menu Integration**
```json
// In package.json contributions
"menus": {
  "explorer/context": [
    {
      "command": "superdesign.importComponent",
      "when": "resourceExtname =~ /\\.(tsx|jsx|vue|svelte)$/",
      "group": "superdesign"
    },
    {
      "command": "superdesign.exportToFramework",
      "when": "resourcePath =~ /\\.superdesign\\/design_iterations/",
      "group": "superdesign"
    }
  ]
}
```

#### Benefits
- Natural workflow integration
- Right-click context menus for common tasks
- Faster iteration cycles
- Less context switching

---

## Phase 2: Framework Integration

### 3. Framework-Specific Output - Analysis & Discussion

**Status:** Not Implemented  
**Priority:** High (with caveats)  
**Complexity:** High

#### Your Question: Is this needed if AI agents can convert HTML?

**Short Answer:** It depends on your workflow preference. Let me break this down:

#### Scenario A: You use Cursor's main AI for integration

**Workflow:**
1. Superdesign generates `login_1.html` (pure HTML/CSS mockup)
2. You review in Canvas, approve the design
3. You paste the HTML into Cursor's main chat
4. You ask Cursor AI: "Convert this to a React component matching my project's patterns"
5. Cursor AI has access to your project context and generates the React component
6. You paste into your codebase

**Pros:**
- Cursor AI has full project context
- Can use MCP tools (Figma, etc.) if needed
- Leverages Cursor's existing capabilities
- Simpler for Superdesign to maintain

**Cons:**
- Extra step (copy/paste to Cursor)
- Context switching between tools
- Need to re-explain project context to Cursor AI

**Recommendation:** If this is your workflow, **framework-specific output is LOW priority**. The HTML is sufficient.

---

#### Scenario B: You use Superdesign end-to-end

**Workflow:**
1. Superdesign generates `login_1.html` (pure HTML/CSS mockup)
2. You review in Canvas, approve the design
3. You click "Export to React" in Superdesign
4. Superdesign AI (which already has project context) generates `Login.tsx`
5. You copy directly into your codebase

**Pros:**
- Seamless workflow within one tool
- No context switching
- Superdesign AI already knows project context
- One-click conversion

**Cons:**
- More complex to implement in Superdesign
- Duplicate effort (Cursor can already do this)
- Maintenance burden for multiple frameworks

**Recommendation:** If this is your workflow, **framework-specific output is HIGH priority**.

---

#### Middle Ground: Smart Export Assistant

**Suggested Approach:**

Instead of full framework conversion, add a **"Export Assistant"** that:

1. **Provides AI-ready context**
   ```typescript
   // Command: "Superdesign: Prepare for Integration"
   // Generates a summary that you can paste into Cursor:
   
   I've created a design in .superdesign/design_iterations/login_1.html
   
   Project Context:
   - Framework: React (Next.js 14)
   - Component Library: shadcn/ui
   - Styling: Tailwind with custom config
   - Colors: [list from your palette]
   - Component pattern: src/components/[Name]/[Name].tsx
   
   Please convert this HTML to a React component following our patterns:
   [HTML content here]
   ```

2. **Copy button** that puts this entire context on clipboard
3. You paste into Cursor main chat
4. Cursor does the conversion with full context

**Benefits:**
- Bridges both tools
- Leverages Cursor's strengths
- Minimal implementation in Superdesign
- Still provides value

#### My Recommendation

Given your stated workflow ("produce design options... once approved, we can move it to getting it built on this side"), I recommend:

**Phase 1:** Implement the "Export Assistant" approach
- Low complexity
- Provides structured context for Cursor
- Lets you use Cursor's AI for framework conversion

**Phase 2:** Consider full framework export if:
- You find yourself repeatedly doing the same conversions
- The manual step becomes a bottleneck
- You want Superdesign to be truly standalone

**Decision Point:** After implementing Project Context Discovery (#1) and Smart Prompts (#2), you'll have all the context needed for framework conversion. The question is whether to do it in Superdesign or let Cursor handle it.

---

## Phase 3: Advanced Features (Backlog)

### 8. Design System Generator

**Status:** Not Implemented  
**Priority:** Medium  
**Complexity:** Medium  
**Timeline:** 2-3 weeks

#### Objective
Extract common design patterns across all generated designs and create a cohesive design system.

#### Use Case
- After creating 5-10 screen designs
- Run "Generate Design System"
- Superdesign analyzes all designs
- Extracts: colors, typography, spacing, components, patterns
- Generates: `tailwind.config.js` or `design-tokens.json`
- Can export to various formats

#### Value
- Maintain consistency across designs
- Easy export to codebase
- Foundation for component library

---

### 9. Screenshot/Upload Analysis Enhancement

**Status:** Basic image upload exists  
**Priority:** Medium  
**Complexity:** Medium  
**Timeline:** 1-2 weeks

#### Current State
Users can upload images to `.superdesign/moodboard/` for inspiration.

#### Enhancement
**A. Visual Analysis**
- AI analyzes uploaded screenshots
- Extracts: colors, fonts, spacing, layout structure
- Suggests matching designs

**B. Reference Screenshots**
- Upload existing UI screenshot
- AI: "I'll create an improved version maintaining the structure"
- Generates redesign with same layout, better aesthetics

**C. Competitive Analysis**
- Upload competitor UI
- AI: "Here's a similar design adapted to your style"

#### Implementation
```typescript
// Command: "Superdesign: Analyze Screenshot"
- Upload or select existing image
- AI vision analysis (Claude/GPT-4V)
- Extract design tokens
- Use as reference for new designs
```

---

### 10. Metadata Files

**Status:** Not Implemented  
**Priority:** Low  
**Complexity:** Low  
**Timeline:** 1 week

#### Objective
Persist project preferences and context across sessions.

#### Implementation
```json
// .superdesign/config.json
{
  "version": "1.0",
  "initialized": "2024-12-15T10:00:00Z",
  "projectName": "My App",
  "context": {
    "framework": "react",
    "lastAnalyzed": "2024-12-15T10:00:00Z"
  },
  "preferences": {
    "defaultTheme": "modern-dark",
    "autoOpenCanvas": true,
    "designPrefix": "app"
  },
  "designSystem": {
    "generatedAt": "2024-12-15T11:00:00Z",
    "tokensPath": "src/styles/tokens.ts"
  }
}
```

---

## Figma MCP Integration (Exploration)

### Background

Figma MCP (Model Context Protocol) allows AI assistants to interact with Figma designs directly. Cursor has built-in Figma MCP support.

### Current State

**Superdesign:**
- Runs as VS Code extension
- Isolated from Cursor's MCP infrastructure
- Cannot access Figma MCP directly

**Cursor:**
- Has Figma MCP configured
- Main AI chat can read Figma designs
- Extract design specs, components, tokens

### Integration Challenge

VS Code extensions run in an isolated extension host and **cannot directly access MCP servers** configured in `.cursor/mcp.json`. This is by design for security and architecture reasons.

### Possible Integration Approaches

#### Approach 1: Proxy Through Cursor (Recommended)

**Architecture:**
```
User → Superdesign → VS Code Command → Cursor Main Chat → Figma MCP
                                            ↓
                                    Extract design info
                                            ↓
                                    Return to Superdesign
```

**Implementation:**
```typescript
// In Superdesign
vscode.commands.executeCommand('cursor.queryMCP', {
  server: 'figma',
  query: 'Get design for node-id: 123:456'
}).then(result => {
  // Use Figma data in Superdesign
  this.generateFromFigmaDesign(result);
});
```

**Challenge:** This requires Cursor to expose an API for extensions to query MCP servers. This may not exist currently.

---

#### Approach 2: Indirect Integration via Clipboard

**Workflow:**
```
User (in Cursor main chat):
  "Extract design from Figma node 123:456"
  
Cursor AI (with Figma MCP):
  [Extracts design specs, generates structured JSON]
  
User:
  [Copies JSON to clipboard]
  [Opens Superdesign]
  "Create design from this Figma spec: [paste]"
  
Superdesign:
  [Parses Figma spec]
  [Generates matching HTML design]
```

**Implementation:**
```typescript
// Command: "Superdesign: Import Figma Spec"
// - Reads clipboard
// - Expects JSON from Figma MCP
// - Generates design matching Figma specs

// In chat handler
if (message.includes('figma spec') || isFigmaJSON(message)) {
  const figmaData = parseFigmaJSON(message);
  await this.generateFromFigmaSpec(figmaData);
}
```

**Pros:**
- Works today
- No Cursor API needed
- User controls the flow

**Cons:**
- Manual copy/paste step
- Not seamless

---

#### Approach 3: Shared Context File

**Architecture:**
```
Cursor AI → Writes Figma data to .superdesign/figma-context.json
Superdesign → Watches file → Reads Figma data → Generates design
```

**Implementation:**
```typescript
// In Cursor main chat (user asks):
"Extract this Figma design and save for Superdesign"

// Cursor AI (with Figma MCP):
// Writes to .superdesign/figma-context.json

// In Superdesign:
const figmaWatcher = vscode.workspace.createFileSystemWatcher(
  '.superdesign/figma-context.json'
);

figmaWatcher.onDidChange(async () => {
  const figmaData = await this.readFigmaContext();
  // Auto-generate design from Figma
  await this.generateFromFigmaSpec(figmaData);
});
```

**Pros:**
- Automated
- No manual copy/paste
- Works within current constraints

**Cons:**
- Requires cooperation from Cursor AI
- File-based communication
- Slightly complex

---

#### Approach 4: Native MCP Client (Experimental)

**What if Superdesign implemented its own MCP client?**

**Architecture:**
```
Superdesign → MCP Client → Figma MCP Server
```

**Requirements:**
- Implement MCP protocol in Superdesign
- Read .cursor/mcp.json for Figma configuration
- Connect directly to Figma MCP server

**Implementation:**
```typescript
// src/services/mcpClient.ts
import { MCPClient } from '@modelcontextprotocol/sdk';

export class SuperdesignMCPClient {
  private figmaClient: MCPClient | null = null;
  
  async connect() {
    // Read .cursor/mcp.json
    const mcpConfig = await this.readMCPConfig();
    
    // Connect to Figma MCP server
    this.figmaClient = new MCPClient(mcpConfig.figma);
    await this.figmaClient.connect();
  }
  
  async getFigmaDesign(nodeId: string) {
    // Query Figma MCP directly
    return await this.figmaClient.call('get_design_context', { nodeId });
  }
}
```

**Pros:**
- Direct access
- No middleman
- Full Figma capabilities

**Cons:**
- Complex implementation
- Need to implement MCP protocol
- May have authentication issues
- Unclear if .cursor/mcp.json is accessible to extensions

---

### Recommended Figma Integration Path

**Phase 1 (Immediate):** Approach 2 - Clipboard Integration
- Easiest to implement
- Works today
- No dependencies on Cursor

**Phase 2 (Short-term):** Approach 3 - Shared Context File
- More automated
- Better UX
- Still within VS Code extension constraints

**Phase 3 (Future):** Approach 4 - Native MCP Client
- If MCP SDK supports it
- After other features are stable
- Investigate feasibility first

**Phase X (Dream):** Approach 1 - If Cursor exposes MCP API
- Ideal solution
- Wait for Cursor to support extension → MCP communication
- May never happen (architectural constraint)

---

### Figma Integration Feature Spec

**Command:** `Superdesign: Import from Figma`

**Workflow:**
1. User copies Figma URL or node ID
2. Runs command (or pastes in Superdesign chat)
3. Superdesign detects Figma reference
4. Shows helper message:
   ```
   To import from Figma:
   
   1. In Cursor main chat, paste this Figma URL
   2. Ask: "Extract design specs and save to .superdesign/figma-import.json"
   3. I'll automatically generate the design when ready
   
   Or paste the design specs JSON directly into this chat.
   ```
5. Once JSON is available (file or paste), generate design

**Later Enhancement:**
- Watch `.superdesign/figma-import.json`
- Auto-detect Figma JSON in clipboard
- One-click import from URL

---

## Implementation Priority Matrix

| Feature | Priority | Complexity | Impact | Implement First? |
|---------|----------|------------|--------|------------------|
| Project Context Discovery | High | Medium | High | ✅ Yes - Foundation |
| Smart System Prompt | High | Medium | High | ✅ Yes - Core |
| Better Integration Commands | High | Low-Medium | Medium | ✅ Yes - Quick wins |
| Style System Integration | Medium | Medium | High | ✅ Yes - Big value |
| Component Pattern Learning | Medium | Medium-High | High | ⏳ After #1,#2 |
| Framework-Specific Output | Medium* | High | Medium | ⏸️ Maybe later |
| Bi-directional Sync | Low/High | High | High | ⏸️ Phase 3 |
| Figma Integration | Medium | High | Medium | 🔬 Research first |
| Design System Generator | Medium | Medium | Medium | ⏸️ Nice to have |
| Screenshot Analysis | Medium | Medium | Medium | ⏸️ Enhancement |
| Metadata Files | Low | Low | Low | ✅ Easy add |

\* Framework-specific output priority depends on chosen workflow (see detailed analysis above)

---

## Development Roadmap

### Sprint 1: Foundation (Weeks 1-2)
- [ ] Implement ProjectAnalyzer utility
- [ ] Create design token extractors (Tailwind, CSS vars)
- [ ] Build dynamic PromptBuilder
- [ ] Add metadata storage (.superdesign/config.json, context.json)
- [ ] Test with 3-5 different project types

**Deliverable:** Superdesign understands project context

---

### Sprint 2: Integration (Weeks 3-4)
- [ ] Add "Analyze Project" command
- [ ] Add "Import Component" command  
- [ ] Add "Refresh Context" command
- [ ] Implement component pattern analyzer
- [ ] Update system prompt with full context
- [ ] Add context menu items

**Deliverable:** Seamless workflow integration

---

### Sprint 3: Workflow Enhancement (Weeks 5-6)
- [ ] Add "Export Assistant" (clipboard helper for Cursor)
- [ ] Implement component pattern learning
- [ ] Add design-to-code suggestions in Canvas
- [ ] Create integration guides for each framework

**Deliverable:** Smooth design → code transition

---

### Sprint 4: Advanced Features (Weeks 7-10)
- [ ] Research Figma MCP integration feasibility
- [ ] Implement Approach 2/3 for Figma (clipboard or file-based)
- [ ] Add bi-directional sync (if valuable)
- [ ] Framework-specific output (if chosen)
- [ ] Design system generator

**Deliverable:** Advanced capabilities

---

## Success Metrics

### User Experience
- Time from "design idea" to "production code": **< 10 minutes**
- Manual adaptation needed: **< 20% of generated code**
- Developer satisfaction: **8+/10**

### Technical
- Project context detection accuracy: **> 90%**
- Design token extraction accuracy: **> 85%**
- Generated code matches project patterns: **> 80%**

### Adoption
- Used weekly by active projects: **> 70%**
- Designs actually shipped to production: **> 50%**

---

## Open Questions

1. **Framework Export vs. Cursor Integration:**
   - Should Superdesign do framework conversion?
   - Or focus on perfect HTML + easy handoff to Cursor?
   - **Decision needed:** User preference drives this

2. **Figma Integration:**
   - Is direct MCP access possible for extensions?
   - Would file-based approach be acceptable?
   - How critical is Figma integration vs. other features?

3. **Context Update Frequency:**
   - Auto-refresh project context on every design?
   - Manual refresh command only?
   - Cache for performance?

4. **Privacy/Security:**
   - Store project context in version control?
   - Exclude sensitive data (API keys, tokens)?
   - Allow opt-out of certain analysis?

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Prioritize features** based on actual workflow
3. **Start with Sprint 1** - Project Context Discovery
4. **Gather feedback** from real usage
5. **Iterate** based on learnings

---

## Notes

- This plan assumes Superdesign remains a VS Code extension (not a separate MCP server)
- Framework-specific output is optional - depends on workflow preference
- Figma integration has architectural constraints - multiple approaches available
- Focus should be on making HTML output as contextually rich as possible
- The goal is not to replace Cursor's AI, but to complement it with design-specific capabilities

---

**Document Owner:** Superdesign Development Team  
**Last Updated:** December 15, 2024  
**Next Review:** After Sprint 1 completion

