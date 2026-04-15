# OneScan – Apple App Store Submission

---

## 1. Reviewer Notes (Hinweise für den Apple-Prüfer)

```
Dear App Review Team,

OneScan is a medical document scanning app for healthcare practices. 
It allows clinic staff to scan paper documents and transfer them to 
their practice management software (AIS) via SMB (Windows file share) 
and GDT 2.1 interface.

--- DEMO MODE ---

Since a live SMB server is not available during review, the app 
includes a built-in Demo Mode that simulates all key functions 
without requiring network access.

To activate Demo Mode:
1. Tap the gear icon (⚙) in the top-right corner of the main screen
2. Scroll to the "Verbindungstest & Demo" section
3. Enable the "Demo-Modus" toggle
4. Tap "Einstellungen speichern"
5. Return to the main screen

In Demo Mode:
- QR-Code scan: instantly fills in a demo patient ("Max Demo-Patient")
- GDT load: fills in the same demo patient without network access
- Document scan / photo: works normally (real camera capture)
- "Senden" button: simulates a successful transfer with a confirmation
  dialog — no actual SMB connection is attempted

No login credentials, server address, or network access is required 
to use the app in Demo Mode.

Thank you for reviewing OneScan.
```

---

## 2. App Store Metadaten

### Name (30 Zeichen max.)
```
OneScan – Praxisscanner
```

### Untertitel (30 Zeichen max.)
```
GDT-Dokumente ins AIS senden
```

### Beschreibung (4000 Zeichen max.)
```
OneScan – Der Dokumentenscanner für Arztpraxen

Scannen Sie Papierdokumente direkt mit Ihrem iPhone oder iPad und übertragen Sie diese automatisch in Ihre Praxissoftware – schnell, sicher und ohne Umwege.

WIE ES FUNKTIONIERT

1. Patientendaten laden
   Lesen Sie den Patienten per QR-Code aus Ihrer Praxissoftware ein – die Felder werden automatisch befüllt. Alternativ können Daten per GDT-Datei aus dem Netzwerk gelesen oder manuell eingegeben werden.

2. Dokument erfassen
   Wählen Sie zwischen mehrseitigem PDF-Scan (automatische Kantenerkennung) oder schnellem Einzelfoto (JPEG). Die App erkennt Dokumentenkanten automatisch.

3. Senden
   Mit einem Tap wird das Dokument zusammen mit einer GDT-Rückmeldung auf Ihre Windows-Netzwerkfreigabe übertragen. Ihre Praxissoftware empfängt das Dokument sofort.

FUNKTIONEN

• QR-Code-Scan – Patientendaten in Sekunden einlesen
• GDT 2.1 – Volle Kompatibilität mit CGM MAXX, TurboMed, Medistar, x.comfort und anderen AIS-Systemen
• Mehrseitiger PDF-Scan – bis zu 20 Seiten in einem Dokument
• Automatische Kantenerkennung – schiefe Aufnahmen werden korrigiert
• SMB-Übertragung – direkt auf Windows-Netzwerkfreigaben
• Dokumentenbeschreibung – vor dem Senden anpassbar
• Demo-Modus – Vollständige Testumgebung ohne Serverzugang
• Oberfläche anpassbar – Buttons und Felder nach Bedarf ein-/ausblenden
• Verbindungstest – Netzwerkverbindung direkt aus der App prüfen

SICHERHEIT & DATENSCHUTZ

Keine Cloud. Keine externen Server. Alle Daten bleiben ausschließlich in Ihrem Praxisnetzwerk. Zugangsdaten werden verschlüsselt auf dem Gerät gespeichert (iOS Keychain). Eine Internetverbindung ist nicht erforderlich.

VORAUSSETZUNGEN

• iPhone mit iOS 16.0 oder neuer
• WLAN-Verbindung zur Praxis-Netzwerkfreigabe
• SMB-Freigabe auf dem Praxisserver (Windows-Netzwerk)
• Praxissoftware mit GDT 2.1-Unterstützung

DEMO-MODUS

Kein Server vorhanden? Kein Problem. Aktivieren Sie den Demo-Modus in den Einstellungen und testen Sie alle Funktionen der App ohne jegliche Netzwerkverbindung.
```

