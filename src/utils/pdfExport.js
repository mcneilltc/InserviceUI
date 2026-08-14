import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import moment from 'moment';

// Shared table-to-PDF export, used by every "Download" button that used to
// produce a CSV (Reports, Manager Dashboard's site report, Add Training's
// session export, the topic tally tables). Every generated file gets the
// report's title and the generation date both in the visible document
// (so a printed/forwarded copy is self-explanatory) and in the filename
// itself (so it sorts/searches sensibly once saved to disk).
//
// headers: string[] — column labels, in order
// rows: (string|number)[][] — one array of cell values per row, same order as headers
export function exportTableToPdf({ title, headers, rows, filenamePrefix }) {
  const orientation = headers.length > 6 ? 'landscape' : 'portrait';
  const doc = new jsPDF({ orientation });
  const dateLabel = moment().format('MMMM D, YYYY');

  doc.setFontSize(16);
  doc.text(title, 14, 18);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${dateLabel}`, 14, 25);

  autoTable(doc, {
    startY: 30,
    head: [headers],
    body: rows.map((row) => row.map((cell) => String(cell ?? ''))),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [0, 144, 199] }, // matches the app's chart accent color
  });

  const safePrefix = filenamePrefix.replace(/[^a-zA-Z0-9_-]+/g, '_');
  doc.save(`${safePrefix}_${moment().format('YYYY-MM-DD')}.pdf`);
}
