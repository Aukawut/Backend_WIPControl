const sql = require("mssql");
const {sqlConfigApp02} = require("../config/config");

class RollerController {
   async GetAllRoller(req,res) {
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

}

module.exports = RollerController ;