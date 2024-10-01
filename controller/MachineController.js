const sql = require("mssql");
const { sqlConfig, sqlConfigApp02 } = require("../config/config");

class MachineController {
    
    async GetMachineNoByName(req,res) {
        try {
            const { name } = req.params;
            const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
            const result = await pool.request()
              .input("name",sql.NVarChar,name)
              .query(`SELECT * FROM [dbo].[tbl_cmachine] WHERE mach_name = @name`);
      
            if (result && result?.recordset?.length > 0) {
              return res.json({
                err: false,
                result: result?.recordset,
                status: "Ok",
              });
            }else{
              return res.json({
                err: true,
                msg: "Machine isn't found",
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
          const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
          const result = await pool.request()
            .input("name",sql.NVarChar,name)
            .query(`SELECT * FROM [dbo].[tbl_cmachine] WHERE [status] = 'USE' ORDER BY mach_name`);
    
          if (result && result?.recordset?.length > 0) {
            return res.json({
              err: false,
              result: result?.recordset,
              status: "Ok",
            });
          }else{
            return res.json({
              err: true,
              msg: "Not Found",
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

  async GetMachineMaster(req,res) {
    try {
        const { name } = req.params;
        const pool = await new sql.ConnectionPool(sqlConfig).connect();
        const result = await pool.request()
          .input("name",sql.NVarChar,name)
          .query(`SELECT * FROM [dbo].[TBL_MACHINE]  WHERE [ACTIVEFLG] = '1' ORDER BY [MCHCD] ASC`);
  
        if (result && result?.recordset?.length > 0) {
          return res.json({
            err: false,
            results: result?.recordset,
            status: "Ok",
          });
        }else{
          return res.json({
            err: true,
            msg: "Not Found",
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
