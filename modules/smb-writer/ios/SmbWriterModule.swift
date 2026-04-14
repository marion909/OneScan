import Foundation
import ExpoModulesCore

public class SmbWriterModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SmbWriter")

    AsyncFunction("testConnection") { (uncPath: String, username: String, password: String, domain: String) throws -> Bool in
      throw Exception(name: "NotImplemented", description: "SMB not supported on iOS")
    }

    AsyncFunction("readFile") { (uncPath: String, username: String, password: String, domain: String, fileName: String) throws -> String in
      throw Exception(name: "NotImplemented", description: "SMB not supported on iOS")
    }

    AsyncFunction("writeFiles") { (uncPath: String, username: String, password: String, domain: String, jpegBase64: String, gdtBase64: String, jpegFileName: String, gdtFileName: String) throws in
      throw Exception(name: "NotImplemented", description: "SMB not supported on iOS")
    }
  }
}
