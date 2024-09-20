const sql = require("mssql");
const { sqlConfigApp02,sqlConfig } = require("../config/config");

class PartController {
  async GetPartMaster(req, res) {
    try {
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();

      const results = await pool
        .request()
        .query(
          `SELECT * FROM [dbo].[tbl_cpartmaster] WHERE status = 'USE' ORDER BY partno ASC`
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
  async GetPartByPartNo(req, res) {
    try {
      const {partNo} = req.params ;
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();

      const results = await pool
        .request()
        .input("partNo",sql.NVarChar,partNo)
        .query(
          `SELECT * FROM [dbo].[tbl_cpartmaster] WHERE status = 'USE' AND partno = @partNo ORDER BY partno ASC`
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

  async GetFGPartMaster(req, res) {
    try {
      const {partNo} = req.params ;
      const pool = await new sql.ConnectionPool(sqlConfig).connect();

      const results = await pool
        .request()
        .input("partNo",sql.NVarChar,partNo)
        .query(
          `SELECT ITEMNO,ITEMNM,CRTDBY,CRTDON,LUPDBY FROM [PRD_WIPCONTROL].[dbo].[TBL_MST_ITEM] ORDER BY ITEMNO ASC`
        );
      if (results && results.recordset?.length > 0) {
        pool.close()
        return res.json({
          err: false,
          results: results.recordset,
          status: "Ok",
        });
      } else {
        pool.close()
        return res.json({
            err: true,
            results:[],
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
  async DownloadFGPartFromIM(req, res) {
    try {
      const pool = await new sql.ConnectionPool(sqlConfig).connect();

      const exec = await pool
        .request()
        .query(
          `EXEC [SprocDownloadPartFgFromDCS]`
        );
        console.log(exec);
        if (exec && exec.rowsAffected[0] >= 0) {
   
          return res.json({
            err: false,
            status: "Ok",
            msg: "Part downloaded successfully",
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
