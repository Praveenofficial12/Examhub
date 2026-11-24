function escapeTitle(str: string): string {
  return String(str || 'VSBEC Document')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Reliably prints clean A4 Portrait HTML via a dedicated hidden print iframe.
 * Bypasses SPA shell fixed sidebars, sticky headers, overflow containers, and CSS transform traps
 * inside nested AI Studio preview frames while preserving every inline table & diagram style.
 */
export function printHtmlDocument(title: string, bodyHtml: string): void {
  try {
    const existing = document.getElementById('vsbec-isolated-print-frame');
    if (existing && existing.parentNode) {
      existing.parentNode.removeChild(existing);
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'vsbec-isolated-print-frame';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
    const frameWin = iframe.contentWindow;
    if (!frameDoc || !frameWin) {
      window.print();
      return;
    }

    const styleTags = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((node) => node.outerHTML)
      .join('\n');

    const safeHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeTitle(title)}</title>
    ${styleTags}
    <style>
      @page {
        size: A4 portrait;
        margin: 10mm;
      }
      *, *::before, *::after {
        box-sizing: border-box;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        color: #000000 !important;
        font-family: 'Times New Roman', Times, Georgia, serif;
        width: 100% !important;
        height: auto !important;
        overflow: visible !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .print-root {
        width: 100%;
        max-width: 190mm;
        margin: 0 auto;
        padding: 0;
        background: #ffffff;
      }
      table {
        border-collapse: collapse;
        page-break-inside: auto;
      }
      tr {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      pre {
        white-space: pre-wrap;
        word-break: break-word;
        font-family: 'Courier New', Consolas, monospace;
      }
      [data-ak-diagram-box="true"] {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      footer, .no-print, .print\\:hidden {
        display: none !important;
      }
      [data-ac09-footer="true"] {
        display: block !important;
        page-break-inside: avoid;
        break-inside: avoid;
      }
    </style>
  </head>
  <body>
    <div class="print-root">${bodyHtml}</div>
  </body>
</html>`;

    frameDoc.open();
    frameDoc.write(safeHtml);
    frameDoc.close();

    let printed = false;
    const executePrint = () => {
      if (printed) return;
      printed = true;
      try {
        frameWin.focus();
        frameWin.print();
      } catch {
        window.print();
      }
      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 60000);
    };

    iframe.onload = () => setTimeout(executePrint, 120);
    setTimeout(executePrint, 280);
  } catch {
    window.print();
  }
}
