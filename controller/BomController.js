const { sqlConfig, sqlConfigApp02 } = require("../config/config");
const sql = require("mssql");
const moment = require("moment");

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

  async GetPartBomMasterComponent(req, res) {
    try {
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const results = await pool.request().query(`SELECT RM_PARTNO,COUNT(*) as AMOUNT FROM TBL_BOMS GROUP BY RM_PARTNO ORDER BY RM_PARTNO`);
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
      const checkRM = rmPartNo?.filter((x) => x.partNo == "" || x.partNo == null);
      if(checkRM?.length > 0){
        return res.json({
            err:true,
            msg: "Data is required!",
        })
      }


      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      
      const checkPart = await pool
      .request()
      .input("fgPart",sql.NVarChar,fgPartNo.trim())
      .query(`SELECT * FROM [dbo].[TBL_BOMS] WHERE [FG_PARTNO] = @fgPart`)
      if(checkPart && checkPart?.recordset?.length > 0) {
        return res.json({
          err:true,
          msg:"FG Part is duplicated!"
        })
      }
      
      for (let i = 0; i < rmPartNo?.length; i++) {
  
        const insert = await pool
          .request()
          .input("fgPart", sql.NVarChar, fgPartNo)
          .input("fgQty", sql.Int, 1)
          .input("fgUnit", sql.NVarChar, "Pcs")
          .input("rmPartNo", sql.NVarChar, rmPartNo[i].partNo)
          .input("rmQty", sql.Int, 1)
          .input("rmUnit", sql.NVarChar, "Pcs")
          .input("fullName", sql.NVarChar, fullName)
          .query(`INSERT INTO  [dbo].[TBL_BOMS] ([FG_PARTNO]
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
      
    } catch (err) {
      console.log(err);
    }
  }

  async UpdateBom(req, res) {
    try {
      const {fgPartNo} = req.params ;
      const {  rmPartNo, fullName } = req.body;
      if (!fgPartNo || rmPartNo?.length == 0) {
        return res.json({
          err: true,
          msg: "Data is required!",
        });
      }
      let inserted = 0;
      const checkRM = rmPartNo?.filter((x) => x.partNo == "" || x.partNo == null);
      if(checkRM?.length > 0){
        return res.json({
            err:true,
            msg: "Data is required!",
        })
      }


      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      
      const checkPart = await pool
      .request()
      .input("fgPart",sql.NVarChar,fgPartNo.trim())
      .query(`SELECT * FROM [dbo].[TBL_BOMS] WHERE [FG_PARTNO] = @fgPart`);

      const oldCreateDate = checkPart.recordset[0].CREATED_AT;

      if(checkPart && checkPart?.recordset?.length > 0) {
        // ลบของเก่า
        const deletePart = await pool
        .request()
        .input("fgPart",sql.NVarChar,fgPartNo)
        .query(`DELETE FROM [dbo].[TBL_BOMS] WHERE [FG_PARTNO] = @fgPart`)
        if(true) {
          // ถ้าลบสำเร็จแล้วให้ Insert

          // Start Loop
          for (let i = 0; i < rmPartNo?.length; i++) {
   
              
            const insert = await pool
              .request()
              .input("fgPart", sql.NVarChar, fgPartNo)
              .input("fgQty", sql.Int, 1)
              .input("fgUnit", sql.NVarChar, "Pcs")
              .input("rmPartNo", sql.NVarChar, rmPartNo[i].partNo)
              .input("rmQty", sql.Int, 1)
              .input("rmUnit", sql.NVarChar, "Pcs")
              .input("fullName", sql.NVarChar, fullName)
              .query(`INSERT INTO [dbo].[TBL_BOMS] ([FG_PARTNO]
              ,[FG_QTY]
              ,[FG_UNITS]
              ,[RM_PARTNO]
              ,[RM_QTY]
              ,[RM_UNITS]
              ,[CREATED_AT]
              ,[UPDATED_BY],[UPDATED_AT]) VALUES (@fgPart,@fgQty,@fgUnit,@rmPartNo,@rmQty,@rmUnit,'${moment(oldCreateDate).utc().format('YYYY-MM-DD HH:mm')}',@fullName,GETDATE())`);
    
            if (insert && insert?.rowsAffected[0] > 0) {
              inserted++;
            }
    
          }
          // End Loop 

          if (inserted == rmPartNo?.length) {
            pool.close()
            return res.json({
              err: false,
              msg: "Updated successfully!",
              status: "Ok",
            });
          } else {
            pool.close()
            return res.json({
              err: true,
              msg: "Something went wrong!",
            });
          }

        }else{
          return res.json({
            err:true,
            msg:"Error, Delete Part"
          })
        }


      }else{
        return res.json({
          err:true,
          msg:"Part No Not Found!"
        })
      }
      
      
      
    } catch (err) {
      console.log(err);
    }
  }


  async DeleteBom(req, res) {
    try {
      const { fgPart } = req.params;

      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      
      const checkPart = await pool
      .request()
      .input("fgPart",sql.NVarChar,fgPart)
      .query(`DELETE  FROM [dbo].[TBL_BOMS] WHERE [FG_PARTNO] = @fgPart`)
      if(checkPart && checkPart?.rowsAffected[0] > 0) {
        pool.close();
        return res.json({
          err:false,
          msg:"Part deleted!",
          status : "Ok"
        })
      }else{
        pool.close();
        return res.json({
          err:true,
          msg:"Something went wrong!"
        })
      }
      
      
      
    } catch (err) {
      console.log(err);
    }
  }
}
module.exports = BomController;
