const sql = require("mssql");
const { sqlConfig } = require("../config/config");

class ProductionController {
  async GetProdTrnByDate(req, res) {
    const { start, end } = req.params;
    try {
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const results = await pool.request().query(
        `SELECT a.* FROM (SELECT TRNNO,TRNDT,TRNSTT,REMARK,CRTDBY,CRTDON,LUPDBY,LUPDON,FCTYCD 
        FROM [BSNCRAPP09].[DCS_IM].[dbo].[tbl_PD_TransferHdr] WHERE TRNDT BETWEEN '${start}' AND '${end}') a  ORDER BY a.FCTYCD,a.TRNNO DESC`
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
  async GetProdTrnDetailByTranNo(req, res) {
    const { tranNo, factory } = req.params;

    try {
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const results = await pool
        .request()
        .input("tranNo", sql.NVarChar, tranNo)
        .input("factory", sql.NVarChar, factory)
        .query(
          `SELECT * FROM [BSNCRAPP09].[DCS_IM].[dbo].[tbl_PD_TransferDtl] WHERE [TRNNO] = @tranNo AND [FCTYCD] = @factory`
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


  async GetProdTrnSummaryByTranNo(req, res) {
    const { tranNo, factory } = req.params;

    try {
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const results = await pool
        .request()
        .input("tranNo", sql.NVarChar, tranNo)
        .input("factory", sql.NVarChar, factory)
        .query(
          `SELECT a.* , t.TRNDT FROM (SELECT FCTYCD,TRNNO,LOTNO,ITEMNO,CFMDOC,SUM(PCKQTY) as _SUM  
            FROM [BSNCRAPP09].[DCS_IM].[dbo].tbl_PD_TransferDtl 
            GROUP BY FCTYCD,TRNNO,LOTNO,ITEMNO,CFMDOC ) a 
            LEFT JOIN [BSNCRAPP09].[DCS_IM].[dbo].tbl_PD_TransferHdr t ON a.FCTYCD = t.FCTYCD AND a.TRNNO = t.TRNNO
            WHERE a.TRNNO = @tranNo
            AND a.FCTYCD = @factory ORDER BY t.TRNDT DESC`
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
  async GetProdClosedDetailByTranNo(req, res) {
    const { tranNo, factory } = req.params;
  
      
    try {
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const results = await pool
        .request()
        .input("tranNo", sql.NVarChar, tranNo)
        .input("factory", sql.NVarChar, factory)
        .query(
          `SELECT * FROM [BSNCRAPP09].[DCS_IM].[dbo].[tbl_PD_DailyClosedDtl] WHERE [TRNNO] = @tranNo 
          AND [FCTYCD] = @factory`
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
  async GetProdClosedByFactory(req, res) {
    const { start, end, factory } = req.params;

    try {
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const results = await pool
        .request()

        .input("factory", sql.NVarChar, factory)
        .query(
          `SELECT * FROM [BSNCRAPP09].[DCS_IM].[dbo].[tbl_PD_DailyClosedHdr] WHERE TRNDT BETWEEN '${start}' AND '${end}' 
          AND FCTYCD = @factory ORDER BY CRTDON DESC`
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
}

module.exports = ProductionController;
