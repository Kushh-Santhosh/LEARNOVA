# LEARNOVA Desktop Screen Companion (Mode C)

> **STATUS**: **ARCHITECTURE READY / IMPLEMENTATION PENDING**  
> *Target Framework*: **Tauri 2.0 (Rust + Webview Overlay)**

---

## 1. Status & Scope
- **Web Application & Browser Companion**: Implemented & active.
- **Desktop Companion (Native OS Overlay)**: Architecture designed; implementation pending native Tauri 2.0 scaffolding.

## 2. Planned Native Capabilities
1. **Global Shortcut**: `Cmd + Shift + N` (macOS) / `Ctrl + Shift + N` (Windows) to summon Professor Nova over any native app (VS Code, PDF reader, Obsidian).
2. **Active Window Context**: Monitors frontmost window title and accessibility tree without intrusive keyboard/mouse hijacking.
3. **Transparent Click-Through Canvas**: Renders guidance beacons and spotlights using native OS transparent layer (`NSPanel` on macOS / `WS_EX_LAYERED` on Windows).
4. **Pedagogical Boundary**: Adheres strictly to the LEARNOVA safety charter: **Guide, Don't Take Over**.

See [DESKTOP_ARCHITECTURE.md](./DESKTOP_ARCHITECTURE.md) for full technical design, IPC schemas, and memory safety benchmarks.
