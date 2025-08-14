const express = require('express');
const { Pool } = require('pg');
const { createClient } = require('redis'); // Importa o cliente do Redis

const PORT = 3000;
const HOST = '0.0.0.0';

// --- Conexões ---
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
});
redisClient.on('error', (err) => console.log('Redis Client Error', err));

const app = express();
app.use(express.json());

// --- Funções de Inicialização ---
const createTable = async () => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS urls (
      id SERIAL PRIMARY KEY,
      original_url TEXT NOT NULL,
      short_code VARCHAR(10) UNIQUE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;
  await pool.query(queryText);
  console.log('Tabela "urls" verificada/criada com sucesso.');
};

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const connectWithRetry = async (serviceName, connectFn) => {
  let retries = 5;
  while (retries) {
    try {
      await connectFn();
      console.log(`Conexão com ${serviceName} bem-sucedida.`);
      break;
    } catch (err) {
      console.error(`Não foi possível conectar ao ${serviceName}:`, err.message);
      retries -= 1;
      console.log(`Tentativas restantes: ${retries}. Tentando novamente em 5 segundos...`);
      if (retries === 0) {
        console.error(`Não foi possível estabelecer conexão com ${serviceName}. Encerrando.`);
        process.exit(1);
      }
      await wait(5000);
    }
  }
};

// --- Endpoints da API ---
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', services: ['API', 'PostgreSQL', 'Redis'] });
});

app.get('/urls', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, original_url, short_code FROM urls ORDER BY created_at DESC');
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/urls', async (req, res) => {
  const { original_url } = req.body;
  if (!original_url) return res.status(400).json({ error: 'original_url é obrigatório' });
  
  const short_code = Math.random().toString(36).substring(2, 8);
  
  try {
    const queryText = 'INSERT INTO urls(original_url, short_code) VALUES($1, $2) RETURNING *';
    const result = await pool.query(queryText, [original_url, short_code]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint principal: Redirecionamento com lógica de cache
app.get('/:short_code', async (req, res) => {
  const { short_code } = req.params;

  try {
    // 1. Tenta buscar no Cache (Redis) primeiro
    const cachedUrl = await redisClient.get(short_code);

    if (cachedUrl) {
      console.log(`CACHE HIT: Redirecionando ${short_code} para ${cachedUrl}`);
      return res.redirect(301, cachedUrl);
    }

    // 2. Se não achou no cache (CACHE MISS), busca no Banco de Dados (PostgreSQL)
    console.log(`CACHE MISS: Buscando ${short_code} no banco de dados.`);
    const dbResult = await pool.query('SELECT original_url FROM urls WHERE short_code = $1', [short_code]);

    if (dbResult.rows.length > 0) {
      const originalUrl = dbResult.rows[0].original_url;

      // 3. Salva o resultado no cache para a próxima vez. Define uma expiração de 1 hora (3600s).
      await redisClient.set(short_code, originalUrl, { EX: 3600 });
      console.log(`SALVO NO CACHE: ${short_code} -> ${originalUrl}`);
      
      return res.redirect(301, originalUrl);
    } else {
      return res.status(404).json({ error: 'URL não encontrada' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// --- Inicialização do Servidor ---
const startServer = async () => {
  await connectWithRetry('PostgreSQL', () => pool.connect().then(client => client.release()));
  await connectWithRetry('Redis', () => redisClient.connect());
  
  await createTable();
  
  app.listen(PORT, HOST, () => {
    console.log(`Servidor Node.js rodando em http://${HOST}:${PORT}`);
  });
};

startServer();