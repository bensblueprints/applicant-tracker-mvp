require('dotenv').config();
const path = require('path');
const { createApp } = require('./app');

const PORT = Number(process.env.PORT) || 5354;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'hirestack.db');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
const COMPANY_NAME = process.env.COMPANY_NAME || 'Our company';

const app = createApp({ dbPath: DB_PATH, adminPassword: ADMIN_PASSWORD, companyName: COMPANY_NAME });

app.listen(PORT, () => {
  console.log(`Hirestack listening on http://localhost:${PORT}`);
  console.log(`Public careers page: http://localhost:${PORT}/careers`);
  if (ADMIN_PASSWORD === 'admin') {
    console.log('⚠ Using default admin password — set ADMIN_PASSWORD in .env for production.');
  }
});
