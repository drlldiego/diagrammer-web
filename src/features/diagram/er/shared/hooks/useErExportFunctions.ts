import { useState } from "react";
import BpmnModeler from "bpmn-js/lib/Modeler";
import jsPDF from "jspdf";
import { logger } from "../../../../../utils/logger";
import {
  ErrorType,
  safeAsyncOperation,
} from "../../../../../utils/errorHandler";
import { notifications } from "../../../../../utils/notifications";
// Função para remover setas das conexões no SVG
const removeArrowMarkersFromSVG = (svgString: string): string => {
  try {
    // Remover definições de marcadores de seta
    let processedSvg = svgString.replace(/<defs>[\s\S]*?<\/defs>/g, (match) => {
      // Manter defs mas remover markers de seta
      return match.replace(/<marker[^>]*?id="[^"]*arrow[^"]*"[^>]*?>[\s\S]*?<\/marker>/gi, '');
    });
    
    // Remover atributos marker-end e marker-start das conexões
    processedSvg = processedSvg.replace(/marker-(end|start)="[^"]*"/g, '');
    
    // Remover qualquer referência a markers de seta em paths
    processedSvg = processedSvg.replace(/marker-(end|start):\s*url\([^)]*\)/g, '');
    
    logger.debug('Setas removidas do SVG para exportação', 'ER_EXPORT');
    return processedSvg;
  } catch (error) {
    logger.warn('Erro ao remover setas do SVG, usando SVG original', 'ER_EXPORT', error as Error);
    return svgString;
  }
};

// Função utilitária para preparar SVG para exportação
const prepareSVGForExport = async (modelerRef: React.RefObject<BpmnModeler | null>) => {
  if (!modelerRef.current) throw new Error("Modeler não encontrado");
  
  const { svg: originalSvg } = await modelerRef.current.saveSVG();
  if (!originalSvg) throw new Error("Não foi possível gerar SVG do diagrama");
  
  // Remover setas das conexões para manter consistência visual com o canvas
  const svg = removeArrowMarkersFromSVG(originalSvg);
  
  if (!svg.includes('<svg') || !svg.includes('</svg>')) {
    throw new Error("SVG inválido ou malformado");
  }
  
  return svg;
};

// Função utilitária para configurar canvas com qualidade máxima
const setupHighQualityCanvas = (
  canvas: HTMLCanvasElement, 
  ctx: CanvasRenderingContext2D,
  finalWidth: number,
  finalHeight: number,
  scaleFactor: number = 5
) => {
  const highResWidth = finalWidth * scaleFactor;
  const highResHeight = finalHeight * scaleFactor;
  
  canvas.width = highResWidth;
  canvas.height = highResHeight;
  
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  
  // Fundo branco sólido
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, highResWidth, highResHeight);
  
  ctx.scale(scaleFactor, scaleFactor);
  
  return { highResWidth, highResHeight };
};

// Função utilitária para criar imagem a partir de SVG
const createImageFromSVG = (svg: string): Promise<{ img: HTMLImageElement; url: string }> => {
  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    
    img.crossOrigin = 'anonymous';
    
    img.onload = () => resolve({ img, url });
    img.onerror = (event) => {
      URL.revokeObjectURL(url);
      reject(new Error("Erro ao carregar SVG como imagem"));
    };
    
    img.src = url;
  });
};

