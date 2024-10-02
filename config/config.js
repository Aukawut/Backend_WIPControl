require("dotenv").config() ;


const sqlConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PWD,
    database: process.env.DB_NAME,
    server: process.env.DB_SERVER,
    options: {
      encrypt: false,
      trustServerCertificate: false
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
  }
  }

  const sqlConfigApp02 = {
    user: process.env.DB_USER_APP02,
    password: process.env.DB_PWD_APP02,
    database: process.env.DB_NAME_APP02,
    server: process.env.DB_SERVER_APP02,
    options: {
      encrypt: false,
      trustServerCertificate: false
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
      acquireTimeoutMillis:60000
      
    },
    requestTimeout:60000 
  }

  const sqlConfigApp09 = {
    user: process.env.DB_USER_APP09,
    password: process.env.DB_PWD_APP09,
    database: process.env.DB_NAME_APP09,
    server: process.env.DB_SERVER_APP09,
    options: {
      encrypt: false,
      trustServerCertificate: false
    },pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    }
  }

  module.exports = {sqlConfig,sqlConfigApp02,sqlConfigApp09 }