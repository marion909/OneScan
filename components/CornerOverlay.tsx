import { View, StyleSheet } from 'react-native';
import { Corners } from '../types/Corners';

interface Props {
  corners?: Corners;
  color?: string;
  size?: number;
  thickness?: number;
}

/**
 * Draws corner brackets at the four corners of the document overlay.
 * When `corners` is provided, renders at those exact positions.
 * When omitted, renders a fixed centered rectangle (useful as a scan guide).
 */
export default function CornerOverlay({ color = '#00FF99', size = 28, thickness = 3 }: Props) {
  const corner = { width: size, height: size, borderColor: color, borderWidth: thickness };

  return (
    <View style={styles.overlay} pointerEvents="none">
      {/* Top-left */}
      <View style={[styles.corner, styles.topLeft, { borderTopWidth: thickness, borderLeftWidth: thickness, borderColor: color, width: size, height: size }]} />
      {/* Top-right */}
      <View style={[styles.corner, styles.topRight, { borderTopWidth: thickness, borderRightWidth: thickness, borderColor: color, width: size, height: size }]} />
      {/* Bottom-left */}
      <View style={[styles.corner, styles.bottomLeft, { borderBottomWidth: thickness, borderLeftWidth: thickness, borderColor: color, width: size, height: size }]} />
      {/* Bottom-right */}
      <View style={[styles.corner, styles.bottomRight, { borderBottomWidth: thickness, borderRightWidth: thickness, borderColor: color, width: size, height: size }]} />
    </View>
  );
}

const MARGIN = 40;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    margin: MARGIN,
  },
  corner: {
    position: 'absolute',
  },
  topLeft: {
    top: 0,
    left: 0,
  },
  topRight: {
    top: 0,
    right: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
  },
});
