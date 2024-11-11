const mysql = require('mysql2/promise');
const { Connector } = require('@google-cloud/cloud-sql-connector');

const connector = new Connector();

const createPool = async () => {
  const clientOpts = await connector.getOptions({
    instanceConnectionName: 'serious-music-440723-h5:us-central1:store',
    ipType: 'PUBLIC',
  });

  const pool = mysql.createPool({
    ...clientOpts,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 10,
  });

  return pool;
};

module.exports = createPool();