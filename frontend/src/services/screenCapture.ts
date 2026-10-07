/**
 * LEARNOVA Screen Context Provider Architecture
 * Turn Information Into Understanding — Visually and Contextually.
 *
 * Implements Mode A (Web Page DOM), Mode B (Browser Screen Capture via getDisplayMedia),
 * and defines the Mode C (Desktop Companion) architectural interface.
 */

import { ScreenContextMode } from '../types';

export interface CapturedDOMElement {
  id: string;
  guide_id?: string;
  label: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  is_visible: boolean;
}

export interface ScreenContextResult {
  mode: ScreenContextMode;
  current_route: string;
  dom_elements: CapturedDOMElement[];
  screenshot_base64?: string;
  error?: string;
}

export interface ScreenContextProvider {
  readonly mode: ScreenContextMode;
  isAvailable(): boolean;
  captureContext(currentRoute: string): Promise<ScreenContextResult>;
}

/**
 * Mode A: In-Page DOM & Accessibility Provider
 * Fast, deterministic, zero-network overhead, completely private.
 * Uses getBoundingClientRect() on DOM elements with data-guide-id or interactive roles.
 */
export class WebPageContextProvider implements ScreenContextProvider {
  readonly mode: ScreenContextMode = 'dom';

  isAvailable(): boolean {
    return typeof document !== 'undefined';
  }

  async captureContext(currentRoute: string): Promise<ScreenContextResult> {
    if (!this.isAvailable()) {
      return { mode: 'dom', current_route: currentRoute, dom_elements: [] };
    }

    const elements: CapturedDOMElement[] = [];

    // Prioritize elements explicitly marked with data-guide-id
    const marked = document.querySelectorAll<HTMLElement>('[data-guide-id]');
    marked.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const isVisible = rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none';
      if (isVisible) {
        elements.push({
          id: el.id || el.getAttribute('data-guide-id') || '',
          guide_id: el.getAttribute('data-guide-id') || undefined,
          label: (el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim().slice(0, 80),
          type: el.tagName.toLowerCase(),
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          is_visible: true,
        });
      }
    });

    // Also include interactive buttons/tabs if not already captured
    const interactive = document.querySelectorAll<HTMLElement>('button, [role="tab"], [role="button"], input[type="file"]');
    interactive.forEach((el) => {
      const guideId = el.getAttribute('data-guide-id');
      if (!guideId) {
        const rect = el.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== 'none';
        if (isVisible) {
          const text = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim();
          if (text) {
            elements.push({
              id: el.id || `el-${Math.random().toString(36).slice(2, 7)}`,
              label: text.slice(0, 80),
              type: el.tagName.toLowerCase(),
              x: Math.round(rect.left),
              y: Math.round(rect.top),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              is_visible: true,
            });
          }
        }
      }
    });

    return {
      mode: 'dom',
      current_route: currentRoute,
      dom_elements: elements,
    };
  }
}

/**
 * Mode B: Browser Screen Share Provider
 * Uses navigator.mediaDevices.getDisplayMedia to capture a transient video frame.
 * Captures in-memory to canvas, extracts JPEG base64, and stops all stream tracks immediately.
 * Never stores images on disk or in persistent browser storage.
 */
export class BrowserScreenProvider implements ScreenContextProvider {
  readonly mode: ScreenContextMode = 'browser_screen';
  private activeStream: MediaStream | null = null;

  isAvailable(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getDisplayMedia === 'function'
    );
  }

  async captureContext(currentRoute: string): Promise<ScreenContextResult> {
    if (!this.isAvailable()) {
      return {
        mode: 'browser_screen',
        current_route: currentRoute,
        dom_elements: [],
        error: 'Browser screen capture is not supported in this environment.',
      };
    }

    try {
      // Request user screen share permission
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser',
        },
        audio: false,
      });

      this.activeStream = stream;
      const track = stream.getVideoTracks()[0];

      // Draw single frame to canvas
      const video = document.createElement('video');
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;

      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          video.play().then(() => resolve());
        };
      });

      // Allow 100ms for video buffer to render frame
      await new Promise((r) => setTimeout(r, 100));

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      const b64 = canvas.toDataURL('image/jpeg', 0.85);

      // Stop track immediately to release user's screen share indicator
      track.stop();
      stream.getTracks().forEach((t) => t.stop());
      this.activeStream = null;

      // Extract DOM elements as complement
      const domProvider = new WebPageContextProvider();
      const domRes = await domProvider.captureContext(currentRoute);

      return {
        mode: 'browser_screen',
        current_route: currentRoute,
        dom_elements: domRes.dom_elements,
        screenshot_base64: b64,
      };
    } catch (err: any) {
      if (this.activeStream) {
        this.activeStream.getTracks().forEach((t) => t.stop());
        this.activeStream = null;
      }

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        return {
          mode: 'browser_screen',
          current_route: currentRoute,
          dom_elements: [],
          error: "I can't see your screen until you allow screen access.",
        };
      }

      return {
        mode: 'browser_screen',
        current_route: currentRoute,
        dom_elements: [],
        error: `Screen capture failed: ${err.message || 'Unknown error'}`,
      };
    }
  }

  stopCapture(): void {
    if (this.activeStream) {
      this.activeStream.getTracks().forEach((t) => t.stop());
      this.activeStream = null;
    }
  }
}

/**
 * Mode C: Desktop Companion Provider (Architectural Interface)
 * Reserved for native companion (Tauri / Electron) with global hotkey (Cmd+Shift+N).
 */
export class DesktopScreenProvider implements ScreenContextProvider {
  readonly mode: ScreenContextMode = 'desktop';

  isAvailable(): boolean {
    return false; // Native companion required
  }

  async captureContext(currentRoute: string): Promise<ScreenContextResult> {
    return {
      mode: 'desktop',
      current_route: currentRoute,
      dom_elements: [],
      error: 'Desktop Companion requires native application adapter (Tauri/Electron). Architecture ready.',
    };
  }
}

export const webPageProvider = new WebPageContextProvider();
export const browserScreenProvider = new BrowserScreenProvider();
export const desktopScreenProvider = new DesktopScreenProvider();