export const useErExportFunctions = (
  modelerRef: React.RefObject<BpmnModeler | null>,
  diagramName?: string
) => {
  const [xml, setXml] = useState<string>("");
  const [exportDropdownOpen, setExportDropdownOpen] = useState<boolean>(false);

  const exportDiagram = async () => {
    if (!modelerRef.current) return;

    logger.info("Iniciando exportação ER XML", "ER_EXPORT");

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
        logger.info("ER XML exportado com sucesso", "ER_EXPORT");
      },
      {
        type: ErrorType.BPMN_EXPORT,
        operation: "Exportar diagrama ER",
        userMessage: "Erro ao exportar diagrama ER. Tente novamente.",
        fallback: () => {
          logger.warn(
            "Fallback: Tentando salvar ER XML em formato não formatado",
            "ER_EXPORT"
          );
          // Tentar exportar sem formatação como fallback
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
                  "Diagrama ER exportado em formato básico devido a erro"
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

    logger.info("Iniciando exportação PDF", "ER_PDF_EXPORT");

    await safeAsyncOperation(
      async () => {
        const svg = await prepareSVGForExport(modelerRef);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          throw new Error("Não foi possível obter contexto do canvas");
        }

        // Obter viewport atual
        const canvasElement = modelerRef.current!.get("canvas") as any;
        const viewport = canvasElement.viewbox();
        const canvasSize = { width: viewport.outer.width, height: viewport.outer.height };

        logger.debug(`SVG length: ${svg.length} chars`, "ER_PDF_EXPORT");
        
        const { img, url } = await createImageFromSVG(svg);

        try {
          const originalWidth = img.width;
          const originalHeight = img.height;
          
          logger.debug(`Dimensões SVG originais: ${originalWidth}x${originalHeight}`, "ER_PDF_EXPORT");
          logger.debug(`Tamanho do canvas: ${canvasSize.width}x${canvasSize.height}`, "ER_PDF_EXPORT");

          // Verificar se os elementos cabem no tamanho do canvas
          const elementsFitInCanvas = originalWidth <= canvasSize.width && originalHeight <= canvasSize.height;
          const finalWidth = elementsFitInCanvas ? canvasSize.width : originalWidth;
          const finalHeight = elementsFitInCanvas ? canvasSize.height : originalHeight;
          
          logger.debug(`Dimensões finais: ${finalWidth}x${finalHeight} (cabem: ${elementsFitInCanvas})`, "ER_PDF_EXPORT");

          const { highResWidth, highResHeight } = setupHighQualityCanvas(canvas, ctx, finalWidth, finalHeight);

          // Desenhar imagem no canvas
          if (elementsFitInCanvas) {
            const offsetX = (finalWidth - originalWidth) / 2;
            const offsetY = (finalHeight - originalHeight) / 2;
            ctx.drawImage(img, offsetX, offsetY);
          } else {
            ctx.drawImage(img, 0, 0);
          }

          // Criar PDF
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
        operation: "Exportar PDF ER",
        userMessage:
          "Erro ao exportar PDF ER. Tente usar outro formato ou verifique se o diagrama está válido.",
        fallback: () => {
          logger.warn(
            "Fallback: Tentando exportar PDF ER com qualidade reduzida",
            "ER_PDF_EXPORT"
          );
          // Fallback: tentar exportar como SVG
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
                "Não foi possível exportar nem em PDF nem em SVG"
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
          throw new Error("Não foi possível obter contexto do canvas");
        }

        // Obter viewport atual
        const canvasElement = modelerRef.current!.get("canvas") as any;
        const viewport = canvasElement.viewbox();
        const canvasSize = { width: viewport.outer.width, height: viewport.outer.height };

        logger.debug(`SVG length: ${svg.length} chars`, "ER_PNG_EXPORT");
        
        const { img, url } = await createImageFromSVG(svg);

        try {
          const originalWidth = img.width;
          const originalHeight = img.height;
          
          logger.debug(`Dimensões SVG originais: ${originalWidth}x${originalHeight}`, "ER_PNG_EXPORT");
          logger.debug(`Tamanho do canvas: ${canvasSize.width}x${canvasSize.height}`, "ER_PNG_EXPORT");

          // Verificar se os elementos cabem no tamanho do canvas
          const elementsFitInCanvas = originalWidth <= canvasSize.width && originalHeight <= canvasSize.height;
          const finalWidth = elementsFitInCanvas ? canvasSize.width : originalWidth;
          const finalHeight = elementsFitInCanvas ? canvasSize.height : originalHeight;
          
          logger.debug(`Dimensões finais: ${finalWidth}x${finalHeight} (cabem: ${elementsFitInCanvas})`, "ER_PNG_EXPORT");

          setupHighQualityCanvas(canvas, ctx, finalWidth, finalHeight);

          // Desenhar imagem no canvas
          if (elementsFitInCanvas) {
            const offsetX = (finalWidth - originalWidth) / 2;
            const offsetY = (finalHeight - originalHeight) / 2;
            ctx.drawImage(img, offsetX, offsetY);
          } else {
            ctx.drawImage(img, 0, 0);
          }

          // Converter canvas para PNG
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
                  
                  notifications.success("Download de PNG com sucesso!");
                  resolve();
                } else {
                  reject(new Error("Erro ao criar blob PNG ER"));
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
        operation: "Exportar PNG ER",
        userMessage:
          "Erro ao exportar PNG ER. Tente novamente ou use outro formato.",
        fallback: () => {
          logger.warn(
            "Fallback: Tentando exportar PNG ER com qualidade reduzida",
            "ER_PNG_EXPORT"
          );
          // Fallback: tentar exportar como SVG
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
                "Exportado como SVG devido a erro no PNG ER"
              );
            })
            .catch(() => {
              notifications.error(
                "Não foi possível exportar nem em PNG nem em SVG"
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