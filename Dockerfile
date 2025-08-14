# Passo 1: Imagem Base
# Começamos com uma imagem oficial do Node.js, a versão 18-alpine é leve e segura.
FROM node:18-alpine

# Passo 2: Diretório de Trabalho
# Criamos e definimos um diretório de trabalho dentro do contêiner.
# Todos os comandos a seguir serão executados a partir daqui.
WORKDIR /code

# Passo 3: Copiar e Instalar Dependências
# Copiamos os arquivos 'package.json' e 'package-lock.json' (se existir).
# O '*' garante que ambos sejam copiados.
COPY app/package*.json ./
# Executamos 'npm install' para baixar as dependências listadas no package.json.
# Fazer isso ANTES de copiar o resto do código é uma otimização importante!
RUN npm install

# Passo 4: Copiar o Código da Aplicação
# Agora sim, copiamos os arquivos da nossa aplicação para o contêiner.
COPY ./app .

# Passo 5: Expor a Porta
# Informamos ao Docker que nossa aplicação, dentro do contêiner, vai rodar na porta 3000.
EXPOSE 3000

# Passo 6: Comando de Execução
# Este é o comando que será executado para iniciar nossa aplicação quando o contêiner subir.
# Ele executa o script "start" que definimos no nosso package.json.
CMD [ "npm", "start" ]