### Schlüsselwörter (100 Zeichen max., kommagetrennt)
```
scanner,gdt,praxis,dokument,arzt,smb,qrcode,ais,medizin,turbomed,medistar,cgm,befund,patient
```

### Werbetext (170 Zeichen max. — ohne Update änderbar)
```
Neu: Dokumentenbeschreibung vor dem Senden editierbar. Demo-Modus für risikofreie Tests. Jetzt für iPhones verfügbar.
```

### Datenschutzrichtlinie URL
```
https://github.com/marion909/OneScan/blob/master/README.md
```

### Supportseite URL
```
https://github.com/marion909/OneScan
```

### Kategorie
```
Primär:    Business
Sekundär:  Medical
```

### Altersfreigabe
```
4+ (keine bedenklichen Inhalte)
```

---

## 3. What''s New – Version 1.0.5
```
• Dokumentenbeschreibung vor dem Senden bearbeitbar
• Oberflächen-Toggles jetzt ohne App-Neustart aktiv
• iOS-Build auf stabilem Xcode 16.4 – verbesserte Stabilität
• Behobener Fehler beim App-Start auf neueren iOS-Versionen
```

---

## 4. App Store Screenshots – Nano Banana 2 Prompts

> Format: **1290 × 2796 px (iPhone 16 Pro Max)** — wird für alle iPhone-Größen skaliert.
> Gerät im Mockup: **iPhone 16 Pro**, Natural Titanium.
> Farbpalette: Header #1a5c9a, Buttons #0d6ebd, Hintergrund #f0f2f5, Akzent #e8910a.

---

### Screenshot 1 – Hauptscreen

**Nano Banana 2 Prompt:**
```
Device: iPhone 16 Pro, color: Natural Titanium, portrait orientation. Tall 6.9-inch screen, rounded corners, no home button, Dynamic Island top center.

Screen content:
- Navigation bar: solid #1a5c9a, white text "PATIENTENDATEN" centered uppercase bold 15pt. Top-right: white gear icon.
- Screen background: #f0f2f5.
- Two chips side-by-side, 8px gap, 16px horizontal margin:
  Left "QR-Code": bg #e3effc, border 1px #0d6ebd, text #0d6ebd bold 13pt, 4px radius.
  Right "GDT einlesen": bg #fff3e0, border 1px #e8910a, text #e8910a bold 13pt, 4px radius.
- 4 form fields (label uppercase 11pt #5a6a7a, input bg #f7f9fb border 1px #c5cdd5 4px radius):
  "PATIENTEN-ID *" → "12345", "NACHNAME *" → "Mustermann",
  "VORNAME" → "Max", "GEBURTSDATUM (TTMMJJJJ)" → "01011980"
- Divider 1px #c5cdd5.
- Two buttons in row: "Dokument scannen" bg #0d6ebd white text, "Bild erstellen" bg #2e8b57 white text. Both 4px radius bold 14pt.

Marketing overlay:
- Background: dark navy gradient #0a2a4a (top) to #1a5c9a (bottom).
- Headline above device (white bold 44pt): "Patientendaten in Sekunden laden"
- Sub-text (#a0c4e8, 24pt): "Per QR-Code, GDT oder manuell"
- Bottom badge (white pill): "✓ CGM MAXX · Turbomed · Medistar"
```

---

### Screenshot 2 – Dokumentenscanner

