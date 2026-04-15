import { Patient } from '../types/Patient';
import { GDT_FIELDS } from '../constants/GDTFields';

/**
 * Parses a GDT 2.1 file content and extracts patient data.
 * Each line format: LLL FFFF value — first 3 chars = length, next 4 = field ID, rest = value
 */
export function parseGdtContent(content: string): Partial<Patient> {
  const lines = content.split(/\r?\n/);
  const patient: Partial<Patient> = {};
  for (const line of lines) {
    if (line.length < 7) continue;
    const fieldId = line.substring(3, 7);
    const value = line.substring(7).trim();
    switch (fieldId) {
      case GDT_FIELDS.PATIENT_ID:         patient.id = value; break;
      case GDT_FIELDS.PATIENT_NAME:       patient.lastName = value; break;
      case GDT_FIELDS.PATIENT_FIRST_NAME: patient.firstName = value; break;
      case GDT_FIELDS.PATIENT_BIRTH_DATE: patient.birthDate = value; break;
    }
  }
  return patient;
}

/**
 * Builds a GDT 2.1 "Befundübertragung" (record type 6310) string for the given patient.
 * Encoding: ISO-8859-1 (Windows-1252 compatible), line ending: CR LF.
 */
export function buildGdtContent(patient: Patient, jpegFileName?: string, description?: string): string {
  const today = formatDate(new Date());
  const now = formatTime(new Date());

  const records = [
    field(GDT_FIELDS.RECORD_TYPE, '6310'),
    field(GDT_FIELDS.GDT_VERSION, '02.10'),
    field(GDT_FIELDS.SENDER_ID, 'OneScan'),
    field(GDT_FIELDS.PATIENT_ID, patient.id),
    field(GDT_FIELDS.PATIENT_NAME, patient.lastName),
    ...(patient.firstName ? [field(GDT_FIELDS.PATIENT_FIRST_NAME, patient.firstName)] : []),
    ...(patient.birthDate ? [field(GDT_FIELDS.PATIENT_BIRTH_DATE, patient.birthDate)] : []),
    field(GDT_FIELDS.ACTIVITY_DATE, today),
    field(GDT_FIELDS.ACTIVITY_TIME, now),
    field(GDT_FIELDS.TRANSFER_TITLE, description ?? 'Eingescanntes Dokument'),
    ...(jpegFileName ? [field(GDT_FIELDS.TRANSFER_FILE, jpegFileName)] : []),
  ];

  // Prepend the total record size field (8000). Size includes the size field line itself.
  const body = records.join('\r\n') + '\r\n';
  // Each line: len=3 (len field) + 4 (field id) + 13 (content fixed part) ... actually:
  // GDT line format: LLL FFFF CONTENT CRLF  — LLL = total bytes of the line incl. CRLF
  // We re-build with correct lengths:
  const lines = records.map(buildLine);
  const totalBytes = lines.reduce((sum, l) => sum + l.length, 0);

  // The record-size line itself (field 8000): format "LLLLFFFFvalue"
  const sizeLine = buildLine(field(GDT_FIELDS.RECORD_SIZE, String(totalBytes + /* size line itself */ 12 + 2)));
  return sizeLine + lines.join('');
}

function field(id: string, value: string): string {
  return `${id}${value}`;
}

/**
 * Builds a single GDT line: `LLL` + fieldId (4 chars) + value + CR LF
 * LLL = total line length including the 3-char length prefix and CRLF
 */
function buildLine(raw: string): string {
  // raw = fieldId (4) + value
  const lineWithoutLen = raw;
  const totalLen = 3 + lineWithoutLen.length + 2; // 3 (len) + content + CRLF
  const lenStr = String(totalLen).padStart(3, '0');
  return `${lenStr}${lineWithoutLen}\r\n`;
}

function formatDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear());
  return `${day}${month}${year}`;
}

function formatTime(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${h}${m}${s}`;
}
