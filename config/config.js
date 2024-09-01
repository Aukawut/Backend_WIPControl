require("dotenv").config() ;


const sqlConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PWD,
    database: process.env.DB_NAME,
    server: process.env.DB_SERVER,
    options: {
      encrypt: false,
      trustServerCertificate: false
    }
  }



  module.exports = {sqlConfig }