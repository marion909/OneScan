import Foundation
import ExpoModulesCore
import Network
import CommonCrypto

public class SmbWriterModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SmbWriter")

    AsyncFunction("testConnection") { (uncPath: String, username: String, password: String, domain: String) -> Bool in
      let client = SmbClient(uncPath: uncPath, username: username, password: password, domain: domain)
      return await client.testConnection()
    }

    AsyncFunction("writeFiles") { (
      uncPath: String, username: String, password: String, domain: String,
      jpegBase64: String, gdtBase64: String, jpegFileName: String, gdtFileName: String
    ) in
      guard
        let jpegData = Data(base64Encoded: jpegBase64),
        let gdtData  = Data(base64Encoded: gdtBase64)
      else {
        throw NSError(domain: "SmbWriter", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid base64 input"])
      }
      let client = SmbClient(uncPath: uncPath, username: username, password: password, domain: domain)
      try await client.writeFiles(jpegData: jpegData, gdtData: gdtData, jpegFileName: jpegFileName, gdtFileName: gdtFileName)
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  SMB2 Client (iOS)
// ═══════════════════════════════════════════════════════════════════════════

actor SmbClient {
  private let server: String
  private let share: String
  private let subPath: String
  private let username: String
  private let password: String
  private let domain: String

  private var messageId: UInt64 = 1
  private var sessionId: UInt64 = 0
  private var treeId: UInt32    = 0

  init(uncPath: String, username: String, password: String, domain: String) {
    let (srv, sh, sub) = SmbClient.parseUncPath(uncPath)
    self.server   = srv
    self.share    = sh
    self.subPath  = sub
    self.username = username
    self.password = password
    self.domain   = domain
  }

  // ─── Öffentliche API ───────────────────────────────────────────────────

  func testConnection() async -> Bool {
    do {
      let conn = try await openConnection()
      try await negotiate(conn: conn)
      try await sessionSetup(conn: conn)
      try await treeConnect(conn: conn)
      conn.cancel()
      return true
    } catch {
      return false
    }
  }

  func writeFiles(jpegData: Data, gdtData: Data, jpegFileName: String, gdtFileName: String) async throws {
    let conn = try await openConnection()
    try await negotiate(conn: conn)
    try await sessionSetup(conn: conn)
    try await treeConnect(conn: conn)

    let jpegPath = subPath.isEmpty ? jpegFileName : "\(subPath)\\\(jpegFileName)"
    let gdtPath  = subPath.isEmpty ? gdtFileName  : "\(subPath)\\\(gdtFileName)"

    try await writeFile(conn: conn, filePath: jpegPath, data: jpegData)
    try await writeFile(conn: conn, filePath: gdtPath,  data: gdtData)
    conn.cancel()
  }

  // ─── Verbindung ────────────────────────────────────────────────────────

  private func openConnection() async throws -> NWConnection {
    let host = NWEndpoint.Host(server)
    let port = NWEndpoint.Port(rawValue: 445)!
    let conn = NWConnection(host: host, port: port, using: .tcp)

    return try await withCheckedThrowingContinuation { cont in
      conn.stateUpdateHandler = { state in
        switch state {
        case .ready:          cont.resume(returning: conn)
        case .failed(let e):  cont.resume(throwing: e)
        case .cancelled:      cont.resume(throwing: SmbError.connectionCancelled)
        default:              break
        }
      }
      conn.start(queue: .global(qos: .userInitiated))
    }
  }

  // ─── SMB2 Negotiate ───────────────────────────────────────────────────

  private func negotiate(conn: NWConnection) async throws {
    var body = Data(capacity: 38)
    body.appendLE16(36)             // StructureSize
    body.appendLE16(1)              // DialectCount
    body.appendLE16(1)              // SecurityMode: signing enabled
    body.appendLE16(0)              // Reserved
    body.appendLE32(0)              // Capabilities
    body.append(Data(count: 16))    // ClientGuid (random would be better)
    body.appendLE64(0)              // ClientStartTime
    body.appendLE16(0x0202)         // Dialect SMB 2.0.2

    try await sendSmb2(conn: conn, command: 0x0000, body: body)
    let resp = try await recvSmb2(conn: conn)
    try checkStatus(resp, op: "Negotiate")
  }

  // ─── SMB2 Session Setup (NTLMv2) ─────────────────────────────────────

  private func sessionSetup(conn: NWConnection) async throws {
    // Runde 1
    let ntlmNeg = buildNtlmNegotiateMessage()
    let spnego1 = wrapInSpnego(ntlmNeg)
    try await sendSessionSetup(conn: conn, token: spnego1)
    let resp1 = try await recvSmb2(conn: conn)

    let status1 = resp1.leUInt32(at: 8)
    // 0xC0000016 = STATUS_MORE_PROCESSING_REQUIRED
    if status1 != 0xC0000016 && status1 != 0x00000000 {
      throw SmbError.unexpectedStatus("SessionSetup R1: 0x\(String(status1, radix: 16))")
    }
    sessionId = resp1.leUInt64(at: 40)
    let spnegoResp = extractSecurityBuffer(from: resp1)
    let challenge  = try extractNtlmChallenge(from: spnegoResp)

    // Runde 2
    let ntlmAuth = buildNtlmAuthenticateMessage(challenge: challenge)
    let spnego2  = wrapNtlmAuth(ntlmAuth)
    try await sendSessionSetup(conn: conn, token: spnego2)
    let resp2 = try await recvSmb2(conn: conn)
    try checkStatus(resp2, op: "SessionSetup R2")
  }

  private func sendSessionSetup(conn: NWConnection, token: Data) async throws {
    var body = Data(capacity: 25 + token.count)
    body.appendLE16(25)                              // StructureSize
    body.append(0)                                   // Flags
    body.append(1)                                   // SecurityMode
    body.appendLE32(0x00000001)                      // Capabilities
    body.appendLE32(0)                               // Channel
    body.appendLE16(UInt16(64 + 24))                 // SecurityBufferOffset
    body.appendLE16(UInt16(token.count))             // SecurityBufferLength
    body.appendLE64(0)                               // PreviousSessionId
    body.append(token)
    try await sendSmb2(conn: conn, command: 0x0001, body: body, sessionId: sessionId)
  }

  // ─── NTLM Nachrichten ─────────────────────────────────────────────────

  private func buildNtlmNegotiateMessage() -> Data {
    var d = Data(capacity: 32)
    d.append(contentsOf: Array("NTLMSSP\0".utf8))
    d.appendLE32(1)          // MessageType: NEGOTIATE
    d.appendLE32(0xE2088297) // Flags
    d.appendLE16(0); d.appendLE16(0); d.appendLE32(0)  // Domain
    d.appendLE16(0); d.appendLE16(0); d.appendLE32(0)  // Workstation
    return d
  }

  private func buildNtlmAuthenticateMessage(challenge: NtlmChallenge) -> Data {
    var clientNonce = Data(count: 8)
    clientNonce.withUnsafeMutableBytes { _ = SecRandomCopyBytes(kSecRandomDefault, 8, $0.baseAddress!) }
    let timestamp = windowsTimestamp()

    // NT-Hash = MD4(UTF-16LE(password))
    let passData  = password.data(using: .utf16LittleEndian)!
    let ntHash    = md4(passData)

    // ResponseKeyNT = HMAC_MD5(ntHash, UTF-16LE(UPPER(username)+domain))
    let userDomain = (username.uppercased() + domain).data(using: .utf16LittleEndian)!
    let responseKeyNT = hmacMd5(key: ntHash, data: userDomain)

    // Blob
    var blobFixed = Data(count: 28)
    blobFixed[0] = 1; blobFixed[1] = 1
    withUnsafeMutableBytes(of: &blobFixed) { _ in }
    var ts = timestamp
    withUnsafeMutableBytes(of: &ts) { tsBytes in
      for i in 0..<8 { blobFixed[8 + i] = tsBytes[i] }
    }
    for i in 0..<8 { blobFixed[16 + i] = clientNonce[i] }

    let blob = blobFixed + challenge.targetInfo + Data(count: 4)

    let ntProofStr = hmacMd5(key: responseKeyNT, data: challenge.serverChallenge + blob)
    let ntResponse = ntProofStr + blob
    let lmResponse = hmacMd5(key: responseKeyNT, data: challenge.serverChallenge + clientNonce) + clientNonce

    let userBytes      = username.data(using: .utf16LittleEndian)!
    let domainBytes    = domain.data(using: .utf16LittleEndian)!
    let workstation    = "ONESCAN".data(using: .utf16LittleEndian)!

    let headerSize     = 72
    let lmOff          = headerSize
    let ntOff          = lmOff + lmResponse.count
    let domainOff      = ntOff + ntResponse.count
    let userOff        = domainOff + domainBytes.count
    let wsOff          = userOff + userBytes.count
    let totalSize      = wsOff + workstation.count

    var buf = Data(capacity: totalSize)
    buf.append(contentsOf: Array("NTLMSSP\0".utf8))
    buf.appendLE32(3)               // MessageType: AUTHENTICATE
    buf.appendSecBuf(len: lmResponse.count, off: lmOff)
    buf.appendSecBuf(len: ntResponse.count, off: ntOff)
    buf.appendSecBuf(len: domainBytes.count, off: domainOff)
    buf.appendSecBuf(len: userBytes.count, off: userOff)
    buf.appendSecBuf(len: workstation.count, off: wsOff)
    buf.appendSecBuf(len: 0, off: wsOff + workstation.count)  // EncryptedRandomSessionKey (empty)
    buf.appendLE32(0xA2888205)      // NegotiateFlags
    buf.append(Data(count: 8))      // Version
    buf.append(Data(count: 16))     // MIC
    buf.append(lmResponse)
    buf.append(ntResponse)
    buf.append(domainBytes)
    buf.append(userBytes)
    buf.append(workstation)
    return buf
  }

  // ─── SPNEGO Wrapper ────────────────────────────────────────────────────

  private func wrapInSpnego(_ ntlmToken: Data) -> Data {
    let ntlmOid: [UInt8] = [0x06, 0x0A, 0x2B, 0x06, 0x01, 0x04, 0x01, 0x82, 0x37, 0x02, 0x02, 0x0A]
    let mechList  = asnSequence(Data(ntlmOid))
    let mechToken = asnCtx(2, asnOctetString(ntlmToken))
    let negInit   = asnSequence(asnCtx(0, mechList) + mechToken)
    let spnegoOid: [UInt8] = [0x06, 0x06, 0x2B, 0x06, 0x01, 0x05, 0x05, 0x02]
    return asnCtx(0, Data(spnegoOid) + asnCtx(0, negInit))
  }

  private func wrapNtlmAuth(_ ntlmToken: Data) -> Data {
    return asnCtx(1, asnSequence(asnCtx(2, asnOctetString(ntlmToken))))
  }

  private func asnLen(_ len: Int) -> Data {
    if len < 128 { return Data([UInt8(len)]) }
    if len < 256 { return Data([0x81, UInt8(len)]) }
    return Data([0x82, UInt8(len >> 8), UInt8(len & 0xFF)])
  }
  private func asnTlv(_ tag: UInt8, _ content: Data) -> Data { Data([tag]) + asnLen(content.count) + content }
  private func asnSequence(_ c: Data) -> Data   { asnTlv(0x30, c) }
  private func asnOctetString(_ c: Data) -> Data { asnTlv(0x04, c) }
  private func asnCtx(_ n: Int, _ c: Data) -> Data { asnTlv(UInt8(0xA0 | n), c) }

  // ─── NTLM Challenge parsen ────────────────────────────────────────────

  struct NtlmChallenge {
    let serverChallenge: Data
    let targetInfo: Data
  }

  private func extractSecurityBuffer(from resp: Data) -> Data {
    guard resp.count >= 72 else { return Data() }
    let offset = Int(resp.leUInt16(at: 64 + 4))
    let length = Int(resp.leUInt16(at: 64 + 6))
    guard offset > 0, length > 0, offset + length <= resp.count else { return Data() }
    return resp.subdata(in: offset..<(offset + length))
  }

  private func extractNtlmChallenge(from spnegoResp: Data) throws -> NtlmChallenge {
    let sig = Array("NTLMSSP\0".utf8)
    var ntlmOffset = -1
    for i in 0...(spnegoResp.count - sig.count) {
      if spnegoResp[i..<(i + sig.count)].elementsEqual(sig) { ntlmOffset = i; break }
    }
    guard ntlmOffset >= 0 else { throw SmbError.ntlmChallengeNotFound }
    let ntlm = spnegoResp.subdata(in: ntlmOffset..<spnegoResp.count)
    let serverChallenge = ntlm.subdata(in: 24..<32)
    let tiLen = Int(ntlm.leUInt16(at: 40))
    let tiOff = Int(ntlm.leUInt32(at: 44)) - ntlmOffset
    let targetInfo: Data = (tiLen > 0 && tiOff + tiLen <= ntlm.count)
      ? ntlm.subdata(in: tiOff..<(tiOff + tiLen)) : Data()
    return NtlmChallenge(serverChallenge: serverChallenge, targetInfo: targetInfo)
  }

  // ─── Tree Connect ──────────────────────────────────────────────────────

  private func treeConnect(conn: NWConnection) async throws {
    let pathStr  = "\\\\\(server)\\\(share)"
    let pathData = pathStr.data(using: .utf16LittleEndian)!
    var body = Data(capacity: 9 + pathData.count)
    body.appendLE16(9)
    body.appendLE16(0)
    body.appendLE16(UInt16(64 + 8))
    body.appendLE16(UInt16(pathData.count))
    body.append(pathData)
    try await sendSmb2(conn: conn, command: 0x0003, body: body, sessionId: sessionId)
    let resp = try await recvSmb2(conn: conn)
    try checkStatus(resp, op: "TreeConnect")
    treeId = resp.leUInt32(at: 36)
  }

  // ─── Create / Write / Close ───────────────────────────────────────────

  private func writeFile(conn: NWConnection, filePath: String, data: Data) async throws {
    let nameData = filePath.data(using: .utf16LittleEndian)!
    var createBody = Data(capacity: 57 + nameData.count)
    createBody.appendLE16(57)
    createBody.append(0)                  // SecurityFlags
    createBody.append(0)                  // OplockLevel: NONE
    createBody.appendLE32(0)              // ImpersonationLevel
    createBody.appendLE64(0)              // SmbCreateFlags
    createBody.appendLE64(0)              // Reserved
    createBody.appendLE32(0x00120116)     // DesiredAccess
    createBody.appendLE32(0)              // FileAttributes
    createBody.appendLE32(0x00000007)     // ShareAccess
    createBody.appendLE32(0x00000005)     // CreateDisposition: FILE_OVERWRITE_IF
    createBody.appendLE32(0x00000060)     // CreateOptions
    createBody.appendLE16(UInt16(64 + 56)) // NameOffset
    createBody.appendLE16(UInt16(nameData.count))
    createBody.appendLE32(0)              // CreateContextsOffset
    createBody.appendLE32(0)              // CreateContextsLength
    createBody.append(nameData)

    try await sendSmb2(conn: conn, command: 0x0005, body: createBody, sessionId: sessionId, treeId: treeId)
    let createResp = try await recvSmb2(conn: conn)
    try checkStatus(createResp, op: "Create")
    let fileId = createResp.subdata(in: 128..<144)

    // WRITE
    var writeHeader = Data(capacity: 49)
    writeHeader.appendLE16(49)
    writeHeader.appendLE16(UInt16(64 + 48))  // DataOffset
    writeHeader.appendLE32(UInt32(data.count))
    writeHeader.appendLE64(0)                // FileOffset
    writeHeader.append(fileId)
    writeHeader.appendLE32(0)                // Channel
    writeHeader.appendLE32(0)                // RemainingBytes
    writeHeader.appendLE16(0); writeHeader.appendLE16(0)  // WriteChannelInfo
    writeHeader.appendLE32(0)                // Flags
    let writeBody = writeHeader + data
    try await sendSmb2(conn: conn, command: 0x0009, body: writeBody, sessionId: sessionId, treeId: treeId)
    let writeResp = try await recvSmb2(conn: conn)
    try checkStatus(writeResp, op: "Write")

    // CLOSE
    var closeBody = Data(count: 24)
    closeBody.appendLE16(24); closeBody.appendLE16(0); closeBody.appendLE32(0)
    closeBody.append(fileId)
    try await sendSmb2(conn: conn, command: 0x000E, body: closeBody, sessionId: sessionId, treeId: treeId)
    let closeResp = try await recvSmb2(conn: conn)
    try checkStatus(closeResp, op: "Close")
  }

  // ─── Sende/Empfange-Primitiven ────────────────────────────────────────

  private func sendSmb2(conn: NWConnection, command: UInt16, body: Data, sessionId: UInt64 = 0, treeId: UInt32 = 0) async throws {
    let mid = messageId
    messageId += 1
    var header = Data(capacity: 64)
    header.append(contentsOf: [0xFE, 0x53, 0x4D, 0x42]) // ProtocolId
    header.appendLE16(64)
    header.appendLE16(1)             // CreditCharge
    header.appendLE32(0)             // Status
    header.appendLE16(command)
    header.appendLE16(1)             // CreditRequest
    header.appendLE32(0)             // Flags
    header.appendLE32(0)             // NextCommand
    header.appendLE64(mid)
    header.appendLE32(0)             // Reserved
    header.appendLE32(treeId)
    header.appendLE64(sessionId)
    header.append(Data(count: 16))   // Signature

    let packet = header + body
    var frame = Data(capacity: 4 + packet.count)
    frame.append(0)
    frame.append(UInt8((packet.count >> 16) & 0xFF))
    frame.append(UInt8((packet.count >> 8)  & 0xFF))
    frame.append(UInt8( packet.count        & 0xFF))
    frame.append(packet)

    try await withCheckedThrowingContinuation { (cont: CheckedContinuation<Void, Error>) in
      conn.send(content: frame, completion: .contentProcessed { err in
        if let err = err { cont.resume(throwing: err) } else { cont.resume() }
      })
    }
  }

  private func recvSmb2(conn: NWConnection) async throws -> Data {
    let nbHeader: Data = try await readExactly(conn: conn, count: 4)
    let length = (Int(nbHeader[1]) << 16) | (Int(nbHeader[2]) << 8) | Int(nbHeader[3])
    return try await readExactly(conn: conn, count: length)
  }

  private func readExactly(conn: NWConnection, count: Int) async throws -> Data {
    return try await withCheckedThrowingContinuation { cont in
      conn.receive(minimumIncompleteLength: count, maximumLength: count) { data, _, _, err in
        if let err = err { cont.resume(throwing: err); return }
        guard let data = data, data.count == count else {
          cont.resume(throwing: SmbError.connectionCancelled); return
        }
        cont.resume(returning: data)
      }
    }
  }

  // ─── CommonCrypto Kryptographie ───────────────────────────────────────

  private func md4(_ data: Data) -> Data {
    var digest = Data(count: 16)
    data.withUnsafeBytes { dataPtr in
      digest.withUnsafeMutableBytes { digestPtr in
        CC_MD4(dataPtr.baseAddress, CC_LONG(data.count), digestPtr.bindMemory(to: UInt8.self).baseAddress)
      }
    }
    return digest
  }

  private func hmacMd5(key: Data, data: Data) -> Data {
    var mac = Data(count: 16)
    key.withUnsafeBytes { keyPtr in
      data.withUnsafeBytes { dataPtr in
        mac.withUnsafeMutableBytes { macPtr in
          CCHmac(CCHmacAlgorithm(kCCHmacAlgMD5),
                 keyPtr.baseAddress, key.count,
                 dataPtr.baseAddress, data.count,
                 macPtr.baseAddress)
        }
      }
    }
    return mac
  }

  /** Windows FILETIME in 100ns-Einheiten seit 1. Januar 1601 */
  private func windowsTimestamp() -> UInt64 {
    let epoch: UInt64 = 11644473600 * 10_000_000
    return UInt64(Date().timeIntervalSince1970 * 10_000_000) + epoch
  }

  private func checkStatus(_ data: Data, op: String) throws {
    guard data.count >= 12 else { throw SmbError.unexpectedStatus("\(op): too short") }
    let status = data.leUInt32(at: 8)
    if status != 0 { throw SmbError.unexpectedStatus("\(op): 0x\(String(status, radix: 16))") }
  }

  // ─── UNC Parser ───────────────────────────────────────────────────────

  static func parseUncPath(_ unc: String) -> (String, String, String) {
    let clean = unc.trimmingCharacters(in: CharacterSet(charactersIn: "\\/"))
    let parts = clean.components(separatedBy: CharacterSet(charactersIn: "\\/"))
    let srv  = parts.count > 0 ? parts[0] : ""
    let sh   = parts.count > 1 ? parts[1] : ""
    let sub  = parts.count > 2 ? parts[2...].joined(separator: "\\") : ""
    return (srv, sh, sub)
  }
}

// ─── Fehlertypen ──────────────────────────────────────────────────────────

enum SmbError: Error {
  case connectionCancelled
  case ntlmChallengeNotFound
  case unexpectedStatus(String)
}

// ─── Data Erweiterungen (Little-Endian Helfer) ────────────────────────────

extension Data {
  mutating func appendLE16(_ v: UInt16) { var x = v.littleEndian; append(Data(bytes: &x, count: 2)) }
  mutating func appendLE32(_ v: UInt32) { var x = v.littleEndian; append(Data(bytes: &x, count: 4)) }
  mutating func appendLE64(_ v: UInt64) { var x = v.littleEndian; append(Data(bytes: &x, count: 8)) }
  mutating func append(_ v: UInt8)      { append(contentsOf: [v]) }

  mutating func appendSecBuf(len: Int, off: Int) {
    appendLE16(UInt16(len)); appendLE16(UInt16(len)); appendLE32(UInt32(off))
  }

  func leUInt16(at off: Int) -> UInt16 {
    return UInt16(self[off]) | (UInt16(self[off + 1]) << 8)
  }
  func leUInt32(at off: Int) -> UInt32 {
    return UInt32(self[off]) | (UInt32(self[off+1]) << 8) | (UInt32(self[off+2]) << 16) | (UInt32(self[off+3]) << 24)
  }
  func leUInt64(at off: Int) -> UInt64 {
    return UInt64(leUInt32(at: off)) | (UInt64(leUInt32(at: off + 4)) << 32)
  }
}
