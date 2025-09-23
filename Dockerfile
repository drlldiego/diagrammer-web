# Imagem base com Node
FROM node:18-alpine

# Criar diretório da app
WORKDIR /app

# Copiar package.json primeiro para otimizar cache
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar código da app
COPY . .

# Expor porta usada pelo React (3000 por padrão)
EXPOSE 3000

# Comando para rodar em modo dev
CMD ["npm", "start"]