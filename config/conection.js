const mysql = require('mysql2');

const db = mysql.createPool({
  host: 'localhost',//process.env.MYSQL_HOST, // Type here the host
  port: 33060, //process.env.MYSQL_PORT, 
  user: 'root',//process.env.MYSQL_USER, // Type here the user 'root'
  password: 'my-secret-pw', //process.env.MYSQL_PASS, // Type here the pass
  database: 'store',
  multipleStatements: true,
  connectionLimit: 10,
});

module.exports = { db };