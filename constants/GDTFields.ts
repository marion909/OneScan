/** GDT 2.1 Feldnummern (4-stellig als String) */
export const GDT_FIELDS = {
  /** Satzidentifikation (Satzart) */
  RECORD_TYPE: '8000',
  /** GDT-Versionskennung */
  GDT_VERSION: '9218',
  /** Patientennummer */
  PATIENT_ID: '3000',
  /** Namenszusatz / Nachname */
  SURNAME: '3101',
  /** Vorname */
  GIVEN_NAME: '3102',
  /** Geburtsdatum DDMMYYYY */
  BIRTH_DATE: '3103',
  /** Geschlecht 1=männlich 2=weiblich */
  GENDER: '3110',
  /** Dateiname / Dokumentname */
  FILE_NAME: '6220',
  /** Dokumentklasse */
  DOC_CLASS: '6221',
  /** Untersuchungsart */
  EXAM_TYPE: '6200',
} as const;

/** Satzart-Werte */
export const GDT_RECORD_TYPES = {
  /** Ergebnisse einer Untersuchung — zurück an PMS */
  RESULT: '6311',
  /** Anforderung einer Untersuchung */
  REQUEST: '6310',
} as const;

/** GDT Version 2.1 Kennung */
export const GDT_VERSION_VALUE = '02.10';
