// Lightweight XLSX (Office Open XML) writer. No external dependency and no formulas:
// values from untrusted transaction labels remain literal text to prevent injection.
import { deflateRawSync } from "node:zlib";

export type WorkbookSheet = { name: string; rows: Array<Array<string | number | null | undefined>> };
const encoder = new TextEncoder();
function escapeXml(input: string) {
  return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
}
function colName(index: number) { let col = ""; for (let i = index + 1; i > 0; i = Math.floor((i - 1) / 26)) col = String.fromCharCode(65 + (i - 1) % 26) + col; return col; }
function sheetXml(sheet: WorkbookSheet) {
  const rows = sheet.rows;
  const columnCount = Math.max(1, ...rows.slice(0, 250).map((row) => row.length));
  const widths = Array.from({ length: columnCount }, (_, index) => {
    const maxLength = rows.slice(0, 250).reduce((len, row) => Math.max(len, String(row[index] ?? "").length), 0);
    // Keep UTF-8 labels legible without letting long notes blow up the layout.
    const width = Math.min(44, Math.max(12, Math.ceil(maxLength * 1.15) + 2));
    return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`;
  }).join("");
  const maxColumn = colName(columnCount - 1);
  const autoFilter = sheet.name === "Tong hop" || rows.length <= 1 ? "" : `<autoFilter ref="A1:${maxColumn}${rows.length}"/>`;

  const inner = rows.map((row, ri) => `<row r="${ri + 1}">${row.map((cell, ci) => {
    if (cell === null || cell === undefined) return "";
    const addr = `${colName(ci)}${ri + 1}`;
    if (typeof cell === "number" && Number.isFinite(cell)) return `<c r="${addr}" s="${ri === 0 ? 1 : 2}"><v>${cell}</v></c>`;
    const txt = escapeXml(String(cell));
    return `<c r="${addr}" s="${ri === 0 ? 1 : 0}" t="inlineStr"><is><t xml:space="preserve">${txt}</t></is></c>`;
  }).join("")}</row>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="19"/><cols>${widths}</cols><sheetData>${inner}</sheetData>${autoFilter}</worksheet>`;
}
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) { let c = i; for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTable[i] = c >>> 0; }
function crc32(bytes: Uint8Array) { let crc = 0xffffffff; for (const b of bytes) crc = crcTable[(crc ^ b) & 0xff] ^ (crc >>> 8); return (crc ^ 0xffffffff) >>> 0; }
function zipFiles(entries: Array<{ name: string; xml: string }>) {
  const locals: Buffer[] = []; const directory: Buffer[] = []; let offset = 0;
  for (const { name, xml } of entries) {
    const filename = Buffer.from(name, "utf8");
    const plain = Buffer.from(encoder.encode(xml));
    const compressed = deflateRawSync(plain);
    const checksum = crc32(plain);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x800, 6);
    local.writeUInt16LE(8, 8); local.writeUInt32LE(checksum, 14); local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(plain.length, 22); local.writeUInt16LE(filename.length, 26);
    locals.push(local, filename, compressed);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x800, 8); central.writeUInt16LE(8, 10); central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(compressed.length, 20); central.writeUInt32LE(plain.length, 24);
    central.writeUInt16LE(filename.length, 28); central.writeUInt32LE(offset, 42);
    directory.push(central, filename);
    offset += local.length + filename.length + compressed.length;
  }
  const directoryOffset = offset;
  const directoryBytes = directory.reduce((total, part) => total + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directoryBytes, 12); end.writeUInt32LE(directoryOffset, 16);
  return Buffer.concat([...locals, ...directory, end]);
}
export function makeReportXlsx(sheets: WorkbookSheet[]) {
  if (!sheets.length || sheets.length > 12) throw new Error("Số trang báo cáo không hợp lệ");
  const workbook = sheets.map((sheet, index) => `<sheet name="${escapeXml(sheet.name.slice(0, 31))}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("");
  const rels = sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("");
  const overrides = sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("");
  const entries = [
    { name: "[Content_Types].xml", xml: `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${overrides}</Types>` },
    { name: "_rels/.rels", xml: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: "xl/workbook.xml", xml: `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbook}</sheets></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", xml: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: "xl/styles.xml", xml: `<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.##"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Aptos"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Aptos"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF106A56"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>` },
    ...sheets.map((sheet, index) => ({ name: `xl/worksheets/sheet${index + 1}.xml`, xml: sheetXml(sheet) }))
  ];
  return zipFiles(entries);
}
