/**
 * Singleton Pyodide Manager to prevent multiple initializations
 * This solves the critical performance issue of loading Pyodide (28MB+) multiple times
 */

import React from 'react';

export interface PyodideInstance {
  runPython: (code: string) => unknown;
  loadPackage: (packages: string[]) => Promise<void>;
  globals: {
    get: (name: string) => unknown;
  };
}

type PyodideStatus = 'idle' | 'loading' | 'ready' | 'error';

interface PyodideManagerState {
  instance: PyodideInstance | null;
  status: PyodideStatus;
  error: Error | null;
  initPromise: Promise<PyodideInstance> | null;
}

class PyodideManager {
  private static state: PyodideManagerState = {
    instance: null,
    status: 'idle',
    error: null,
    initPromise: null
  };

  private static listeners = new Set<(state: PyodideManagerState) => void>();

  /**
   * Get the singleton Pyodide instance
   */
  static async getInstance(): Promise<PyodideInstance> {
    if (this.state.instance) {
      return this.state.instance;
    }

    if (this.state.initPromise) {
      return this.state.initPromise;
    }

    this.state.initPromise = this.initializePyodide();
    try {
      this.state.instance = await this.state.initPromise;
      return this.state.instance;
    } catch (error) {
      this.state.initPromise = null;
      throw error;
    }
  }

  /**
   * Get current status without triggering initialization
   */
  static getStatus(): PyodideStatus {
    return this.state.status;
  }

  /**
   * Get current error if any
   */
  static getError(): Error | null {
    return this.state.error;
  }

  /**
   * Subscribe to status changes
   */
  static subscribe(listener: (state: PyodideManagerState) => void): () => void {
    this.listeners.add(listener);
    // Immediately call with current state
    listener({ ...this.state });

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of state changes
   */
  private static notifyListeners(): void {
    this.listeners.forEach(listener => listener({ ...this.state }));
  }

  /**
   * Initialize Pyodide with proper error handling and status updates
   */
  private static async initializePyodide(): Promise<PyodideInstance> {
    try {
      this.state.status = 'loading';
      this.state.error = null;
      this.notifyListeners();

      // Check if we're in browser environment
      if (typeof window === 'undefined') {
        throw new Error('Pyodide can only be initialized in browser environment');
      }

      const windowWithPyodide = window as Window & typeof globalThis & {
        loadPyodide?: (config: { indexURL: string }) => Promise<PyodideInstance>
      };

      // Load Pyodide script if not already loaded
      if (!windowWithPyodide.loadPyodide) {
        await this.loadPyodideScript();
      }

      if (!windowWithPyodide.loadPyodide) {
        throw new Error('Failed to load Pyodide script');
      }

      // Initialize Pyodide
      const pyodideInstance = await windowWithPyodide.loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.28.2/full/',
      });

      // Load common packages
      await pyodideInstance.loadPackage(['numpy', 'matplotlib']);

      this.state.status = 'ready';
      this.state.error = null;
      this.notifyListeners();

      return pyodideInstance;
    } catch (error) {
      this.state.status = 'error';
      this.state.error = error instanceof Error ? error : new Error(String(error));
      this.state.instance = null;
      this.notifyListeners();
      throw this.state.error;
    }
  }

  /**
   * Load Pyodide script dynamically
   */
  private static loadPyodideScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if script is already being loaded
      const existingScript = document.querySelector('script[src*="pyodide.js"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', reject);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/pyodide/v0.28.2/full/pyodide.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Pyodide script'));
      document.head.appendChild(script);
    });
  }

  /**
   * Reset the manager (for testing or error recovery)
   */
  static reset(): void {
    this.state = {
      instance: null,
      status: 'idle',
      error: null,
      initPromise: null
    };
    this.notifyListeners();
  }
}

export default PyodideManager;

/**
 * React hook for using Pyodide with automatic status updates
 */
export function usePyodide() {
  const [state, setState] = React.useState<PyodideManagerState>({
    instance: null,
    status: 'idle',
    error: null,
    initPromise: null
  });

  React.useEffect(() => {
    const unsubscribe = PyodideManager.subscribe(setState);
    return unsubscribe;
  }, []);

  const initialize = React.useCallback(async () => {
    try {
      await PyodideManager.getInstance();
    } catch (error) {
      // Error is already handled by the manager
      console.error('Failed to initialize Pyodide:', error);
    }
  }, []);

  return {
    instance: state.instance,
    status: state.status,
    error: state.error,
    initialize
  };
}