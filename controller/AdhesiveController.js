const sql = require("mssql");
const { sqlConfig } = require("../config/config");

class AdhesiveController {
  SaveActualAdhesive(req, res) {
    try {
    } catch (err) {
      console.log(err);
      return res.json({
        err: true,
        msg: err.message,
      });
    }
  }

  async GetAdhesiveActual(req, res) {
    try {
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const results = await pool
        .request()
        .query(`SELECT * FROM V_AdhesiveActual ORDER BY DATE_PLATE DESC`);
      if (results && results.recordset?.length > 0) {
        return res.json({
          err: false,
          status: "Ok",
          results: results?.recordset,
        });
      }else{
        return res.json({
            err: true,
            msg:"Actual not found!",
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
module.exports = AdhesiveController;
