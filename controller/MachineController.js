const sql = require("mssql");
const { sqlConfig } = require("../config/config");

class MachineController {
    
    async GetMachineNoByName(req,res) {
        try {
            const { name } = req.params;
            const pool = await new sql.ConnectionPool(sqlConfig).connect();
            const result = await pool.request()
              .input("name",sql.NVarChar,name)
              .query(`SELECT * FROM [SRRYAPP02].[DB_AVP2WIPCONTROL].[dbo].[tbl_cmachine] WHERE mach_name = @name`);
      
            if (result && result?.recordset?.length > 0) {
              return res.json({
                err: false,
                result: result?.recordset,
                status: "Ok",
              });
            }else{
              return res.json({
                err: true,
                msg: res.json(),
                status: "Ok",
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

    async GetMachine(req,res) {
      try {
          const { name } = req.params;
          const pool = await new sql.ConnectionPool(sqlConfig).connect();
          const result = await pool.request()
            .input("name",sql.NVarChar,name)
            .query(`SELECT * FROM [SRRYAPP02].[DB_AVP2WIPCONTROL].[dbo].[tbl_cmachine] WHERE [status] = 'USE' ORDER BY mach_name`);
    
          if (result && result?.recordset?.length > 0) {
            return res.json({
              err: false,
              result: result?.recordset,
              status: "Ok",
            });
          }else{
            return res.json({
              err: true,
              msg: res.json(),
              status: "Ok",
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

module.exports = MachineController ;
