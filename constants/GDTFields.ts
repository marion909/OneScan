// GDT 2.1 field identifiers
export const GDT_FIELDS = {
  // Record header
  RECORD_SIZE: '8000',
  RECORD_TYPE: '8100',
  GDT_VERSION: '9218',

  // Patient master data
  PATIENT_ID: '3000',
  PATIENT_NAME: '3101',  // Nachname
  PATIENT_FIRST_NAME: '3102',
  PATIENT_BIRTH_DATE: '3103',  // TTMMJJJJ
  PATIENT_GENDER: '3110',  // 1=männlich, 2=weiblich, 9=unbekannt

  // Sender / receiver
  SENDER_ID: '8315',
  RECEIVER_ID: '8316',

  // Document / order
  ACTIVITY_DATE: '6200',   // TTMMJJJJ
  ACTIVITY_TIME: '6201',   // HHMMSS

  // Transfer data object (Befund)
  TRANSFER_TITLE: '6227',
  TRANSFER_FILE: '6228',  // File path for document
} as const;
