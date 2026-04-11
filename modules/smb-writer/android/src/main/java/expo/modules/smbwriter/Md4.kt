package expo.modules.smbwriter

/**
 * MD4 Hash-Implementierung (RFC 1320).
 * Benötigt für NTLMv2: NT-Hash = MD4(UTF-16LE(password))
 * Android JCA enthält kein MD4 — daher selbst implementiert.
 */
object Md4 {

  fun hash(input: ByteArray): ByteArray {
    // Padding: 1-Bit + 0-Bits + Länge (64-Bit LE)
    val msgLen = input.size
    val bitLen = msgLen.toLong() * 8L
    val padLen = ((55 - msgLen) % 64 + 64) % 64 + 1  // mind. 1, ergibt len ≡ 56 mod 64
    val padded = ByteArray(msgLen + padLen + 8)
    input.copyInto(padded)
    padded[msgLen] = 0x80.toByte()
    // Bit-Länge als 64-Bit Little-Endian
    for (i in 0..7) padded[msgLen + padLen + i] = ((bitLen ushr (8 * i)) and 0xFFL).toByte()

    // Initialisierungsvektor
    var a = 0x67452301.toInt()
    var b = 0xEFCDAB89.toInt()
    var c = 0x98BADCFEu.toInt()
    var d = 0x10325476.toInt()

    var i = 0
    while (i < padded.size) {
      val x = IntArray(16) { j -> leInt(padded, i + j * 4) }
      val aa = a; val bb = b; val cc = c; val dd = d

      // Runde 1
      a = r1(a, b, c, d, x[0],  3); d = r1(d, a, b, c, x[1],  7)
      c = r1(c, d, a, b, x[2], 11); b = r1(b, c, d, a, x[3], 19)
      a = r1(a, b, c, d, x[4],  3); d = r1(d, a, b, c, x[5],  7)
      c = r1(c, d, a, b, x[6], 11); b = r1(b, c, d, a, x[7], 19)
      a = r1(a, b, c, d, x[8],  3); d = r1(d, a, b, c, x[9],  7)
      c = r1(c, d, a, b, x[10],11); b = r1(b, c, d, a, x[11],19)
      a = r1(a, b, c, d, x[12], 3); d = r1(d, a, b, c, x[13], 7)
      c = r1(c, d, a, b, x[14],11); b = r1(b, c, d, a, x[15],19)

      // Runde 2
      a = r2(a, b, c, d, x[0],  3); d = r2(d, a, b, c, x[4],  5)
      c = r2(c, d, a, b, x[8],  9); b = r2(b, c, d, a, x[12],13)
      a = r2(a, b, c, d, x[1],  3); d = r2(d, a, b, c, x[5],  5)
      c = r2(c, d, a, b, x[9],  9); b = r2(b, c, d, a, x[13],13)
      a = r2(a, b, c, d, x[2],  3); d = r2(d, a, b, c, x[6],  5)
      c = r2(c, d, a, b, x[10], 9); b = r2(b, c, d, a, x[14],13)
      a = r2(a, b, c, d, x[3],  3); d = r2(d, a, b, c, x[7],  5)
      c = r2(c, d, a, b, x[11], 9); b = r2(b, c, d, a, x[15],13)

      // Runde 3
      a = r3(a, b, c, d, x[0],  3); d = r3(d, a, b, c, x[8],  9)
      c = r3(c, d, a, b, x[4], 11); b = r3(b, c, d, a, x[12],15)
      a = r3(a, b, c, d, x[2],  3); d = r3(d, a, b, c, x[10], 9)
      c = r3(c, d, a, b, x[6], 11); b = r3(b, c, d, a, x[14],15)
      a = r3(a, b, c, d, x[1],  3); d = r3(d, a, b, c, x[9],  9)
      c = r3(c, d, a, b, x[5], 11); b = r3(b, c, d, a, x[13],15)
      a = r3(a, b, c, d, x[3],  3); d = r3(d, a, b, c, x[11], 9)
      c = r3(c, d, a, b, x[7], 11); b = r3(b, c, d, a, x[15],15)

      a += aa; b += bb; c += cc; d += dd
      i += 64
    }

    val out = ByteArray(16)
    leBytes(a, out, 0); leBytes(b, out, 4)
    leBytes(c, out, 8); leBytes(d, out, 12)
    return out
  }

  // ─── Hilfsfunktionen ───────────────────────────────────────────────────

  private fun leInt(b: ByteArray, off: Int): Int =
    (b[off].toInt() and 0xFF) or
    ((b[off + 1].toInt() and 0xFF) shl 8) or
    ((b[off + 2].toInt() and 0xFF) shl 16) or
    ((b[off + 3].toInt() and 0xFF) shl 24)

  private fun leBytes(v: Int, b: ByteArray, off: Int) {
    b[off]     = (v and 0xFF).toByte()
    b[off + 1] = ((v ushr 8)  and 0xFF).toByte()
    b[off + 2] = ((v ushr 16) and 0xFF).toByte()
    b[off + 3] = ((v ushr 24) and 0xFF).toByte()
  }

  private fun rol(x: Int, n: Int): Int = (x shl n) or (x ushr (32 - n))

  private fun f(x: Int, y: Int, z: Int): Int = (x and y) or (x.inv() and z)
  private fun g(x: Int, y: Int, z: Int): Int = (x and y) or (x and z) or (y and z)
  private fun h(x: Int, y: Int, z: Int): Int = x xor y xor z

  private fun r1(a: Int, b: Int, c: Int, d: Int, xk: Int, s: Int): Int =
    rol(a + f(b, c, d) + xk, s)

  private fun r2(a: Int, b: Int, c: Int, d: Int, xk: Int, s: Int): Int =
    rol(a + g(b, c, d) + xk + 0x5A827999.toInt(), s)

  private fun r3(a: Int, b: Int, c: Int, d: Int, xk: Int, s: Int): Int =
    rol(a + h(b, c, d) + xk + 0x6ED9EBA1.toInt(), s)
}
