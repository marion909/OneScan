package expo.modules.documentdetector

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlin.math.*

class DocumentDetectorModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("DocumentDetector")

    AsyncFunction("detectCorners") Coroutine { base64Jpeg: String ->
      withContext(Dispatchers.Default) {
        detectDocumentCorners(base64Jpeg)
      }
    }
  }

  // ─── Hauptfunktion ───────────────────────────────────────────────────────

  private fun detectDocumentCorners(base64Jpeg: String): Map<String, Map<String, Double>> {
    val bytes = Base64.decode(base64Jpeg, Base64.DEFAULT)
    val original = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
      ?: return fallbackCorners()

    val origW = original.width
    val origH = original.height

    // Auf 640×480 skalieren für Performance
    val targetW = 640
    val targetH = 480
    val scaled = Bitmap.createScaledBitmap(original, targetW, targetH, true)
    original.recycle()

    val w = scaled.width
    val h = scaled.height
    val pixels = IntArray(w * h)
    scaled.getPixels(pixels, 0, w, 0, 0, w, h)
    scaled.recycle()

    // Pipeline: Graustufen → Blur → Sobel → NMS → Canny → Hough → Ecken
    val grey   = toGrayscale(pixels, w, h)
    val blurred = gaussianBlur(grey, w, h)
    val (magnitude, direction) = sobel(blurred, w, h)
    val suppressed = nonMaxSuppression(magnitude, direction, w, h)
    val edges  = cannyHysteresis(suppressed, w, h)
    val corners = houghAndFindCorners(edges, w, h)

    // Koordinaten normalisieren auf Originalgröße [0, 1]
    return mapOf(
      "topLeft"     to mapOf("x" to corners[0].first / origW.toDouble(), "y" to corners[0].second / origH.toDouble()),
      "topRight"    to mapOf("x" to corners[1].first / origW.toDouble(), "y" to corners[1].second / origH.toDouble()),
      "bottomRight" to mapOf("x" to corners[2].first / origW.toDouble(), "y" to corners[2].second / origH.toDouble()),
      "bottomLeft"  to mapOf("x" to corners[3].first / origW.toDouble(), "y" to corners[3].second / origH.toDouble()),
    )
  }

  // ─── Graustufenkonvertierung ──────────────────────────────────────────────

  private fun toGrayscale(pixels: IntArray, w: Int, h: Int): IntArray {
    val grey = IntArray(w * h)
    for (i in pixels.indices) {
      val px = pixels[i]
      val r  = (px shr 16) and 0xFF
      val g  = (px shr 8)  and 0xFF
      val b  =  px         and 0xFF
      grey[i] = (0.299 * r + 0.587 * g + 0.114 * b).toInt()
    }
    return grey
  }

  // ─── Gaussian Blur 5×5 ────────────────────────────────────────────────────

  private fun gaussianBlur(grey: IntArray, w: Int, h: Int): IntArray {
    val kernel = intArrayOf(1, 4, 7, 4, 1,
                            4,16,26,16, 4,
                            7,26,41,26, 7,
                            4,16,26,16, 4,
                            1, 4, 7, 4, 1)
    val kSum = 273
    val out  = IntArray(w * h)
    for (y in 2..(h - 3)) {
      for (x in 2..(w - 3)) {
        var acc = 0
        var ki  = 0
        for (ky in -2..2) {
          for (kx in -2..2) {
            acc += grey[(y + ky) * w + (x + kx)] * kernel[ki++]
          }
        }
        out[y * w + x] = acc / kSum
      }
    }
    return out
  }

  // ─── Sobel Kantendetektion ────────────────────────────────────────────────

  private fun sobel(grey: IntArray, w: Int, h: Int): Pair<IntArray, IntArray> {
    val mag  = IntArray(w * h)
    val dir  = IntArray(w * h) // in Grad 0-179
    for (y in 1..(h - 2)) {
      for (x in 1..(w - 2)) {
        val tl = grey[(y - 1) * w + (x - 1)]; val t = grey[(y - 1) * w + x]; val tr = grey[(y - 1) * w + (x + 1)]
        val ml = grey[y * w + (x - 1)];                                        val mr = grey[y * w + (x + 1)]
        val bl = grey[(y + 1) * w + (x - 1)]; val b = grey[(y + 1) * w + x]; val br = grey[(y + 1) * w + (x + 1)]

        val gx = -tl - 2 * ml - bl + tr + 2 * mr + br
        val gy = -tl - 2 * t  - tr + bl + 2 * b  + br

        mag[y * w + x] = min(255, abs(gx) + abs(gy))
        val angle = Math.toDegrees(atan2(gy.toDouble(), gx.toDouble())).toInt()
        dir[y * w + x] = ((angle + 180) % 180)
      }
    }
    return Pair(mag, dir)
  }

  // ─── Non-Maximum Suppression ──────────────────────────────────────────────

  private fun nonMaxSuppression(mag: IntArray, dir: IntArray, w: Int, h: Int): IntArray {
    val out = IntArray(w * h)
    for (y in 1..(h - 2)) {
      for (x in 1..(w - 2)) {
        val i = y * w + x
        val m = mag[i]
        val d = dir[i]
        val (n1, n2) = when {
          d < 22  || d >= 157 -> Pair(mag[i - 1], mag[i + 1])
          d < 67              -> Pair(mag[(y - 1) * w + (x + 1)], mag[(y + 1) * w + (x - 1)])
          d < 112             -> Pair(mag[(y - 1) * w + x], mag[(y + 1) * w + x])
          else                -> Pair(mag[(y - 1) * w + (x - 1)], mag[(y + 1) * w + (x + 1)])
        }
        out[i] = if (m >= n1 && m >= n2) m else 0
      }
    }
    return out
  }

  // ─── Canny Hysteresis ─────────────────────────────────────────────────────

  private fun cannyHysteresis(mag: IntArray, w: Int, h: Int): BooleanArray {
    val maxMag = mag.max() ?: 0
    val high   = (maxMag * 0.20).toInt()
    val low    = (maxMag * 0.10).toInt()
    val strong  = BooleanArray(w * h)
    val weak    = BooleanArray(w * h)
    for (i in mag.indices) {
      when {
        mag[i] >= high -> strong[i] = true
        mag[i] >= low  -> weak[i]   = true
      }
    }
    // Flood-Fill von starken Kanten auf schwache
    val edges = strong.copyOf()
    val stack = ArrayDeque<Int>()
    for (i in strong.indices) if (strong[i]) stack.add(i)
    while (stack.isNotEmpty()) {
      val idx = stack.removeLast()
      val y   = idx / w
      val x   = idx % w
      for (dy in -1..1) {
        for (dx in -1..1) {
          if (dy == 0 && dx == 0) continue
          val ny = y + dy; val nx = x + dx
          if (ny < 0 || ny >= h || nx < 0 || nx >= w) continue
          val ni = ny * w + nx
          if (weak[ni] && !edges[ni]) {
            edges[ni] = true
            stack.add(ni)
          }
        }
      }
    }
    return edges
  }

  // ─── Hough Transform + Eckpunktsuche ──────────────────────────────────────

  private fun houghAndFindCorners(edges: BooleanArray, w: Int, h: Int): List<Pair<Double, Double>> {
    val diag    = sqrt((w * w + h * h).toDouble()).toInt()
    val numTheta = 180
    val numRho   = 2 * diag + 1
    val acc      = Array(numTheta) { IntArray(numRho) }

    val cosT = DoubleArray(numTheta) { cos(Math.toRadians(it.toDouble())) }
    val sinT = DoubleArray(numTheta) { sin(Math.toRadians(it.toDouble())) }

    for (y in 0 until h) {
      for (x in 0 until w) {
        if (!edges[y * w + x]) continue
        for (t in 0 until numTheta) {
          val rho = (x * cosT[t] + y * sinT[t]).toInt() + diag
          if (rho in 0 until numRho) acc[t][rho]++
        }
      }
    }

    // Top-N Linien extrahieren (unterdrücke Nachbarpeaks)
    data class Line(val theta: Int, val rho: Int, val votes: Int)
    val lines = mutableListOf<Line>()
    val suppressed = Array(numTheta) { BooleanArray(numRho) }
    val maxLines = 20
    repeat(maxLines) {
      var bestVotes = 0; var bestT = 0; var bestR = 0
      for (t in 0 until numTheta) for (r in 0 until numRho) {
        if (!suppressed[t][r] && acc[t][r] > bestVotes) {
          bestVotes = acc[t][r]; bestT = t; bestR = r
        }
      }
      if (bestVotes < 20) return@repeat
      lines.add(Line(bestT, bestR - diag, bestVotes))
      // Nachbarschaft unterdrücken
      for (dt in -10..10) for (dr in -20..20) {
        val nt = (bestT + dt + numTheta) % numTheta
        val nr = bestR + dr
        if (nr in 0 until numRho) suppressed[nt][nr] = true
      }
    }

    // Schnittpunkte aller Linienpaare berechnen
    val intersections = mutableListOf<Pair<Double, Double>>()
    for (i in lines.indices) {
      for (j in i + 1 until lines.size) {
        val (t1, r1, _) = lines[i]
        val (t2, r2, _) = lines[j]
        val denom = cosT[t1] * sinT[t2] - sinT[t1] * cosT[t2]
        if (abs(denom) < 1e-10) continue
        val ix = (r1 * sinT[t2] - r2 * sinT[t1]) / denom
        val iy = (r2 * cosT[t1] - r1 * cosT[t2]) / denom
        if (ix in 0.0..(w.toDouble()) && iy in 0.0..(h.toDouble())) {
          intersections.add(Pair(ix, iy))
        }
      }
    }

    if (intersections.size < 4) return fallbackCornersScaled(w.toDouble(), h.toDouble())

    // Größtes Rechteck aus Schnittpunkten: 4 Ecken auswählen
    return selectQuadCorners(intersections, w.toDouble(), h.toDouble())
  }

  // ─── Eckpunktauswahl (größtes Rechteck) ──────────────────────────────────

  private fun selectQuadCorners(pts: List<Pair<Double, Double>>, w: Double, h: Double): List<Pair<Double, Double>> {
    // Finde topLeft, topRight, bottomRight, bottomLeft als Ecken des größten Rechtecks
    val cx = pts.map { it.first }.average()
    val cy = pts.map { it.second }.average()

    fun angle(p: Pair<Double, Double>) = atan2(p.second - cy, p.first - cx)

    // Cluster in 4 Quadranten (relativ zum Zentroid) und wähle äußersten Punkt pro Quadrant
    val tl = pts.filter { it.first < cx && it.second < cy }.minByOrNull { dist(it, 0.0, 0.0) }
    val tr = pts.filter { it.first >= cx && it.second < cy }.minByOrNull { dist(it, w, 0.0) }
    val br = pts.filter { it.first >= cx && it.second >= cy }.minByOrNull { dist(it, w, h) }
    val bl = pts.filter { it.first < cx && it.second >= cy }.minByOrNull { dist(it, 0.0, h) }

    return if (tl != null && tr != null && br != null && bl != null) {
      listOf(tl, tr, br, bl)
    } else {
      fallbackCornersScaled(w, h)
    }
  }

  private fun dist(p: Pair<Double, Double>, x: Double, y: Double): Double {
    return sqrt((p.first - x).pow(2) + (p.second - y).pow(2))
  }

  // ─── Fallback (wenn kein Dokument erkannt) ────────────────────────────────

  private fun fallbackCorners() = mapOf(
    "topLeft"     to mapOf("x" to 0.0, "y" to 0.0),
    "topRight"    to mapOf("x" to 1.0, "y" to 0.0),
    "bottomRight" to mapOf("x" to 1.0, "y" to 1.0),
    "bottomLeft"  to mapOf("x" to 0.0, "y" to 1.0),
  )

  private fun fallbackCornersScaled(w: Double, h: Double) = listOf(
    Pair(0.0, 0.0), Pair(w, 0.0), Pair(w, h), Pair(0.0, h)
  )
}
