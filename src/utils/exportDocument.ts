function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const EXPORT_DOCUMENT_CSS = `
html, body {
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif;
  font-size: 10pt;
  line-height: 1.55;
  color: #1b1b1b;
  background: #ffffff;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.export-document {
  max-width: 100%;
}

@page {
  size: auto;
  margin: 16mm 18mm 18mm;
}

h1, h2, h3, h4, h5, h6 {
  break-after: avoid-page;
  break-inside: avoid-page;
  page-break-after: avoid;
  page-break-inside: avoid;
}

h1 {
  font-size: 18pt;
  font-weight: 700;
  margin: 0 0 8pt 0;
  line-height: 1.18;
}

h2 {
  font-size: 14pt;
  font-weight: 600;
  margin: 22pt 0 6pt 0;
  line-height: 1.24;
}

h3 {
  font-size: 11pt;
  font-weight: 600;
  margin: 16pt 0 4pt 0;
}

h4, h5, h6 {
  font-size: 10pt;
  font-weight: 600;
  margin: 12pt 0 3pt 0;
}

h5, h6 {
  color: #5b5c5d;
}

h1 + p,
h1 + ul,
h1 + ol,
h1 + blockquote,
h1 + pre,
h1 + table,
h2 + p,
h2 + ul,
h2 + ol,
h2 + blockquote,
h2 + pre,
h2 + table,
h3 + p,
h3 + ul,
h3 + ol,
h3 + blockquote,
h3 + pre,
h3 + table {
  break-before: avoid-page;
  page-break-before: avoid;
}

p {
  margin: 0 0 8pt 0;
  orphans: 3;
  widows: 3;
}

strong { font-weight: 700; }
em { font-style: italic; }
u { text-decoration: underline; text-underline-offset: 2px; }
s { text-decoration: line-through; color: #5b5c5d; }

a {
  color: #5e6ad2;
  text-decoration: none;
}

code {
  font-family: "SF Mono", "Menlo", Consolas, monospace;
  font-size: 8.5pt;
  background: #f3f4f6;
  padding: 1px 4px;
  border-radius: 3px;
}

pre {
  font-family: "SF Mono", "Menlo", Consolas, monospace;
  font-size: 8pt;
  line-height: 1.5;
  background: #f7f7f7;
  border: 1px solid #eeeeee;
  border-radius: 4px;
  padding: 8pt 10pt;
  margin: 10pt 0 12pt 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
}

pre code {
  background: none;
  padding: 0;
  font-size: inherit;
}

blockquote {
  border-left: 2.5px solid #5e6ad2;
  padding: 5pt 10pt;
  margin: 10pt 0 12pt 0;
  background: #f8f8f8;
  color: #2f2f31;
  break-inside: avoid-page;
  page-break-inside: avoid;
}

blockquote p:last-child {
  margin-bottom: 0;
}

ul, ol {
  margin: 6pt 0 10pt 0;
  padding-left: 18pt;
}

li {
  margin-bottom: 3pt;
  break-inside: avoid-page;
  page-break-inside: avoid;
}

li p {
  margin: 0 0 3pt 0;
}

ul[data-type="taskList"] {
  list-style: none;
  padding-left: 0;
}

ul[data-type="taskList"] li {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

ul[data-type="taskList"] li > label {
  flex-shrink: 0;
  margin-top: 1px;
}

ul[data-type="taskList"] li > label input[type="checkbox"] {
  width: 10px;
  height: 10px;
  margin: 0;
  accent-color: #5e6ad2;
}

ul[data-type="taskList"] li > div {
  flex: 1;
}

ul[data-type="taskList"] li[data-checked="true"] > div {
  text-decoration: line-through;
  color: #9b9b9d;
}

table {
  border-collapse: collapse;
  width: 100%;
  margin: 10pt 0 12pt 0;
  font-size: 9pt;
  table-layout: fixed;
}

thead {
  display: table-header-group;
}

tr, td, th {
  break-inside: avoid-page;
  page-break-inside: avoid;
}

th, td {
  border: 1px solid #dcdcdc;
  padding: 5pt 8pt;
  text-align: left;
  vertical-align: top;
  overflow-wrap: anywhere;
}

th {
  background: #f5f5f5;
  font-weight: 600;
  font-size: 8pt;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #5b5c5d;
}

img {
  display: block;
  max-width: 100%;
  height: auto;
  break-inside: avoid-page;
  page-break-inside: avoid;
}

mark {
  background: #fef08a;
  padding: 1px 2px;
}

hr {
  border: none;
  border-top: 1px solid #dcdcdc;
  margin: 16pt 0;
}

@media print {
  body {
    margin: 0;
    padding: 0;
  }
}
`.trim();

export function buildExportDocumentHtml(title: string, bodyHtml: string): string {
  const safeTitle = escapeHtml(title || "Document");

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>${safeTitle}</title>
    <style>${EXPORT_DOCUMENT_CSS}</style>
  </head>
  <body>
    <main class="export-document">${bodyHtml}</main>
  </body>
</html>`;
}
