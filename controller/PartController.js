const sql = require("mssql");
const { sqlConfigApp02, sqlConfig } = require("../config/config");
const moment = require("moment");

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
          result: [],
          msg: "Part isn't found!",
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
  async GetAdhesivePart(req, res) {
    try {
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();

      const results = await pool.request().query(
        `SELECT tran_no,partno,partname,part_forma,note,qty_pcs,amount_dateexpire,remark,status,create_by,create_date,lastupdate_by,lastupdate_date,part_fac  from  tbl_cpartmaster 
           WHERE status='USE' order by partno`
      );
      if (results && results.recordset?.length > 0) {
        return res.json({
          err: false,
          results: results.recordset,
          status: "Ok",
        });
      } else {
        return res.json({
          err: true,
          results: [],
          msg: "Part isn't found!",
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

  async GetAdhesivePartRunningNo(req, res) {
    try {
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const dateNow = moment(new Date()).format("YYYYMM");
      const results = await pool
        .request()
        .query(
          `SELECT TOP 1  tran_no  from tbl_cpartmaster WHERE  tran_no like '${dateNow}%' ORDER BY tran_no desc`
        );
      if (results && results.recordset?.length > 0) {
        const last = Number(results?.recordset[0].tran_no) + 1;
        const lastNo = await pool
          .request()
          .query(
            `SELECT RIGHT(REPLICATE('0', 4) + '${last}', 4) AS FormattedNumber`
          );
        return res.json({
          err: false,
          status: "Ok",
          lastNo: `${dateNow}${lastNo.recordset[0].FormattedNumber}`,
        });
      } else {
        return res.json({
          err: false,
          status: "Ok",
          lastNo: `${dateNow}0001`,
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

  async AddPartAdhesive(req, res) {
    try {
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const {tranNo,partNo,partName,partForma,note,factory,amountExp,qtyPcs,fullName} = req.body ;

      if(!tranNo || !partNo || !partName || !partForma  || !factory || !amountExp || !qtyPcs || !fullName){
        return res.json({
          err:true,
          msg:"Data is Required!"
        })
      }

      const results = await pool
        .request()
        .input("tranNo",sql.NVarChar,tranNo)
        .query(
          `SELECT * FROM [dbo].[tbl_cpartmaster] WHERE [tran_no] = @tranNo AND status = 'USE'`
        );

        const checkPart = await pool
        .request()
        .input("partNo",sql.NVarChar,partNo.trim())
        .query(
          `SELECT * FROM [dbo].[tbl_cpartmaster] WHERE [partno] = @partNo AND status = 'USE'`
        );

      if (results && results.recordset?.length > 0) {
        // Transection ซ้ำ
        return res.json({
          err: true,
          msg: "Trans Duplicated",
        });
      } else {

        if(checkPart && checkPart.recordset.length > 0){
            // Part No ซ้ำ
          return res.json({
            err: true,
            msg: "Part No Duplicated",
          });
        }


         const insert = await pool
         .request()
         .input("tranNo",sql.NVarChar,tranNo)
         .input("partNo",sql.NVarChar,partNo)
         .input("partName",sql.NVarChar,partName)
         .input("partForma",sql.NVarChar,partForma)
         .input("factory",sql.NVarChar,factory)
         .input("note",sql.NVarChar,note)
         .input("qtyPcs",sql.Int,qtyPcs)
         .input("amountExp",sql.Int,amountExp)
         .input("status",sql.NVarChar,'USE')
         .input("create_by",sql.NVarChar,fullName)
         .query(`INSERT INTO [dbo].[tbl_cpartmaster] ([tran_no],[partno],[partname],[part_forma],[part_fac],[note],[qty_pcs],[amount_dateexpire],[status],[create_by],[create_date]) 
          VALUES (@tranNo,@partNo,@partName,@partForma,@factory ,@note,@qtyPcs,@amountExp,@status,@create_by,GETDATE())`)

       if(insert && insert.rowsAffected[0] > 0) {
        return res.json({
          err:false,
          status : "Ok",
          msg:"Inserted successfully!"
        })
       }else{
        return res.json({
          err:true,
          msg:"Something went wrong"
        })
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

  async UpdatePartAdhesive(req, res) {
    const { tranNo } = req.params ;
    try {
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();

      const {partNo,partName,partForma,note,factory,amountExp,qtyPcs,fullName} = req.body ;

      if(!partNo || !partName || !partForma  || !factory || !amountExp || !qtyPcs || !fullName){
        return res.json({
          err:true,
          msg:"Data is Required!"
        })
      }


        const checkPart = await pool
        .request()
        .input("tranNo",sql.NVarChar,tranNo)
        .query(
          `SELECT * FROM [dbo].[tbl_cpartmaster] WHERE [tran_no] = @tranNo AND status = 'USE' `
        );
        if(checkPart && checkPart?.recordset.length > 0 ){

        const checkDuplicatePart = await pool
        .request()
        .input("partNo",sql.NVarChar,partNo.trim())
        .input("oldPartNo",sql.NVarChar,checkPart?.recordset[0].partno)
        .query(`SELECT * FROM [dbo].[tbl_cpartmaster] WHERE [partno] != @oldPartNo AND [partno] = @partNo AND status = 'USE'`)

          
        if(checkDuplicatePart && checkDuplicatePart.recordset.length > 0){
            // Part No ซ้ำ
          return res.json({
            err: true,
            msg: "Part No Duplicated",
          });
        }


         const update = await pool
         .request()
         .input("tranNo",sql.NVarChar,tranNo)
         .input("partNo",sql.NVarChar,partNo)
         .input("partName",sql.NVarChar,partName)
         .input("partForma",sql.NVarChar,partForma)
         .input("factory",sql.NVarChar,factory)
         .input("note",sql.NVarChar,note)
         .input("qtyPcs",sql.Int,qtyPcs)
         .input("amountExp",sql.Int,amountExp)
         .input("status",sql.NVarChar,'USE')
         .input("upadte_by",sql.NVarChar,fullName)
         .query(`UPDATE [dbo].[tbl_cpartmaster]  SET [partno] = @partNo,[partname] = @partName,[part_forma] = @partForma,[part_fac] = @factory,
          [note] = @note,[qty_pcs] = @qtyPcs,[amount_dateexpire] = @amountExp,[lastupdate_by] = @upadte_by,
          [lastupdate_date] = GETDATE() WHERE [tran_no] = @tranNo`)

       if(update && update.rowsAffected[0] > 0) {
        return res.json({
          err:false,
          status : "Ok",
          msg:"Updated successfully!"
        })
       }else{
        return res.json({
          err:true,
          msg:"Something went wrong"
        })
       }
      }else{
        return res.json({
          err:true,
          msg:"Part No, is'not Found"
        })

      }
    } catch (err) {
      console.log(err);
      return res.json({
        err: true,
        msg: err.message,
      });
    }
  }

  async CancelAdhesivePart(req, res) {
    try {
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const {fullName} = req.body ;
      const {transecNo} = req.params ;

      const results = await pool
        .request()
        .input("tranNo",sql.NVarChar,transecNo)
        .input("fullName",sql.NVarChar,fullName)
        .query(
          `UPDATE [dbo].[tbl_cpartmaster] SET [status] = 'CANCEL',[lastupdate_by] = @fullName,[lastupdate_date] = GETDATE() WHERE [tran_no] = @tranNo`
        );
      if (results && results.rowsAffected[0] > 0) {
        pool.close()
        return res.json({
          err: false,
          msg: "Canceled!",
          status:"Ok"
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
      return res.json({
        err: true,
        msg: err.message,
      });
    }
  }

  async GetPartByPartNo(req, res) {
    try {
      const { partNo } = req.params;
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();

      const results = await pool
        .request()
        .input("partNo", sql.NVarChar, partNo)
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
          result: [],
          msg: "Part isn't found!",
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
      const { partNo } = req.params;
      const pool = await new sql.ConnectionPool(sqlConfig).connect();

      const results = await pool
        .request()
        .input("partNo", sql.NVarChar, partNo)
        .query(
          `SELECT ITEMNO,ITEMNM,CRTDBY,CRTDON,LUPDBY FROM [PRD_WIPCONTROL].[dbo].[TBL_MST_ITEM] ORDER BY ITEMNO ASC`
        );
      if (results && results.recordset?.length > 0) {
        pool.close();
        return res.json({
          err: false,
          results: results.recordset,
          status: "Ok",
        });
      } else {
        pool.close();
        return res.json({
          err: true,
          results: [],
          msg: "Part isn't found!",
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
        .query(`EXEC [SprocDownloadPartFgFromDCS]`);
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
