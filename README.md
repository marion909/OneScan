# OneScan

**OneScan** ist eine Android-App für medizinische Praxen, die das Scannen und Übertragen von Dokumenten in ein Arztinformationssystem (AIS) per GDT-Schnittstelle ermöglicht.

## Funktionen

- **Dokument scannen** – randgenaue Dokumentaufnahme mit automatischer Kantenerkennung
- **Patientendaten laden** – per QR-Code-Scan oder GDT-Einlesen vom AIS
- **GDT-Ausgabe** – scanntes JPEG + GDT-Rückmeldedatei werden in einen SMB-Freigabeordner geschrieben
- **GDT-Eingang** – Patientendaten werden automatisch aus einer GDT-Datei des AIS gelesen
- **Demo-Modus** – simuliert alle Abläufe ohne echte Datenübertragung (für Tests und Präsentationen)

## Technik

| Komponente | Details |
|---|---|
| Framework | Expo SDK ~54 / React Native 0.81 |
| Sprache | TypeScript |
| Routing | expo-router |
| SMB | SMBJ 0.7.0 + Bouncy Castle 1.70 (NTLM/MD4) |
| Build | EAS Build (Android) |
| Bundle ID | `com.neuhauser.onescan` |

## Bildschirme

| Screen | Funktion |
|---|---|
| **Start** (`index.tsx`) | Patientendaten eingeben, QR-Code scannen, GDT einlesen |
| **Scan** (`scan.tsx`) | Dokument fotografieren und zuschneiden |
| **Bestätigen** (`confirm.tsx`) | Vorschau + Übertragung auslösen |
| **Einstellungen** (`settings.tsx`) | SMB-Zugangsdaten, GDT-Pfade, Demo-Modus |

## Einstellungen

### GDT-Ausgabe (AIS)
UNC-Pfad der SMB-Freigabe, in die JPEG und GDT-Rückmeldedatei geschrieben werden.

```
\\server\freigabe
```

### GDT-Eingang (AIS)
UNC-Pfad des Ordners und Dateiname, aus der Patientendaten per GDT 2.1 gelesen werden.

```
\\server\freigabe\gdt\TURBO.GDT
```

## Build & Deployment

```bash
# EAS Production Build (Android)
eas build --profile production --platform android

# lokale Entwicklung
npx expo start
```

## Demo-Modus

Im Demo-Modus werden alle Abläufe simuliert:
- QR-Code-Scan füllt Testpatient „Max Demo-Patient" ein
- GDT-Einlesen liefert dieselben Testdaten
- Keine SMB-Verbindung, keine Dateiübertragung

Aktivieren: **Einstellungen → Demo-Modus aktivieren**

---

© 2025–2026 Neuhauser
