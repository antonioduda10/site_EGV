import sanitizeHtml from "sanitize-html";
import { rewriteUploadUrlsInHtml } from "./content-url";

const classes = [
  "ql-align-center", "ql-align-right", "ql-align-justify", "ql-direction-rtl",
  ...Array.from({ length: 8 }, (_, i) => `ql-indent-${i + 1}`),
  "media", "media--left", "media--center", "media--right", "media--small", "media--medium", "media--wide",
  "media--ratio-1-1", "media--ratio-4-3", "media--ratio-16-9"
];

export function sanitizeRichHtml(html?: string | null): string {
  return sanitizeHtml(rewriteUploadUrlsInHtml(html), {
    allowedTags: ["p", "br", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "strong", "b", "em", "i", "u", "s", "blockquote", "a", "img", "span", "div", "figure", "figcaption", "pre", "code", "hr"],
    allowedAttributes: {
      "*": ["class", "style"],
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height", "data-align", "loading", "decoding"],
      li: [{ name: "data-list", values: ["bullet", "ordered"] }]
    },
    allowedClasses: { "*": classes },
    allowedStyles: { "*": {
      "text-align": [/^(left|right|center|justify)$/],
      width: [/^(?:100|[1-9]?\d)(?:\.\d+)?%$/, /^\d{1,4}px$/],
      height: [/^auto$/, /^\d{1,4}px$/],
      "max-width": [/^100%$/],
      display: [/^block$/],
      "margin-left": [/^(?:0|0px|auto)$/],
      "margin-right": [/^(?:0|0px|auto)$/]
    } },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["http", "https"] },
    allowProtocolRelative: false,
    nonTextTags: ["script", "style", "textarea", "option", "xmp", "noscript", "iframe", "object", "embed", "svg", "math"],
    nestingLimit: 30,
    transformTags: {
      a: (_tagName, attributes) => ({ tagName: "a", attribs: { ...attributes, rel: "noopener noreferrer", ...(attributes.target === "_blank" ? { target: "_blank" } : { target: "_self" }) } }),
      img: (_tagName, attributes) => ({ tagName: "img", attribs: { ...attributes, loading: "lazy", decoding: "async" } })
    }
  });
}

export function sanitizeRichRecord<T extends { conteudo: string }>(record: T): T {
  return { ...record, conteudo: sanitizeRichHtml(record.conteudo) };
}
