# Usamos a imagem oficial e leve do Nginx.
FROM nginx:1.25-alpine

# Remove o arquivo de configuração padrão do Nginx.
RUN rm /etc/nginx/conf.d/default.conf

# Copia nosso arquivo de configuração personalizado para o lugar certo dentro do contêiner.
COPY nginx.conf /etc/nginx/conf.d/