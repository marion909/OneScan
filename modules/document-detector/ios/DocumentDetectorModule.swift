import Foundation
import ExpoModulesCore
import Vision
import UIKit

public class DocumentDetectorModule: Module {
  public func definition() -> ModuleDefinition {
    Name("DocumentDetector")

    AsyncFunction("detectCorners") { (base64Jpeg: String) -> [String: Any] in
      guard
        let data = Data(base64Encoded: base64Jpeg, options: .ignoreUnknownCharacters),
        let uiImage = UIImage(data: data),
        let cgImage = uiImage.cgImage
      else {
        throw NSError(
          domain: "DocumentDetector",
          code: 1,
          userInfo: [NSLocalizedDescriptionKey: "Invalid base64 JPEG input"]
        )
      }

      return try await withCheckedThrowingContinuation { continuation in
        let request = VNDetectRectanglesRequest { (req, error) in
          if let error = error {
            continuation.resume(throwing: error)
            return
          }

          guard
            let results = req.results as? [VNRectangleObservation],
            let best = results.first
          else {
            // Kein Dokument erkannt — Bildrahmen als Fallback zurückgeben
            let fallback: [String: Any] = [
              "topLeft":     ["x": 0.0, "y": 0.0],
              "topRight":    ["x": 1.0, "y": 0.0],
              "bottomRight": ["x": 1.0, "y": 1.0],
              "bottomLeft":  ["x": 0.0, "y": 1.0],
            ]
            continuation.resume(returning: fallback)
            return
          }

          // Vision: Ursprung unten-links → umrechnen auf oben-links
          func flip(_ p: CGPoint) -> [String: Double] {
            return ["x": Double(p.x), "y": Double(1.0 - p.y)]
          }

          let result: [String: Any] = [
            "topLeft":     flip(best.topLeft),
            "topRight":    flip(best.topRight),
            "bottomRight": flip(best.bottomRight),
            "bottomLeft":  flip(best.bottomLeft),
          ]
          continuation.resume(returning: result)
        }

        // Konfiguration: nur bestes Ergebnis, Dokument-typische Aspektverhältnisse
        request.minimumAspectRatio   = 0.4
        request.maximumAspectRatio   = 1.0
        request.quadratureTolerance  = 25.0
        request.minimumSize          = 0.15
        request.minimumConfidence    = 0.4
        request.maximumObservations  = 1

        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        do {
          try handler.perform([request])
        } catch {
          continuation.resume(throwing: error)
        }
      }
    }
  }
}
