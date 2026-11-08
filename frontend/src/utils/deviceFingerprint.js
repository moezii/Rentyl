/**
 * Device Fingerprinting Utility
 * Generates a unique device fingerprint for session tracking
 */

class DeviceFingerprint {
  constructor() {
    this.fingerprint = null;
    this.generateFingerprint();
  }

  /**
   * Generate a comprehensive device fingerprint
   */
  generateFingerprint() {
    try {
      const components = [];

      // Screen information
      if (screen) {
        components.push(`screen:${screen.width}x${screen.height}x${screen.colorDepth}`);
        components.push(`avail:${screen.availWidth}x${screen.availHeight}`);
      }

      // Timezone
      components.push(`tz:${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
      components.push(`tzOffset:${new Date().getTimezoneOffset()}`);

      // Language
      components.push(`lang:${navigator.language}`);
      components.push(`langs:${navigator.languages?.join(',') || ''}`);

      // Platform information
      components.push(`platform:${navigator.platform}`);
      components.push(`userAgent:${this.hashString(navigator.userAgent)}`);

      // Hardware concurrency (CPU cores)
      if (navigator.hardwareConcurrency) {
        components.push(`cores:${navigator.hardwareConcurrency}`);
      }

      // Device memory (if available)
      if (navigator.deviceMemory) {
        components.push(`memory:${navigator.deviceMemory}`);
      }

      // Canvas fingerprint (lightweight version)
      const canvasFingerprint = this.getCanvasFingerprint();
      if (canvasFingerprint) {
        components.push(`canvas:${canvasFingerprint}`);
      }

      // WebGL fingerprint
      const webglFingerprint = this.getWebGLFingerprint();
      if (webglFingerprint) {
        components.push(`webgl:${webglFingerprint}`);
      }

      // Touch support
      components.push(`touch:${navigator.maxTouchPoints || 0}`);

      // Cookie enabled
      components.push(`cookies:${navigator.cookieEnabled}`);

      // Do Not Track
      components.push(`dnt:${navigator.doNotTrack || 'unspecified'}`);

      // Storage availability
      components.push(`localStorage:${this.hasLocalStorage()}`);
      components.push(`sessionStorage:${this.hasSessionStorage()}`);

      // Plugins (limit to avoid too much data)
      const plugins = Array.from(navigator.plugins || [])
        .slice(0, 5)
        .map(p => p.name)
        .join(',');
      components.push(`plugins:${this.hashString(plugins)}`);

      // Generate final fingerprint by hashing all components
      const fingerprintString = components.join('|');
      this.fingerprint = this.hashString(fingerprintString).substring(0, 32); // Keep it reasonably short
    } catch (error) {
      console.warn('[DeviceFingerprint] Error generating fingerprint:', error);
      // Fallback to a simple random fingerprint
      this.fingerprint = 'fallback_' + Math.random().toString(36).substring(2, 15);
    }
  }

  /**
   * Get canvas fingerprint (lightweight)
   */
  getCanvasFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) return null;

      // Set canvas size
      canvas.width = 280;
      canvas.height = 60;

      // Draw some text with different fonts and styles
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint canvas 🔒', 4, 4);

      ctx.font = '12px Times';
      ctx.fillText('Security tracking enabled', 4, 20);

      // Draw some shapes
      ctx.fillStyle = 'rgba(255,0,0,0.5)';
      ctx.fillRect(10, 35, 40, 20);

      ctx.fillStyle = 'rgba(0,255,0,0.5)';
      ctx.beginPath();
      ctx.arc(80, 45, 10, 0, Math.PI * 2);
      ctx.fill();

      // Get image data and hash it
      const imageData = canvas.toDataURL();
      return this.hashString(imageData).substring(0, 16);
    } catch (error) {
      console.warn('[DeviceFingerprint] Canvas fingerprint failed:', error);
      return null;
    }
  }

  /**
   * Get WebGL fingerprint
   */
  getWebGLFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

      if (!gl) return null;

      const components = [];

      // WebGL vendor and renderer
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        components.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
        components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
      }

      // WebGL version
      components.push(gl.getParameter(gl.VERSION));
      components.push(gl.getParameter(gl.SHADING_LANGUAGE_VERSION));

      return this.hashString(components.join('|')).substring(0, 16);
    } catch (error) {
      console.warn('[DeviceFingerprint] WebGL fingerprint failed:', error);
      return null;
    }
  }

  /**
   * Check if localStorage is available
   */
  hasLocalStorage() {
    try {
      const test = '__test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Check if sessionStorage is available
   */
  hasSessionStorage() {
    try {
      const test = '__test__';
      sessionStorage.setItem(test, test);
      sessionStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Simple hash function for strings
   */
  hashString(str) {
    let hash = 0;
    if (str.length === 0) return hash.toString();

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return Math.abs(hash).toString(36);
  }

  /**
   * Get the current device fingerprint
   */
  getFingerprint() {
    return this.fingerprint;
  }

  /**
   * Force regenerate fingerprint
   */
  regenerate() {
    this.generateFingerprint();
    return this.fingerprint;
  }
}

// Create singleton instance
const deviceFingerprint = new DeviceFingerprint();

export default deviceFingerprint;
