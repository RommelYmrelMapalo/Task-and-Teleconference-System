const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const sourcePath = path.join(repoRoot, "docs", "ttcs-user-manual.md");
const outputPath = path.join(repoRoot, "docs", "ttcs-user-manual.pdf");

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 56;
const MARGIN_TOP = 64;
const MARGIN_BOTTOM = 58;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

const REGULAR_FONT = "F1";
const BOLD_FONT = "F2";

function escapePdfText(text) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function approximateTextWidth(text, size, bold = false) {
  const average = bold ? 0.56 : 0.52;
  return text.length * size * average;
}

function wrapText(text, size, bold = false, maxWidth = CONTENT_WIDTH) {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) {
    return [""];
  }

  const lines = [];
  let current = words[0];

  for (let index = 1; index < words.length; index += 1) {
    const candidate = `${current} ${words[index]}`;
    if (approximateTextWidth(candidate, size, bold) <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[index];
    }
  }

  lines.push(current);
  return lines;
}

function parseMarkdown(markdown) {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.replace(/\t/g, "  "))
    .map((line) => {
      if (!line.trim()) {
        return { type: "blank" };
      }

      if (line.startsWith("### ")) {
        return { type: "heading3", text: line.slice(4).trim() };
      }

      if (line.startsWith("## ")) {
        return { type: "heading2", text: line.slice(3).trim() };
      }

      if (line.startsWith("# ")) {
        return { type: "heading1", text: line.slice(2).trim() };
      }

      if (/^\d+\.\s+/.test(line)) {
        const match = line.match(/^(\d+\.)\s+(.*)$/);
        return {
          type: "number",
          prefix: match[1],
          text: match[2].trim(),
        };
      }

      if (line.startsWith("- ")) {
        return { type: "bullet", prefix: "-", text: line.slice(2).trim() };
      }

      return { type: "paragraph", text: line.trim() };
    });
}

function createRenderer() {
  const pages = [];
  let currentPage = [];
  let y = PAGE_HEIGHT - MARGIN_TOP;

  function pushPage() {
    pages.push(currentPage);
    currentPage = [];
    y = PAGE_HEIGHT - MARGIN_TOP;
  }

  function ensureSpace(heightNeeded) {
    if (y - heightNeeded < MARGIN_BOTTOM) {
      pushPage();
    }
  }

  function addLine({
    text,
    x = MARGIN_X,
    font = REGULAR_FONT,
    size = 11,
  }) {
    currentPage.push({
      text,
      x,
      y,
      font,
      size,
    });
  }

  function addSpacing(amount) {
    y -= amount;
  }

  function renderWrappedParagraph(text, options = {}) {
    const size = options.size ?? 11;
    const font = options.font ?? REGULAR_FONT;
    const bold = font === BOLD_FONT;
    const x = options.x ?? MARGIN_X;
    const width = options.width ?? CONTENT_WIDTH;
    const lineHeight = options.lineHeight ?? size * 1.45;
    const lines = wrapText(text, size, bold, width);

    for (const line of lines) {
      ensureSpace(lineHeight);
      addLine({ text: line, x, font, size });
      y -= lineHeight;
    }
  }

  function renderListItem(prefix, text, options = {}) {
    const size = options.size ?? 11;
    const font = options.font ?? REGULAR_FONT;
    const bold = font === BOLD_FONT;
    const prefixWidth = approximateTextWidth(`${prefix} `, size, bold);
    const indent = options.indent ?? 18;
    const firstX = options.x ?? MARGIN_X;
    const bodyX = firstX + indent;
    const lineHeight = options.lineHeight ?? size * 1.45;
    const lines = wrapText(text, size, bold, CONTENT_WIDTH - indent);

    if (!lines.length) {
      return;
    }

    ensureSpace(lineHeight);
    addLine({ text: prefix, x: firstX, font, size });
    addLine({ text: lines[0], x: Math.max(bodyX, firstX + prefixWidth), font, size });
    y -= lineHeight;

    for (const line of lines.slice(1)) {
      ensureSpace(lineHeight);
      addLine({ text: line, x: bodyX, font, size });
      y -= lineHeight;
    }
  }

  function renderDocument(blocks) {
    let seenFirstHeading = false;

    for (const block of blocks) {
      if (block.type === "blank") {
        addSpacing(8);
        continue;
      }

      if (block.type === "heading1") {
        const size = seenFirstHeading ? 20 : 24;
        const lineHeight = size * 1.35;
        const lines = wrapText(block.text, size, true, CONTENT_WIDTH);

        addSpacing(seenFirstHeading ? 8 : 16);
        for (const line of lines) {
          ensureSpace(lineHeight);
          const width = approximateTextWidth(line, size, true);
          const x = MARGIN_X + Math.max(0, (CONTENT_WIDTH - width) / 2);
          addLine({ text: line, x, font: BOLD_FONT, size });
          y -= lineHeight;
        }
        addSpacing(seenFirstHeading ? 8 : 18);
        seenFirstHeading = true;
        continue;
      }

      if (block.type === "heading2") {
        addSpacing(10);
        renderWrappedParagraph(block.text, {
          font: BOLD_FONT,
          size: 15,
          lineHeight: 22,
        });
        addSpacing(4);
        continue;
      }

      if (block.type === "heading3") {
        addSpacing(8);
        renderWrappedParagraph(block.text, {
          font: BOLD_FONT,
          size: 12,
          lineHeight: 18,
        });
        addSpacing(2);
        continue;
      }

      if (block.type === "bullet") {
        renderListItem(block.prefix, block.text);
        addSpacing(2);
        continue;
      }

      if (block.type === "number") {
        renderListItem(block.prefix, block.text);
        addSpacing(2);
        continue;
      }

      renderWrappedParagraph(block.text);
      addSpacing(4);
    }

    if (currentPage.length) {
      pages.push(currentPage);
    }

    return pages;
  }

  return { renderDocument };
}

