const sql = require("mssql");
const { sqlConfig } = require("../config/config");

class AdhesiveController {
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
      } else {
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

  async SaveActual(req, res) {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    const {
      partNo,
      phLine,
      glue,
      qty,
      remark,
      createdBy,
      datePlate,
      datePlan,
    } = req.body;
    try {
      if (
        !qty ||
        !partNo ||
        !phLine ||
        !glue ||
        !createdBy ||
        !datePlan ||
        !datePlate
      ) {
        return res.json({
          err: true,
          msg: "Data is required!",
        });
      }

      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const results = await pool
        .request()
        .input("partNo", sql.NVarChar, partNo)
        .input("phLine", sql.NVarChar, phLine)
        .input("glue", sql.NVarChar, glue)
        .input("qty", sql.Int, qty)
        .input("remark", sql.VarChar, remark)
        .input("createdBy", sql.NVarChar, createdBy)
        .input("datePlate", sql.Date, datePlate)
        .input("datePlan", sql.Date, datePlan)
        .input("ip", sql.NVarChar, ip)
        .query(
          `INSERT INTO [dbo].[TBL_ACTUAL_ADHESIVE] ([PART_NO],[PH_LINE],[GLUE_TYPE],[QTY],[REMARK],[CREATED_BY],[DATE_PLATE],[DATE_PLAN],[IP]) 
          VALUES (@partNo,@phLine,@glue,@qty,@remark,@createdBy,@datePlate,@datePlan,@ip)`
        );
      if (results && results.rowsAffected[0] > 0) {
        return res.json({
          err: false,
          status: "Ok",
          msg: "Actual saved!",
        });
      } else {
        return res.json({
          err: true,
          msg: "Something went wrong!",
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

  async UpdateActual(req, res) {
    const { id } = req.params;
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    const { qty, remark ,updatedBy} = req.body;
    try {
      if (!qty || !updatedBy) {
        return res.json({
          err: true,
          msg: "Data is required!",
        });
      }

      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const results = await pool
        .request()

        .input("qty", sql.Int, qty)
        .input("remark", sql.VarChar, remark)
        .input("updatedBy", sql.NVarChar, updatedBy)
        .input("ip", sql.NVarChar, ip)
        .input("id", sql.Int, id)
        .query(
          `UPDATE [dbo].[TBL_ACTUAL_ADHESIVE] SET [QTY] = @qty,[REMARK] = @remark,[UPDATED_BY] = @updatedBy,[IP] = @ip,
          [UPDATED_AT] = GETDATE() WHERE [Id] = @id`
        );
      if (results && results.rowsAffected[0] > 0) {
        return res.json({
          err: false,
          status: "Ok",
          msg: "Actual updated!",
        });
      } else {
        return res.json({
          err: true,
          msg: "Something went wrong!",
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
