const sql = require("mssql");
const { sqlConfig } = require("../config/config");

class PackController  {
    async GetPack (req,res ){
        try {
            const pool = await new sql.ConnectionPool(sqlConfig).connect();
            const results = await pool
              .request()
              .query(`SELECT * FROM [dbo].[TBL_PACK] ORDER BY Id ASC`);
            if (results && results.recordset?.length > 0) {
                pool.close()
              return res.json({
                err: false,
                status: "Ok",
                results: results?.recordset,
              });
            } else {
                pool.close()
              return res.json({
                err: true,
                msg: "Actual not found!",
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
module.exports = PackController;