const sql = require("mssql");
const { sqlConfig } = require("../config/config");

class FactoryController {
    async GetFactory(req,res) {
        try {

            const pool = await new sql.ConnectionPool(sqlConfig).connect();
            const results = await pool.request()
            .query(`SELECT * FROM [dbo].[TBL_FACTORY] ORDER BY Id`);
            if(results && results.recordset?.length > 0) {
                return res.json({
                    err: false,
                    results: results.recordset,
                    status:"Ok"
                  });
            }else{
                return res.json({
                    err: true,
                    msg: "Factory not found",
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

module.exports = FactoryController;