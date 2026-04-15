# OneScan – Beschreibung & Dokumentation

> **OneScan** ist eine mobile App für Android und iOS, die Arztpraxen die papierlose Dokumentenübertragung in ihr Arztinformationssystem (AIS) ermöglicht. Dokumente werden direkt am Smartphone oder Tablet gescannt und vollautomatisch als GDT-konforme Rückmeldung in die AIS-Software übertragen.

---

## Inhaltsverzeichnis

1. [Funktionsübersicht](#funktionsübersicht)
2. [Workflow](#workflow)
3. [Patientendaten laden](#patientendaten-laden)
   - [QR-Code-Scan](#qr-code-scan)
   - [GDT-Einlesen](#gdt-einlesen)
   - [Manuelle Eingabe](#manuelle-eingabe)
4. [Dokumente erfassen](#dokumente-erfassen)
   - [Dokument scannen (PDF)](#dokument-scannen-pdf)
   - [Bild erstellen (JPG)](#bild-erstellen-jpg)
5. [GDT-Schnittstelle](#gdt-schnittstelle)
   - [Was ist GDT?](#was-ist-gdt)
   - [GDT-Eingang (Patientendaten)](#gdt-eingang-patientendaten)
   - [GDT-Ausgabe (Befundübertragung)](#gdt-ausgabe-befundübertragung)
6. [SMB-Dateiübertragung](#smb-dateiübertragung)
7. [Einstellungen](#einstellungen)
8. [Demo-Modus](#demo-modus)
9. [Oberflächen-Konfiguration](#oberflächen-konfiguration)
10. [Systemvoraussetzungen](#systemvoraussetzungen)

---

## Funktionsübersicht

| Funktion | Beschreibung |
|---|---|
| **QR-Code-Scan** | Patientendaten per QR-Code aus dem AIS übernehmen |
| **GDT-Einlesen** | Patientendaten aus einer GDT-Datei auf dem Server laden |
| **Dokument scannen** | Mehrere Seiten mit automatischer Kantenerkennung als PDF erfassen |
| **Bild erstellen** | Einzelfoto als JPG aufnehmen |
| **SMB-Übertragung** | Dokument + GDT-Rückmeldedatei direkt auf den Praxisserver schreiben |
| **Demo-Modus** | Vollständiger Testablauf ohne echte Datenübertragung |

---

## Workflow

```
AIS (z.B. CGM MAXX)
       │
       │  GDT-Auftragsdatei (3000/3101/3102/3103)
       ▼
 ┌─────────────────┐
 │    OneScan App  │
 │                 │
 │  1. Patient laden (QR / GDT / manuell)
 │  2. Dokument scannen oder Foto aufnehmen
 │  3. Vorschau prüfen
 │  4. Senden                              │
 └─────────────────┘
       │
       │  JPEG/PDF + GDT-Rückmeldedatei (Satzart 6310)
       ▼
 SMB-Freigabe (\\server\freigabe)
       │
       ▼
 AIS verarbeitet Befund automatisch
```

---

## Patientendaten laden

OneScan bietet drei Wege, um Patientendaten in die App zu übernehmen:

### QR-Code-Scan

Das AIS erzeugt einen QR-Code mit den Patientenstammdaten. OneScan liest diesen mit der Gerätekamera.

**QR-Code-Format (Semikolon-getrennt):**
```
PatientenID;Nachname;Vorname;Geburtsdatum
```

**Beispiel:**
```
12345;Mustermann;Max;01011980
```

| Feld | Position | Pflicht |
|---|---|---|
| Patienten-ID | 1 | ✅ |
| Nachname | 2 | ✅ |
| Vorname | 3 | — |
| Geburtsdatum (TTMMJJJJ) | 4 | — |

> Der QR-Code kann im AIS z.B. auf der Patientenkarte, im Karteireiter oder auf einem Aufkleber gedruckt werden.

---

### GDT-Einlesen

OneScan liest eine vom AIS erzeugte GDT-Auftragsdatei direkt vom SMB-Server.

- Der Pfad zur GDT-Datei und der Dateiname werden in den Einstellungen hinterlegt.
- Die Datei wird per SMB aus dem Netzwerkordner gelesen.
- Unterstütztes Encoding: **Windows-1252 / ISO-8859-1** (GDT-Standard) und UTF-8.

**Verwendete GDT-Felder beim Einlesen:**

| Feld-ID | Bedeutung |
|---|---|
| `3000` | Patienten-ID |
| `3101` | Nachname |
| `3102` | Vorname |
| `3103` | Geburtsdatum (TTMMJJJJ) |

---

### Manuelle Eingabe

Patientendaten können jederzeit manuell in die vier Felder eingetippt werden:

- **Patienten-ID** *(Pflichtfeld)*
- **Nachname** *(Pflichtfeld)*
- **Vorname**
- **Geburtsdatum** (Format: TTMMJJJJ, z.B. `01011980`)

> Die manuelle Eingabe kann in den Einstellungen deaktiviert werden (Felder werden dann schreibgeschützt), sodass Daten ausschließlich per QR-Code oder GDT übernommen werden können.

---

## Dokumente erfassen

### Dokument scannen (PDF)

- Mehrere Seiten können nacheinander aufgenommen werden (bis zu 20 Seiten).
- **Automatische Kantenerkennung**: Das System erkennt die Dokumentränder und schneidet das Bild automatisch zu.
- Alle Seiten werden zu einer **mehrseitigen PDF-Datei** zusammengeführt.
- Der Dateiname lautet: `{PatientenID}_{Zeitstempel}.pdf`

### Bild erstellen (JPG)

- Einzelnes Foto mit der Gerätekamera aufnehmen.
- Wird als **JPEG-Datei** übertragen.
- Der Dateiname lautet: `{PatientenID}_{Zeitstempel}.jpg`

> Nach der Aufnahme wird eine Vorschau angezeigt. Dokument kann vor der Übertragung verworfen und neu aufgenommen werden.

---

## GDT-Schnittstelle

### Was ist GDT?

**GDT (Gerätedaten-Träger)** ist ein deutsches Standardformat für den Datenaustausch zwischen medizinischen Geräten und Arztinformationssystemen. Es ist in der **GDT-Version 2.1** definiert und wird von allen gängigen AIS-Systemen (CGM MAXX, Turbomed, Medistar, x.concept u.a.) unterstützt.

Jede GDT-Datei besteht aus Zeilen im Format:
```
LLL FFFF Inhalt
```
- `LLL` = Gesamtlänge der Zeile (3 Zeichen, inkl. CR+LF)
- `FFFF` = Feld-ID (4-stellig)
- `Inhalt` = Feldwert

**Beispiel einer GDT-Zeile:**
```
01330001234
```
→ Länge=13, Feld-ID=3000 (Patienten-ID), Wert=1234

---

### GDT-Eingang (Patientendaten)

Das AIS schreibt eine GDT-Datei mit Patientenstammdaten in einen definierten Ordner auf dem Server. OneScan liest diese Datei und befüllt die Patientenfelder automatisch.

**Einrichtung im AIS:**
1. Im AIS eine GDT-Schnittstelle als "Gerät" anlegen.
2. Als Ausgabepfad den SMB-Ordner eintragen (z.B. `\\server\gdt-out`).
3. Dateiname (z.B. `TURBO.GDT`) in den OneScan-Einstellungen hinterlegen.

---

### GDT-Ausgabe (Befundübertragung)

OneScan schreibt nach der Übertragung automatisch eine GDT-Rückmeldedatei (**Satzart 6310 – Befundübertragung**) in denselben SMB-Ordner wie das Dokument.

**Dateiinhalt (Satzart 6310):**

| Feld-ID | Bedeutung | Beispielwert |
|---|---|---|
| `8000` | Datensatzgröße | `0180` |
| `8100` | Satzart | `6310` |
| `9218` | GDT-Version | `02.10` |
| `8315` | Absender-ID | `OneScan` |
| `3000` | Patienten-ID | `12345` |
| `3101` | Nachname | `Mustermann` |
| `3102` | Vorname | `Max` |
| `3103` | Geburtsdatum | `01011980` |
| `6200` | Leistungsdatum | `15042026` |
| `6201` | Leistungszeit | `133500` |
| `6227` | Befundtitel | `Eingescanntes Dokument` |
| `6228` | Dateipfad | `\\server\share\12345_20260415133500.pdf` |

**Einrichtung im AIS:**
1. Im AIS eine GDT-Schnittstelle als "Befund-Eingang" konfigurieren.
2. Als Eingabepfad denselben SMB-Ordner wie die Ausgabe eintragen.
3. Das AIS verarbeitet die GDT-Datei automatisch und verknüpft das Dokument mit dem Patienten.

---

## SMB-Dateiübertragung

OneScan überträgt Dokument und GDT-Datei direkt über das **SMB-Protokoll** (Windows-Dateifreigabe) in einen Netzwerkordner auf dem Praxisserver.

**Konfiguration in den Einstellungen:**

| Feld | Beschreibung | Beispiel |
|---|---|---|
| Ausgabe-Pfad (UNC) | Netzwerkpfad zur SMB-Freigabe | `\\192.168.1.10\praxis` |
| Benutzername | Zugangsdaten für die Freigabe | `praxisuser` |
| Passwort | Passwort für die Freigabe | `••••••••` |
| Domain (optional) | Windows-Domäne, falls erforderlich | `PRAXIS` |

> **Tipp:** Mit dem Button „Verbindung testen" kann die Verbindung direkt aus der App geprüft werden.

**Sicherheit:**
- Zugangsdaten werden verschlüsselt im Gerätespeicher gesichert (iOS Keychain / Android Keystore via `expo-secure-store`).
- Die Übertragung erfolgt ausschließlich im lokalen Netzwerk.

---

## Einstellungen

Die Einstellungen werden über das **Zahnrad-Symbol (⚙)** oben rechts geöffnet.

### GDT-Ausgabe (AIS)
Konfiguration der SMB-Freigabe, in die Dokumente und GDT-Rückmeldedateien geschrieben werden.

### GDT-Eingang (AIS)
Pfad und Dateiname der GDT-Datei, aus der automatisch Patientendaten gelesen werden können.

### Demo-Modus
Simuliert den gesamten Workflow ohne echte Datenübertragung — ideal für Schulungen und Präsentationen.

### Oberfläche
Steuerung der sichtbaren Bedienelemente am Hauptscreen (für konfigurierte Umgebungen).

---

## Demo-Modus

Im Demo-Modus werden alle Funktionen mit Testdaten simuliert:

- **QR-Code-Scan** und **GDT-Einlesen** liefern einen Dummy-Patienten (`Demo-Patient, Max / ID: 99001`).
- Die **SMB-Übertragung** wird übersprungen — die App zeigt eine Erfolgsmeldung, ohne Dateien zu schreiben.
- Ideal für **Produktvorführungen**, **Mitarbeiterschulungen** und **Systemtests**.

> ⚠️ Der Demo-Modus ist in den Einstellungen deutlich als aktiv markiert, damit er nicht versehentlich im Echtbetrieb vergessen wird.

---

## Oberflächen-Konfiguration

Für konfigurierte Installationen können einzelne Bedienelemente im Hauptscreen ausgeblendet werden:

| Einstellung | Wirkung |
|---|---|
| QR-Code-Button ausblenden | Der QR-Code-Button ist nicht mehr sichtbar |
| GDT-einlesen-Button ausblenden | Der GDT-einlesen-Button ist nicht mehr sichtbar |
| Manuelle Eingabe deaktivieren | Patientenfelder sind schreibgeschützt; Daten nur per QR/GDT |

> Diese Einstellungen ermöglichen es, die App an den Praxisablauf anzupassen — z.B. wenn ausschließlich GDT-gesteuerter Betrieb gewünscht ist.

---

## Systemvoraussetzungen

| Plattform | Mindestversion |
|---|---|
| Android | Android 8.0 (API 26) |
| iOS | iOS 15 |
| Netzwerk | Lokales WLAN mit Zugriff auf SMB-Freigabe |
| Server | Windows-Dateifreigabe (SMB 2/3) |

**Berechtigungen:**
- Kamera (QR-Code-Scan, Dokumentaufnahme)
- Lokales Netzwerk (SMB-Zugriff auf Praxisserver)

---

*OneScan – entwickelt für den medizinischen Praxisalltag.*  
*Version 1.0.4 · © 2026 Mario Neuhauser*
