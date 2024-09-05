const sql = require("mssql");
const jwt = require("jsonwebtoken");
const { sqlConfig } = require("../config/config");

class Utils {
  async SearchAllFactory(sumBy) {
    try {
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const resultsPart = await pool.request()
        .query(`SELECT itemno as ItemNo,itypcd,packcd as Pack,trnstt as Status_TF,
        SUM(pckqty) as Qty  FROM [BSNCRAPP09].[DCS_IM].[dbo].v_pd_status_summary_byfac
        where  ITYPCD <> 'SEMI' GROUP BY  itemno,itypcd,packcd,trnstt
        ORDER BY itemno, itypcd,packcd,trnstt`);

      const resultsLot = await pool.request()
        .query(`SELECT  itemno as ItemNo,lotno as LotNo,itypcd,packcd as Pack,trnstt as Status_TF,sum(pckqty) as Qty  
        FROM [BSNCRAPP09].[DCS_IM].[dbo].v_pd_status_summary_byfac
        WHERE  ITYPCD <> 'SEMI' GROUP BY itemno,lotno,itypcd,packcd,trnstt
        ORDER BY itemno,lotno,itypcd,packcd,trnstt`);

      if (sumBy == "part") {
        if (resultsPart?.recordset?.length > 0) {
          return { err: false, status: "Ok", results: resultsPart.recordset };
        } else {
          return { err: true, msg: "Not Found", results: [] };
        }
      } else if (sumBy == "lot") {
        if (resultsLot?.recordset?.length > 0) {
          return { err: false, status: "Ok", results: resultsLot.recordset };
        } else {
          return { err: true, msg: "Not Found", results: [] };
        }
      } else {
        return { err: true, msg: "Something went wrong" };
      }
    } catch (err) {
      console.log(err);
      return { err: true, msg: err.message };
    }
  }

  async SearchByFactory(sumBy, factory) {
    try {
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const resultsPart = await pool
        .request()
        .input("factory", sql.NVarChar, factory)
        .query(`SELECT  fctycd as Factory,itemno as ItemNo,itypcd,packcd as Pack,trnstt as Status_TF,sum(pckqty) as Qty  
        FROM [BSNCRAPP09].[DCS_IM].[dbo].v_pd_status_summary_byfac
        WHERE fctycd = @factory AND ITYPCD <> 'SEMI' GROUP BY fctycd,itemno,itypcd,packcd,trnstt
        ORDER BY fctycd,itemno,itypcd,packcd,trnstt`);

      const resultsLot = await pool
        .request()
        .input("factory", sql.NVarChar, factory)
        .query(`SELECT  fctycd as Factory,itemno as ItemNo,lotno as LotNo,itypcd,packcd as Pack,trnstt as Status_TF,pckqty as Qty  
        FROM [BSNCRAPP09].[DCS_IM].[dbo].v_pd_status_summary_byfac
        WHERE fctycd = @factory AND ITYPCD <> 'SEMI'
        ORDER BY itemno,lotno`);

      if (sumBy == "part") {
        if (resultsPart?.recordset?.length > 0) {
          return { err: false, status: "Ok", results: resultsPart.recordset };
        } else {
          return { err: true, msg: "Not Found", results: [] };
        }
      } else if (sumBy == "lot") {
        if (resultsLot?.recordset?.length > 0) {
          return { err: false, status: "Ok", results: resultsLot.recordset };
        } else {
          return { err: true, msg: "Not Found", results: [] };
        }
      } else {
        return { err: true, msg: "Something went wrong" };
      }
    } catch (err) {
      console.log(err);
      return { err: true, msg: err.message };
    }
  }

  async getHRInfomation(username) {
    try {
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const results = await pool
        .request()
        .input("username", sql.NVarChar, username)
        .query(`SELECT us.EMP_CODE,us.ROLE,f.Id as Id_Factory,f.FACTORY_NAME,r.NAME_ROLE,u.UHR_FirstName_en,u.UHR_EmpCode,u.UHR_LastName_en,u.UHR_Department,u.AD_Mail,u.AD_UserLogon FROM TBL_USERS us 
                LEFT JOIN V_AllUsers u ON us.EMP_CODE = u.UHR_EmpCode
                LEFT JOIN TBL_USERS um ON u.UHR_EmpCode = um.EMP_CODE
                LEFT JOIN TBL_ROLE r ON us.ROLE = r.Id
                LEFT JOIN TBL_FACTORY f ON um.FACTORY = f.Id
                WHERE u.AD_UserLogon = @username`);
      if (results && results.recordset?.length > 0) {
        const payload = {
          username: results.recordset[0].AD_UserLogon,
          department: results.recordset[0].UHR_Department,
          emp_code: results.recordset[0].UHR_EmpCode,
          firstName: results.recordset[0].UHR_FirstName_en,
          lastName: results.recordset[0].UHR_LastName_en,
          role: results.recordset[0].NAME_ROLE,
          factory: results.recordset[0].FACTORY_NAME,
        };

        return { err: false, payload: payload };
      } else {
        return { err: true, msg: "Users isn't found" };
      }
    } catch (err) {
      return { err: true, msg: err.message };
    }
  }

  getToken(payload) {
    const secretKey = process.env.JWT_SECRET;
    const token = jwt.sign(payload, secretKey, {
      expiresIn: "4h",
    });

    return token;
  }

  async SaveLogsChangePlan(id, fields) {
    try {
      let stmt = "UPDATE [dbo].[TBL_PN_LOGCHANGE] SET";
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
 
      const results = await pool
        .request()
        .input("id", sql.Int, id)
        .query(`SELECT * FROM [dbo].[TBL_PN_LOGCHANGE] WHERE [Id_Plan] = @id`);
      if (results && results?.recordset?.length > 0) {
        for (let i = 0; i < fields?.length; i++) {
          stmt += ` ${fields[i].fieldName} = ${fields[i].bind}`;
        }
        stmt += " WHERE [Id_Plan] = @id";
      }
      const update = await pool
        .request()
        .input("id", sql.Int, id)
        .input("mc", sql.Int, Number(results?.recordset[0].C_MC) + 1)
        .input("mcGroup", sql.Int, Number(results?.recordset[0].C_MC_GROUP) + 1)
        .input("customer", sql.Int,Number(results?.recordset[0].C_CUSTOMER_CODE) + 1)
        .input("partNo", sql.Int, Number(results?.recordset[0].C_PART_NO) + 1)
        .input("compound",sql.Int,Number(results?.recordset[0].C_COMPOUND) + 1)
        .input("pack", sql.Int, Number(results?.recordset[0].C_PACK) + 1)
        .input("qty", sql.Int, Number(results?.recordset[0].C_QTY) + 1)
        .query(stmt);
      
        
      if (update && update?.rowsAffected[0] > 0) {
        pool.close();
        return { err: false, msg: "Logs changed successfully" };
      } else {
        pool.close();
        return { err: true, msg: "Logs save failed" };
      }
    } catch (err) {
      console.log(err);
      return { err: true, msg: err.message };
    }
  }
}

module.exports = Utils;
