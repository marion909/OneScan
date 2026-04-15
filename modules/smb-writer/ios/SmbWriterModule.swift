import Foundation
import ExpoModulesCore

public class SmbWriterModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SmbWriter")

    AsyncFunction("testConnection") { (_: String, _: String, _: String, _: String) throws -> Bool in
      throw Exception(name: "NotSupported", description: "SMB-Verbindungen werden auf iOS nicht unterstützt. Bitte Demo-Modus verwenden oder Android nutzen.")
    }

    AsyncFunction("readFile") { (_: String, _: String, _: String, _: String, _: String) throws -> String in
      throw Exception(name: "NotSupported", description: "SMB-Dateilesen wird auf iOS nicht unterstützt.")
    }

    AsyncFunction("writeFiles") { (_: String, _: String, _: String, _: String, _: String, _: String, _: String, _: String) throws in
      throw Exception(name: "NotSupported", description: "SMB-Schreiben wird auf iOS nicht unterstützt.")
    }
  }
}
