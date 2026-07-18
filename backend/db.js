const { Pool } = require('pg');
require('dotenv').config();

// Soporta dos formas de configurar la conexión:
// 1) DATABASE_URL (lo más común en Supabase, Neon, Render, etc.)
// 2) Variables sueltas (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)
const usaConnectionString = !!process.env.DATABASE_URL;

const config = usaConnectionString
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
    }
  : {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    };

const pool = new Pool(config);

pool.on('connect', () => {
  console.log('Conectado a PostgreSQL correctamente.');
});

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de PostgreSQL:', err.message);
});

module.exports = { pool };
