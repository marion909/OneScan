import Foundation
import ExpoModulesCore

// Build a smb://user:pass@server/share URL from a UNC path like \\server\share[\sub]
private func smbURL(uncPath: String, username: String, password: String) throws -> URL {
  let normalised = uncPath
    .replacingOccurrences(of: "\\", with: "/")
    .trimmingCharacters(in: CharacterSet(charactersIn: "/"))

  let parts = normalised.split(separator: "/", omittingEmptySubsequences: true).map(String.init)
  guard parts.count >= 2 else {
    throw Exception(name: "InvalidPath", description: "UNC path must be \\\\server\\share[\\subpath]")
  }

  let server  = parts[0]
  let share   = parts[1]
  let subpath = parts.dropFirst(2).joined(separator: "/")
  let base    = subpath.isEmpty ? "" : "/\(subpath)"

  let encodedUser = username.addingPercentEncoding(withAllowedCharacters: .urlUserAllowed) ?? username
  let encodedPass = password.addingPercentEncoding(withAllowedCharacters: .urlPasswordAllowed) ?? password

  guard let url = URL(string: "smb://\(encodedUser):\(encodedPass)@\(server)/\(share)\(base)") else {
    throw Exception(name: "InvalidPath", description: "Cannot construct SMB URL")
  }
  return url
}

public class SmbWriterModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SmbWriter")

    AsyncFunction("testConnection") { (uncPath: String, username: String, password: String, domain: String) throws -> Bool in
      let url = try smbURL(uncPath: uncPath, username: username, password: password)
      var isDir: ObjCBool = false
      let reachable = FileManager.default.fileExists(atPath: url.path, isDirectory: &isDir)
      return reachable || isDir.boolValue
    }

    AsyncFunction("readFile") { (uncPath: String, username: String, password: String, domain: String, fileName: String) throws -> String in
      var base = try smbURL(uncPath: uncPath, username: username, password: password)
      base.appendPathComponent(fileName)
      let data = try Data(contentsOf: base)
      if let str = String(data: data, encoding: .windowsCP1252) { return str }
      if let str = String(data: data, encoding: .utf8) { return str }
      throw Exception(name: "DecodingError", description: "Could not decode file as text")
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
    ) throws in
      guard let fileData = Data(base64Encoded: fileBase64) else {
        throw Exception(name: "InvalidData", description: "fileBase64 is not valid base64")
      }
      guard let gdtData = Data(base64Encoded: gdtBase64) else {
        throw Exception(name: "InvalidData", description: "gdtBase64 is not valid base64")
      }

      let baseURL = try smbURL(uncPath: uncPath, username: username, password: password)

      var fileURL = baseURL
      fileURL.appendPathComponent(fileName)
      try fileData.write(to: fileURL, options: .atomic)

      var gdtURL = baseURL
      gdtURL.appendPathComponent(gdtFileName)
      try gdtData.write(to: gdtURL, options: .atomic)
    }
  }
}
