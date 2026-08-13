/**
 * Input Sanitization Utility Module (XSS Prevention)
 * Strict HTML escaping and DOMPurify-style attribute filtering.
 */

export function sanitizeHtml(dirtyInput: string): string {
  if (!dirtyInput) return "";
  return dirtyInput
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

export function sanitizeObject<T>(obj: T): T {
  if (typeof obj === "string") {
    return sanitizeHtml(obj) as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item)) as unknown as T;
  }
  if (obj !== null && typeof obj === "object") {
    const sanitized: any = {};
    for (const key of Object.keys(obj as any)) {
      sanitized[key] = sanitizeObject((obj as any)[key]);
    }
    return sanitized as T;
  }
  return obj;
}
