package expo.modules.smbwriter

import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.InputStream
import java.io.OutputStream
import java.net.InetAddress
import java.net.Socket
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.charset.StandardCharsets
import java.security.SecureRandom
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

class SmbWriterModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SmbWriter")

    AsyncFunction("testConnection") Coroutine { uncPath: String, username: String, password: String, domain: String ->
      withContext(Dispatchers.IO) {
        SmbClient(uncPath, username, password, domain).testConnection()
      }
    }

    AsyncFunction("writeFiles") Coroutine {
      uncPath: String, username: String, password: String, domain: String,
      jpegBase64: String, gdtBase64: String, jpegFileName: String, gdtFileName: String ->
      withContext(Dispatchers.IO) {
        val jpegBytes = Base64.decode(jpegBase64, Base64.DEFAULT)
        val gdtBytes  = Base64.decode(gdtBase64,  Base64.DEFAULT)
        SmbClient(uncPath, username, password, domain).writeFiles(
          jpegBytes, gdtBytes, jpegFileName, gdtFileName
        )
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  SMB2 Client
// ═══════════════════════════════════════════════════════════════════════════

private class SmbClient(
  private val uncPath: String,
  private val username: String,
  private val password: String,
  private val domain: String
) {
  // UNC-Pfad parsen: \\server\share\optionalSubPath
  private val parsed  = parseUncPath(uncPath)
  private val server  = parsed.first
  private val share   = parsed.second
  private val subPath = parsed.third

  private var messageId  = 1L
  private var sessionId  = 0L
  private var treeId     = 0
  private val rng        = SecureRandom()

  // ─── Öffentliche API ───────────────────────────────────────────────────

  fun testConnection(): Boolean {
    return try {
      Socket(InetAddress.getByName(server), 445).use { socket ->
        socket.soTimeout = 10_000
        val inp = socket.getInputStream()
        val out = socket.getOutputStream()
        negotiate(inp, out)
        sessionSetup(inp, out)
        treeConnect(inp, out)
        true
      }
    } catch (e: Exception) {
      false
    }
  }

  fun writeFiles(
    jpegBytes: ByteArray, gdtBytes: ByteArray,
    jpegFileName: String, gdtFileName: String
  ) {
    Socket(InetAddress.getByName(server), 445).use { socket ->
      socket.soTimeout = 30_000
      val inp = socket.getInputStream()
      val out = socket.getOutputStream()

      negotiate(inp, out)
      sessionSetup(inp, out)
      treeConnect(inp, out)

      val jpegPath = if (subPath.isNotEmpty()) "$subPath\\$jpegFileName" else jpegFileName
      val gdtPath  = if (subPath.isNotEmpty()) "$subPath\\$gdtFileName"  else gdtFileName

      writeFile(inp, out, jpegPath, jpegBytes)
      writeFile(inp, out, gdtPath,  gdtBytes)
    }
  }

  // ─── SMB2 Negotiate ───────────────────────────────────────────────────

  private fun negotiate(inp: InputStream, out: OutputStream) {
    val clientGuid = ByteArray(16).also { rng.nextBytes(it) }
    val body = buildNegotiateRequest(clientGuid)
    sendSmb2(out, 0x0000, body)
    val resp = recvSmb2(inp)
    checkStatus(resp, "Negotiate")
    // Server-SPNEGO-Token aus Negotiate-Response ignorieren (NTLM wird direkt in SessionSetup eingebettet)
  }

  private fun buildNegotiateRequest(clientGuid: ByteArray): ByteArray {
    val buf = ByteBuffer.allocate(36 + 2).order(ByteOrder.LITTLE_ENDIAN)
    buf.putShort(36)           // StructureSize
    buf.putShort(1)            // DialectCount
    buf.putShort(1)            // SecurityMode: signing enabled
    buf.putShort(0)            // Reserved
    buf.putInt(0)              // Capabilities
    buf.put(clientGuid)        // ClientGuid (16 bytes)
    buf.putLong(0)             // ClientStartTime
    buf.putShort(0x0202)       // Dialect: SMB 2.0.2
    return buf.array()
  }

  // ─── SMB2 Session Setup (NTLMv2) ─────────────────────────────────────

  private fun sessionSetup(inp: InputStream, out: OutputStream) {
    // Runde 1: NTLM NEGOTIATE_MESSAGE
    val ntlmNeg = buildNtlmNegotiateMessage()
    val spnego1  = wrapInSpnego(ntlmNeg)
    val req1     = buildSessionSetupRequest(spnego1)
    sendSmb2(out, 0x0001, req1)
    val resp1 = recvSmb2(inp)

    // STATUS_MORE_PROCESSING_REQUIRED (0xC0000016) erwartet
    val status1 = readLeInt(resp1, 8)
    if (status1 != -0x3FFFFFE9 /* 0xC0000016 unsigned */) {
      val statusStr = "0x${Integer.toHexString(status1)}"
      // Toleriere auch STATUS_SUCCESS falls Server kein NTLM benötigt
      if (status1 != 0) throw RuntimeException("SessionSetup R1 unexpected status: $statusStr")
    }
    sessionId = readLeLong(resp1, 40)

    // NTLM Challenge aus Response extrahieren
    val spnegoResp = extractSecurityBuffer(resp1)
    val challenge  = extractNtlmChallenge(spnegoResp)

    // Runde 2: NTLM AUTHENTICATE_MESSAGE mit NTLMv2-Response
    val ntlmAuth = buildNtlmAuthenticateMessage(challenge)
    val spnego2  = wrapNtlmAuth(ntlmAuth)
    val req2     = buildSessionSetupRequest(spnego2)
    sendSmb2(out, 0x0001, req2, sessionId = sessionId)
    val resp2 = recvSmb2(inp)
    checkStatus(resp2, "SessionSetup R2")
  }

  private fun buildNtlmNegotiateMessage(): ByteArray {
    val flags = 0xE2088297.toInt()  // Unicode + NTLM2 + ExtSecurity + etc.
    val buf = ByteBuffer.allocate(32).order(ByteOrder.LITTLE_ENDIAN)
    buf.put("NTLMSSP\u0000".toByteArray(StandardCharsets.US_ASCII))
    buf.putInt(1)        // MessageType: NEGOTIATE
    buf.putInt(flags)
    buf.putShort(0); buf.putShort(0); buf.putInt(0)  // DomainNameFields
    buf.putShort(0); buf.putShort(0); buf.putInt(0)  // WorkstationFields
    return buf.array()
  }

  private fun buildNtlmAuthenticateMessage(challenge: NtlmChallenge): ByteArray {
    val clientNonce = ByteArray(8).also { rng.nextBytes(it) }
    val timestamp   = windowsTimestamp()

    // NT-Hash = MD4(UTF-16LE(password))
    val passBytes   = password.toByteArray(StandardCharsets.UTF_16LE)
    val ntHash      = Md4.hash(passBytes)

    // ResponseKeyNT = HMAC_MD5(ntHash, UTF-16LE(UPPER(username) + domain))
    val userDomain  = (username.uppercase() + domain).toByteArray(StandardCharsets.UTF_16LE)
    val responseKeyNT = hmacMd5(ntHash, userDomain)

    // Blob bauen
    val avPairs     = challenge.targetInfo
    val blobFixed   = ByteArray(28).also { b ->
      b[0] = 1; b[1] = 1  // RespType, HiRespType
      // 2 bytes reserved, 4 bytes reserved = 0
      leBytes8(timestamp, b, 8)
      clientNonce.copyInto(b, 16)
      // 4 bytes reserved = 0
    }
    val blob = blobFixed + avPairs + byteArrayOf(0, 0, 0, 0)

    // NTProofStr = HMAC_MD5(responseKeyNT, serverChallenge || blob)
    val ntProofStr   = hmacMd5(responseKeyNT, challenge.serverChallenge + blob)
    val ntResponse   = ntProofStr + blob

    // LMv2 Response (vereinfacht — 24 Byte, häufig ignoriert)
    val lmResponse   = hmacMd5(responseKeyNT, challenge.serverChallenge + clientNonce) + clientNonce

    // Strings
    val userBytes    = username.toByteArray(StandardCharsets.UTF_16LE)
    val domainBytes  = domain.toByteArray(StandardCharsets.UTF_16LE)
    val workstation  = "ONESCAN".toByteArray(StandardCharsets.UTF_16LE)

    // Offsets berechnen
    val flags       = 0xA2888205.toInt()
    val headerSize  = 72  // StructureSize eines AUTHENTICATE_MESSAGE Headers
    val lmOff       = headerSize
    val ntOff       = lmOff + lmResponse.size
    val domainOff   = ntOff + ntResponse.size
    val userOff     = domainOff + domainBytes.size
    val wsOff       = userOff + userBytes.size
    val totalSize   = wsOff + workstation.size

    val buf = ByteBuffer.allocate(totalSize).order(ByteOrder.LITTLE_ENDIAN)
    buf.put("NTLMSSP\u0000".toByteArray(StandardCharsets.US_ASCII))
    buf.putInt(3)  // MessageType: AUTHENTICATE

    // LmChallengeResponseFields
    putSecBuf(buf, lmResponse.size, lmOff)
    // NtChallengeResponseFields
    putSecBuf(buf, ntResponse.size, ntOff)
    // DomainNameFields
    putSecBuf(buf, domainBytes.size, domainOff)
    // UserNameFields
    putSecBuf(buf, userBytes.size, userOff)
    // WorkstationFields
    putSecBuf(buf, workstation.size, wsOff)
    // EncryptedRandomSessionKeyFields (leer)
    buf.putShort(0); buf.putShort(0); buf.putInt(wsOff + workstation.size)
    // NegotiateFlags
    buf.putInt(flags)
    // Version (8 Bytes — optional, mit 0 füllen)
    buf.put(ByteArray(8))
    // MIC (16 Bytes — 0, nicht berechnet für Einfachheit)
    buf.put(ByteArray(16))

    // Payloads
    buf.put(lmResponse)
    buf.put(ntResponse)
    buf.put(domainBytes)
    buf.put(userBytes)
    buf.put(workstation)

    return buf.array()
  }

  // ─── SPNEGO-Wrapper ───────────────────────────────────────────────────

  private fun wrapInSpnego(ntlmToken: ByteArray): ByteArray {
    // SPNEGO NegTokenInit mit NTLMSSP-OID
    val ntlmOid = byteArrayOf(
      0x06, 0x0A,  // OID Tag + Length 10
      0x2B.toByte(), 0x06, 0x01, 0x04.toByte(), 0x01.toByte(),
      0x82.toByte(), 0x37, 0x02, 0x02, 0x0A
    )
    val mechList = asnSequence(ntlmOid)
    val mechToken = asnContextual(2, asnOctetString(ntlmToken))
    val negTokenInit = asnSequence(asnContextual(0, mechList) + mechToken)
    val spnegoOid = byteArrayOf(
      0x06, 0x06, 0x2B, 0x06, 0x01, 0x05, 0x05, 0x02  // SPNEGO OID 1.3.6.1.5.5.2
    )
    return asnContextual(0, spnegoOid + asnContextual(0, negTokenInit))
  }

  private fun wrapNtlmAuth(ntlmToken: ByteArray): ByteArray {
    // SPNEGO NegTokenResp
    val responseToken = asnContextual(2, asnOctetString(ntlmToken))
    val negTokenResp  = asnSequence(responseToken)
    return asnContextual(1, negTokenResp)
  }

  // DER ASN.1 Hilfsfunktionen
  private fun asnLen(len: Int): ByteArray = when {
    len < 128 -> byteArrayOf(len.toByte())
    len < 256 -> byteArrayOf(0x81.toByte(), len.toByte())
    else      -> byteArrayOf(0x82.toByte(), (len shr 8).toByte(), (len and 0xFF).toByte())
  }
  private fun asnTlv(tag: Byte, content: ByteArray) = byteArrayOf(tag) + asnLen(content.size) + content
  private fun asnSequence(content: ByteArray)        = asnTlv(0x30, content)
  private fun asnOctetString(content: ByteArray)     = asnTlv(0x04, content)
  private fun asnContextual(ctx: Int, content: ByteArray) = asnTlv((0xA0 or ctx).toByte(), content)

  // ─── NTLM Challenge parsen ────────────────────────────────────────────

  private fun extractSecurityBuffer(smb2Resp: ByteArray): ByteArray {
    // Session Setup Response: Header(64) + StructureSize(2) + SessionFlags(2) + SecBufOffset(2) + SecBufLen(2)
    val offset = readLeShort(smb2Resp, 64 + 4).toInt()
    val length = readLeShort(smb2Resp, 64 + 6).toInt()
    if (offset <= 0 || length <= 0 || offset + length > smb2Resp.size) return byteArrayOf()
    return smb2Resp.copyOfRange(offset, offset + length)
  }

  data class NtlmChallenge(val serverChallenge: ByteArray, val targetInfo: ByteArray)

  private fun extractNtlmChallenge(spnegoResp: ByteArray): NtlmChallenge {
    // NTLMSSP-Token innerhalb SPNEGO suchen
    val sig = "NTLMSSP\u0000".toByteArray(StandardCharsets.US_ASCII)
    var ntlmOffset = -1
    for (i in 0..spnegoResp.size - sig.size) {
      if (spnegoResp.copyOfRange(i, i + sig.size).contentEquals(sig)) {
        ntlmOffset = i; break
      }
    }
    if (ntlmOffset < 0) throw RuntimeException("NTLM Challenge not found in SPNEGO response")
    val ntlm = spnegoResp.copyOfRange(ntlmOffset, spnegoResp.size)

    // ServerChallenge bei Offset 24 (8 Bytes)
    val serverChallenge = ntlm.copyOfRange(24, 32)
    // TargetInfoFields bei Offset 40: len(2), maxLen(2), offset(4)
    val tiLen = readLeShort(ntlm, 40).toInt()
    val tiOff = readLeInt(ntlm, 44) - ntlmOffset
    val targetInfo = if (tiLen > 0 && tiOff + tiLen <= ntlm.size)
      ntlm.copyOfRange(tiOff, tiOff + tiLen) else byteArrayOf()
    return NtlmChallenge(serverChallenge, targetInfo)
  }

  // ─── SMB2 Tree Connect ────────────────────────────────────────────────

  private fun treeConnect(inp: InputStream, out: OutputStream) {
    val path  = "\\\\$server\\$share".toByteArray(StandardCharsets.UTF_16LE)
    val buf   = ByteBuffer.allocate(9 + path.size).order(ByteOrder.LITTLE_ENDIAN)
    buf.putShort(9)                    // StructureSize
    buf.putShort(0)                    // Reserved
    buf.putShort((64 + 8).toShort())   // PathOffset (nach Header + 8 Byte Body)
    buf.putShort(path.size.toShort())  // PathLength
    buf.put(path)
    sendSmb2(out, 0x0003, buf.array(), sessionId = sessionId)
    val resp = recvSmb2(inp)
    checkStatus(resp, "TreeConnect")
    treeId = readLeInt(resp, 36)
  }

  // ─── SMB2 Create / Write / Close ─────────────────────────────────────

  private fun writeFile(inp: InputStream, out: OutputStream, filePath: String, data: ByteArray) {
    val nameBytes = filePath.toByteArray(StandardCharsets.UTF_16LE)
    val createBuf = ByteBuffer.allocate(57 + nameBytes.size).order(ByteOrder.LITTLE_ENDIAN)
    createBuf.putShort(57)                         // StructureSize
    createBuf.put(0)                               // SecurityFlags
    createBuf.put(0)                               // RequestedOplockLevel: NONE
    createBuf.putInt(0)                            // ImpersonationLevel
    createBuf.putLong(0); createBuf.putLong(0)     // SmbCreateFlags, Reserved
    createBuf.putInt(0x00120116)                   // DesiredAccess: Write + Sync
    createBuf.putInt(0)                            // FileAttributes: normal
    createBuf.putInt(0x00000007)                   // ShareAccess: Read|Write|Delete
    createBuf.putInt(0x00000005)                   // CreateDisposition: FILE_OVERWRITE_IF
    createBuf.putInt(0x00000060)                   // CreateOptions: SYNC_IO + NON_DIR
    createBuf.putShort((64 + 56).toShort())        // NameOffset
    createBuf.putShort(nameBytes.size.toShort())   // NameLength
    createBuf.putInt(0)                            // CreateContextsOffset
    createBuf.putInt(0)                            // CreateContextsLength
    createBuf.put(nameBytes)

    sendSmb2(out, 0x0005, createBuf.array(), sessionId = sessionId, treeId = treeId)
    val createResp = recvSmb2(inp)
    checkStatus(createResp, "Create")
    // FileId bei Offset 64+4+16+8 = 92 (nach Header + StructureSize + OplockLevel + Flags + FileAttributes + ...) → korrekter Offset: 64+4 = 68 → StructureSize(2)+OplockLevel(1)+reserved(1)+FlagsReserved(8)+CreateAction(4)+CreationTime(8)+LastAccessTime(8)+LastWriteTime(8)+ChangeTime(8)+AllocationSize(8)+EndofFile(8)+FileAttributes(4)+Reserved2(4) = 72 Bytes nach Header → FileId @ 64+72 = 136? Nein, korrekt: Header(64) + StructureSize(2) + OplockLevel(1) + Flag(1) + CreateAction(4) + CreationTime(8)*4 + AllocationSize(8) + EndOfFile(8) + FileAttributes(4) + Reserved2(4) = 64+2+1+1+4+32+8+8+4+4 = 128 → FileId @128
    val fileId = createResp.copyOfRange(128, 144)

    // WRITE
    val writeBuf = ByteBuffer.allocate(49).order(ByteOrder.LITTLE_ENDIAN)
    writeBuf.putShort(49)                          // StructureSize
    writeBuf.putShort((64 + 48).toShort())         // DataOffset (Header + Write Body)
    writeBuf.putInt(data.size)                     // Length
    writeBuf.putLong(0)                            // Offset in file
    writeBuf.put(fileId)                           // FileId (16 bytes)
    writeBuf.putInt(0)                             // Channel
    writeBuf.putInt(0)                             // RemainingBytes
    writeBuf.putShort(0); writeBuf.putShort(0)     // WriteChannelInfoOffset/Length
    writeBuf.putInt(0)                             // Flags
    val writeBody = writeBuf.array() + data

    sendSmb2(out, 0x0009, writeBody, sessionId = sessionId, treeId = treeId)
    val writeResp = recvSmb2(inp)
    checkStatus(writeResp, "Write")

    // CLOSE
    val closeBuf = ByteBuffer.allocate(24).order(ByteOrder.LITTLE_ENDIAN)
    closeBuf.putShort(24)   // StructureSize
    closeBuf.putShort(0)    // Flags
    closeBuf.putInt(0)      // Reserved
    closeBuf.put(fileId)    // FileId
    sendSmb2(out, 0x000E, closeBuf.array(), sessionId = sessionId, treeId = treeId)
    val closeResp = recvSmb2(inp)
    checkStatus(closeResp, "Close")
  }

  // ─── SMB2 Sende/Empfange-Primitiven ──────────────────────────────────

  private fun sendSmb2(
    out: OutputStream,
    command: Int,
    body: ByteArray,
    sessionId: Long = 0,
    treeId: Int = 0
  ) {
    val mid = messageId++
    val header = ByteBuffer.allocate(64).order(ByteOrder.LITTLE_ENDIAN)
    header.put(byteArrayOf(0xFE.toByte(), 0x53, 0x4D, 0x42))  // ProtocolId
    header.putShort(64)        // StructureSize
    header.putShort(1)         // CreditCharge
    header.putInt(0)           // Status/Channel
    header.putShort(command.toShort())  // Command
    header.putShort(1)         // CreditRequest
    header.putInt(0)           // Flags
    header.putInt(0)           // NextCommand
    header.putLong(mid)        // MessageId
    header.putInt(0)           // Reserved
    header.putInt(treeId)      // TreeId
    header.putLong(sessionId)  // SessionId
    header.put(ByteArray(16))  // Signature (zeros — no signing)

    val packet = header.array() + body
    // NetBIOS framing: 4 Byte big-endian Länge
    val frame = ByteArray(4 + packet.size)
    frame[0] = 0
    frame[1] = (packet.size shr 16).toByte()
    frame[2] = (packet.size shr 8).toByte()
    frame[3] = (packet.size and 0xFF).toByte()
    packet.copyInto(frame, 4)
    out.write(frame)
    out.flush()
  }

  private fun recvSmb2(inp: InputStream): ByteArray {
    // NetBIOS-Header (4 Bytes)
    val nbHeader = ByteArray(4)
    readFully(inp, nbHeader)
    val length = ((nbHeader[1].toInt() and 0xFF) shl 16) or
                 ((nbHeader[2].toInt() and 0xFF) shl 8)  or
                  (nbHeader[3].toInt() and 0xFF)
    val data = ByteArray(length)
    readFully(inp, data)
    return data
  }

  private fun readFully(inp: InputStream, buf: ByteArray) {
    var off = 0
    while (off < buf.size) {
      val n = inp.read(buf, off, buf.size - off)
      if (n < 0) throw RuntimeException("Connection closed by server")
      off += n
    }
  }

  // ─── Kryptographie (HMAC-MD5 via JCA) ────────────────────────────────

  private fun hmacMd5(key: ByteArray, data: ByteArray): ByteArray {
    val mac = Mac.getInstance("HmacMD5")
    mac.init(SecretKeySpec(key, "HmacMD5"))
    return mac.doFinal(data)
  }

  // ─── Hilfsfunktionen ─────────────────────────────────────────────────

  private fun readLeInt(b: ByteArray, off: Int): Int =
    (b[off].toInt() and 0xFF) or
    ((b[off + 1].toInt() and 0xFF) shl 8) or
    ((b[off + 2].toInt() and 0xFF) shl 16) or
    ((b[off + 3].toInt() and 0xFF) shl 24)

  private fun readLeLong(b: ByteArray, off: Int): Long =
    (readLeInt(b, off).toLong() and 0xFFFFFFFFL) or (readLeInt(b, off + 4).toLong() shl 32)

  private fun readLeShort(b: ByteArray, off: Int): Short =
    ((b[off].toInt() and 0xFF) or ((b[off + 1].toInt() and 0xFF) shl 8)).toShort()

  private fun leBytes8(v: Long, b: ByteArray, off: Int) {
    for (i in 0..7) b[off + i] = ((v ushr (8 * i)) and 0xFFL).toByte()
  }

  private fun putSecBuf(buf: ByteBuffer, len: Int, offset: Int) {
    buf.putShort(len.toShort()); buf.putShort(len.toShort()); buf.putInt(offset)
  }

  /** Windows FILETIME: Nanosekunden seit 1. Januar 1601, in 100ns-Einheiten */
  private fun windowsTimestamp(): Long {
    val epoch1601to1970 = 11644473600L * 10_000_000L
    return System.currentTimeMillis() * 10_000L + epoch1601to1970
  }

  private fun checkStatus(resp: ByteArray, op: String) {
    if (resp.size < 12) throw RuntimeException("$op: Response too short")
    val status = readLeInt(resp, 8)
    if (status != 0) throw RuntimeException("$op failed: status=0x${Integer.toHexString(status)}")
  }

  companion object {
    /**
     * Parst \\server\share\subpath → Triple(server, share, subPath)
     */
    fun parseUncPath(unc: String): Triple<String, String, String> {
      val clean = unc.trimStart('\\').trimStart('/')
      val parts = clean.split("[/\\\\]".toRegex(), limit = 3)
      val srv   = parts.getOrElse(0) { "" }
      val sh    = parts.getOrElse(1) { "" }
      val sub   = parts.getOrElse(2) { "" }
      return Triple(srv, sh, sub)
    }
  }
}
