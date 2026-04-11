# App-Icon Beschreibung für KI-Bildgenerierung

## Prompt (Englisch — für DALL·E, Midjourney, Stable Diffusion etc.)

> A clean, modern mobile app icon for a medical document scanning app called "OneScan".
> The icon features a stylized white document with rounded corners, slightly tilted at a 5–10 degree angle, centered on the icon.
> On the document, four small glowing corner markers (bright cyan or #00C864 green) highlight the edges, suggesting automatic document corner detection.
> A subtle QR code symbol is partially visible in the upper-left area of the document.
> The background is a deep, professional dark blue gradient (#0A2540 to #1A3A6B), giving it a trustworthy medical/enterprise feel.
> The overall style is flat design with very subtle soft shadows — no gradients on the document itself, just clean white.
> The corner markers emit a faint glow effect.
> The icon should look great at 1024×1024 px and scale down well to 57×57 px.
> No text, no letters on the icon itself.
> Style reference: iOS/Android system app icon, similar aesthetic to medical or productivity apps.

---

## Beschreibung (Deutsch)

**Konzept:** Medizinischer Dokumenten-Scanner mit automatischer Eckerkennung

**Hintergrund:**
- Tiefes Dunkelblau, leichter Farbverlauf von `#0A2540` nach `#1A3A6B`
- Wirkt professionell und vertrauenswürdig (Medizin / Praxis-Software)

**Hauptelement — Dokument:**
- Weißes, leicht abgerundetes Rechteck (Seitenverhältnis DIN A4-ähnlich)
- 5–10° geneigt, zentriert im Icon
- Flaches Design, kein Verlauf — reines Weiß `#FFFFFF`
- Subtiler Schlagschatten nach unten-rechts

**Eckerkennung-Marker:**
- An allen vier Ecken des Dokuments: kleine leuchtende Kreise oder L-förmige Klammern
- Farbe: leuchtendes Grün `#00C864` oder helles Cyan `#00D4FF`
- Leichter Glow-Effekt (Blur-Radius ~8 px)
- Symbolisieren die automatische Dokumenterkennung der App

**QR-Code-Element:**
- Kleines, vereinfachtes QR-Code-Symbol oben links auf dem Dokument
- Hellgrau `#CCCCCC`, dezent — kein dominantes Element

**Stil:**
- Flat Design, iOS/Android System-App-Ästhetik
- Keine Texte, keine Beschriftungen
- Funktioniert als 1024×1024 px und als 57×57 px gleichermaßen gut

---

## Farbpalette

| Element | Farbe | Hex |
|---|---|---|
| Hintergrund oben | Dunkelblau | `#0A2540` |
| Hintergrund unten | Mittelblau | `#1A3A6B` |
| Dokument | Weiß | `#FFFFFF` |
| Eckenmarker | Grün/Cyan | `#00C864` |
| QR-Code | Hellgrau | `#CCCCCC` |
| Schatten | Schwarz, 20 % Opazität | `#00000033` |

---

## Maße & Export

- Canvas: **1024 × 1024 px**
- Eckenradius (Icon-Form): **230 px** (iOS-Norm) — wird vom Betriebssystem automatisch maskiert
- Kein Alpha-Kanal, **kein transparenter Hintergrund** (Expo erwartet `icon.png` ohne Transparenz)
- Format: **PNG**, 32-Bit
- Dateiname: `icon.png` → ablegen in `assets/icon.png`
- Zusätzlich `adaptive-icon.png` (1024 × 1024, nur das weiße Dokument mit Eck-Markern, kein Hintergrund) für Android Adaptive Icons
