const sql = require("mssql");
const {sqlConfigApp02} = require("../config/config");

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

}

module.exports = RollerController ;