# OneScan

Medizinische Dokumenten-Scanner-App für Android und iOS. Scannt Patientendokumente mit automatischer Eckerkennung, erstellt eine GDT 2.1-Datei und speichert beide Dateien über SMB2 auf einem UNC-Netzwerkpfad.

---

## Features

- **QR-Code & Patienten-ID** — Patienten-ID per QR-Code scannen oder manuell eingeben
- **Dokument-Scan** — Echtzeit-Eckerkennung mit visuellem Overlay (Canny/Hough auf Android, Vision-Framework auf iOS)
- **GDT 2.1** — automatisch generierte GDT-Datei (Satzart 6311, ISO-8859-1) für die Praxissoftware
- **SMB2-Upload** — vollständig selbst implementierter SMB2-Client mit NTLMv2-Authentifizierung; keine externen Netzwerkbibliotheken
- **Sichere Einstellungen** — UNC-Pfad, Benutzername und Passwort werden verschlüsselt im Gerätespeicher abgelegt (expo-secure-store)

---

## Screens

| Screen | Beschreibung |
|---|---|
| **Patienten-ID** | QR-Scanner oder manuelle Eingabe |
| **Scan** | Kamera mit Live-Eckerkennung und Capture-Button |
| **Bestätigung** | Vorschau, Dateinamen, GDT-Info — Senden oder wiederholen |
| **Einstellungen** | UNC-Pfad, Zugangsdaten, Verbindungstest (erscheint beim ersten Start) |

---

## Technischer Aufbau

```
app/                  Expo Router Screens
  _layout.tsx         Root-Layout, First-Run-Prüfung
  index.tsx           Screen 1: Patienten-ID
  scan.tsx            Screen 2: Dokument-Scan
  confirm.tsx         Screen 3: Bestätigung & Upload
  settings.tsx        Einstellungen

components/
  CornerOverlay.tsx   SVG-Polygon für erkannte Ecken

services/
  gdtService.ts       GDT 2.1 Builder (Satzart 6311, ISO-8859-1)
  settingsService.ts  Einstellungen lesen/schreiben (expo-secure-store)
  fileService.ts      Temporäre Dateien (expo-file-system v19 API)

modules/
  document-detector/  Nativer Modul: Eckerkennung
    android/          Kotlin — Sobel → Canny → Hough
    ios/              Swift — VNDetectRectanglesRequest (Vision)
  smb-writer/         Nativer Modul: SMB2-Client
    android/          Kotlin — SMB2 + NTLMv2 + MD4 (selbst implementiert)
    ios/              Swift — SMB2 + NTLMv2 + CommonCrypto

types/                TypeScript-Interfaces (Patient, Settings, Corners, GDTRecord)
constants/            GDT-Feldnummern
```

### Selbst implementierte Komponenten

| Komponente | Plattform | Details |
|---|---|---|
| SMB2-Client | Android + iOS | Binary-Paketaufbau, NetBIOS-Framing, NTLMv2-Handshake |
| NTLMv2-Auth | Android + iOS | NT-Hash, HMAC-MD5 Response, SPNEGO/ASN.1-Wrapping |
| MD4-Hash | Android | Pure Kotlin (RFC 1320) — Android JCA enthält kein MD4 |
| Eckerkennung | Android | Sobel → Non-Max-Suppression → Canny → Hough-Transform |
| Eckerkennung | iOS | `VNDetectRectanglesRequest` (Vision Framework) |

---

## Voraussetzungen

- Node.js ≥ 20 / npm
- [EAS CLI](https://docs.expo.dev/eas/): `npm install -g eas-cli`
- Expo-Account (für EAS Build)
- Android Studio (Android) / Xcode 15+ (iOS)

---

## Installation

```bash
git clone https://github.com/marion909/OneScan.git
cd OneScan
npm install --legacy-peer-deps
```

---

## Build

Die App verwendet custom Native Modules und kann **nicht** mit Expo Go getestet werden. Ein EAS Development Build ist erforderlich.

```bash
# Development Build (intern verteilt)
eas build --profile development --platform android
eas build --profile development --platform ios

# Preview Build
eas build --profile preview --platform all

# Production Build
eas build --profile production --platform all
```

---

## Konfiguration (Erst-Start)

Beim ersten Start öffnet sich automatisch der Einstellungs-Screen. Folgende Felder ausfüllen:

| Feld | Beispiel |
|---|---|
| UNC-Pfad | `\\\\server\share\praxis` |
| Benutzername | `praxis\scanner` |
| Passwort | `••••••••` |
| Domäne | `praxis` (optional) |

Mit **„Verbindung testen"** kann die SMB2-Verbindung vor dem Speichern geprüft werden.

---

## Dateiformat

Pro Scan werden zwei Dateien auf dem Netzwerklaufwerk abgelegt:

- `PATID_YYYYMMDD_HHmmss.jpg` — Dokument-JPEG (Qualität 85 %)
- `PATID_YYYYMMDD_HHmmss.gdt` — GDT 2.1 Datei (Satzart 6311, ISO-8859-1, `\r\n`)

---

## Tech Stack

| Technologie | Version |
|---|---|
| Expo SDK | 54 |
| React Native | 0.81.5 |
| Expo Router | 6 |
| expo-camera | 17 |
| expo-file-system | 19 |
| expo-secure-store | 15 |
| react-native-svg | 15 |
| TypeScript | 5.9 (strict) |

---

## Lizenz

Privat / Intern — kein öffentlicher Einsatz ohne Genehmigung.
