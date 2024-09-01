const sql = require("mssql");
const { sqlConfig } = require("../config/config");
const fs = require("fs");
const moment = require("moment");

class PlanController {
  async GetAllAdhesivePlan(req, res) {
    try {
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const results = await pool
        .request()
        .query(
          `SELECT * FROM [dbo].[TBL_ADHESIVE_PLAN] ORDER BY [DATE_PLATE] DESC`
        );
      if (results && results?.recordset?.length > 0) {
        pool.close();
        return res.json({
          err: false,
          results: results?.recordset,
          status: "Ok",
        });
      } else {
        pool.close();
        return res.json({
          err: true,
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
  async GetAdhesivePlanByDuration(req, res) {
    const {start,end} = req.params ;
  
    try {
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const results = await pool
        .request()
        .input("start",sql.Date,start)
        .input("end",sql.Date,end)
        .query(
          `SELECT * FROM [dbo].[TBL_ADHESIVE_PLAN] WHERE [DATE_PLATE] BETWEEN @start AND @end ORDER BY DATE_PLATE DESC`
        );
      
        
      if (results && results?.recordset?.length > 0) {
        pool.close();
        return res.json({
          err: false,
          results: results?.recordset,
          status: "Ok",
        });
      } else {
        pool.close();
        return res.json({
          err: true,
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
  async SaveAdhesivePlan(req, res) {
    try {
      let inserted = 0;
      const { plan, date } = req.body;
      const dailayPlan = JSON.parse(plan);
    
      
      //   console.log(req.body);
      //   console.log(req.files);

      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const results = await pool
        .request()
        .input("date", sql.Date, date)
        .query(
          `SELECT * FROM [dbo].[TBL_ADHESIVE_PLAN] WHERE [DATE_PLATE] = @date`
        );

      if (results && results?.recordset?.length > 0) {
        pool.close();
        // ลบไฟลที่อัพโหลด
        fs.unlink(`upload/${req.file.filename}`, (err) => {
          if (err) {
            console.error(`Error removing file: ${err}`);
          }
        });
        
        return res.json({
          err: true,
          msg: `You've already made plans for ${date}.`,
        });
      } else {
        for (let i = 0; i < dailayPlan?.length; i++) {
          const save = await pool
            .request()
            .input("partNo", sql.NVarChar, dailayPlan[i].partNo)
            .input("phLine", sql.NVarChar, dailayPlan[i].phLine)
            .input("refFile", sql.NVarChar, req.file.filename)
            .input("adhesiveType", sql.NVarChar, dailayPlan[i].adhesiveType)
            .input("qty", sql.Int, dailayPlan[i].qty)
            .input("pnDate", sql.Date, moment(date).add(1, "days").format("YYYY-MM-DD")) // แผนการผลิต + 1
            .input("pDate", sql.Date, date) // แผนชุบเหล็ก
            .query(`INSERT INTO [dbo].[TBL_ADHESIVE_PLAN] ([PART_NO],[PH_LINE],[GLUE_TYPE],[QTY],[DATE_PLAN],[DATE_PLATE],[FILE_REF]) 
                    VALUES (@partNo,@phLine,@adhesiveType,@qty,@pnDate,@pDate,@refFile)`);

          if (save && save?.rowsAffected[0] > 0) {
            inserted++;
          }
        }
        if (inserted === dailayPlan?.length) {
          pool.close();
          return res.json({
            err: false,
            msg: "Plan Saved!",
            status: "Ok",
          });
        } else {
          pool.close();
          return res.json({
            err: true,
            msg: "Something went wrong!",
          });
        }
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

module.exports = PlanController;
