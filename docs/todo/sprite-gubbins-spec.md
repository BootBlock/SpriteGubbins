# **👾 MASTER IMPLEMENTATION SPECIFICATION**

> **Status:** 📘 REFERENCE — all five phases shipped: build system and PWA shell, design tokens, domain types and option pools, the prompt compiler, SQLite-on-OPFS persistence (in a worker — see the note on §2.4 below) with its localStorage fallback, the five Zustand stores, the full component tree and app assembly, and the verification pass. Kept here as the durable blueprint the implementation is held to, not as open work.
>
> Two places where the implementation knowingly departs from the text below, both verified in a real browser:
>
> - **§2.4 / Task 1.3.4 — SQLite cannot run on the main thread.** The SAH-pool VFS needs `FileSystemFileHandle.prototype.createSyncAccessHandle`, which browsers expose only inside a worker, so the database lives in `src/db/sqliteWorker.ts` behind a message bridge rather than being opened in the page.
> - **§2.4 — `prompt_history` carries two more columns than the DDL here lists** (`subject_json`, `output_json`). Without them the drawer's "one-click restore" in §4.4 cannot exist: the compiled prompt is a one-way rendering of the studio state, so the state has to be stored alongside it. Rows written before those columns restore to their category's defaults.

## **Project: Sprite Gubbins — Vite \+ React \+ TypeScript \+ PWA \+ SQLite**

**Target AI Engine:** Claude Opus 5 / Claude Code / Cursor / Windsurf  
**Repository Architecture:** Production-Grade Modular PWA (Vite \+ React \+ TS)

## **📋 EXECUTIVE OVERVIEW & GOALS**

You are acting as a **principal software engineer** tasked with migrating **Sprite Gubbins** from a single-file HTML application (index.html) into a modular, production-ready Progressive Web Application (PWA) built with **Vite**, **React 18/19**, **TypeScript**, **Tailwind CSS**, **Zustand**, and browser-embedded **SQLite WASM** with Origin Private File System (OPFS) persistence.  
This document serves as your **Master Blueprint**. You must read and internalize this document, then execute the implementation sequentially across **Phase 1 through Phase 5**.

## **🛡️ CRITICAL ARCHITECTURAL GUARDRAILS & SYSTEM LAWS**

You must strictly adhere to the following principles throughout all phases:

### **1\. Structural & File Bounding Laws**

> * **NO Monolithic Files:** Target file length is **\< 150 lines**. Never create large multi-responsibility files.  
> * **NO God Objects / God Components:** Every UI component, utility function, custom hook, store, and type definition MUST reside in its own dedicated file.  
> * **Strict Separation of Concerns (SoC):**  
  * **Domain & Compiler Logic** ![][image1] src/utils/  
  * **State Management** ![][image1] src/stores/  
  * **Database Persistence** ![][image1] src/db/  
  * **UI Primitives** ![][image1] src/components/common/  
  * **Studio Panels** ![][image1] src/components/studio/  
  * **Modals** ![][image1] src/components/modals/

### **2\. Zero-Truncation & Completeness Mandate**

> * **NEVER** write // TODO: add remaining fields, /\* rest of options here \*/, or stubbed function bodies.  
> * All 5 category definitions (CHARACTER, CREATURE, OBJECT, ITEM, BUILDING), all field option arrays (80+ items), tooltips, and compiler rules MUST be completely migrated with 100% fidelity.

### **3\. Strict Adherence to YAGNI & DRY**

