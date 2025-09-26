# Etapa 1: Build da app
FROM node:18-alpine AS build

WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar código fonte
COPY . .

# Fazer build da aplicação React
RUN npm run build


# Etapa 2: Servir com Nginx
FROM nginx:stable-alpine

# Apagar configurações default do nginx
RUN rm -rf /usr/share/nginx/html/*

# Copiar build gerado
COPY --from=build /app/build /usr/share/nginx/html

# Copiar config customizada
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
