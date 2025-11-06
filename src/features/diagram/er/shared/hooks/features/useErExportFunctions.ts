/**
 * Hook ER para funções de exportação
 * Responsável por exportar diagramas ER em XML, PDF e PNG
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

        notifications.success("Diagrama ER exportado com sucesso!");        
        logger.info("Diagrama ER exportado com sucesso!", "ER_EXPORT");
      },
      {
        type: ErrorType.BPMN_EXPORT,
        operation: "Export ER diagram",
        userMessage: "Error exporting ER diagram. Please try again.",
        fallback: () => {
          logger.warn(
            "Fallback: A tentar exportar diagrama ER sem formatação",
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
                  "Diagrama ER exportado sem formatação devido a um erro"
                );
              }
            })
            .catch(() => {
              notifications.error("Não foi possível exportar o diagrama ER");
            });
        },
      }
    );
  };

  const exportToPDF = async () => {
    if (!modelerRef.current) return;

    logger.info("Iniciando exportação para PDF", "ER_PDF_EXPORT");

    await safeAsyncOperation(
      async () => {
        const svg = await prepareSVGForExport(modelerRef);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          throw new Error("Não foi possível obter o contexto do canvas");
        }

        const canvasSize = getCanvasViewport(modelerRef);
        logger.debug(`SVG length: ${svg.length} chars`, "ER_PDF_EXPORT");
        
        const { img, url } = await createImageFromSVG(svg);

        try {
          const originalWidth = img.width;
          const originalHeight = img.height;

          logger.debug(`Dimensões originais do SVG: ${originalWidth}x${originalHeight}`, "ER_PDF_EXPORT");
          logger.debug(`Tamanho do canvas: ${canvasSize.width}x${canvasSize.height}`, "ER_PDF_EXPORT");

          const { finalWidth, finalHeight, elementsFitInCanvas } = calculateExportDimensions(
            originalWidth,
            originalHeight,
            canvasSize.width,
            canvasSize.height
          );

          logger.debug(`Dimensões finais: ${finalWidth}x${finalHeight} (fit: ${elementsFitInCanvas})`, "ER_PDF_EXPORT");

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

          logger.info("PDF gerado com sucesso", "ER_PDF_EXPORT");
          notifications.success("PDF exportado com sucesso!");

        } finally {
          URL.revokeObjectURL(url);
        }
      },
      {
        type: ErrorType.PDF_EXPORT,
        operation: "Export ER PDF",
        userMessage:
          "Erro ao exportar PDF ER. Tente usar outro formato ou verifique se o diagrama é válido.",
        fallback: () => {
          logger.warn(
            "Fallback: A tentar exportar ER PDF com baixa qualidade",
            "ER_PDF_EXPORT"       
          );
          // Fallback: Tentar exportar como SVG
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
                "Exportado como SVG devido a erro no PDF ER"
              );
            })
            .catch(() => {
              notifications.error(
                "Não foi possível exportar como PDF ou SVG"
              );
            });
        },
      }
    );
  };

  const exportToPNG = async () => {
    if (!modelerRef.current) return;

    logger.info("Iniciando exportação PNG", "ER_PNG_EXPORT");

    await safeAsyncOperation(
      async () => {
        const svg = await prepareSVGForExport(modelerRef);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          throw new Error("Não foi possível obter o contexto do canvas");
        }

        const canvasSize = getCanvasViewport(modelerRef);
        logger.debug(`Comprimento do SVG: ${svg.length} chars`, "ER_PNG_EXPORT");

        const { img, url } = await createImageFromSVG(svg);

        try {
          const originalWidth = img.width;
          const originalHeight = img.height;

          logger.debug(`Dimensões originais do SVG: ${originalWidth}x${originalHeight}`, "ER_PNG_EXPORT");
          logger.debug(`Tamanho do canvas: ${canvasSize.width}x${canvasSize.height}`, "ER_PNG_EXPORT");

          const { finalWidth, finalHeight, elementsFitInCanvas } = calculateExportDimensions(
            originalWidth,
            originalHeight,
            canvasSize.width,
            canvasSize.height
          );

          logger.debug(`Dimensões finais: ${finalWidth}x${finalHeight} (fit: ${elementsFitInCanvas})`, "ER_PNG_EXPORT");

          setupHighQualityCanvas(canvas, ctx, finalWidth, finalHeight);
          drawImageOnCanvas(ctx, img, finalWidth, finalHeight, originalWidth, originalHeight, elementsFitInCanvas);

          // Convert canvas to PNG
          return new Promise<void>((resolve, reject) => {
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  logger.info("PNG gerado com sucesso", "ER_PNG_EXPORT");
                  
                  const pngUrl = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = pngUrl;
                  const pngFilename = diagramName ? `${diagramName} - ER.png` : "er-diagram.png";
                  a.download = pngFilename;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(pngUrl);

                  notifications.success("Download do PNG bem-sucedido!");
                  resolve();
                } else {
                  reject(new Error("Erro ao criar blob PNG para ER"));
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
          "Erro ao exportar ER PNG. Por favor, tente novamente ou use outro formato.",
        fallback: () => {
          logger.warn(
            "Fallback: A tentar exportar ER PNG com qualidade reduzida",
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
                "Exportado como SVG devido ao erro de ER PNG"
              );
            })
            .catch(() => {
              notifications.error(
                "Não foi possível exportar como PNG ou SVG"
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