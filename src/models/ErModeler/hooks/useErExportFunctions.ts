import { useState } from "react";
import BpmnModeler from "bpmn-js/lib/Modeler";
import jsPDF from "jspdf";
import { logger } from "../../../utils/logger";
import {
  ErrorHandler,
  ErrorType,
  safeAsyncOperation,
} from "../../../utils/errorHandler";
import { notifications } from "../../../utils/notifications";

export const useErExportFunctions = (
  modelerRef: React.RefObject<BpmnModeler | null>
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
        const a = document.createElement("a");
        a.href = url;
        a.download = "er-diagram.bpmn";
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
                a.download = "er-diagram-fallback.bpmn";
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

    logger.info(
      "Iniciando exportação PDF",
      "ER_PDF_EXPORT"
    );

    await safeAsyncOperation(
      async () => {
        const { svg } = await modelerRef.current!.saveSVG();

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          throw new Error("Não foi possível obter contexto do canvas");
        }

        // Fator de escala ALTO para qualidade máxima (5x = 500 DPI)
        const scaleFactor = 5;

        const svgBlob = new Blob([svg], {
          type: "image/svg+xml;charset=utf-8",
        });
        const url = URL.createObjectURL(svgBlob);
        const img = new Image();

        return new Promise<void>((resolve, reject) => {
          img.onload = function () {
            logger.debug(
              `Dimensões SVG ER originais: ${img.width}x${img.height}`,
              "ER_PDF_EXPORT"
            );

            const originalWidth = img.width;
            const originalHeight = img.height;
            const highResWidth = originalWidth * scaleFactor;
            const highResHeight = originalHeight * scaleFactor;

            // Configurar canvas para resolução máxima
            canvas.width = highResWidth;
            canvas.height = highResHeight;

            // CONFIGURAÇÕES PARA QUALIDADE MÁXIMA
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";

            // ✅ GARANTIR FUNDO BRANCO SÓLIDO
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, highResWidth, highResHeight);

            // Escalar contexto APÓS pintar o fundo
            ctx.scale(scaleFactor, scaleFactor);

            // Desenhar SVG escalado sobre fundo branco
            ctx.drawImage(img, 0, 0);

            // Criar PDF com dimensões em milímetros para precisão
            const mmWidth = originalWidth * 0.264583; // px para mm (1px = 0.264583mm)
            const mmHeight = originalHeight * 0.264583;

            const pdf = new jsPDF({
              orientation: mmWidth > mmHeight ? "landscape" : "portrait",
              unit: "mm",
              format: [mmWidth, mmHeight],
            });

            // Usar PNG sem compressão para melhor qualidade
            const imgData = canvas.toDataURL("image/png", 1.0); // PNG sem compressão

            logger.debug(
              `PDF ER: ${mmWidth.toFixed(1)}x${mmHeight.toFixed(1)}mm`,
              "ER_PDF_EXPORT"
            );
            pdf.addImage(
              imgData,
              "PNG",
              0,
              0,
              mmWidth,
              mmHeight,
              undefined,
              "SLOW"
            );

            logger.info(
              "PDF gerado com sucesso",
              "ER_PDF_EXPORT"
            );
            pdf.save("er-diagram.pdf");
            notifications.success(
              "PDF exportado com sucesso!"
            );

            URL.revokeObjectURL(url);
            resolve();
          };

          img.onerror = function () {
            logger.error(
              "Erro ao carregar SVG como imagem para PDF ER",
              "ER_PDF_EXPORT"
            );
            URL.revokeObjectURL(url);
            reject(new Error("Erro ao processar SVG ER"));
          };

          img.src = url;
        });
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
              link.download = "er-diagram-fallback.svg";
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

    logger.info(
      "Iniciando exportação PNG",
      "ER_PNG_EXPORT"
    );

    await safeAsyncOperation(
      async () => {
        const { svg } = await modelerRef.current!.saveSVG();

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          throw new Error("Não foi possível obter contexto do canvas");
        }

        const svgBlob = new Blob([svg], {
          type: "image/svg+xml;charset=utf-8",
        });
        const url = URL.createObjectURL(svgBlob);
        const img = new Image();

        return new Promise<void>((resolve, reject) => {
          img.onload = function () {
            logger.debug(
              `Dimensões SVG ER originais: ${img.width}x${img.height}`,
              "ER_PNG_EXPORT"
            );

            // Fator de escala ALTO para qualidade máxima (5x = 500 DPI)
            const scaleFactor = 5;
            const highResWidth = img.width * scaleFactor;
            const highResHeight = img.height * scaleFactor;

            canvas.width = highResWidth;
            canvas.height = highResHeight;

            // CONFIGURAÇÕES PARA QUALIDADE MÁXIMA
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";

            // ✅ GARANTIR FUNDO BRANCO SÓLIDO
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, highResWidth, highResHeight);

            // Escalar contexto APÓS pintar o fundo
            ctx.scale(scaleFactor, scaleFactor);

            // Desenhar SVG escalado sobre fundo branco
            ctx.drawImage(img, 0, 0);

            // Converter canvas para PNG com qualidade máxima
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  logger.info(
                    "PNG gerado com sucesso",
                    "ER_PNG_EXPORT"
                  );
                  const pngUrl = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = pngUrl;
                  a.download = "er-diagram.png";
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(pngUrl);
                  notifications.success(
                    "Download de PNG com sucesso!"
                  );
                  resolve();
                } else {
                  reject(new Error("Erro ao criar blob PNG ER"));
                }
              },
              "image/png",
              1.0
            );

            URL.revokeObjectURL(url);
          };

          img.onerror = function () {
            logger.error(
              "Erro ao carregar SVG como imagem para PNG ER",
              "ER_PNG_EXPORT"
            );
            URL.revokeObjectURL(url);
            reject(new Error("Erro ao processar SVG ER para PNG"));
          };

          img.src = url;
        });
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
              link.download = "er-diagram-fallback.svg";
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
