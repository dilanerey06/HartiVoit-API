// // const mysql = require('mysql2');
// const mysql = require('mysql2/promise');
// // import {Connector} from '@google-cloud/cloud-sql-connector';
// const { Connector } = require('@google-cloud/cloud-sql-connector');
// // const db = mysql.createPool({
// //   host: 'localhost',//process.env.MYSQL_HOST, // Type here the host
// //   port: 33060, //process.env.MYSQL_PORT, 
// //   user: 'root',//process.env.MYSQL_USER, // Type here the user 'root'
// //   password: 'my-secret-pw', //process.env.MYSQL_PASS, // Type here the pass
// //   database: 'store',
// //   multipleStatements: true,
// //   connectionLimit: 10,
// // });

// const connector = new Connector();

// (async () => {
//   const clientOpts = await connector.getOptions({
//     instanceConnectionName: 'serious-music-440723-h5:us-central1:store',
//     ipType: 'PUBLIC',
//   });

//   console.log(process.env.DB_PASSWORD);
  
//   const db = mysql.createPool({
//     ...clientOpts,
//     user: process.env.DB_USER,
//     password: process.env.DB_PASSWORD,
//     database: process.env.DB_NAME,
//     connectionLimit: 10,
//   });
//   console.log(db);
  
//   module.exports = db; // Exporta la pool directamente
// })();

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