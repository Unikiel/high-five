/**
 * Detects whether a string is programming code (Java/pseudocode)
 * rather than a math formula, so it can be rendered in monospace
 * instead of being mangled by LaTeX rendering.
 */
const LATEX_HINTS = /\\(frac|sqrt|sum|cdot|times|div|pi|mu|sigma|hat|bar|left|right|alpha|beta|theta|Delta|infty|approx|leq|geq|neq|pm|text)/;

const CODE_HINTS = [
  /;\s*$/m,                                   // statements ending with ;
  /\b(int|double|boolean|String|char|void|public|private|static|final|class|new|return|if|else|for|while|System|println|print|args|null|true|false|ArrayList|length|substring|indexOf|equals|compareTo)\b/,
  /\w+\.\w+\s*\(/,                            // method calls like i.intValue(
  /\bInteger\.|Double\.|Math\./,              // wrapper/utility class usage
  /\/\//,                                     // line comments
  /[{}]\s*$/m,                                // braces on line ends
];

export function looksLikeCode(value) {
  const v = String(value || "").trim();
  if (!v) return false;
  if (LATEX_HINTS.test(v)) return false;
  return CODE_HINTS.some((pattern) => pattern.test(v));
}