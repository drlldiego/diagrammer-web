import { useState } from "react";
import BpmnModeler from "bpmn-js/lib/Modeler";
import jsPDF from "jspdf";

export const useExportFunctions = (modelerRef: React.MutableRefObject<BpmnModeler | null>) => {
  const [xml, setXml] = useState<string>("");
  const [exportDropdownOpen, setExportDropdownOpen] = useState<boolean>(false);

  const exportDiagram = async () => {
    if (!modelerRef.current) return;
    try {
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
    } catch (err) {
      console.error("Error exporting BPMN XML", err);
    }
  };

  const exportToPDF = async () => {
    if (!modelerRef.current) return;

    try {
      console.log('🎯 Iniciando exportação PDF BPMN com qualidade máxima...');
      
      const { svg } = await modelerRef.current.saveSVG();

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
        
        console.log(`📐 Canvas alta resolução: ${highResWidth}x${highResHeight} (escala ${scaleFactor}x)`);
        
        // CONFIGURAÇÕES PARA QUALIDADE MÁXIMA
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // ✅ GARANTIR FUNDO BRANCO SÓLIDO
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, highResWidth, highResHeight);
        console.log('✅ Fundo branco aplicado');
        
        // Escalar contexto APÓS pintar o fundo
        ctx.scale(scaleFactor, scaleFactor);
        
        // Desenhar SVG escalado sobre fundo branco
        ctx.drawImage(img, 0, 0);
        console.log('✅ SVG BPMN desenhado sobre fundo branco');

        // Criar PDF com dimensões em milímetros para precisão
        const mmWidth = originalWidth * 0.264583; // px para mm (1px = 0.264583mm)
        const mmHeight = originalHeight * 0.264583;
        
        const pdf = new jsPDF({
          orientation: mmWidth > mmHeight ? "landscape" : "portrait",
          unit: "mm",
          format: [mmWidth, mmHeight],
        });

        // ✅ USAR PNG SEM COMPRESSÃO para máxima qualidade
        const imgData = canvas.toDataURL("image/png", 1.0); // PNG sem compressão
        
        console.log(`📄 PDF BPMN: ${mmWidth.toFixed(1)}x${mmHeight.toFixed(1)}mm`);
        pdf.addImage(imgData, "PNG", 0, 0, mmWidth, mmHeight, undefined, 'SLOW'); // SLOW = máxima qualidade
        
        console.log('✅ PDF BPMN ALTA QUALIDADE gerado com sucesso');
        pdf.save("diagrama-bpmn.pdf");

        URL.revokeObjectURL(url);
      };

      img.onerror = function() {
        console.error('❌ Erro ao carregar SVG como imagem');
        alert('Erro ao processar SVG BPMN. Tente novamente.');
      };

      img.src = url;
    } catch (err) {
      console.error("❌ Erro crítico na exportação PDF BPMN:", err);
      alert(`Erro na exportação PDF BPMN: ${err}`);
    }
  };

  const exportToPNG = async () => {
    if (!modelerRef.current) return;

    try {
      console.log('🎯 Iniciando exportação PNG BPMN com qualidade máxima...');
      
      const { svg } = await modelerRef.current.saveSVG();

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      if (!ctx) {
        throw new Error('Não foi possível obter contexto do canvas');
      }

      const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();

      img.onload = function () {
        console.log(`📐 Dimensões SVG originais: ${img.width}x${img.height}`);
        
        // Fator de escala ALTO para qualidade máxima (5x = 500 DPI)
        const scaleFactor = 5;
        const highResWidth = img.width * scaleFactor;
        const highResHeight = img.height * scaleFactor;
        
        canvas.width = highResWidth;
        canvas.height = highResHeight;
        
        console.log(`📐 PNG alta resolução: ${highResWidth}x${highResHeight} (escala ${scaleFactor}x)`);
        
        // CONFIGURAÇÕES PARA QUALIDADE MÁXIMA
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // ✅ GARANTIR FUNDO BRANCO SÓLIDO
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, highResWidth, highResHeight);
        console.log('✅ Fundo branco aplicado ao PNG BPMN');
        
        // Escalar contexto APÓS pintar o fundo
        ctx.scale(scaleFactor, scaleFactor);
        
        // Desenhar SVG escalado sobre fundo branco
        ctx.drawImage(img, 0, 0);
        console.log('✅ SVG BPMN desenhado sobre fundo branco');

        // Converter canvas para PNG com qualidade máxima
        canvas.toBlob((blob) => {
          if (blob) {
            console.log('✅ PNG BPMN ALTA QUALIDADE gerado com sucesso');
            const pngUrl = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = pngUrl;
            a.download = "diagrama-bpmn.png";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(pngUrl);
          } else {
            console.error('❌ Erro ao criar blob PNG BPMN');
          }
        }, "image/png", 1.0); // Qualidade máxima PNG

        URL.revokeObjectURL(url);
      };

      img.onerror = function() {
        console.error('❌ Erro ao carregar SVG como imagem para PNG BPMN');
        alert('Erro ao processar SVG BPMN para PNG. Tente novamente.');
      };

      img.src = url;
    } catch (err) {
      console.error("❌ Erro crítico na exportação PNG BPMN:", err);
      alert(`Erro na exportação PNG BPMN: ${err}`);
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