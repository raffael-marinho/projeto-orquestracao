// 1. Importar o framework Express
const express = require('express');

// 2. Definir constantes importantes
const PORT = 3000;
// O host '0.0.0.0' é CRUCIAL. Ele faz o servidor escutar por conexões
// de qualquer lugar, o que é necessário para que o Docker consiga se conectar a ele.
const HOST = '0.0.0.0';

// 3. Criar a instância da aplicação Express
const app = express();

// 4. Definir uma rota de teste
// Quando alguém acessar a raiz do nosso site (o endpoint '/'),
// esta função será executada.
app.get('/', (req, res) => {
  // Ela envia de volta uma resposta no formato JSON.
  // Isso é perfeito para uma API que será consumida por um frontend no futuro.
  res.json({ 
      mensagem: 'API do Encurtador de URL funcionando!',
      status: 'OK'
    });
});

// 5. Iniciar o servidor
app.listen(PORT, HOST, () => {
  console.log(`Servidor Node.js rodando em http://${HOST}:${PORT}`);
});