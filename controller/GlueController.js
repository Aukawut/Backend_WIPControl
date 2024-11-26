const sql = require("mssql");
const { sqlConfig } = require("../config/config");

class GlueController {
    async GetAllGlue(req, res) {
        try {
          const pool = await new sql.ConnectionPool(sqlConfig).connect();
          const results = await pool
            .request()
            .query(`SELECT * FROM [dbo].[TBL_GLUETYPE] ORDER BY Id DESC`);
          if (results && results.recordset?.length > 0) {
            return res.json({
              err: false,
              status: "Ok",
              results: results?.recordset,
            });
          } else {
            return res.json({
              err: true,
              msg: "Glue not found!",
              results: [],
            });
          }
        } catch (err) {
          console.log(err);
          return res.json({
            err: true,
            msg: err.message,
          });
        }
      }
}

module.exports = GlueController;