**Nano Banana 2 Prompt:**
```
Device: iPhone 16 Pro, Natural Titanium, portrait, Dynamic Island visible.

Screen content:
- Navigation bar: #1a5c9a, white back-arrow, "DOKUMENT SCANNEN" uppercase bold white centered.
- Full-screen camera viewfinder: dark realistic preview of an A4 document on a desk.
- Green corner brackets at document edges (automatic detection overlay).
- Circular capture button bottom-center: outer ring white 4px 80px, inner circle #0d6ebd 60px.

Marketing overlay:
- Background: deep navy #071a2e.
- Headline (white bold 44pt): "Automatische Kantenerkennung"
- Sub-text (#a0c4e8, 24pt): "Bis zu 20 Seiten · mehrseitiges PDF"
- Icon row (white 14pt): "📄 PDF · 📷 20 Seiten · ✂️ Auto-Zuschnitt"
```

---

### Screenshot 3 – Vorschau & Senden

**Nano Banana 2 Prompt:**
```
Device: iPhone 16 Pro, Natural Titanium, portrait.

Screen content:
- Navigation bar: #1a5c9a, "BESTÄTIGEN" uppercase bold white.
- Patient banner (full width, 16px margin): bg #dbe8f6, border 1px #9bbbd8, 4px radius.
  Label "PATIENT" 10pt uppercase #1a5c9a. Name "Mustermann, Max — ID: 12345" bold 16pt #1a2733.
- Badge left-aligned: bg #0d6ebd, 3px radius, "3 Seiten · PDF" white 12pt.
- Description field: label "BESCHREIBUNG" 11pt uppercase #5a6a7a. Input bg #f7f9fb, value "Eingescanntes Dokument".
- Document preview card: 1px #c5cdd5, 4px radius, shows clean scan of medical document.
- "Senden" button: full width #0d6ebd white text bold. Below: outlined "Erneut scannen" border #0d6ebd.

Marketing overlay:
- Background: gradient #1a5c9a → #0d3d6b.
- Headline (white bold 44pt): "Direkt in Ihr AIS"
- Sub-text (#dbe8f6, 24pt): "GDT-Rückmeldung automatisch erstellt"
- Badges: "🔒 Verschlüsselt · 📁 SMB · ✓ GDT 2.1" (white 13pt)
```

---

### Screenshot 4 – QR-Code-Scanner

**Nano Banana 2 Prompt:**
```
Device: iPhone 16 Pro, Natural Titanium, portrait.

Screen content:
- Full-screen dark camera view. Dynamic Island top center.
- Center: realistic QR code on white card, slightly tilted.
- White rounded-square corner brackets around QR code area.
- Blue scan line #0d6ebd crossing the QR code.
- Bottom: semi-transparent pill "Abbrechen" (rgba(0,0,0,0.6), white text).

Marketing overlay:
- Background: very dark #050f1a.
- Headline (white bold 44pt): "QR-Code scannen"
- Sub-text (#a0c4e8, 24pt): "Patientendaten sofort übernehmen"
- Format example (dark card #0d4474, 8px radius): monospace white 13pt: "12345;Mustermann;Max;01011980"
```

---

### Screenshot 5 – Einstellungen

**Nano Banana 2 Prompt:**
```
Device: iPhone 16 Pro, Natural Titanium, portrait.

Screen content:
- Navigation bar: #1a5c9a, "EINSTELLUNGEN" uppercase bold white, back-arrow.
- Background: #f0f2f5.
- Three SectionCards (bg white, 1px #c5cdd5 border, 4px radius):
  Card 1 "GDT-Ausgabe (AIS)" [expanded]: orange badge #FF9500 "→", body shows UNC path "\\192.168.1.10\praxis", username "praxisuser", password ●●●●●●.
  Card 2 "GDT-Eingang (AIS)" [collapsed, orange "←" badge].
  Card 3 "Oberfläche" [collapsed, blue #0d6ebd "☰" badge].
- Two buttons at bottom: "Verbindung testen" outlined #0d6ebd, "Einstellungen speichern" solid #0d6ebd.

Marketing overlay:
- Background: gradient #f0f2f5 (left) → #1a5c9a (right), subtle.
- Headline (#1a2733 bold 44pt): "Einmalig einrichten"
- Sub-text (#5a6a7a, 24pt): "SMB, GDT-Schnittstelle & Zugangsdaten"
- Bullets (14pt): "✓ Verschlüsselt · ✓ Verbindungstest · ✓ GDT ein & aus"
```

