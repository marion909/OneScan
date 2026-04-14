# QR-Code Format — OneScan

## Format

Der QR-Code enthält Patientendaten als **Semikolon-getrennten Text**:

```
PatientID;Nachname;Vorname;Geburtsdatum
```

## Felder

| Position | Feld         | Pflicht | Beschreibung                         | Beispiel       |
|----------|--------------|---------|--------------------------------------|----------------|
| 0        | PatientID    | ✅ Ja   | Eindeutige Patienten-Nummer          | `123456`       |
| 1        | Nachname     | ✅ Ja   | Familienname                         | `Mustermann`   |
| 2        | Vorname      | ❌ Nein | Vorname                              | `Max`          |
| 3        | Geburtsdatum | ❌ Nein | Format `TTMMJJJJ` (ohne Trennzeichen)| `01011980`     |

## Beispiele

```
123456;Mustermann;Max;01011980
```

```
789012;Müller;Anna;15031975
```

```
999;Schmidt;;
```
*(Vorname und Geburtsdatum können leer sein)*

## Regeln

- Trennzeichen: **Semikolon** (`;`)
- Felder 2 und 3 (Vorname, Geburtsdatum) sind optional — können leer bleiben, das Semikolon muss aber trotzdem vorhanden sein
- Geburtsdatum immer **8 Ziffern**: Tag (2), Monat (2), Jahr (4) — z.B. `01011980` für 01.01.1980
- Leerzeichen an Anfang/Ende werden automatisch entfernt (trimmed)
- Mindestens **2 Felder** (PatientID + Nachname) müssen vorhanden sein, sonst wird eine Fehlermeldung angezeigt

## Ablauf in der App

1. Startseite → grüner Button **„QR-Code scannen"**
2. Kamera öffnet sich im Vollbild
3. QR-Code wird automatisch erkannt und die Felder werden befüllt
4. Felder können danach manuell korrigiert werden
5. **„Dokument scannen"** startet den Dokumentenscanner
