const {sqlConfig } = require("../config/config");
const sql = require("mssql");

class BomController {
   async GetAllBom(req,res) {
    try{
        const pool  = await new sql.ConnectionPool(sqlConfig).connect();
        const results = await pool.request().query(`SELECT * FROM [dbo].[TBL_BOMS] WHERE FG_PARTNO != '.' ORDER BY FG_PARTNO ASC `)
        if(results && results.recordset?.length > 0) {
            return res.json({
                err:false,
                results:results.recordset
            })
        }else{
            return res.json({
                err:true,
                results:[],
                msg:"Not Found"
            })
        }
    }catch(err) {
        console.log(err);
        
    }
   }
   async GetPartBomMaster(req,res) {
    try{
        const pool  = await new sql.ConnectionPool(sqlConfig).connect();
        const results = await pool.request().query(`SELECT 
	COUNT(*) as AMOUNT_COMP,FG_PARTNO FROM [dbo].[TBL_BOMS] WHERE FG_PARTNO != '.' GROUP BY FG_PARTNO ORDER BY FG_PARTNO`)
        if(results && results.recordset?.length > 0) {
            return res.json({
                err:false,
                results:results.recordset
            })
        }else{
            return res.json({
                err:true,
                results:[],
                msg:"Not Found"
            })
        }
    }catch(err) {
        console.log(err);
        
    }
   }
}
module.exports = BomController ;