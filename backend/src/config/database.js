import dotenv from "dotenv";

dotenv.config();

import mysql from "mysql2/promise";

console.log("DB HOST:", process.env.DB_HOST);
console.log("DB USER:", process.env.DB_USER);

const pool = mysql.createPool({

 host: process.env.DB_HOST,

 port: Number(process.env.DB_PORT),

 user: process.env.DB_USER,

 password: process.env.DB_PASSWORD,

 database: process.env.DB_NAME,

 waitForConnections: true,

 connectionLimit: 10

});

export default pool;