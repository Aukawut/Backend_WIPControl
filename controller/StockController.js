const sql = require("mssql");

const { sqlConfig } = require("../config/config");
const moment = require("moment");

class StockController {
  async GetAllStock(req, res) {
    try {
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const results = await pool
        .request()
        .query(
          `SELECT * FROM [SRRYAPP02].[DB_AVP2WIPCONTROL].[dbo].[V_StockMetal] ORDER BY PartNo, Roller_No`
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
        results: err.message,
      });
    }
  }

  async GetAllStockByPart(req, res) {
    try {
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const results = await pool
        .request()
        .query(
          `SELECT * FROM [SRRYAPP02].[DB_AVP2WIPCONTROL].[dbo].[V_StockMetalByPart] ORDER BY PartNo`
        );
      if (results && results?.recordset?.length > 0) {
        return res.json({
          err: false,
          results: results?.recordset,
          status: "Ok",
        });
      } else {
        return res.json({
          err: true,
          results: [],
        });
      }
    } catch (err) {
      console.log(err);
      return res.json({
        err: true,
        results: err.message,
      });
    }
  }
  async GetStockByFactory(req, res) {
    try {
      const { factory } = req.params;
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const results = await pool
        .request()
        .input("factory", sql.NVarChar, factory)
        .query(
          `SELECT s.PartNo,s.Factory_Part,s.Total_Box,s.Total_Qty as Store_Qty,s.Total_Qty - ISNULL(r._SUM,0) as Total_Qty,ISNULL(r._SUM,0) as REQ_QTY FROM [SRRYAPP02].[DB_AVP2WIPCONTROL].[dbo].[V_StockMetalByPart] s
            LEFT JOIN (SELECT m.PART_NO,SUM(m.QTY) as _SUM FROM (
			      SELECT distinct rd.PART_NO,rd.QTY FROM [dbo].[TBL_METAL_REQDTL] rd
            LEFT JOIN TBL_METAL_REQ r ON rd.REQ_NO  = r.REQ_NO 
            WHERE r.STATUS NOT IN ('3','4') ) m GROUP BY m.PART_NO) r ON s.PartNo COLLATE Thai_CI_AI = r.PART_NO COLLATE Thai_CI_AI
            WHERE s.[Factory_Part] = @factory ORDER BY s.PartNo`
        );
      if (results && results?.recordset?.length > 0) {
        return res.json({
          err: false,
          results: results?.recordset,
          status: "Ok",
        });
      } else {
        return res.json({
          err: true,
          results: [],
        });
      }
    } catch (err) {
      console.log(err);
      return res.json({
        err: true,
        results: err.message,
      });
    }
  }
  async GetLotAboutToExpire(req, res) {
    const {day} = req.params ;
    const formatDate = moment(new Date()).add(Number(day), "days").format("YYYY-MM-DD"); // 2 วันก่อนหมด

    try {
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const results = await pool.request()
        .query(`SELECT DISTINCT a.Lot_No as lot_no,a.Part_No,a.Machine_No,a.[Status],a.create_date,a.TimeOnly,a.DateOnly,a.PDLotDate,a.QA_DateExpire,b.roller_no FROM [SRRYAPP02].[DB_AVP2WIPCONTROL].[dbo].[tbl_cstockdetail] b 
          LEFT JOIN [SRRYAPP02].[DB_AVP2WIPCONTROL].[dbo].[V_AdhesiveLotControl] a ON a.Lot_No = b.lot_no AND a.Part_No = b.partno
          WHERE a.QA_DateExpire <= '${formatDate}' AND b.status_supply = 'N'
          AND status_active <> 'NG' AND b.status = 'USE' ORDER BY a.Lot_No`);
      if (results && results?.recordset?.length > 0) {
        return res.json({
          err: false,
          results: results?.recordset,
          status: "Ok",
        });
      } else {
        return res.json({
          err: true,
          results: [],
        });
      }
    } catch (err) {
      console.log(err);
      return res.json({
        err: true,
        results: err.message,
      });
    }
  }
}

module.exports = StockController;
