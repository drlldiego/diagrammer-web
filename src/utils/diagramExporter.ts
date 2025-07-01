import BpmnJS from "bpmn-js/lib/Modeler";
import { DiagramType } from "../types/DiagramTypes";

export interface ExportOptions {
  format: "xml" | "svg" | "png";
  filename?: string;
}

export class DiagramExporter {
  static async exportDiagram(
    modeler: BpmnJS,
    diagramType: DiagramType,
    options: ExportOptions
  ): Promise<void> {
    const { format, filename } = options;
    const defaultFilename = `diagram_${diagramType}_${Date.now()}`;

    try {
      switch (format) {
        case "xml":
          await this.exportAsXML(modeler, filename || `${defaultFilename}.xml`);
          break;
        case "svg":
          await this.exportAsSVG(modeler, filename || `${defaultFilename}.svg`);
          break;
        case "png":
          await this.exportAsPNG(modeler, filename || `${defaultFilename}.png`);
          break;
        default:
          throw new Error(`Formato não suportado: ${format}`);
      }
    } catch (error) {
      console.error("Export error:", error);
      throw error;
    }
  }

  private static async exportAsXML(
    modeler: BpmnJS,
    filename: string
  ): Promise<void> {
    const result = (await modeler.saveXML({ format: true })) as {
      xml?: string;
    };
    const xml = result.xml;

    if (!xml) {
      throw new Error("Falha ao gerar XML");
    }

    this.downloadFile(xml, filename, "application/xml");
  }

  private static async exportAsSVG(
    modeler: BpmnJS,
    filename: string
  ): Promise<void> {
    const result = (await modeler.saveSVG()) as {
      svg?: string;
    };
    const svg = result.svg;

    if (!svg) {
      throw new Error("Falha ao gerar SVG");
    }

    this.downloadFile(svg, filename, "image/svg+xml");
  }

  private static async exportAsPNG(
    modeler: BpmnJS,
    filename: string
  ): Promise<void> {
    const { svg } = await modeler.saveSVG();

    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);

        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            this.downloadURL(url, filename);
            URL.revokeObjectURL(url);
            resolve();
          } else {
            reject(new Error("Falha ao gerar PNG"));
          }
        }, "image/png");
      };

      img.onerror = () => reject(new Error("Falha ao carregar SVG"));
      img.src = "data:image/svg+xml;base64," + btoa(svg);
    });
  }

  private static downloadFile(
    content: string,
    filename: string,
    mimeType: string
  ): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    this.downloadURL(url, filename);
    URL.revokeObjectURL(url);
  }

  private static downloadURL(url: string, filename: string): void {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}
