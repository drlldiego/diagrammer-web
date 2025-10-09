/**
 * Utility functions for ER diagram export functionality
 * Extracted from useErExportFunctions to reduce code duplication
 */

import BpmnModeler from "bpmn-js/lib/Modeler";
import { logger } from "../../../../../utils/logger";

/**
 * Removes arrow markers from SVG connections to maintain consistency with canvas display
 */
export const removeArrowMarkersFromSVG = (svgString: string): string => {
  try {
    // Remove arrow marker definitions
    let processedSvg = svgString.replace(/<defs>[\s\S]*?<\/defs>/g, (match) => {
      // Keep defs but remove arrow markers
      return match.replace(/<marker[^>]*?id="[^"]*arrow[^"]*"[^>]*?>[\s\S]*?<\/marker>/gi, '');
    });
    
    // Remove marker-end and marker-start attributes from connections
    processedSvg = processedSvg.replace(/marker-(end|start)="[^"]*"/g, '');
    
    // Remove any arrow marker references in paths
    processedSvg = processedSvg.replace(/marker-(end|start):\s*url\([^)]*\)/g, '');
    
    logger.debug('Arrow markers removed from SVG for export', 'ER_EXPORT');
    return processedSvg;
  } catch (error) {
    logger.warn('Error removing arrows from SVG, using original SVG', 'ER_EXPORT', error as Error);
    return svgString;
  }
};

/**
 * Prepares SVG for export by generating and cleaning the SVG content
 */
export const prepareSVGForExport = async (modelerRef: React.RefObject<BpmnModeler | null>) => {
  if (!modelerRef.current) throw new Error("Modeler not found");
  
  const { svg: originalSvg } = await modelerRef.current.saveSVG();
  if (!originalSvg) throw new Error("Could not generate SVG from diagram");
  
  // Remove arrows from connections to maintain visual consistency with canvas
  const svg = removeArrowMarkersFromSVG(originalSvg);
  
  if (!svg.includes('<svg') || !svg.includes('</svg>')) {
    throw new Error("Invalid or malformed SVG");
  }
  
  return svg;
};

/**
 * Sets up a high-quality canvas for image export
 */
export const setupHighQualityCanvas = (
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
  
  // Solid white background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, highResWidth, highResHeight);
  
  ctx.scale(scaleFactor, scaleFactor);
  
  return { highResWidth, highResHeight };
};

/**
 * Creates an image element from SVG string
 */
export const createImageFromSVG = (svg: string): Promise<{ img: HTMLImageElement; url: string }> => {
  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    
    img.crossOrigin = 'anonymous';
    
    img.onload = () => resolve({ img, url });
    img.onerror = (event) => {
      URL.revokeObjectURL(url);
      reject(new Error("Error loading SVG as image"));
    };
    
    img.src = url;
  });
};

/**
 * Gets viewport information from the modeler
 */
export const getCanvasViewport = (modelerRef: React.RefObject<BpmnModeler | null>) => {
  if (!modelerRef.current) throw new Error("Modeler not found");
  
  const canvasElement = modelerRef.current.get("canvas") as any;
  const viewport = canvasElement.viewbox();
  
  return {
    width: viewport.outer.width,
    height: viewport.outer.height
  };
};

/**
 * Calculates final dimensions for export based on canvas and content size
 */
export const calculateExportDimensions = (
  originalWidth: number,
  originalHeight: number,
  canvasWidth: number,
  canvasHeight: number
) => {
  const elementsFitInCanvas = originalWidth <= canvasWidth && originalHeight <= canvasHeight;
  const finalWidth = elementsFitInCanvas ? canvasWidth : originalWidth;
  const finalHeight = elementsFitInCanvas ? canvasHeight : originalHeight;
  
  return {
    finalWidth,
    finalHeight,
    elementsFitInCanvas
  };
};

/**
 * Draws image on canvas with proper positioning
 */
export const drawImageOnCanvas = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  finalWidth: number,
  finalHeight: number,
  originalWidth: number,
  originalHeight: number,
  elementsFitInCanvas: boolean
) => {
  if (elementsFitInCanvas) {
    const offsetX = (finalWidth - originalWidth) / 2;
    const offsetY = (finalHeight - originalHeight) / 2;
    ctx.drawImage(img, offsetX, offsetY);
  } else {
    ctx.drawImage(img, 0, 0);
  }
};