import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import type { Corners } from '../types/Corners';

interface Props {
  corners: Corners | null;
  width: number;
  height: number;
}

/**
 * SVG-Overlay das erkannte Dokumentecken als grünes Polygon über der Kamera anzeigt.
 * Koordinaten sind normalisiert [0–1] und werden auf die Viewport-Größe skaliert.
 */
export default function CornerOverlay({ corners, width, height }: Props) {
  if (!corners) return null;

  const tl = corners.topLeft;
  const tr = corners.topRight;
  const br = corners.bottomRight;
  const bl = corners.bottomLeft;

  // Normalisierte Koordinaten → Pixel
  const points = [
    `${tl.x * width},${tl.y * height}`,
    `${tr.x * width},${tr.y * height}`,
    `${br.x * width},${br.y * height}`,
    `${bl.x * width},${bl.y * height}`,
  ].join(' ');

  // Prüfen ob Ecken einen sinnvollen Bereich abdecken (>10% der Fläche)
  const area = Math.abs(
    (tl.x - br.x) * (tl.y - br.y)
  );
  if (area < 0.01) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.container]} pointerEvents="none">
      <Svg width={width} height={height}>
        <Polygon
          points={points}
          fill="rgba(0, 200, 100, 0.15)"
          stroke="#00C864"
          strokeWidth={3}
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 10,
  },
});
