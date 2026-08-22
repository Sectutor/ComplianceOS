/**
 * DLP (Data Loss Prevention) Sanitizer Engine
 * Pre-prompt sensitive data scrubber that detects and redacts secrets, API keys,
 * PII, and credentials before outgoing LLM prompts are transmitted.
 */

export interface DlpMatch {
  type: "aws_key" | "github_token" | "openai_key" | "private_key" | "jwt_token" | "credit_card" | "ssn" | "iban" | "password_field";
  placeholder: string;
  original: string;
}

export interface DlpSanitizeResult {
  sanitizedText: string;
  hasRedactions: boolean;
  matches: DlpMatch[];
  redactedCount: number;
}

export class DlpSanitizer {
  private static readonly PATTERNS: Array<{
    type: DlpMatch["type"];
    regex: RegExp;
    prefix: string;
  }> = [
    // AWS Access Key ID
    {
      type: "aws_key",
      regex: /\b(AKIA[0-9A-Z]{16})\b/g,
      prefix: "REDACTED_AWS_KEY",
    },
    // GitHub Tokens (classic & fine-grained)
    {
      type: "github_token",
      regex: /\b(ghp_[0-9a-zA-Z]{36}|github_pat_[0-9a-zA-Z_]{82})\b/g,
      prefix: "REDACTED_GITHUB_TOKEN",
    },
    // OpenAI / DeepSeek / AI Provider Keys
    {
      type: "openai_key",
      regex: /\b(sk-[a-zA-Z0-9]{32,64}|sk-ant-[a-zA-Z0-9_-]{40,})\b/g,
      prefix: "REDACTED_AI_KEY",
    },
    // RSA / EC / OpenSSH Private Keys
    {
      type: "private_key",
      regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g,
      prefix: "REDACTED_PRIVATE_KEY",
    },
    // JWT Bearer Tokens
    {
      type: "jwt_token",
      regex: /\beyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/g,
      prefix: "REDACTED_JWT_TOKEN",
    },
    // Credit Cards (13 to 19 digits with optional hyphens/spaces)
    {
      type: "credit_card",
      regex: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})\b/g,
      prefix: "REDACTED_CREDIT_CARD",
    },
    // US Social Security Numbers (SSN)
    {
      type: "ssn",
      regex: /\b\d{3}-\d{2}-\d{4}\b/g,
      prefix: "REDACTED_SSN",
    },
    // International Bank Account Numbers (IBAN)
    {
      type: "iban",
      regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}\b/g,
      prefix: "REDACTED_IBAN",
    },
  ];

  /**
   * Scans prompt and redacts any detected secrets/PII
   */
  public sanitize(text: string): DlpSanitizeResult {
    if (!text || typeof text !== "string") {
      return { sanitizedText: text, hasRedactions: false, matches: [], redactedCount: 0 };
    }

    let sanitized = text;
    const matches: DlpMatch[] = [];
    let counter = 1;

    for (const pattern of DlpSanitizer.PATTERNS) {
      sanitized = sanitized.replace(pattern.regex, (match) => {
        const placeholder = `[${pattern.prefix}_${counter++}]`;
        matches.push({
          type: pattern.type,
          placeholder,
          original: match,
        });
        return placeholder;
      });
    }

    return {
      sanitizedText: sanitized,
      hasRedactions: matches.length > 0,
      matches,
      redactedCount: matches.length,
    };
  }

  /**
   * Restores redacted tokens for local rendering without exposing them upstream
   */
  public restore(sanitizedText: string, matches: DlpMatch[]): string {
    if (!sanitizedText || matches.length === 0) return sanitizedText;
    let restored = sanitizedText;
    for (const m of matches) {
      restored = restored.replace(m.placeholder, m.original);
    }
    return restored;
  }
}

export const dlpSanitizer = new DlpSanitizer();
