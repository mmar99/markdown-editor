import { describe, expect, it } from "vitest";
import { EXPORT_DOCUMENT_CSS, buildExportDocumentHtml } from "./exportDocument";

describe("exportDocument", () => {
  it("wraps the exported body in a dedicated print container", () => {
    const html = buildExportDocumentHtml("My Doc", "<h1>Hello</h1><p>World</p>");

    expect(html).toContain('<main class="export-document">');
    expect(html).toContain("<h1>Hello</h1><p>World</p>");
  });

  it("escapes unsafe title characters", () => {
    const html = buildExportDocumentHtml('A <B> "C"', "<p>x</p>");

    expect(html).toContain("<title>A &lt;B&gt; &quot;C&quot;</title>");
  });

  it("includes pagination-safe print rules for headings and tables", () => {
    expect(EXPORT_DOCUMENT_CSS).toContain("break-after: avoid-page;");
    expect(EXPORT_DOCUMENT_CSS).toContain("display: table-header-group;");
    expect(EXPORT_DOCUMENT_CSS).toContain("overflow-wrap: anywhere;");
  });
});
