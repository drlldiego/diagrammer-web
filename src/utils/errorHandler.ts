export const handleDiagramError = (error: unknown, context: string): string => {
  console.error(`Error in ${context}:`, error);
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return `Erro desconhecido em ${context}`;
};