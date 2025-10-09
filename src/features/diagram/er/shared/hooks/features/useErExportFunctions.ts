/**
 * Refactored ER export functions hook
 * Now uses extracted utilities for better maintainability
 */

import { useState } from "react";
import BpmnModeler from "bpmn-js/lib/Modeler";
import jsPDF from "jspdf";
import { logger } from "../../../../../../utils/logger";
import {
  ErrorType,
  safeAsyncOperation,
} from "../../../../../../utils/errorHandler";
import { notifications } from "../../../../../../utils/notifications";
import {
  prepareSVGForExport,
  setupHighQualityCanvas,
  createImageFromSVG,
  getCanvasViewport,
  calculateExportDimensions,
  drawImageOnCanvas,
} from "../../utils/export-utils";

export const useErExportFunctions = (
  modelerRef: React.RefObject<BpmnModeler | null>,
  diagramName?: string
) => {
  const [xml, setXml] = useState<string>("");
  const [exportDropdownOpen, setExportDropdownOpen] = useState<boolean>(false);

  const exportDiagram = async () => {
    if (!modelerRef.current) return;

    logger.info("Starting ER XML export", "ER_EXPORT");

    await safeAsyncOperation(
      async () => {
        const { xml } = await modelerRef.current!.saveXML({ format: true });
        const xmlString: string = xml ?? "";
        setXml(xmlString);
        const blob = new Blob([xmlString], { type: "application/xml" });
        const url = URL.createObjectURL(blob);
        const filename = diagramName ? `${diagramName} - ER.bpmn` : "er-diagram.bpmn";
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        notifications.success("ER diagram exported successfully!");
        logger.info("ER XML exported successfully", "ER_EXPORT");
      },
      {
        type: ErrorType.BPMN_EXPORT,
        operation: "Export ER diagram",
        userMessage: "Error exporting ER diagram. Please try again.",
        fallback: () => {
          logger.warn(
            "Fallback: Trying to save ER XML in unformatted format",
            "ER_EXPORT"
          );
          // Try exporting without formatting as fallback
          modelerRef.current
            ?.saveXML({ format: false })
            .then(({ xml }) => {
              if (xml) {
                const blob = new Blob([xml], { type: "application/xml" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                const fallbackFilename = diagramName ? `${diagramName} - ER-fallback.bpmn` : "er-diagram-fallback.bpmn";
                a.download = fallbackFilename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                notifications.warning(
                  "ER diagram exported in basic format due to error"
                );
              }
            })
            .catch(() => {
              notifications.error("Could not export ER diagram");
            });
        },
      }
    );
  };

  const exportToPDF = async () => {
    if (!modelerRef.current) return;

    logger.info("Starting PDF export", "ER_PDF_EXPORT");

    await safeAsyncOperation(
      async () => {
        const svg = await prepareSVGForExport(modelerRef);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          throw new Error("Could not get canvas context");
        }

        const canvasSize = getCanvasViewport(modelerRef);
        logger.debug(`SVG length: ${svg.length} chars`, "ER_PDF_EXPORT");
        
        const { img, url } = await createImageFromSVG(svg);

        try {
          const originalWidth = img.width;
          const originalHeight = img.height;
          
          logger.debug(`Original SVG dimensions: ${originalWidth}x${originalHeight}`, "ER_PDF_EXPORT");
          logger.debug(`Canvas size: ${canvasSize.width}x${canvasSize.height}`, "ER_PDF_EXPORT");

          const { finalWidth, finalHeight, elementsFitInCanvas } = calculateExportDimensions(
            originalWidth,
            originalHeight,
            canvasSize.width,
            canvasSize.height
          );
          
          logger.debug(`Final dimensions: ${finalWidth}x${finalHeight} (fit: ${elementsFitInCanvas})`, "ER_PDF_EXPORT");

          setupHighQualityCanvas(canvas, ctx, finalWidth, finalHeight);
          drawImageOnCanvas(ctx, img, finalWidth, finalHeight, originalWidth, originalHeight, elementsFitInCanvas);

          // Create PDF
          const mmWidth = finalWidth * 0.264583;
          const mmHeight = finalHeight * 0.264583;

          const pdf = new jsPDF({
            orientation: mmWidth > mmHeight ? "landscape" : "portrait",
            unit: "mm",
            format: [mmWidth, mmHeight],
          });

          const imgData = canvas.toDataURL("image/png", 1.0);
          
          logger.debug(`PDF: ${mmWidth.toFixed(1)}x${mmHeight.toFixed(1)}mm`, "ER_PDF_EXPORT");
          
          pdf.addImage(imgData, "PNG", 0, 0, mmWidth, mmHeight, undefined, "SLOW");

          const pdfFilename = diagramName ? `${diagramName} - ER.pdf` : "er-diagram.pdf";
          pdf.save(pdfFilename);
          
          logger.info("PDF generated successfully", "ER_PDF_EXPORT");
          notifications.success("PDF exported successfully!");
          
        } finally {
          URL.revokeObjectURL(url);
        }
      },
      {
        type: ErrorType.PDF_EXPORT,
        operation: "Export ER PDF",
        userMessage:
          "Error exporting ER PDF. Try using another format or check if the diagram is valid.",
        fallback: () => {
          logger.warn(
            "Fallback: Trying to export ER PDF with reduced quality",
            "ER_PDF_EXPORT"
          );
          // Fallback: try exporting as SVG
          modelerRef.current
            ?.saveSVG()
            .then(({ svg }) => {
              const link = document.createElement("a");
              const blob = new Blob([svg], { type: "image/svg+xml" });
              link.href = URL.createObjectURL(blob);
              const svgFallbackFilename = diagramName ? `${diagramName} - ER-fallback.svg` : "er-diagram-fallback.svg";
              link.download = svgFallbackFilename;
              link.click();
              notifications.warning(
                "Exported as SVG due to PDF ER error"
              );
            })
            .catch(() => {
              notifications.error(
                "Could not export as PDF or SVG"
              );
            });
        },
      }
    );
  };

  const exportToPNG = async () => {
    if (!modelerRef.current) return;

    logger.info("Starting PNG export", "ER_PNG_EXPORT");

    await safeAsyncOperation(
      async () => {
        const svg = await prepareSVGForExport(modelerRef);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          throw new Error("Could not get canvas context");
        }

        const canvasSize = getCanvasViewport(modelerRef);
        logger.debug(`SVG length: ${svg.length} chars`, "ER_PNG_EXPORT");
        
        const { img, url } = await createImageFromSVG(svg);

        try {
          const originalWidth = img.width;
          const originalHeight = img.height;
          
          logger.debug(`Original SVG dimensions: ${originalWidth}x${originalHeight}`, "ER_PNG_EXPORT");
          logger.debug(`Canvas size: ${canvasSize.width}x${canvasSize.height}`, "ER_PNG_EXPORT");

          const { finalWidth, finalHeight, elementsFitInCanvas } = calculateExportDimensions(
            originalWidth,
            originalHeight,
            canvasSize.width,
            canvasSize.height
          );
          
          logger.debug(`Final dimensions: ${finalWidth}x${finalHeight} (fit: ${elementsFitInCanvas})`, "ER_PNG_EXPORT");

          setupHighQualityCanvas(canvas, ctx, finalWidth, finalHeight);
          drawImageOnCanvas(ctx, img, finalWidth, finalHeight, originalWidth, originalHeight, elementsFitInCanvas);

          // Convert canvas to PNG
          return new Promise<void>((resolve, reject) => {
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  logger.info("PNG generated successfully", "ER_PNG_EXPORT");
                  
                  const pngUrl = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = pngUrl;
                  const pngFilename = diagramName ? `${diagramName} - ER.png` : "er-diagram.png";
                  a.download = pngFilename;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(pngUrl);
                  
                  notifications.success("PNG download successful!");
                  resolve();
                } else {
                  reject(new Error("Error creating PNG blob for ER"));
                }
              },
              "image/png",
              1.0
            );
          });
        } finally {
          URL.revokeObjectURL(url);
        }
      },
      {
        type: ErrorType.PNG_EXPORT,
        operation: "Export ER PNG",
        userMessage:
          "Error exporting ER PNG. Please try again or use another format.",
        fallback: () => {
          logger.warn(
            "Fallback: Trying to export ER PNG with reduced quality",
            "ER_PNG_EXPORT"
          );
          // Fallback: try exporting as SVG
          modelerRef.current
            ?.saveSVG()
            .then(({ svg }) => {
              const link = document.createElement("a");
              const blob = new Blob([svg], { type: "image/svg+xml" });
              link.href = URL.createObjectURL(blob);
              const svgFallbackFilename = diagramName ? `${diagramName} - ER-fallback.svg` : "er-diagram-fallback.svg";
              link.download = svgFallbackFilename;
              link.click();
              notifications.warning(
                "Exported as SVG due to PNG ER error"
              );
            })
            .catch(() => {
              notifications.error(
                "Could not export as PNG or SVG"
              );
            });
        },
      }
    );
  };

  const toggleExportDropdown = () => {
    setExportDropdownOpen(!exportDropdownOpen);
  };

  const handleExportOption = (type: "pdf" | "png" | "bpmn") => {
    setExportDropdownOpen(false);

    switch (type) {
      case "pdf":
        exportToPDF();
        break;
      case "png":
        exportToPNG();
        break;
      case "bpmn":
        exportDiagram();
        break;
    }
  };

  return {
    xml,
    exportDropdownOpen,
    setExportDropdownOpen,
    exportDiagram,
    exportToPDF,
    exportToPNG,
    toggleExportDropdown,
    handleExportOption,
  };
};