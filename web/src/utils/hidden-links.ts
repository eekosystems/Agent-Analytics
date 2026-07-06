const HIDDEN_LINK_PATTERNS = [
  "langfuse.com",
  "langfuse.io",
  "discord.gg",
  "github.com/langfuse",
];

export const isHiddenExternalLink = (href?: string | null): boolean =>
  !!href &&
  HIDDEN_LINK_PATTERNS.some((pattern) =>
    href.toLowerCase().includes(pattern),
  );

export const sanitizeExternalHref = (href?: string): string | undefined =>
  isHiddenExternalLink(href) ? undefined : href;
