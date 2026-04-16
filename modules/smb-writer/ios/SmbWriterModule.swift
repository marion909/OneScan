import Foundation
import ExpoModulesCore
import AMSMB2

// Parse \\server\share[\subpath] → (serverURL, shareName, subpath)
private func parseUNC(uncPath: String) throws -> (URL, String, String) {
  let normalised = uncPath
    .replacingOccurrences(of: "\\", with: "/")
    .trimmingCharacters(in: CharacterSet(charactersIn: "/"))

  let parts = normalised.split(separator: "/", omittingEmptySubsequences: true).map(String.init)
  guard parts.count >= 2 else {
    throw Exception(name: "InvalidPath", description: "UNC-Pfad muss \\\\Server\\Share[\\Unterordner] sein")
  }

  let server  = parts[0]
  let share   = parts[1]
  let subpath = parts.dropFirst(2).joined(separator: "/")

  guard let serverURL = URL(string: "smb://\(server)") else {
    throw Exception(name: "InvalidPath", description: "SMB-Server-URL konnte nicht erstellt werden")
  }

  return (serverURL, share, subpath)
}

private func filePath(subpath: String, fileName: String) -> String {
  subpath.isEmpty ? fileName : "\(subpath)/\(fileName)"
}

public class SmbWriterModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SmbWriter")

    AsyncFunction("testConnection") { (uncPath: String, username: String, password: String, domain: String) async throws -> Bool in
      let (serverURL, share, _) = try parseUNC(uncPath: uncPath)
      let credential = URLCredential(user: username, password: password, persistence: .forSession)
      guard let client = SMB2Manager(url: serverURL, domain: domain, credential: credential) else {
        throw Exception(name: "InitError", description: "SMB-Client konnte nicht erstellt werden")
      }
      try await client.connectShare(name: share)
      try await client.disconnectShare()
      return true
    }

    AsyncFunction("readFile") { (uncPath: String, username: String, password: String, domain: String, fileName: String) async throws -> String in
      let (serverURL, share, subpath) = try parseUNC(uncPath: uncPath)
      let credential = URLCredential(user: username, password: password, persistence: .forSession)
      guard let client = SMB2Manager(url: serverURL, domain: domain, credential: credential) else {
        throw Exception(name: "InitError", description: "SMB-Client konnte nicht erstellt werden")
      }
      try await client.connectShare(name: share)
      defer { Task { try? await client.disconnectShare() } }

      let path = filePath(subpath: subpath, fileName: fileName)
      let data = try await client.contents(atPath: path, progress: nil)

      if let str = String(data: data, encoding: .windowsCP1252) { return str }
      if let str = String(data: data, encoding: .utf8) { return str }
      throw Exception(name: "DecodingError", description: "Datei konnte nicht als Text dekodiert werden")
    }

    AsyncFunction("writeFiles") { (
      uncPath: String,
      username: String,
      password: String,
      domain: String,
      fileBase64: String,
      gdtBase64: String,
      fileName: String,
      gdtFileName: String
    ) async throws in
      guard let fileData = Data(base64Encoded: fileBase64) else {
        throw Exception(name: "InvalidData", description: "fileBase64 ist kein gültiges Base64")
      }
      guard let gdtData = Data(base64Encoded: gdtBase64) else {
        throw Exception(name: "InvalidData", description: "gdtBase64 ist kein gültiges Base64")
      }

      let (serverURL, share, subpath) = try parseUNC(uncPath: uncPath)
      let credential = URLCredential(user: username, password: password, persistence: .forSession)
      guard let client = SMB2Manager(url: serverURL, domain: domain, credential: credential) else {
        throw Exception(name: "InitError", description: "SMB-Client konnte nicht erstellt werden")
      }
      try await client.connectShare(name: share)
      defer { Task { try? await client.disconnectShare() } }

      let fp = filePath(subpath: subpath, fileName: fileName)
      let gp = filePath(subpath: subpath, fileName: gdtFileName)

      try await client.write(data: fileData, toPath: fp, progress: nil)
      try await client.write(data: gdtData, toPath: gp, progress: nil)
    }
  }
}
