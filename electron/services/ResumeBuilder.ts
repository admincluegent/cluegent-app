import { BrowserWindow, dialog } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { renderResumeHtml, ResumeData, ResumeTemplate } from '../../shared/resume';

export async function importResumeDocument() {
  try {
    const chosen = await (dialog.showOpenDialog as unknown as (options: Electron.OpenDialogOptions) => Promise<{ canceled: boolean; filePaths: string[] }>)({ title: 'Import resume', properties: ['openFile'], filters: [{ name: 'Resume documents', extensions: ['pdf', 'docx'] }] });
    if (chosen.canceled || !chosen.filePaths[0]) return { success: false, cancelled: true };
    const filePath = chosen.filePaths[0];
    if (fs.statSync(filePath).size > 10 * 1024 * 1024) throw new Error('Choose a file smaller than 10 MB.');
    let text: string;
    const extension = path.extname(filePath).toLowerCase();
    if (extension === '.pdf') {
      const { PDFParse } = require('pdf-parse');
      const parser = new PDFParse({ data: fs.readFileSync(filePath) });
      try { text = (await parser.getText()).text; }
      finally { await parser.destroy().catch(() => {}); }
    } else if (extension === '.docx') {
      text = (await require('mammoth').extractRawText({ path: filePath })).value;
    } else { throw new Error('Choose a PDF or DOCX document.'); }
    text = text.replace(/\u0000/g, '').trim();
    if (text.length < 30) throw new Error('No readable resume text found. Scanned PDFs need OCR; use a text-based PDF, DOCX, or enter your details.');
    if (text.length > 24000) throw new Error('This document is too long. Use a resume with fewer than 24,000 characters.');
    return { success: true, document: { name: path.basename(filePath), content: text } };
  } catch (e) { return { success: false, error: e instanceof Error ? e.message : 'Could not import document.' }; }
}

export async function exportResumePdf(input: { resume: ResumeData; template: ResumeTemplate; color: string }) {
  let printWindow: BrowserWindow | undefined;
  try {
    const html = renderResumeHtml(input.resume, input.template, input.color);
    const safeName = input.resume.name.replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 80) || 'Resume';
    const chosen = await (dialog.showSaveDialog as unknown as (options: Electron.SaveDialogOptions) => Promise<{ canceled: boolean; filePath?: string }>)({ title: 'Download resume PDF', defaultPath: `${safeName}.pdf`, filters: [{ name: 'PDF', extensions: ['pdf'] }] });
    if (chosen.canceled || !chosen.filePath) return { success: false, cancelled: true };
    printWindow = new BrowserWindow({ show: false, webPreferences: { partition: 'resume-builder-print', sandbox: true, contextIsolation: true, nodeIntegration: false, javascript: false } });
    printWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    printWindow.webContents.session.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_, callback) => callback({ cancel: true }));
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    const pdf = await printWindow.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true, pageSize: 'A4', margins: { top: 0, bottom: 0, left: 0, right: 0 } });
    const target = chosen.filePath.toLowerCase().endsWith('.pdf') ? chosen.filePath : `${chosen.filePath}.pdf`;
    await fs.promises.writeFile(target, pdf);
    return { success: true, path: target };
  } catch (e) { return { success: false, error: e instanceof Error ? e.message : 'Could not export PDF.' }; }
  finally { if (printWindow && !printWindow.isDestroyed()) printWindow.destroy(); }
}
