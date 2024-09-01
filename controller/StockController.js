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

  async GetLotAboutToExpire(req, res) {
    const formatDate = moment(new Date()).add(2, "days").format("YYYY-MM-DD"); // 2 วันก่อนหมด

    try {
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const results = await pool.request()
        .query(`SELECT distinct lot_no,roller_no  FROM [SRRYAPP02].[DB_AVP2WIPCONTROL].[dbo].[tbl_cstockdetail] 
          WHERE date_expire <= '${formatDate}' AND status_supply = 'N' AND status_active <> 'NG' 
          AND status = 'USE' ORDER BY lot_no`);
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
