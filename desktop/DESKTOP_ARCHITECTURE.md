# LEARNOVA Desktop Screen Companion Architecture (Mode C)

> **STATUS CLASSIFICATION**:  
> **DESKTOP COMPANION: ARCHITECTURE READY / IMPLEMENTATION NOT YET COMPLETE**  
> *Note: Browser-level DOM guidance and screen share modes are functional in the web application. Native OS-level global monitoring, active-window hooks, and global background hotkeys require the native companion adapter defined in this document.*

---

## 1. Overview & Vision
Mode C extends Professor Nova's screen-aware guidance system beyond the browser tab into native operating system contexts (macOS, Windows, Linux). Built to pair with applications like PDF readers, code editors (VS Code), and document editors (Obsidian, Word), the Desktop Companion observes learner context, provides visual beacons/focus rings, and guides study workflows using the same pedagogical engine (WHAT / WHY / NEXT) without taking control away from the user.

---

## 2. Core Architectural Pillars

### A. Non-Intrusive Guidance ("Guide, Don't Take Over")
- **Visual-only targeting**: The companion illuminates elements, renders pulse beacons, and displays floating instruction cards.
- **Strict safety boundary**: Never injects synthetic mouse clicks, keypresses, or window management actions into third-party software. The student maintains total agency.
- **Forbidden Actions**: Nova must NOT silently:
  - Click buttons
  - Type passwords or user input
  - Submit forms
  - Transfer money or perform transactions
  - Delete files or modify local disk state
  - Perform irreversible actions

### B. Privacy & Security First
- **Transient Memory Only**: Screen captures and accessibility node trees are evaluated in volatile memory. No video or frame buffer is ever persisted to disk.
- **Permission Gated**: Requires explicit OS Accessibility & Screen Recording grants (`kAXTrustedCheckOptionPrompt` on macOS, UI Automation on Windows).
- **Free-Only AI Gateway**: All multimodal reasoning routes strictly through verified free vision models with explicit checks:
  ```python
  assert cand["prompt_price"] == 0.0 and cand["completion_price"] == 0.0
  ```

---

## 3. Technology Stack: Tauri 2.0 vs Electron

| Dimension | Tauri 2.0 (Selected) | Electron |
| :--- | :--- | :--- |
| **Binary Size** | ~12 MB | ~110 MB |
| **Idle RAM Footprint** | ~35 MB | ~180 MB |
| **Window Transparency** | Native NSPanel / WS_EX_LAYERED | Chromium Transparent Window |
| **Click-Through Support** | Native OS Event Pass-Through | `win.setIgnoreMouseEvents(true, {forward: true})` |
| **Global Shortcuts** | Native OS Hook (`globalShortcut` / `rdev`) | Electron `globalShortcut` |
| **Cold Startup Time** | < 300 ms | ~ 2.5 s |

**Selected Architecture**: **Tauri 2.0** with Rust backend and LEARNOVA React/Vite overlay UI.

---

## 4. Multi-Window Overlay Topology

The desktop companion consists of two synchronized native windows:

1. **Floating Pill / Assistant Window (`companion-pill`)**:
   - Small, draggable floating circle with Professor Nova's portrait and pulsating state ring.
   - Kept `alwaysOnTop: true`, `decorations: false`, `transparent: true`.
   - Clicking expands the compact assistant drawer.

2. **Full-Screen Transparent Overlay Window (`guide-overlay`)**:
   - Spans the active display (`x: 0, y: 0, width: screen.width, height: screen.height`).
   - `transparent: true`, `alwaysOnTop: true`, `focusable: false`.
   - When idle: `set_ignore_cursor_events(true)` allows all clicks to pass straight into background apps.
   - When guiding: `set_ignore_cursor_events(false)` allows the student to interact with the Nova pedagogical instruction card while SVG cutout paths keep the background target visible.

---

## 5. Global Hotkey Abstraction (`DesktopShortcutProvider`)

The desktop application isolates system-level global keyboard listeners from the React web interface:

```typescript
// desktop/src/shortcuts/DesktopShortcutProvider.ts
export interface DesktopShortcutProvider {
  /**
   * Registers a system-wide OS global hotkey that fires even when
   * another application or desktop window has active focus.
   */
  registerShortcut(shortcut: string, callback: () => void): Promise<boolean>;
  
  /**
   * Unregisters the global hotkey upon companion exit or user configuration change.
   */
  unregisterShortcut(shortcut: string): Promise<void>;
  
  /**
   * Event listener for incoming global hotkey press events.
   */
  onShortcutPressed(callback: (shortcut: string) => void): void;
}
```

### Platform Implementations:
- **macOS Implementation**:
  - Hotkey: `Cmd+Shift+N`
  - Registered via Tauri global shortcut plugin (`tauri_plugin_global_shortcut`) hooked into Carbon/Cocoa event loop.
- **Windows Implementation**:
  - Hotkey: `Ctrl+Shift+N`
  - Registered via Win32 `RegisterHotKey` API hook.

*Note: In the browser web app, this behavior is simulated strictly as a **browser-level keyboard shortcut** (functional only when the browser window has focus).*

---

## 6. Desktop End-to-End Execution Pipeline

```
USER
 ↓
GLOBAL HOTKEY (Cmd+Shift+N / Ctrl+Shift+N)
 ↓
VOICE / TEXT QUERY ("Where do I find the formula for entropy?")
 ↓
SCREEN CAPTURE (Transient in-memory monitor frame)
 ↓
ACTIVE WINDOW DETECTION (e.g. Acrobat Reader, VS Code)
 ↓
SCREEN UNDERSTANDING (Accessibility Tree + Free Multimodal Model)
 ↓
LEARNOVA TEACHERBRAIN (Pedagogical analysis & course grounding)
 ↓
STEP PLANNER (Multi-step guidance plan: WHAT / WHY / NEXT)
 ↓
TARGET COORDINATES (Physical display bounding box x, y, w, h)
 ↓
NOVA OVERLAY (Pulsing highlight halo + beacon + instruction card)
 ↓
USER ACTION (Student clicks/inspects target element)
 ↓
SCREEN CHANGE (Active state progression observed)
 ↓
VERIFICATION (Confirms expected UI state advanced)
 ↓
NEXT STEP / COMPLETION
```

---

## 7. Product Identity & Independence

Professor Nova's visual companion is an original, integrated pedagogical guidance feature of LEARNOVA:
- Uses Professor Nova's visual persona, tone, and adaptive teaching pedagogy.
- Integrates directly with LEARNOVA's knowledge graphs, misconception diagnostics, and RAG document grounding.
- Does not copy proprietary UI, source code, or visual assets from Clicky, Remy, Cluely, or other tools.
