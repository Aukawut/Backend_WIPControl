const sql = require("mssql");
const { sqlConfig } = require("../config/config");

class PartController {
  async GetPartMaster(req, res) {
    try {
      const pool = await new sql.ConnectionPool(sqlConfig).connect();

      const results = await pool
        .request()
        .query(
          `SELECT * FROM [SRRYAPP02].[DB_AVP2WIPCONTROL].[dbo].[tbl_cpartmaster] WHERE status = 'USE' ORDER BY partno ASC`
        );
      if (results && results.recordset?.length > 0) {
        return res.json({
          err: false,
          result: results.recordset,
          status: "Ok",
        });
      } else {
        return res.json({
            err: true,
            result:[],
            msg:"Part isn't found!"
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
module.exports = PartController;
