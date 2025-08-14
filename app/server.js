const express = require('express');
const { Pool } = require('pg'); // Importa o driver do PostgreSQL

const PORT = 3000;
const HOST = '0.0.0.0';

// Configuração do Pool de Conexões com o PostgreSQL
// As variáveis de ambiente são injetadas pelo docker-compose.yml
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const app = express();
// Middleware para conseguir ler o corpo (body) de requisições POST em JSON
app.use(express.json());

// Função para criar a tabela de URLs se ela não existir
const createTable = async () => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS urls (
      id SERIAL PRIMARY KEY,
      original_url TEXT NOT NULL,
      short_code VARCHAR(10) UNIQUE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;
  try {
    await pool.query(queryText);
    console.log('Tabela "urls" verificada/criada com sucesso.');
  } catch (err) {
    console.error('Erro ao criar a tabela "urls":', err.stack);
  }
};

// Endpoint de Health Check para verificar a conexão com o banco
app.get('/health', async (req, res) => {
  try {
    const client = await pool.connect();
    res.status(200).json({ status: 'OK', db_connection: 'connected' });
    client.release(); // Libera o cliente de volta para o pool
  } catch (err) {
    res.status(500).json({ status: 'Error', db_connection: 'disconnected', error: err.message });
  }
});

// Endpoint para listar todas as URLs (exemplo)
app.get('/urls', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, original_url, short_code FROM urls ORDER BY created_at DESC');
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para criar uma nova URL encurtada
app.post('/urls', async (req, res) => {
  const { original_url } = req.body;
  if (!original_url) {
    return res.status(400).json({ error: 'original_url é obrigatório' });
  }
  // Lógica simples para gerar um código curto (em um projeto real, isso seria mais robusto)
  const short_code = Math.random().toString(36).substring(2, 8);

  try {
    const queryText = 'INSERT INTO urls(original_url, short_code) VALUES($1, $2) RETURNING *';
    const result = await pool.query(queryText, [original_url, short_code]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const startServer = async () => {
  let retries = 5;
  while (retries) {
    try {
      // Tenta se conectar e criar a tabela
      const client = await pool.connect();
      console.log('Conexão com o banco de dados bem-sucedida.');
      
      await createTable(); // A função que você já tem, para criar a tabela
      
      client.release();
      break; // Sai do loop se tudo deu certo
    } catch (err) {
      console.error('Não foi possível conectar ao banco de dados:', err.message);
      retries -= 1;
      console.log(`Tentativas restantes: ${retries}. Tentando novamente em 5 segundos...`);
      if (retries === 0) {
        console.error('Não foi possível estabelecer conexão com o banco de dados após várias tentativas. Encerrando.');
        process.exit(1); // Encerra a aplicação se não conseguir conectar
      }
      await wait(5000); // Espera 5 segundos antes de tentar novamente
    }
  }

  // Só inicia o servidor Express se a conexão com o banco foi bem-sucedida
  app.listen(PORT, HOST, () => {
    console.log(`Servidor Node.js rodando em http://${HOST}:${PORT}`);
  });
};

startServer();