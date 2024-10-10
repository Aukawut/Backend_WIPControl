const sql = require("mssql");
const { sqlConfig } = require("../config/config");

class UsersController {
  async GetUsers(req, res) {
    try {

        const pool = await new sql.ConnectionPool(sqlConfig).connect();
        const results = await pool.request()
        .query(`SELECT u.*,r.Id as IdRole,r.NAME_ROLE,f.Id as IdFac,f.FACTORY_NAME,hr.UHR_FullName_th as FULL_NAME
  FROM [PRD_WIPCONTROL].[dbo].[TBL_USERS] u LEFT JOIN  [dbo].[TBL_ROLE] r ON 
  u.ROLE = r.Id LEFT JOIN [dbo].[TBL_FACTORY] f ON u.FACTORY = f.Id
  LEFT JOIN [dbo].[V_AllUsers] hr ON u.EMP_CODE = hr.UHR_EmpCode`);
        if(results && results.recordset?.length > 0) {
            pool.close()
            return res.json({
                err: false,
                results: results.recordset,
                status:"Ok"
              });
        }else{
            pool.close()
            return res.json({
                err: true,
                msg: "User not found",
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


  async AddUsers(req, res) {
    try {   
        const {empCode,role,factory,fullName} = req.body ;

        //If not send from Client
        if(!empCode || !role || !factory || !fullName) {
            return res.json({
                err:true,
                msg:"Data is required!"
            })
        }
        const pool = await new sql.ConnectionPool(sqlConfig).connect();

        //Check Employee
        const employee = await pool.request()
        .input("empCode",sql.NVarChar,empCode.replace(/\s/g, ''))
        .query(`SELECT * FROM [dbo].[V_AllUsers] WHERE [UHR_EmpCode] = @empCode`);


        if(employee && employee?.recordset?.length > 0) {
           
        // Check User Duplicate
        const users = await pool.request()
        .input("empCode",sql.NVarChar,empCode.replace(/\s/g, ''))
        .query(`SELECT * FROM [dbo].[TBL_USERS] WHERE [EMP_CODE] = @empCode`)
        if(users && users?.recordset?.length > 0) {
            return res.json({
                err:true,
                msg:"Users is duplicated!"
            })
        }

        //Insert User
        const insert = await pool
        .request()
        .input("empCode",sql.NVarChar,empCode)
        .input("fullName",sql.NVarChar,fullName)
        .input("role",sql.Int,role)
        .input("factory",sql.Int,factory)
        .query(`INSERT INTO [dbo].[TBL_USERS] ([EMP_CODE],[ROLE],[FACTORY],[CREATED_AT],[CREATED_BY]) 
            VALUES (@empCode,@role,@factory,GETDATE(),@fullName)`);
        if(insert && insert.rowsAffected[0] > 0) {
            pool.close()
            return res.json({
                err: false,
                msg: "Added Successfully!",
                status:"Ok"
              });
        }else{
            pool.close()
            return res.json({
                err: true,
                msg: "Something went wrong!",
              });
        }
        }else{
            pool.close()
            return res.json({
                err: true,
                msg: "Employee Code isn't found!",
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

  async UpdateUsers(req, res) {
    try {   
        const {empCode} = req.params ;
        const {role,factory,fullName} = req.body ;

        //If not send from Client
        if(!empCode || !role || !factory || !fullName) {
            return res.json({
                err:true,
                msg:"Data is required!"
            })
        }
        const pool = await new sql.ConnectionPool(sqlConfig).connect();
           
        //Update User
        const update = await pool
        .request()
        .input("empCode",sql.NVarChar,empCode)
        .input("fullName",sql.NVarChar,fullName)
        .input("role",sql.Int,role)
        .input("factory",sql.Int,factory)
        .query(`UPDATE [dbo].[TBL_USERS] SET [ROLE] = @role,[FACTORY] = @factory,[UPDATED_AT] = GETDATE(),
            [UPDATED_BY] = @fullName WHERE [EMP_CODE] = @empCode`);
        if(update && update.rowsAffected[0] > 0) {
            pool.close()
            return res.json({
                err: false,
                msg: "Updated Successfully!",
                status:"Ok"
              });
        }else{
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


  async DeleteUser(req, res) {
    try {
        const {empCode} = req.params ;
        const pool = await new sql.ConnectionPool(sqlConfig).connect();
        const results = await pool.request()
        .input("empCode",sql.NVarChar,empCode)
        .query(`DELETE FROM [dbo].[TBL_USERS] WHERE [EMP_CODE] = @empCode`);
        if(results && results.rowsAffected[0] > 0) {
            pool.close()
            return res.json({
                err: false,
                msg: "User Deleted!",
                status:"Ok"
              });
        }else{
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

}
module.exports = UsersController;
