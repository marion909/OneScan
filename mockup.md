# OneScan – Mockup-Prompt für Nano Banana 2

---

## Prompt

Create a complete set of high-fidelity mobile UI mockups for a React Native Android app called **OneScan**. The app is used in German medical practices to scan documents and transfer them to a practice management system via SMB/GDT. The design should be clean, professional, and medical/clinical in feel — comparable to modern health-tech apps. Use a consistent design language across all screens.

**Design Direction:**
- Light theme, white/light gray backgrounds
- Primary accent: `#007AFF` (iOS-style blue) for main actions
- Secondary accent: `#FF9500` (orange) for GDT/import actions
- Neutral backgrounds: `#f5f5f5` (screen), `#ffffff` (inputs/cards)
- Text: `#333333` (primary), `#888888` (hints/secondary)
- Danger/cancel: subtle gray or outlined
- Border radius on inputs and buttons: ~8px
- Consistent padding: 24px horizontal
- Font: System default (clean sans-serif)

---

## Screen 1 – Splash Screen

**Full-screen centered layout, white background (`#ffffff`).**

- Centered app icon/logo (`splash-icon.png`) — use a document-scan icon with a subtle magnifier or checkmark overlay as placeholder
- App name **"OneScan"** below the icon in bold, size ~28px, dark text
- No other UI elements
- Status bar: light

---

## Screen 2 – Home Screen ("OneScan")

**Navigation header:** Title "OneScan", no back button.

**Scrollable content, background `#f5f5f5`, padding 24px:**

**1. Button Row (top, two buttons side by side, full width split 50/50):**
- Left button — **"QR-Code"**: filled, primary blue (`#007AFF`), white text, bold, ~14px
- Right button — **"GDT einlesen"**: filled, orange (`#FF9500`), white text, bold, ~14px
- Both buttons have equal width, rounded corners (~8px), height ~44px
- Small gap (8px) between the two buttons

**2. Form Fields (below the button row, labeled inputs):**

Each field follows the pattern: `Label text` (13px, `#333`, marginBottom 4px) → `TextInput` (white background, border `#ccc`, border-radius 8px, padding 12px, 16px text)

- **"Patienten-ID \*"** — placeholder: `z.B. 123456`, numeric keyboard hint (show `123` keyboard icon subtly)
- **"Nachname \*"** — placeholder: `Mustermann`
- **"Vorname"** — placeholder: `Max`
- **"Geburtsdatum (TTMMJJJJ)"** — placeholder: `01011980`, numeric keyboard hint

**3. Primary Action Button:**
- **"Dokument scannen"** — large, full-width, filled primary blue (`#007AFF`), white bold text, ~18px, height ~54px, rounded 8px, marginTop 32px

**4. Secondary Button:**
- **"Einstellungen"** — full-width, outlined (border `#ccc`, transparent fill), dark text, ~16px, height ~44px, marginTop 12px

---

## Screen 2b – Home Screen (State: QR Scanner Modal)

**Full-screen modal overlaid on top of Home Screen.**

- Camera viewfinder fills the entire screen (dark live preview)
- Subtle dark semi-transparent overlay with a centered square cutout (QR scan zone), with rounded corners and thin white border
- **"Abbrechen"** button: bottom-center, white/semi-transparent background, dark text, rounded pill shape, padding 14px 32px

---

## Screen 3 – Scan Screen ("Scannen")

**Transitional screen shown briefly while native document scanner launches.**

- Full black background (`#000`)
- Centered: white text **"Scanner wird gestartet"**, ~16px, regular weight
- Subtle `ActivityIndicator` (white) below the text
- Navigation header: "Scannen", back button visible (labeled "Zurück")

---

## Screen 4 – Confirm Screen ("Bestätigen")

**Navigation header:** "Bestätigen", back button "Zurück".

**Scrollable content, background `#f5f5f5`, padding 16px, items centered:**

**1. Patient Info Bar:**
- Text: `Mustermann, Max — 123456`
- Style: 16px, semibold (600), `#333`, centered, marginBottom 12px

**2. Document Preview:**
- Full-width image preview (scanned document), height ~480px
- Rounded corners 8px, light gray background (`#e0e0e0`) as placeholder
- Shows the scanned document page

**3. Action Buttons (stacked, full width):**
- **"Senden"** — large primary button, filled blue (`#007AFF`), white bold text ~18px, height 54px, rounded 8px
- **"Erneut scannen"** — secondary/cancel button, outlined or light gray fill, dark text ~16px, height 44px, rounded 8px, marginTop 12px

**Loading State (replaces buttons while sending):**
- `ActivityIndicator` large, blue (`#007AFF`), centered

---

## Screen 5 – Settings Screen ("Einstellungen")

**Navigation header:** "Einstellungen", back button "Zurück".

**Scrollable content, background `#f5f5f5`, padding 24px:**

---

### Section: GDT-Ausgabe (AIS)
- **Section Title:** "GDT-Ausgabe (AIS)" — 18px, bold (700), `#333`, marginTop 32px
- **Section Hint:** "Zielordner für gescannte Dokumente und GDT-Rückmeldungen." — 13px, `#888`, marginBottom 4px

Fields:
- **"Ausgabe-Pfad (UNC) \*"** → input, placeholder: `\\server\freigabe`
- **"Benutzername \*"** → input, placeholder: `Benutzer`
- **"Passwort"** → input, obscured (dots), placeholder: `Passwort`, show an eye-toggle icon on the right
- **"Domain (optional)"** → input, placeholder: `WORKGROUP`

---

### Section: GDT-Eingang (AIS)
- **Section Title:** "GDT-Eingang (AIS)" — same style as above
- **Section Hint:** "Quelldatei mit Patientendaten aus dem AIS." — same style

Fields:
- **"Ordner-Pfad (UNC)"** → input, placeholder: `\\server\freigabe\gdt`
- **"Dateiname"** → input, placeholder: `TURBO.GDT`

---

### Section: Demo-Modus
- **Section Title:** "Demo-Modus" — same style

Row:
- Left: label "Demo-Modus aktivieren" — 15px, `#333`
- Right: `Switch` toggle — track color off: `#cccccc`, track color on: `#FF9500`, thumb white

Conditional hint (visible when switch is ON):
- Text: "Aktiv: QR-Scan und GDT-Einlesen liefern Testdaten. Es werden keine Dateien übertragen." — 13px, `#FF9500` or amber warning style, light amber background container, rounded 6px

---

### Action Buttons (bottom of scroll):
- **"Einstellungen speichern"** — full-width, filled blue (`#007AFF`), white bold text ~16px, height 50px, rounded 8px, marginTop 32px
- **"Verbindung testen"** — full-width, outlined (border `#007AFF`, blue text), transparent fill, ~16px, height 46px, rounded 8px, marginTop 12px

**Loading State (replaces both buttons):**
- `ActivityIndicator` large, blue (`#007AFF`), centered

---

## Additional Notes for the Designer

- All screens are **portrait orientation only**
- Device frame: modern Android phone (e.g. Pixel 8 proportions)
- Show all screens at the same scale in a single overview layout
- Include both the **normal state** and at least one **loading/active state** for screens 2, 4, and 5
- Screen 2b (QR modal) should be shown as an overlay/inset variant of Screen 2
- Use realistic German placeholder data throughout:
  - Patient: `Müller, Anna — 74523`
  - Birthdate: `15061975`
  - SMB path: `\\praxis-server\scans`
  - Username: `praxis`
  - GDT file: `TURBO.GDT`
