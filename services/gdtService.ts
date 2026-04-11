import { GDT_FIELDS, GDT_RECORD_TYPES, GDT_VERSION_VALUE } from '../constants/GDTFields';
import type { GDTRecord } from '../types/GDTRecord';

/**
 * Erzeugt eine GDT 2.1 Zeile im Format: LLL FFFF CONTENT \r\n
 * LLL = 3 (LLL) + 4 (FFFF) + len(CONTENT) + 2 (\r\n) = 9 + len(CONTENT)
 */
function buildLine(fieldId: string, content: string): string {
  const lineLength = 9 + content.length;
  const lll = String(lineLength).padStart(3, '0');
  return `${lll}${fieldId}${content}\r\n`;
}

/**
 * Konvertiert einen UTF-16-String in ISO-8859-1-kompatiblen String.
 * Zeichen > 0xFF werden durch '?' ersetzt.
 */
function toIso88591String(input: string): string {
  let result = '';
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    result += code <= 0xff ? String.fromCharCode(code) : '?';
  }
  return result;
}

/**
 * Kodiert den GDT-String nach ISO-8859-1 als Uint8Array.
 * React Native hat keinen nativen ISO-8859-1 TextEncoder — manuelle char-code Konvertierung.
 */
function encodeIso88591(input: string): Uint8Array {
  const bytes = new Uint8Array(input.length);
  for (let i = 0; i < input.length; i++) {
    bytes[i] = input.charCodeAt(i) & 0xff;
  }
  return bytes;
}

/**
 * Erzeugt einen GDT 2.1 Record (Satzart 6311 = Untersuchungsergebnis an PMS)
 * @param patientId   Patienten-ID aus QR-Code oder manueller Eingabe
 * @param imageFileName  Dateiname des JPEG (nur Dateiname, ohne Pfad)
 * @returns GDTRecord mit rohem GDT-Text (UTF-16, wird beim Schreiben nach ISO-8859-1 kodiert)
 */
export function buildGDTRecord(patientId: string, imageFileName: string): GDTRecord {
  const safePatientId = toIso88591String(patientId.trim());
  const safeImageFileName = toIso88591String(imageFileName.trim());

  const lines = [
    buildLine(GDT_FIELDS.RECORD_TYPE, GDT_RECORD_TYPES.RESULT),
    buildLine(GDT_FIELDS.GDT_VERSION, GDT_VERSION_VALUE),
    buildLine(GDT_FIELDS.PATIENT_ID, safePatientId),
    buildLine(GDT_FIELDS.FILE_NAME, safeImageFileName),
  ];

  const raw = lines.join('');
  const gdtFileName = imageFileName.replace(/\.[^.]+$/, '.gdt');

  return {
    patientId: safePatientId,
    imageFileName: safeImageFileName,
    gdtFileName,
    lines: [
      { fieldId: GDT_FIELDS.RECORD_TYPE, content: GDT_RECORD_TYPES.RESULT },
      { fieldId: GDT_FIELDS.GDT_VERSION, content: GDT_VERSION_VALUE },
      { fieldId: GDT_FIELDS.PATIENT_ID, content: safePatientId },
      { fieldId: GDT_FIELDS.FILE_NAME, content: safeImageFileName },
    ],
    raw,
  };
}

/**
 * Gibt den GDT-Inhalt als ISO-8859-1-kodierten Uint8Array zurück.
 * Wird vom SMB-Writer direkt als Bytes übertragen.
 */
export function encodeGDTRecord(record: GDTRecord): Uint8Array {
  return encodeIso88591(record.raw);
}

/**
 * Erzeugt einen Basis-Dateinamen für JPEG und GDT aus PatientenID und Timestamp.
 * Format: PATID_YYYYMMDD_HHmmss
 */
export function buildBaseFileName(patientId: string): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const safeId = patientId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${safeId}_${yyyy}${mm}${dd}_${hh}${min}${ss}`;
}