---

## 5. Nano Banana Einstellungen (iOS)

| Einstellung      | Wert                               |
|------------------|------------------------------------|
| Output-Größe     | 1290 × 2796 px                     |
| Export-Format    | PNG                                |
| Gerät            | iPhone 16 Pro, Natural Titanium    |
| Status Bar       | Dynamic Island sichtbar            |
| Schriftart       | SF Pro (oder Inter als Fallback)   |
| Device Shadow    | Dezent                             |
| Localization     | Deutsch (de-AT)                    |

> 1290×2796 px (iPhone 16 Pro Max) wird für alle iPhone-Größen akzeptiert.

---

## 6. iPad Screenshots – Nano Banana 2 Prompts (13" iPad Pro)

> Format: **2064 × 2752 px (iPad Pro 13", M4)** — Pflicht für App Store wenn iPad-Support angegeben.
> Gerät: **iPad Pro 13" M4**, Space Black, Landscape oder Portrait.

---

### iPad Screenshot 1 – Hauptscreen (Landscape)

**Nano Banana 2 Prompt:**
```
Device: iPad Pro 13-inch M4, color: Space Black, landscape orientation. Large 13-inch display, rounded corners, no home button, small centered TrueDepth camera bar top center (landscape camera pill). Ultra-wide screen.

Screen content (landscape two-column layout):
- Top navigation bar: solid #1a5c9a, white text "PATIENTENDATEN" centered uppercase bold 15pt. Right: white gear icon ⚙.
- Screen background: #f0f2f5.
- Content centered in a card (max-width 600px, white bg, 1px #c5cdd5 border, 8px radius, shadow-sm), vertically centered on screen.
- Inside card:
  - Two chips top (side-by-side, 8px gap):
    Left "QR-Code": bg #e3effc, border 1px #0d6ebd, text #0d6ebd bold 13pt, 4px radius.
    Right "GDT einlesen": bg #fff3e0, border 1px #e8910a, text #e8910a bold 13pt, 4px radius.
  - 4 form fields (label uppercase 11pt #5a6a7a, input bg #f7f9fb border 1px #c5cdd5 4px radius, 16pt text):
    "PATIENTEN-ID *" → "12345", "NACHNAME *" → "Mustermann",
    "VORNAME" → "Max", "GEBURTSDATUM (TTMMJJJJ)" → "01011980"
  - Divider 1px #c5cdd5.
  - Two action buttons in row: "Dokument scannen" bg #0d6ebd white text, "Bild erstellen" bg #2e8b57 white text. Bold 15pt, 4px radius, full card width split 50/50.

Marketing overlay:
- Background: dark navy gradient #0a2a4a (top) → #1a5c9a (bottom).
- Headline left of device (white bold 52pt): "Patientendaten in Sekunden laden"
- Sub-text (#a0c4e8, 26pt): "Per QR-Code, GDT oder manuell"
- Bottom badge (white pill): "✓ CGM MAXX · Turbomed · Medistar"
```

---

### iPad Screenshot 2 – Dokumentenscanner

**Nano Banana 2 Prompt:**
```
Device: iPad Pro 13-inch M4, Space Black, landscape orientation.

Screen content:
- Navigation bar: #1a5c9a, white back-arrow, "DOKUMENT SCANNEN" uppercase bold white centered.
- Large camera viewfinder filling the screen: dark realistic preview of an A4 document on a desk.
- Green corner brackets at document edges (automatic detection overlay), larger than phone variant.
- Circular capture button bottom-center: outer ring white 5px 96px, inner circle #0d6ebd 72px.

Marketing overlay:
- Background: deep navy #071a2e.
- Headline (white bold 52pt): "Automatische Kantenerkennung"
- Sub-text (#a0c4e8, 26pt): "Bis zu 20 Seiten · mehrseitiges PDF"
- Icon row (white 16pt): "📄 PDF · 📷 20 Seiten · ✂️ Auto-Zuschnitt"
```

---

### iPad Screenshot 3 – Vorschau & Senden

**Nano Banana 2 Prompt:**
```
Device: iPad Pro 13-inch M4, Space Black, landscape orientation.

Screen content (content centered card max-width 700px):
- Navigation bar: #1a5c9a, "BESTÄTIGEN" uppercase bold white.
- Patient banner: bg #dbe8f6, border 1px #9bbbd8, 4px radius. Label "PATIENT" #1a5c9a uppercase. Name "Mustermann, Max — ID: 12345" bold 16pt.
- Badge: bg #0d6ebd, "3 Seiten · PDF" white 13pt.
- Description label "BESCHREIBUNG" + input field value "Eingescanntes Dokument".
- Document preview card showing a clean scan of a medical document.
- "Senden" button: full card width, solid #0d6ebd, white bold. Below: outlined "Erneut scannen".

Marketing overlay:
- Background: gradient #1a5c9a → #0d3d6b.
- Headline (white bold 52pt): "Direkt in Ihr AIS"
- Sub-text (#dbe8f6, 26pt): "GDT-Rückmeldung automatisch erstellt"
- Badges: "🔒 Verschlüsselt · 📁 SMB · ✓ GDT 2.1" (white 14pt)
```

---

### iPad Screenshot 4 – Einstellungen

**Nano Banana 2 Prompt:**
```
Device: iPad Pro 13-inch M4, Space Black, landscape orientation.

Screen content (wide settings layout, cards side-by-side in two columns where possible):
- Navigation bar: #1a5c9a, "EINSTELLUNGEN" uppercase bold white.
- Background: #f0f2f5.
- Left column: SectionCard "GDT-Ausgabe (AIS)" [expanded, orange #FF9500 "→" badge]:
  UNC-path field "\\192.168.1.10\praxis", username "praxisuser", password ●●●●●●.
- Right column: SectionCard "GDT-Eingang (AIS)" [collapsed, orange "←" badge] stacked above SectionCard "Oberfläche" [collapsed, blue #0d6ebd "☰" badge].
- Bottom bar: "Verbindung testen" outlined #0d6ebd | "Einstellungen speichern" solid #0d6ebd.

Marketing overlay:
- Background: gradient #f0f2f5 (left) → #1a5c9a (right), subtle.
- Headline (#1a2733 bold 52pt): "Einmalig einrichten"
- Sub-text (#5a6a7a, 26pt): "SMB, GDT-Schnittstelle & Zugangsdaten"
- Bullets (16pt): "✓ Verschlüsselt · ✓ Verbindungstest · ✓ GDT ein & aus"
```

---

## 7. Nano Banana Einstellungen (iPad)

| Einstellung      | Wert                                      |
|------------------|-------------------------------------------|
| Output-Größe     | 2064 × 2752 px                            |
| Export-Format    | PNG                                       |
| Gerät            | iPad Pro 13-inch M4, Space Black          |
| Orientierung     | Landscape (bevorzugt) oder Portrait       |
| Status Bar       | Kamera-Pill oben, keine Uhrzeit           |
| Schriftart       | SF Pro (oder Inter als Fallback)          |
| Device Shadow    | Dezent                                    |
| Localization     | Deutsch (de-AT)                           |

> Apple verlangt mindestens 1 iPad-Screenshot wenn die App iPad-fähig ist.
> 2064×2752 px (iPad Pro 13" M4) wird für alle iPad-Größen akzeptiert.
