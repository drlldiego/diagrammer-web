import { useState } from "react";
import BpmnModeler from "bpmn-js/lib/Modeler";
import jsPDF from "jspdf";
import { logger } from "../../../utils/logger";
import { ErrorHandler, ErrorType, safeAsyncOperation } from "../../../utils/errorHandler";
import { notifications } from "../../../utils/notifications";

export const useExportFunctions = (
  modelerRef: React.RefObject<BpmnModeler | null>,
  markBpmnExported?: () => void
) => {
  const [xml, setXml] = useState<string>("");
  const [exportDropdownOpen, setExportDropdownOpen] = useState<boolean>(false);

  const exportDiagram = async () => {
    if (!modelerRef.current) return;
    
    logger.info('Iniciando exportação BPMN XML', 'BPMN_EXPORT');
    
    await safeAsyncOperation(
      async () => {
        const { xml } = await modelerRef.current!.saveXML({ format: true });
        const xmlString: string = xml ?? "";
        setXml(xmlString);
        const blob = new Blob([xmlString], { type: "application/xml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "diagram.bpmn";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Marcar que houve exportação .bpmn
        if (markBpmnExported) {
          markBpmnExported();
        }
        
        notifications.success('Diagrama BPMN exportado com sucesso!');
        logger.info('BPMN XML exportado com sucesso', 'BPMN_EXPORT');
      },
      {
        type: ErrorType.BPMN_EXPORT,
        operation: 'Exportar diagrama BPMN',
        userMessage: 'Erro ao exportar diagrama BPMN. Tente novamente.',
        fallback: () => {
          logger.warn('Fallback: Tentando salvar XML em formato não formatado', 'BPMN_EXPORT');
          // Tentar exportar sem formatação como fallback
          modelerRef.current?.saveXML({ format: false }).then(({ xml }) => {
            if (xml) {
              const blob = new Blob([xml], { type: "application/xml" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "diagram-fallback.bpmn";
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              notifications.warning('Diagrama exportado em formato básico devido a erro');
            }
          }).catch(() => {
            notifications.error('Não foi possível exportar o diagrama');
          });
        }
      }
    );
  };

  const exportToPDF = async () => {
    if (!modelerRef.current) return;

    logger.info('Iniciando exportação PDF BPMN com qualidade máxima', 'PDF_EXPORT');
    
    await safeAsyncOperation(
      async () => {
      
      const { svg } = await modelerRef.current!.saveSVG();

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      if (!ctx) {
        throw new Error('Não foi possível obter contexto do canvas');
      }
      
      // Fator de escala ALTO para qualidade máxima (5x = 500 DPI)
      const scaleFactor = 5;
      
      const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();

      img.onload = function () {
        console.log(`📐 Dimensões SVG originais: ${img.width}x${img.height}`);
        
        const originalWidth = img.width;
        const originalHeight = img.height;
        const highResWidth = originalWidth * scaleFactor;
        const highResHeight = originalHeight * scaleFactor;
        
        // Configurar canvas para resolução máxima
        canvas.width = highResWidth;
        canvas.height = highResHeight;                
        
        // CONFIGURAÇÕES PARA QUALIDADE MÁXIMA
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // GARANTIR FUNDO BRANCO SÓLIDO
        ctx.fillStyle = '#FFFFFF';
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

        // USAR PNG SEM COMPRESSÃO para máxima qualidade
        const imgData = canvas.toDataURL("image/png", 1.0); // PNG sem compressão                
        pdf.addImage(imgData, "PNG", 0, 0, mmWidth, mmHeight, undefined, 'SLOW'); // SLOW = máxima qualidade
        
        logger.info('PDF gerado com sucesso', 'PDF_EXPORT');
        pdf.save("diagrama-bpmn.pdf");
        notifications.success('PDF exportado com sucesso!');

        URL.revokeObjectURL(url);
      };

      img.onerror = function() {
        logger.error('Erro ao carregar SVG como imagem para PDF', 'PDF_EXPORT');
        throw new Error('Erro ao processar SVG BPMN');
      };

      img.src = url;
      },
      {
        type: ErrorType.PDF_EXPORT,
        operation: 'Exportar PDF BPMN',
        userMessage: 'Erro ao exportar PDF. Tente usar outro formato ou verifique se o diagrama está válido.',
        fallback: () => {
          logger.warn('Fallback: Tentando exportar PDF com qualidade reduzida', 'PDF_EXPORT');
          // Fallback: tentar exportar com qualidade reduzida
          modelerRef.current?.saveSVG().then(({ svg }) => {
            const link = document.createElement('a');
            const blob = new Blob([svg], { type: 'image/svg+xml' });
            link.href = URL.createObjectURL(blob);
            link.download = 'diagram-fallback.svg';
            link.click();
            notifications.warning('Exportado como SVG devido a erro no PDF');
          }).catch(() => {
            notifications.error('Não foi possível exportar nem em PDF nem em SVG');
          });
        }
      }
    );
  };

  const exportToPNG = async () => {
    if (!modelerRef.current) return;

    try {          
      const { svg } = await modelerRef.current!.saveSVG();

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      if (!ctx) {
        throw new Error('Não foi possível obter contexto do canvas');
      }

      const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();

      img.onload = function () {                
        // Fator de escala ALTO para qualidade máxima (5x = 500 DPI)
        const scaleFactor = 5;
        const highResWidth = img.width * scaleFactor;
        const highResHeight = img.height * scaleFactor;
        
        canvas.width = highResWidth;
        canvas.height = highResHeight;                
        
        // CONFIGURAÇÕES PARA QUALIDADE MÁXIMA
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // GARANTIR FUNDO BRANCO SÓLIDO
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, highResWidth, highResHeight);        
        
        // Escalar contexto APÓS pintar o fundo
        ctx.scale(scaleFactor, scaleFactor);
        
        // Desenhar SVG escalado sobre fundo branco
        ctx.drawImage(img, 0, 0);        

        // Converter canvas para PNG com qualidade máxima
        canvas.toBlob((blob) => {
          if (blob) {            
            const pngUrl = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = pngUrl;
            a.download = "diagrama-bpmn.png";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(pngUrl);
          } else {
            logger.error('Erro ao criar blob PNG BPMN');
          }
        }, "image/png", 1.0); // Qualidade máxima PNG

        URL.revokeObjectURL(url);
      };

      img.onerror = function() {
        logger.error('Erro ao processar SVG BPMN para PNG. Tente novamente.');
      };

      img.src = url;
    } catch (err) {
      logger.error('Erro na exportação PNG BPMN:', undefined, err as Error);
    }
  };

  const toggleExportDropdown = () => {
    setExportDropdownOpen(!exportDropdownOpen);
  };

  const handleExportOption = (type: 'pdf' | 'png' | 'bpmn') => {
    setExportDropdownOpen(false);
    
    switch(type) {
      case 'pdf':
        exportToPDF();
        break;
      case 'png':
        exportToPNG();
        break;
      case 'bpmn':
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
    handleExportOption
  };
};