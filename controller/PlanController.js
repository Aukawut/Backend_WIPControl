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

  async GetAdhesivePlanByPlateDate(req, res) {
    const {date} = req.params ;
    try {
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const results = await pool
        .request()
        .query(
          `SELECT a.PART_NO,COUNT(*) as COUNT_ ,a.DATE_PLATE,SUM(QTY) as SUM_PN_QTY,
          SUM(LIMIT_NG) as SUM_LIMIT,SUM(QTY_ACTUAL) as SUM_ACTUAL
          FROM (
          SELECT ap.PART_NO,ap.DATE_PLATE,ap.GLUE_TYPE,ap.QTY,ISNULL(aa.QTY,0) as QTY_ACTUAL,ap.CREATED_AT,ap.QTY - ISNULL(aa.QTY,0) as  LIMIT_NG FROM [dbo].[TBL_ADHESIVE_PLAN] ap
          LEFT JOIN [dbo].[TBL_ACTUAL_ADHESIVE] aa ON ap.PART_NO = aa.PART_NO  
          AND ap.DATE_PLAN = aa.DATE_PLAN AND ap.DATE_PLATE = aa.DATE_PLATE
          WHERE ap.QTY - ISNULL(aa.QTY,0) != 0 AND ap.DATE_PLATE = '${date}' ) a GROUP BY a.PART_NO,a.DATE_PLATE ORDER BY a.PART_NO`
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

  async GetPlanByRawMaterial(req,res) {
    const { factory,start,end} = req.params ;

    try{
      const pool = await new sql.ConnectionPool(sqlConfig).connect()
      const results = await pool
      .request()
      .input('factory',sql.NVarChar,factory)
      .query(`WITH CTE_PLAN AS (
      SELECT p.Id,p.MC_GROUP,p.FACTORY,p.MC,p.CUSTOMER_CODE,p.COMPOUND,p.PACK,p.PART_NO,b.RM_PARTNO,p.PLAN_DATE,p.QTY FROM [dbo].[TBL_BOMS] b LEFT JOIN  [dbo].[TBL_MOLDING_PLAN] p ON 
      b.FG_PARTNO COLLATE Thai_CI_AI = p.PART_NO COLLATE Thai_CI_AI WHERE
      p.FACTORY = @factory AND b.FG_PARTNO IS NOT NULL AND p.PART_NO IS NOT NULL
      AND p.PLAN_DATE BETWEEN '${start}' AND '${end}' AND p.QTY > 0 ) 
      SELECT SUM(QTY) as QTY,RM_PARTNO,PLAN_DATE,FACTORY FROM CTE_PLAN p  
	    GROUP BY RM_PARTNO,PLAN_DATE,FACTORY
	    ORDER BY p.RM_PARTNO,p.PLAN_DATE DESC`);

      
      if(results && results.recordset?.length > 0){
        pool.close()
        return res.json({
          err:false,
          results:results.recordset,
          status : "Ok"
        })
      }else{
        pool.close()
        return res.json({
          err:true,
          msg:"Not Found"
        })
      }
    }catch(err) {
      console.log(err);
      return res.json({
        err:true,
        msg:err.message
      })
    }
  }

  async GetMetalRequestComparePlan(req,res) {
    const { factory,start,end ,reqOnly} = req.params ;

    try{
      const pool = await new sql.ConnectionPool(sqlConfig).connect()
      const results = await pool
      .request()
      .input('factory',sql.NVarChar,factory)
      .query(`SELECT sp.*,isnull(r.qty_req,0) as QTY_REQ,sp.QTY - isnull(r.qty_req,0) as QTY_DIFF  FROM (
      SELECT SUM(p.QTY) as QTY,p.RM_PARTNO,p.PLAN_DATE,p.FACTORY  FROM (
	    SELECT p.Id,p.MC_GROUP,p.FACTORY,p.MC,p.CUSTOMER_CODE,p.COMPOUND,p.PACK,p.PART_NO,b.RM_PARTNO,p.PLAN_DATE,p.QTY FROM [dbo].[TBL_BOMS] b LEFT JOIN  [dbo].[TBL_MOLDING_PLAN] p ON 
      b.FG_PARTNO COLLATE Thai_CI_AI = p.PART_NO COLLATE Thai_CI_AI WHERE
      p.FACTORY = @factory AND b.FG_PARTNO IS NOT NULL AND p.PART_NO IS NOT NULL
      AND p.PLAN_DATE BETWEEN '${start}' AND '${end}' AND p.QTY > 0 ) p
	    GROUP BY p.RM_PARTNO,p.PLAN_DATE,p.FACTORY) sp
	    LEFT JOIN (SELECT SUM(qty_supply) as qty_req,partno,plan_date FROM SRRYAPP02.[DB_AVP2WIPCONTROL].[dbo].[tbl_crequestsupply] 
      WHERE plan_date BETWEEN '${start}' AND '${end}' 
      AND factory = @factory AND status = 'USE' GROUP BY partno,plan_date) r 
      ON sp.RM_PARTNO COLLATE Thai_CI_AS = r.partno COLLATE Thai_CI_AS AND sp.PLAN_DATE = CONVERT(varchar(10),r.plan_date,120)
      ${reqOnly == 'Y' ? 'WHERE r.QTY_REQ > 0' : ''}
      ORDER BY PLAN_DATE DESC`);

      
      if(results && results.recordset?.length > 0){
        pool.close()
        return res.json({
          err:false,
          results:results.recordset,
          status : "Ok"
        })
      }else{
        pool.close()
        return res.json({
          err:true,
          msg:"Not Found"
        })
      }
    }catch(err) {
      console.log(err);
      return res.json({
        err:true,
        msg:err.message
      })
    }
  }


}

module.exports = PlanController;
