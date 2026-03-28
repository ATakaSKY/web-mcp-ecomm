/**
 * Type declarations for the WebMCP API (navigator.modelContext).
 * Available in Chrome 146+ with the "WebMCP for testing" flag enabled.
 */

interface ModelContextToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => ModelContextToolResult | Promise<ModelContextToolResult>;
}

interface ModelContextToolResult {
  content: Array<{ type: string; text: string }>;
}

interface ModelContext {
  /** Adds a single tool to the current context. Pass {@link AbortSignal} to unregister via {@link AbortController#abort}. */
  registerTool(
    tool: ModelContextToolDefinition,
    options?: { signal?: AbortSignal }
  ): void;

  /** Removes a tool by name. Deprecated; prefer aborting the signal passed to {@link registerTool}. */
  unregisterTool?(name: string): void;
}

interface Navigator {
  modelContext?: ModelContext;
}

// Extend React's JSX types to recognize WebMCP HTML attributes.
// These are new attributes proposed by the WebMCP spec that Chrome 146+
// understands, but React/TS doesn't have built-in definitions for yet.
/* eslint-disable @typescript-eslint/no-unused-vars -- generic matches React's HTMLAttributes<T> */
declare namespace React {
  interface FormHTMLAttributes<T> {
    toolname?: string;
    tooldescription?: string;
    toolautosubmit?: string | "";
  }

  interface InputHTMLAttributes<T> {
    toolparamdescription?: string;
  }

  interface SelectHTMLAttributes<T> {
    toolparamdescription?: string;
  }

  interface TextareaHTMLAttributes<T> {
    toolparamdescription?: string;
  }
}
/* eslint-enable @typescript-eslint/no-unused-vars */