function buildContentStream(operations, pageIndex, pageCount) {
  const lines = [];

  for (const item of operations) {
    lines.push(
      `BT /${item.font} ${item.size} Tf 1 0 0 1 ${item.x.toFixed(2)} ${item.y.toFixed(2)} Tm (${escapePdfText(item.text)}) Tj ET`,
    );
  }

  const footer = `Page ${pageIndex + 1} of ${pageCount}`;
  const footerWidth = approximateTextWidth(footer, 9, false);
  const footerX = PAGE_WIDTH - MARGIN_X - footerWidth;
  const footerY = 30;
  lines.push(
    `BT /${REGULAR_FONT} 9 Tf 1 0 0 1 ${footerX.toFixed(2)} ${footerY.toFixed(2)} Tm (${escapePdfText(footer)}) Tj ET`,
  );

  return lines.join("\n");
}

function createPdf(pageOperations) {
  const objects = [];

  function addObject(content) {
    objects.push(content);
    return objects.length;
  }

  const fontRegularId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const fontBoldId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  const pageIds = [];
  const contentIds = [];
  const pageCount = pageOperations.length;
  const pagesIdPlaceholder = objects.length + 1;

  for (let index = 0; index < pageOperations.length; index += 1) {
    const stream = buildContentStream(pageOperations[index], index, pageCount);
    const streamObject = `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`;
    const contentId = addObject(streamObject);
    contentIds.push(contentId);
    pageIds.push(0);
  }

  const pagesId = addObject("PAGES_PLACEHOLDER");

  for (let index = 0; index < contentIds.length; index += 1) {
    const pageObject = [
      "<< /Type /Page",
      `/Parent ${pagesId} 0 R`,
      `/MediaBox [0 0 ${PAGE_WIDTH.toFixed(2)} ${PAGE_HEIGHT.toFixed(2)}]`,
      `/Resources << /Font << /${REGULAR_FONT} ${fontRegularId} 0 R /${BOLD_FONT} ${fontBoldId} 0 R >> >>`,
      `/Contents ${contentIds[index]} 0 R`,
      ">>",
    ].join("\n");

    pageIds[index] = addObject(pageObject);
  }

  objects[pagesId - 1] = [
    "<< /Type /Pages",
    `/Count ${pageIds.length}`,
    `/Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}]`,
    ">>",
  ].join("\n");

  const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

function main() {
  const markdown = fs.readFileSync(sourcePath, "utf8");
  const blocks = parseMarkdown(markdown);
  const renderer = createRenderer();
  const pages = renderer.renderDocument(blocks);
  const pdf = createPdf(pages);

  fs.writeFileSync(outputPath, pdf, "binary");
  console.log(`Created ${path.relative(repoRoot, outputPath)}`);
}

main();
