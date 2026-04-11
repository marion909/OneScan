export interface GDTLine {
  fieldId: string;
  content: string;
}

export interface GDTRecord {
  patientId: string;
  imageFileName: string;
  gdtFileName: string;
  lines: GDTLine[];
  raw: string;
}
