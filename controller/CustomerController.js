const sql = require("mssql");
const { sqlConfig } = require("../config/config");

class CustomerController {
async GetCustommer (req,res) {
    try{
        const { name } = req.params;
        const pool = await new sql.ConnectionPool(sqlConfig).connect();
        const result = await pool.request()
          .input("name",sql.NVarChar,name)
          .query(`SELECT * FROM [dbo].[TBL_CUSTOMER]`);
  
        if (result && result?.recordset?.length > 0) {
        pool.close()
          return res.json({
            err: false,
            results: result?.recordset,
            status: "Ok",
          });
        }else{
            pool.close()
          return res.json({
            err: true,
            msg: res.json(),
            status: "Ok",
          });
        }
    }catch(err){
        console.log(err);
        return res.json({
            err:true,
            msg:err.message
        })
        
    }
}
}
module.exports = CustomerController ;