> * **YAGNI (You Aren't Gonna Need It):** Build only what is specified in this document. Do not invent speculative abstractions, unused wrapper hooks, factory functions, or unrequested features.  
> * **DRY (Don't Repeat Yourself):** Re-use atomic UI components (ComboBox, Tooltip, ColorSwatch, Badge) and share strict global TypeScript interfaces.

## **🚫 AI ANTI-PATTERN & JUNIOR-CODE BAN LIST**

You are explicitly forbidden from introducing the following AI-generated code flaws and junior anti-patterns:

> 1. **NO "State Mirroring" / Syncing Derived State via useEffect:**  
   * **WRONG:** Using useState \+ useEffect to calculate word counts, token estimates, or compiled prompts when source state changes.  
   * **RIGHT:** Derive values directly during render or wrap expensive calculations in useMemo. Never trigger unnecessary secondary re-renders.  
> 2. **NO "Trust Me" Type Casts or Lint Suppressors:**  
   * **WRONG:** Using as any, as unknown as Type, ts-ignore, eslint-disable, or @ts-nocheck to force code to pass compilation or linting.  
   * **RIGHT:** Write type-safe code using type guards, narrow union types, and valid interfaces. Fix underlying architectural issues rather than silencing the compiler.  
> 3. **NO Fire-and-Forget Async Logic:**  
   * **WRONG:** Using Array.prototype.forEach with async callbacks, or leaving promises floating without .catch() or try/catch in event handlers.  
   * **RIGHT:** Use for...of loops, Promise.all, or explicit async/await blocks with complete error handling.  
> 4. **NO Unhandled Side-Effects or Missing Cleanup:**  
   * **WRONG:** Registering window listeners, timers, or worker callbacks inside useEffect without returning cleanup/abort functions (causes memory leaks and double-invocation bugs in React 18/19 Strict Mode).  
   * **RIGHT:** Always return explicit cleanup functions and pass AbortSignal to asynchronous calls where applicable.  
> 5. **NO Unsafe Array Indexing (noUncheckedIndexedAccess Violation):**  
   * **WRONG:** Accessing array\[0\].property directly assuming the element always exists.  
   * **RIGHT:** Always handle potential undefined array bounds (e.g., array\[0\]?.property ?? fallback).  
> 6. **NO Prop-Drilling When Global Stores Exist:**  
   * **WRONG:** Passing state or dispatch handlers down through 3 or more component levels when Zustand stores are available.  
   * **RIGHT:** Components must consume Zustand state directly using atomic, fine-grained selectors (e.g., const category \= useSubjectStore(s \=\> s.category)).  
> 7. **NO "Abstraction Soup" / Premature Wrappers:**  
   * **WRONG:** Creating redundant custom hooks that merely wrap a single useState, or writing multi-layered factory functions for simple utility transforms.  
   * **RIGHT:** Keep utility functions pure, simple, and flat in src/utils/.  
> 8. **NO Hardcoded Magic Values:**  
   * **WRONG:** Scattering magic string identifiers or dimension values ("CORE\_DIRECTIONAL\_VARIANTS", \#060911, 2048\) throughout UI component files.  
   * **RIGHT:** Keep all constants in src/constants/ and import them cleanly.

## **🏗️ TARGET PROJECT DIRECTORY STRUCTURE**

You will construct the repository following this exact structure:  
sprite-gubbins/  
├── public/  
│   ├── favicon.ico  
│   ├── icon-192.png  
│   └── icon-512.png  
├── index.html  
├── package.json  
├── tsconfig.json  
├── vite.config.ts  
├── tailwind.config.js  
├── postcss.config.js  
├── eslint.config.js  
└── src/  
    ├── main.tsx  
    ├── App.tsx  
    ├── index.css  
    ├── vite-env.d.ts  
    ├── types/  
    │   ├── subject.ts              \# Category & field interfaces  
    │   ├── output.ts               \# Output technical options & TargetModel types  
    │   ├── preset.ts               \# Archetype preset interfaces  
    │   ├── atlas.ts                \# Atlas grid & GPU VRAM metrics types  
    │   └── history.ts              \# SQLite prompt history log types  
    ├── constants/  
    │   ├── colors.ts               \# COLOR\_HEX\_MAP lookup table  
    │   ├── categories.ts           \# Full CATEGORY\_OPTIONS pool with all tooltips  
    │   ├── models.ts               \# TARGET\_MODELS config & prompt wrappers  
    │   └── presets.ts              \# PRESETS built-in defaults array  
    ├── utils/  
    │   ├── colorParser.ts          \# parseColorFromText helper  
    │   ├── atlasCalculator.ts      \# PO2 calculations, grid layout, JSON metadata  
    │   └── promptCompiler.ts       \# Modular prompt compiler (ChatGPT 5.6 Sol, MJ, SD, etc.)  
    ├── db/  
    │   ├── database.ts             \# SQLite WASM initialization & OPFS setup  
    │   └── schema.ts               \# DDL queries for prompt\_history & custom\_presets  
    ├── stores/  
    │   ├── useSubjectStore.ts      \# Category selection & field state store  
    │   ├── useOutputStore.ts       \# Technical output & target model store  
    │   ├── usePresetStore.ts       \# Built-in & SQLite custom preset store  
    │   ├── useHistoryStore.ts      \# SQLite prompt log history store  
    │   └── useUIStore.ts           \# Navigation tab, modals, toasts & PWA prompt store  
    └── components/  
        ├── common/  
        │   ├── ColorSwatch.tsx     \# Live hex/name visual color circle  
        │   ├── Tooltip.tsx         \# Accessible hover guidance tooltip  
        │   ├── ComboBox.tsx        \# Unfiltered combobox with chevron & swatches  
        │   ├── Badge.tsx           \# Status & tag badge component  
        │   └── Toast.tsx           \# Animated toast notification banner  
        ├── studio/  
        │   ├── CategorySelector.tsx\# Category tab/dropdown selection  
        │   ├── SubjectForm.tsx     \# Form rendering ComboBoxes for category fields  
        │   ├── OutputConfig.tsx    \# Resolution, outline, lighting & mode controls  
        │   ├── TargetModelSelector.tsx \# Target AI dropdown (Sol, MJ, SD, etc.)  
        │   └── PromptPreview.tsx   \# Realtime prompt box, word/token count, copy/download  
        ├── modals/  
        │   ├── AtlasCalculatorModal.tsx \# Interactive PO2 grid visualizer & JSON exporter  
        │   └── HistoryModal.tsx    \# SQLite prompt version history drawer  
        ├── tabs/  
        │   ├── PresetsTab.tsx      \# Grid of built-in & SQLite custom presets  
        │   └── SpecTab.tsx         \# Technical architecture documentation view  
        └── layout/  
            ├── Header.tsx          \# Logo, navigation, atlas calc CTA, copy prompt CTA  
            └── PWAInstallBanner.tsx\# Desktop/Mobile PWA native install CTA

## **📦 REQUIRED NODE DEPENDENCIES & TSCONFIG**

### **Dependencies**

> * react: ^18.3.0 (or ^19.0.0)  
> * react-dom: ^18.3.0 (or ^19.0.0)  
> * zustand: ^4.5.0  
> * @sqlite.org/sqlite-wasm: ^3.45.0  
> * lucide-react: ^0.350.0  
> * clsx: ^2.1.0  
> * tailwind-merge: ^2.2.0

### **Dev Dependencies**

> * vite: ^5.2.0  
> * @vitejs/plugin-react: ^4.2.0  
> * vite-plugin-pwa: ^0.19.0  
> * typescript: ^5.4.0  
> * @types/react: ^18.2.0  
> * @types/react-dom: ^18.2.0  
> * @types/node: ^20.11.0  
> * tailwindcss: ^3.4.0  
> * postcss: ^8.4.0  
> * autoprefixer: ^10.4.0  
> * eslint: ^9.0.0  
> * @eslint/js: ^9.0.0  
> * typescript-eslint: ^8.0.0  
> * globals: ^15.0.0  
> * eslint-plugin-react-hooks: ^4.6.0  
> * eslint-plugin-react-refresh: ^0.4.5

### **Strict Compiler Flags (tsconfig.json)**

{  
  "compilerOptions": {  
    "target": "ES2022",  
    "useDefineForClassFields": true,  
    "lib": \["ES2022", "DOM", "DOM.Iterable"\],  
    "module": "ESNext",  
    "skipLibCheck": true,  
    "moduleResolution": "bundler",  
    "allowImportingTsExtensions": true,  
    "resolveJsonModule": true,  
    "isolatedModules": true,  
    "noEmit": true,  
    "jsx": "react-jsx",  
    "strict": true,  
    "noUnusedLocals": true,  
    "noUnusedParameters": true,  
    "noFallthroughCasesInSwitch": true,  
    "noUncheckedIndexedAccess": true,  
    "exactOptionalPropertyTypes": true  
  },  
  "include": \["src"\]  
}

## **⚡ SEQUENTIAL EXECUTION ROADMAP**

Execute the following 5 phases sequentially. Complete each phase fully before moving to the next.

### **PHASE 1: Scaffold Environment, Build System, PWA Headers & Styling**

#### **Task 1.1: package.json**

Create package.json with all required dependencies, scripts (dev, build, lint, preview), and "type": "module".

#### **Task 1.2: tsconfig.json & vite-env.d.ts**

Configure strict TypeScript targeting ES2022 with strict: true, noUncheckedIndexedAccess: true, and exactOptionalPropertyTypes: true.

#### **Task 1.3: vite.config.ts**

Configure Vite with:

> 1. @vitejs/plugin-react  
> 2. VitePWA plugin:  
   * registerType: 'autoUpdate'  
   * Manifest: name: "Sprite Gubbins", short\_name: "Gubbins", theme\_color: "\#060911", background\_color: "\#060911", display: "standalone", icons (192x192, 512x512).  
> 3. **COOP/COEP Headers (CRITICAL FOR SQLITE WASM OPFS):**  
>    Configure server response headers in configureServer and configurePreviewServer:  
   * Cross-Origin-Opener-Policy: same-origin  
   * Cross-Origin-Embedder-Policy: require-corp  
> 4. **WASM Optimization:** Add @sqlite.org/sqlite-wasm to optimizeDeps.exclude.

#### **Task 1.4: Tailwind & PostCSS**

> 1. Create postcss.config.js with tailwindcss and autoprefixer.  
> 2. Create tailwind.config.js incorporating the custom dark palette (foundry-900: \#060911, foundry-800: \#0f172a, foundry-700: \#1e293b, neon, gold, emerald, rose accents) and JetBrains Mono/Inter font families.  
> 3. Create src/index.css containing @tailwind directives, .bg-grid-pattern, custom scrollbar rules, and keyframe animations (fadeIn, pulseGlow, floatOrb, shimmer).

#### **Task 1.5: ESLint 9 Flat Config (eslint.config.js)**

Create eslint.config.js using modern ESLint 9 Flat Config (typescript-eslint, eslint-plugin-react-hooks, globals.browser).

### **PHASE 2: Domain Types, Constants, Utilities & Browser SQLite WASM Layer**

#### **Task 2.1: Domain Type Interfaces (src/types/)**

> * subject.ts: SubjectCategory (CHARACTER | CREATURE | OBJECT | ITEM | BUILDING), FieldOption, SubjectDefinition (record of field keys to string values).  
> * output.ts: DirectionalMode, SurfaceDetail, ResolutionProfile, PaletteLimit, OutlineStyle, LightingModel, AspectRatio, TargetModelId, OutputConfig.  
> * preset.ts: PresetArchetype (id, name, category, subject, output, isCustom?).  
> * atlas.ts: AtlasConfig, AtlasMetrics, EngineMetadataJSON.  
> * history.ts: PromptHistoryLog (id, category, promptText, createdAt, wordCount, modelUsed).

#### **Task 2.2: Constants Pool (src/constants/)**

> * colors.ts: Export COLOR\_HEX\_MAP mapping 30+ color names to hex codes (cyan: \#06b6d4, gold: \#f59e0b, emerald: \#10b981, etc.).  
> * categories.ts: Export CATEGORY\_OPTIONS for all 5 categories (CHARACTER, CREATURE, OBJECT, ITEM, BUILDING). Include **ALL 16 fields per category**, complete option arrays, and detailed tooltips. Do NOT omit any field or option.  
> * models.ts: Export TARGET\_MODELS array with descriptions for GENERIC, CHATGPT\_5\_6\_SOL, MIDJOURNEY, STABLE\_DIFFUSION, GOOGLE\_IMAGEN\_3, DALLE\_3.  
> * presets.ts: Export built-in PRESETS array (Cyberpunk Katana, Sci-Fi Marine, Dungeon Knight, Creature Drone, Control Console, Ramen Kiosk).

#### **Task 2.3: Pure Utility Functions (src/utils/)**

> * colorParser.ts: parseColorFromText(text: string): string | null (parses direct \#HEX or maps name via COLOR\_HEX\_MAP).  
> * atlasCalculator.ts: Pure functions calculating cell sizes, usable bounds, PO2 compliance checks, grid dimensions (![][image2]), and JSON engine metadata formatting for Godot/Unity/PixiJS.  
> * promptCompiler.ts: Pure function generatePrompt(category, subject, output): string:  
  * Component count calculations (![][image3] parts \+ extra anatomy segments).  
  * Target model wrapping logic (ChatGPT 5.6 Sol reasoning contracts & verification flags, Midjourney flags \--v 6.1 \--style raw, Stable Diffusion negative prompt block, Imagen 3 prefix, DALL-E 3 prefix).

#### **Task 2.4: Browser SQLite WASM & OPFS Layer (src/db/)**

> * database.ts & schema.ts: Initialize @sqlite.org/sqlite-wasm.  
> * DDL Schema:  
  * Table prompt\_history: (id TEXT PRIMARY KEY, category TEXT, prompt\_text TEXT, created\_at INTEGER, word\_count INTEGER, model\_used TEXT)  
  * Table custom\_presets: (id TEXT PRIMARY KEY, name TEXT, category TEXT, subject\_json TEXT, output\_json TEXT, updated\_at INTEGER)  
> * Provide helper methods for insert, select, delete, and query with proper error handling and fallback to localStorage if WASM OPFS is blocked in specific browser environments.

### **PHASE 3: Zustand State Stores (src/stores/)**

Create 5 modular, independent Zustand stores:

> 1. useSubjectStore.ts:  
   * State: category: SubjectCategory, subject: SubjectDefinition.  
   * Actions: setCategory(cat), setField(key, value), randomizeSubject(), resetSubject().  
> 2. useOutputStore.ts:  
   * State: output: OutputConfig.  
   * Actions: setOutputField(key, value), setOutputConfig(config).  
> 3. usePresetStore.ts:  
   * State: customPresets: PresetArchetype\[\], isExporting: boolean.  
   * Actions: loadPreset(preset), saveCustomPreset(name), deleteCustomPreset(id), exportPresetsJSON(), importPresetsJSON(file).  
> 4. useHistoryStore.ts:  
   * State: historyLogs: PromptHistoryLog\[\], isLoading: boolean.  
   * Actions: addLog(log), fetchHistory(), clearHistory().  
> 5. useUIStore.ts:  
   * State: activeTab: 'studio' | 'presets' | 'spec', toastMessage: string | null, isAtlasModalOpen: boolean, isHistoryModalOpen: boolean, deferredPWAInstallPrompt: any.  
   * Actions: setActiveTab(tab), showToast(msg), toggleAtlasModal(), toggleHistoryModal(), setInstallPrompt(prompt).

### **PHASE 4: UI Components & Main Application Assembly**

Decompose the UI into clean, single-responsibility components (\<150 lines target per file):

#### **4.1 Common Primitives (src/components/common/)**

> * ColorSwatch.tsx: Visual circle rendering parsed color hex.  
> * Tooltip.tsx: Floating info guidance card with ⓘ hover trigger.  
> * ComboBox.tsx: Accessible input field with dropdown chevron displaying all preset options, live color swatches, and filtered/unfiltered typing support.  
> * Badge.tsx: Styled chip component for tags and status indicators.  
> * Toast.tsx: Animated floating toast banner.

#### **4.2 Layout Components (src/components/layout/)**

> * Header.tsx: Sticky navigation bar with logo badge, studio/presets/spec tab switchers, Atlas Calc trigger, History Drawer trigger, and Copy Prompt CTA.  
> * PWAInstallBanner.tsx: Native app installation prompt banner.

#### **4.3 Studio View Components (src/components/studio/)**

> * CategorySelector.tsx: Category selector with tooltips.  
> * SubjectForm.tsx: Form rendering ComboBoxes for category fields with 🎲 Randomise CTA.  
> * OutputConfig.tsx: Dropdown controls for Directional Coverage, Surface Detail, Resolution, Palette, Outline, Lighting, Aspect Ratio.  
> * TargetModelSelector.tsx: Target AI Model dropdown (ChatGPT 5.6 Sol, Midjourney v6.1, SD/Flux, Imagen 3, DALL-E 3, Generic).  
> * PromptPreview.tsx: Constrained scrollable prompt display box with real-time word count, token estimation, auto-sync badge, copy prompt CTA, and download .md CTA. (Derive counts during render or useMemo — NO useEffect state syncing\!).

#### **4.4 Modals (src/components/modals/)**

> * AtlasCalculatorModal.tsx: Interactive atlas resolution selector (![][image4] to ![][image5]), cell padding selector, PO2 VRAM status badge, interactive ![][image2] hover grid visualizer, and Copy Atlas Engine Spec JSON button.  
> * HistoryModal.tsx: Slide-over drawer displaying SQLite prompt history with search, model badges, timestamp formatting, and one-click restore.

#### **4.5 Navigation Views (src/components/tabs/)**

> * PresetsTab.tsx: Responsive grid of built-in and user custom presets, custom preset creator form, and JSON import/export CTAs.  
> * SpecTab.tsx: Interactive technical documentation view describing the architecture.

#### **4.6 Entry Assembly (src/App.tsx & src/main.tsx)**

> * App.tsx: Top-level composition assembling Header, PWA banner, active tab view, modals, and Toast. Registers PWA install event listener. Automatically logs generated prompts to SQLite when copied.  
> * main.tsx: React DOM root mounting with PWA service worker registration (virtual:pwa-register).

### **PHASE 5: Verification, Quality Audit, Linting & Build Test**

Execute the following verification commands to ensure zero errors:

> 1. **Type Check & Linting:**  
>    npm run lint

>    *Must complete with 0 ESLint errors and 0 TypeScript compiler errors.*  
> 2. **Production Build Slicing:**  
>    npm run build

>    *Must output optimized production bundle in dist/ with valid service worker manifest.*

## **🎯 BEGIN EXECUTION**

Read Phase 1 through Phase 5, then start Phase 1\. Build out the files systematically, adhering strictly to all architectural guardrails and anti-pattern bans.

### The prompt template has been superseded

The template specified in Phase 2 of this document is **v1**. It has been replaced, after Phases 1–4
shipped, by a v2 that the code now emits. The compiler architecture, the sixteen subject keys and the
five categories are unchanged; the compiled template text, the parameter set and the model wrappers
are not.

- **[baseline-prompt-new.md](baseline-prompt-new.md)** — the v2 template, the reasoning for each
  change, and the three Unsung Saviour presets. Kept as reference.
- **[done/prompt-template-v2-integration.md](done/prompt-template-v2-integration.md)** — the change
  that landed it, and the record of the two places the implementation knowingly departs from the
  template document.

**Where this document and v2 disagree about the prompt, v2 is what ships.** In particular v2
deliberately reverses the `|| 'DEFINED'` fallback described here — a cleared field now omits its line
entirely — and it deletes `FULL_DIRECTIONAL_POSE_LIBRARY`, whose 111 components no model delivers in
one generation.

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAYCAYAAAAVibZIAAAAV0lEQVR4XmNgGAWjYPiCDHQBaoAyIBZDF6QUKAJxM7ogNQAoCFzQBZEByNZJZODNQHySgYphDAoCkMFUC1tuIF4IpakGAhgIhCc5AORKqgOqheMoGG4AAAd3DuEo/FF3AAAAAElFTkSuQmCC>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGgAAAAaCAYAAABb9hlrAAACpklEQVR4Xu2Wy40UMRBA+86ZvRMAdwLgsEcS4E4EJEAGZLAxEAVRQT/tPKa2VHa7R1oxgnqSNTN2uVw/l2fbmqZpmubf4t0+3uTJ5u/zYx+/LoMkNXfI1338zJPN/cAt+pYnm/vgYXtub5/ywo0ctUneOc78r8Dhj/v4sNUPPeusvb98j7Bv9v4c6c4gS8usYP/3bXxWxrM9l30jO2Y+si/qkSjH2qhIWUM3OrLuKTrMQMGXfTy9kLjOoZzBW8OnzN4f5NircchlJyuqJN2SHOSxn3PR9/nyyXxk5qO2MGJs0E9hKkeL5zcJjmAvT4BFyvcsU4LDHBgD4T8yYY25GFScRMa50fvDejSY6prdtExM0tnkAEG38m3B2oTNMvPx7XZNZi5E9WoTn1WCiDH6QJnRTXsBB8ZAAxvJMmiAv0XjbQWjA1lnzUAZrDOYpLPJAc6FHFhsVdeRj4/b1WZvoWS9UNmJHuaJh23wsIsY2KryharKBgCOm6BcRRGMYD/rDPRVcjO85TM7jxjdcFjxEUhgTmSlN7dOYM4Y5OdhiNXt1asw8xkCplNVFUUoBCrG/pwdmhHbWmx3Z5jdcFjxEew2UullrrIRP7QfnbN4/cEE5X4JHARVAjXM+VhF0dHqvcHA1QRVb84tSZrdcFjxEbAl+lfFLz4PwBrJiEnEnqUE2X5yZaEUQwxQNMp2E4OkI7l62BcfXj75nXt9RZUcOZskq3bEio9AYTEvvlH6o80RZDg7JhE9vo2H+JePDSjjAL4bVAKksazzPVcba8yz15sH6FbevUu9d3uWr5Ij6FlJNGDX7Nau+AjI2S2IEfIM5oxdtpl4oC/H9zRkOCuPsFa1QmF99K/kSPdrQ5BGtkWOfBTkoj/oP9q3qrtpmqZpmqZpmtfjN4p2umaCsLOGAAAAAElFTkSuQmCC>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFoAAAAZCAYAAACxZDnAAAACZ0lEQVR4Xu2Yy1HEMAyGfefOnQK4UwAF0AB3KqABOqADaqAKqoJ8ZH4Qwg9FkMyw+Jvx7Kwfkv1b0SpbymQymUwmkw/OlnaztIel3S7t8uvwO4xdl3XMtwszbyvYvPOdC+dl7b8v6574/hPY55XvdKADvkZEbH0DkR7L50IEfy3fHdLXalxCBg72Ulb/FsTHJntjDmIzb+vhsMM5nkr9TMAF0i8fzKsRsdUFByy0h5CAiiIOjAOM20bEsTnEyICY+PFCP5fVrvwTQcyjfwuIo9YSR0Ljg330hB7Z6iKhiWQhoZUSuAQ7LthYLc1EwCabbQlt/UtoxM+g9SNxekKLqK0qNsdywz566PNRi/ApZ2W1JXFrQjNuc7KiiKDIEBVnd6EFB+RxJnJ6P3BKJVmUf6EmtAXBuXT8+cuOEhXnEKHJtzjiULU0YWEeUZZBKUP0hKZfe8qmKIiKc4jQgkgjoluPqRxlosumDNETWih1ZC83Ks6hQoOqgVpkqwzKgF0fmRGhQaVXL6W1iIqzq9As8Iv43hKgVvdGUSqwDT+yScSqbvY1s+b6vUaIirOb0FpEs5Gmks+/saki6QmNnS1pxdvTJfsDq+SzF0B02+qkRVSc3YTWm5l/s/N1rJCTltB6q/T2enh78mHTli05dYnsjb5IGouKs5vQQIRwAKKXxSrv/KMLctISkjWMjzYLmmebNs8ne1Jao7Sj+XpfedvnfWGfDtt8oPhxNWs3aqsLUaKyi8/eo08eHT2um5w3wIf+X2gJCaPxk0UvPUfxG5f6J+GH9KgIU8T/O4jm7EtFhlqdP5lMJqfAG/CX1SX38sczAAAAAElFTkSuQmCC>

[image4]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADUAAAAZCAYAAACRiGY9AAAB0klEQVR4Xu2WwU3EMBBFfefOfQvgTgEUQAPctwIaoAM6oAaq2KrAT8lHs5+xE8QmUiR/abSJPbb/nxlPtpSBgYGBlThVe55/wV21x3msBebufXAG4y/V3uffh+vpfcChX2aXMgmLgOC52meZfDKyBAYxrGX+rUy+T9FpD3A4IiCDQTzLAqIgy3xLFILx8zH8sz03A+QQsxaQbolSplXKQP4udlPcUhRZpOS4l0IUxTjrMJW3nmMgNB6NtWTbx1Iw+VHttUzieO5FtScqg+6VyLM/75QlczQdjCsAB0Fc5Ito7qaqgXkPxA84jEWqedTzHg+I+IsoDsXX9xLRGGkEZ2WKMPnCkfdmhgQ5R4h4Fom1othXFeBQpB2QJ2MRcFMWu9lZQu9yrxVFaWWCQEsUY1kwlcXWfr9AND06/xXF4ZGALriwJMorB1HKos+lYJOWKP8AgyVRdED/2NII4lhLFDwgH0HW8EUMcyRhEVmd9hb3REE8fshljHmmvFEg3AOpxqAxNR4C1wUbczCOEFYr9Q6j0nCLJepz0SIkinvHekoV4Z5NmbLqHLLrcQWigVOWgVsjEiX6e5y5OaKow0NdEFGUePevzlHAnfEm4k1qYOCo+AaUN5kISSYdNAAAAABJRU5ErkJggg==>

[image5]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAD8AAAAZCAYAAACGqvb0AAACRklEQVR4Xu2WzU0DQQxG586dOwVwpwAKoAHuVEADdEAH1EAVVAX7WD3FOPbuSoggJftJVmDGY3/+TcbYsWPHjgvE1SQPk7xM8jTJ7c/rI6B7nQ8D7sfBVqWX/aH/L4DI65gJEDTyNmZyEY9jJvo+yeeoE4Qt3j6P+f5uzPpRN/vDLvZ4c3IQJEFFUC0IQVRAkmDQ7YKnktxFmDBBkOhF25zx7uQdQBVy8AAyN/lwHCqVgycYzrEXQUBRn3v+j53FXfX2z2El+bQaVJj2rdAF3wXgOe8AyUAnJja/5c6xoQsR/uYsdgznjiqizeqsBAY+xuyc9qQimVxEFzz6VfCQNrkd8BkTxFjIyc50iXIuNxOprj7cS3wu+f1GTACSZzKiCx7gLM43sLNyUgR+eEOn5R3Du7x40YNr1DXB6rJDNu0PNzQPEZOQyYil4CVhZQyMs26bc1756vy4Q3JSSDLcedf5OgIVsd0AXVAtJdGREu4LbNBBJiT6ENivAgedH/cDtjOwxV312+II1VeagHzVqh2pDp0+FcyBx1bt3hl8VV3nf3XOgUuqCr5rn44UcFnGzGMj7wG6IduGSzzr/Lgc80w7597jYxVkP7eks5odg44UcFyceZMbiXBGdewsBX+Rh37i6MXlGOH4CL8VVtsfMhh09hEM5cwaWJZI2J+znPnLbqudnFCDJxCqyv/ytFPVie8diyir4BHGIFuNwVaQbSrxWzuxw7DD52olzwVL43XWIGBaneDpInfIRSAvw01fXTt27FjEFz82v6w5QcmUAAAAAElFTkSuQmCC>