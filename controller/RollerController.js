const sql = require("mssql");
const {sqlConfigApp02} = require("../config/config");
const QRCode = require("qrcode");

class RollerController {
   async GetAllRollerEmpty(req,res) {
        try{    

            const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
            const results = await pool
            .request()
            .query(`SELECT a.roller_no,a.roller_detail,b.partno
                    FROM tbl_croller a 
                    LEFT JOIN (SELECT distinct roller_no,roller_detail,partno FROM tbl_cstockdetail
                    WHERE status_supply = 'N') b ON a.roller_no = b.roller_no
                    WHERE a.Status = 'USE' AND b.partno IS NULL
                    ORDER BY a.names,a.items_roller`);

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
            err: false,
            results: [],
            msg:"Roller isn't found"
          });
        }

        }catch(err) {
            console.log(err);
            return res.json({
                err:true,
                results:[],
                msg:err.message
            })
            
        }
    }


    async GetAllRoller(req,res) {
      try{    

          const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
          const results = await pool
          .request()
          .query(`SELECT * FROM [dbo].[tbl_croller] WHERE status = 'USE' ORDER BY roller_no ASC`);

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
          err: false,
          results: [],
          msg:"Roller isn't found"
        });
      }

      }catch(err) {
          console.log(err);
          return res.json({
              err:true,
              results:[],
              msg:err.message
          })
          
      }
  }
    async GetLastTranNo(req,res) {
      try{    

          const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
          const results = await pool
          .request()
          .query(`select top 1  roller_no  from tbl_croller where  roller_detail not like '%HOLD%' AND  roller_detail not like '%NG%' order by roller_no desc`);

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
          err: false,
          results: [],
          msg:"Roller isn't found"
        });
      }

      }catch(err) {
          console.log(err);
          return res.json({
              err:true,
              results:[],
              msg:err.message
          })
          
      }
    }

      async GetLastRoller(req,res) {
        try{    
            const {rollerName} = req.params ;
            const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
            const results = await pool
            .request()
            .query(`SELECT top 1  items_roller  from tbl_croller where roller_no like '%${rollerName}%' and  roller_detail  not  like '%HOLD%'
               AND roller_detail NOT LIKE '%NG%' order by items_roller desc`);
  
        if (results && results.recordset?.length > 0) {
            pool.close()
          return res.json({
            err: false,
            results: results.recordset,
            lastNo: Number(results.recordset[0]?.items_roller) + 1,
            status: "Ok",
          });
        } else {
            pool.close()
            return res.json({
              err: false,
              results: results.recordset,
              lastNo: 1,
              status: "Ok",
            });
        }
  
        }catch(err) {
            console.log(err);
            return res.json({
                err:true,
                results:[],
                msg:err.message
            })
            
        }
  }

  async InsertRoller(req,res) {
    try{    
        const {rollerNo,rollerDetail,rollerName,item,fullName} = req.body ;

        if(!rollerNo,!rollerDetail,!rollerName,!item,!fullName){
          return res.json({
            err:true,
            msg:"Data is required!"
          })
        } 

        const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();

        const results = await pool.request()
        .input("rollerNo",sql.NVarChar,rollerNo)
        .query(`SELECT * FROM [dbo].[tbl_croller] WHERE [roller_no] = @rollerNo`);
      
        if(results && results?.recordset?.length > 0) {
          return res.json({
            err:true,
            msg:"Roller No Duplicated!"
          })
        }

        const insert = await pool
        .request()
        .input("roller_no",sql.NVarChar,rollerNo) 
        .input("roller_detail",sql.NVarChar,rollerDetail) 
        .input("items_roller",sql.Float,item) 
        .input("names",sql.NVarChar,rollerName) 
        .input("fullName",sql.NVarChar,fullName) 
        .input("status",sql.NVarChar,'USE') 
        .input(
          "tag_roller",
          sql.Image,
          await QRCode.toBuffer(rollerNo, { type: "png" })
        )
        .query(`INSERT INTO [dbo].[tbl_croller] ([roller_no],[items_roller],[names],[roller_detail],[status]
              ,[tag_roller]
              ,[create_date]
              ,[create_by]) VALUES (@roller_no,@items_roller,@names,@roller_detail,@status,@tag_roller,GETDATE(),@fullName)`);

    if (insert && insert.rowsAffected[0] > 0) {
        pool.close()
      return res.json({
        err: false,
        msg:"Roller Added!",
        status: "Ok",
      });
    } else {
        pool.close()
        return res.json({
          err: true,
          msg:"Error, Something went wrong!"
        });
    }

    }catch(err) {
        console.log(err);
        return res.json({
            err:true,
            msg:err.message
        })
        
    }
}

async UpdateRoller(req,res) {
  try{    
      const {rollerId} = req.params ;
      const {rollerNo,rollerDetail,rollerName,item,fullName} = req.body ;

      if(!rollerNo,!rollerDetail,!rollerName,!item,!fullName){
        return res.json({
          err:true,
          msg:"Data is required!"
        })
      } 

      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();

      const results = await pool.request()
      .input("id",sql.Int,rollerId)
      .query(`SELECT * FROM [dbo].[tbl_croller] WHERE [rol_id] = @id`);
    
      if(results && results?.recordset?.length > 0) {
        
        const update = await pool
      .request()
      .input("roller_no",sql.NVarChar,rollerNo) 
      .input("roller_detail",sql.NVarChar,rollerDetail) 
      .input("items_roller",sql.Float,item) 
      .input("names",sql.NVarChar,rollerName) 
      .input("fullName",sql.NVarChar,fullName) 
      .input("status",sql.NVarChar,'USE') 
      .input("id",sql.Int,rollerId) 
      .input(
        "tag_roller",
        sql.Image,
        await QRCode.toBuffer(rollerNo, { type: "png" })
      )
      .query(`UPDATE [dbo].[tbl_croller] SET [roller_no] = @roller_no,[items_roller] = @items_roller
            ,[names] = @names,[roller_detail] = @roller_detail,[status] = @status
            ,[tag_roller] = @tag_roller
            ,[lastupdate_date] = GETDATE()
            ,[lastupdate_by] = @fullName WHERE [rol_id] = @id`);

  if (update && update.rowsAffected[0] > 0) {
      pool.close()
    return res.json({
      err: false,
      msg:"Roller Updated!",
      status: "Ok",
    });
  } else {
      pool.close()
      return res.json({
        err: true,
        msg:"Error, Something went wrong!"
      });
  }

      }

      

  }catch(err) {
      console.log(err);
      return res.json({
          err:true,
          msg:err.message
      })
      
  }
}
  async CancelRoller(req,res) {
    try{    
        const {rollerId} = req.params ;

        
        const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
        const update = await pool
        .request()
        .input("id",sql.Int,rollerId)
        .query(`UPDATE [dbo].[tbl_croller] SET [status] = 'CANCEL' WHERE [rol_id] = @id`)

        if (update && update.rowsAffected[0] > 0) {
          pool.close()
          return res.json({
            err: false,
            msg:"Roller Canceled!",
            status: "Ok",
          });
      } else {
          pool.close()
          return res.json({
            err: true,
            msg:"Error, Something went wrong!"
          });
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

module.exports = RollerController ;