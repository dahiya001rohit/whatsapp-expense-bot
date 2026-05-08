'use strict';

/**
 * pdfGenerator.js — generates a monthly report PDF using pdfkit.
 * Returns a Buffer suitable for sending via Baileys.
 */

const PDFDocument = require('pdfkit');

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const fmt = (n) => {
  const num = Number(n);
  const abs = Math.abs(num);
  const str = Number.isInteger(abs) ? String(Math.round(abs)) : abs.toFixed(2);
  const parts = str.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (num < 0 ? '-' : '') + '₹' + parts.join('.');
};

const fmtDate = (d) => {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
};

const fmtTime = (d) => {
  const dt = new Date(d);
  return `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
};

const COL_WIDTHS = [60, 45, 95, 195, 70]; // Date, Time, Category, Note, Amount
const TABLE_WIDTH = COL_WIDTHS.reduce((a, b) => a + b, 0);

function drawTableHeader(doc, headers, y) {
  const startX = doc.page.margins.left;
  doc.font('Helvetica-Bold').fontSize(8);
  // Header background
  doc.rect(startX, y, TABLE_WIDTH, 16).fill('#EEEEEE');
  doc.fillColor('black');
  let x = startX;
  headers.forEach((h, i) => {
    doc.text(h, x + 3, y + 4, { width: COL_WIDTHS[i] - 6, lineBreak: false });
    x += COL_WIDTHS[i];
  });
  return y + 16;
}

function drawTableRow(doc, cells, y, shade) {
  const startX = doc.page.margins.left;
  if (shade) {
    doc.rect(startX, y, TABLE_WIDTH, 14).fill('#F9F9F9');
    doc.fillColor('black');
  }
  doc.font('Helvetica').fontSize(8);
  let x = startX;
  cells.forEach((cell, i) => {
    doc.text(String(cell), x + 3, y + 3, { width: COL_WIDTHS[i] - 6, lineBreak: false, ellipsis: true });
    x += COL_WIDTHS[i];
  });
  // bottom border
  doc.moveTo(startX, y + 14).lineTo(startX + TABLE_WIDTH, y + 14).strokeColor('#DDDDDD').lineWidth(0.5).stroke();
  return y + 14;
}

function drawTable(doc, headers, rows) {
  const startX = doc.page.margins.left;
  let y = doc.y;

  // Check if we need a new page for the header
  if (y > doc.page.height - doc.page.margins.bottom - 50) {
    doc.addPage();
    y = doc.page.margins.top;
  }

  // Outer border top
  doc.rect(startX, y, TABLE_WIDTH, 16 + rows.length * 14).strokeColor('#CCCCCC').lineWidth(0.5).stroke();

  y = drawTableHeader(doc, headers, y);

  rows.forEach((row, idx) => {
    if (y > doc.page.height - doc.page.margins.bottom - 20) {
      doc.addPage();
      y = doc.page.margins.top;
      y = drawTableHeader(doc, headers, y);
    }
    y = drawTableRow(doc, row, y, idx % 2 === 0);
  });

  doc.y = y + 4;
}

/**
 * @param {object} user - Mongoose User doc { name, phone, balance }
 * @param {Array}  creditTxns - sorted credit Transaction docs for the month
 * @param {Array}  debitTxns  - sorted debit Transaction docs for the month
 * @param {number} month - 1-indexed (1=Jan)
 * @param {number} year
 * @returns {Promise<Buffer>}
 */
function generateMonthPdf(user, creditTxns, debitTxns, month, year) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 45, size: 'A4' });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const totalIn  = creditTxns.reduce((s, t) => s + t.amount, 0);
      const totalOut = debitTxns.reduce((s, t) => s + t.amount, 0);
      const net      = totalIn - totalOut;
      const monthLabel = `${MONTHS[month - 1]} ${year}`;

      // ── Header ─────────────────────────────────────────────────────────────
      doc.rect(45, 45, doc.page.width - 90, 70).fill('#1A1A2E');
      doc.fillColor('white')
         .font('Helvetica-Bold').fontSize(18)
         .text('SpendBot — Monthly Report', 45, 58, { align: 'center', width: doc.page.width - 90 });
      doc.font('Helvetica').fontSize(11)
         .text(monthLabel, 45, 80, { align: 'center', width: doc.page.width - 90 });
      doc.fillColor('#AAAAFF').fontSize(9)
         .text(`${user.name}   ·   +${user.phone}`, 45, 97, { align: 'center', width: doc.page.width - 90 });

      doc.fillColor('black');
      doc.y = 130;

      // ── Summary ────────────────────────────────────────────────────────────
      doc.font('Helvetica-Bold').fontSize(10).text('Monthly Summary', { underline: true });
      doc.moveDown(0.4);

      const summaryY = doc.y;
      const summaryX = doc.page.margins.left;
      const summaryW = TABLE_WIDTH;

      doc.rect(summaryX, summaryY, summaryW, 54).fill('#F0F7FF').strokeColor('#AACCEE').lineWidth(0.5).stroke();
      doc.fillColor('black').font('Helvetica').fontSize(10);

      const col = summaryW / 4;
      const labels = ['Total In', 'Total Out', 'Net', 'Closing Balance'];
      const values = [fmt(totalIn), fmt(totalOut), (net >= 0 ? '+' : '') + fmt(net), fmt(user.balance)];
      const colors = ['#22AA44', '#CC2222', net >= 0 ? '#22AA44' : '#CC2222', '#333333'];

      labels.forEach((label, i) => {
        const lx = summaryX + col * i + 5;
        doc.fillColor('#555555').font('Helvetica').fontSize(8).text(label, lx, summaryY + 8, { width: col - 10, align: 'center' });
        doc.fillColor(colors[i]).font('Helvetica-Bold').fontSize(10).text(values[i], lx, summaryY + 24, { width: col - 10, align: 'center' });
      });

      doc.fillColor('black');
      doc.y = summaryY + 64;

      // ── Income Section ─────────────────────────────────────────────────────
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#1A6B2A').text('💰 Income Transactions');
      doc.fillColor('black').moveDown(0.3);

      if (creditTxns.length === 0) {
        doc.font('Helvetica').fontSize(9).fillColor('#888888').text('No income recorded this month.');
      } else {
        drawTable(doc,
          ['Date', 'Time', 'Category', 'Note', 'Amount'],
          creditTxns.map((t) => [
            fmtDate(t.createdAt),
            fmtTime(t.createdAt),
            t.category,
            t.note || '—',
            fmt(t.amount),
          ])
        );
      }

      doc.fillColor('black').moveDown(1);

      // ── Spending Section ───────────────────────────────────────────────────
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#8B1A1A').text('💸 Spending Transactions');
      doc.fillColor('black').moveDown(0.3);

      if (debitTxns.length === 0) {
        doc.font('Helvetica').fontSize(9).fillColor('#888888').text('No spending recorded this month.');
      } else {
        drawTable(doc,
          ['Date', 'Time', 'Category', 'Note', 'Amount'],
          debitTxns.map((t) => [
            fmtDate(t.createdAt),
            fmtTime(t.createdAt),
            t.category,
            t.note || '—',
            fmt(t.amount),
          ])
        );
      }

      doc.fillColor('black').moveDown(1.5);

      // ── Footer ─────────────────────────────────────────────────────────────
      doc.moveTo(doc.page.margins.left, doc.y)
         .lineTo(doc.page.width - doc.page.margins.right, doc.y)
         .strokeColor('#CCCCCC').lineWidth(1).stroke();
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(8).fillColor('#888888')
         .text(`Generated by SpendBot · ${new Date().toLocaleString('en-IN')}`, { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateMonthPdf };
