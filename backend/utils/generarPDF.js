// backend/utils/generarPDF.js
const PDFDocument = require('pdfkit');
const fs = require('fs');

const generarReportePDF = async (datos, nombreArchivo) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(nombreArchivo);

    doc.pipe(stream);
    doc.fontSize(18).text('Reporte de LabSync', { align: 'center' });
    doc.moveDown();

    datos.forEach((item, index) => {
      doc.fontSize(12).text(`${index + 1}. ${item.nombre}: ${item.detalle}`);
      doc.moveDown();
    });

    doc.end();
    stream.on('finish', () => resolve(nombreArchivo));
    stream.on('error', (error) => reject(error));
  });
};

module.exports = { generarReportePDF };