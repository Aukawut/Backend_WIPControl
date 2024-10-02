const { sqlConfig, sqlConfigApp02 } = require("../config/config");
const sql = require("mssql");

class BomController {
  async GetAllBom(req, res) {
    try {
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const results = await pool
        .request()
        .query(
          `SELECT * FROM [dbo].[TBL_BOMS] WHERE FG_PARTNO != '.' ORDER BY FG_PARTNO ASC `
        );
      if (results && results.recordset?.length > 0) {
        return res.json({
          err: false,
          results: results.recordset,
        });
      } else {
        return res.json({
          err: true,
          results: [],
          msg: "Not Found",
        });
      }
    } catch (err) {
      console.log(err);
    }
  }
  async GetPartBomMaster(req, res) {
    try {
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const results = await pool.request().query(`SELECT 
	COUNT(*) as AMOUNT_COMP,FG_PARTNO FROM [dbo].[TBL_BOMS] WHERE FG_PARTNO != '.' GROUP BY FG_PARTNO ORDER BY FG_PARTNO`);
      if (results && results.recordset?.length > 0) {
        return res.json({
          err: false,
          results: results.recordset,
        });
      } else {
        return res.json({
          err: true,
          results: [],
          msg: "Not Found",
        });
      }
    } catch (err) {
      console.log(err);
    }
  }

  async AddBom(req, res) {
    try {
      const { fgPartNo, rmPartNo, fullName } = req.body;
      if (!fgPartNo || rmPartNo?.length == 0) {
        return res.json({
          err: true,
          msg: "Data is required!",
        });
      }
      let inserted = 0;
      const checkRM = rmPartNo?.filter((x) => x.partNo == "" || x.part == null);
      if(checkRM?.length > 0){
        return res.json({
            err:true,
            msg: "Data is required!",
        })
      }
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      for (let i = 0; i < rmPartNo?.length; i++) {
        const insert = await pool
          .request()
          .input("fgPart", sql.fgUnit, fgPartNo)
          .input("fgQty", sql.Int, 1)
          .input("fgUnit", sql.NVarChar, "Pcs")
          .input("rmPartNo", sql.NVarChar, rmPartNo[i].partNo)
          .input("rmQty", sql.Int, 1)
          .input("rmUnit", sql.NVarChar, "Pcs")
          .input("fullName", sql.NVarChar, fullName)
          .query(`INSERT INTO ([FG_PARTNO]
          ,[FG_QTY]
          ,[FG_UNITS]
          ,[RM_PARTNO]
          ,[RM_QTY]
          ,[RM_UNITS]
          ,[CREATED_AT]
          ,[CREATED_BY]) VALUES (@fgPart,@fgQty,@fgUnit,@rmPartNo,@rmQty,@rmUnit,GETDATE(),@fullName)`);

        if (insert && insert?.rowsAffected[0] > 0) {
          inserted++;
        }

        if (inserted == rmPartNo?.length) {
          pool.close()
          return res.json({
            err: false,
            msg: "Saved successfully!",
            status: "Ok",
          });
        } else {
          pool.close()
          return res.json({
            err: true,
            msg: "Something went wrong!",
          });
        }
      }
      console.log(req.body);
    } catch (err) {
      console.log(err);
    }
  }
}
module.exports = BomController;
