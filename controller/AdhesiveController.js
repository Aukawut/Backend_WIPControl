const sql = require("mssql");
const { sqlConfig } = require("../config/config");
const moment = require("moment");
const Utils = require("../utils/Utils");

const utils = new Utils();

class AdhesiveController {
  async GetAdhesiveActual(req, res) {
    try {
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const results = await pool
        .request()
        .query(`SELECT * FROM V_AdhesiveActual ORDER BY DATE_PLATE DESC`);
      if (results && results.recordset?.length > 0) {
        return res.json({
          err: false,
          status: "Ok",
          results: results?.recordset,
        });
      } else {
        return res.json({
          err: true,
          msg: "Actual not found!",
          results: [],
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
  async GetAdhesiveActualByDate(req, res) {
    const { start, end } = req.params;
    try {
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const results = await pool.request()
        .query(`SELECT * FROM V_AdhesiveActual 
          WHERE [DATE_PLATE] BETWEEN '${start}' AND '${end}'
          ORDER BY DATE_PLATE DESC`);
      if (results && results.recordset?.length > 0) {
        return res.json({
          err: false,
          status: "Ok",
          results: results?.recordset,
        });
      } else {
        return res.json({
          err: true,
          msg: "Actual not found!",
          results: [],
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

  async SaveActual(req, res) {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    const {
      partNo,
      phLine,
      glue,
      qty,
      remark,
      createdBy,
      datePlate,
      datePlan,
    } = req.body;
    try {
      if (
        !qty ||
        !partNo ||
        !phLine ||
        !glue ||
        !createdBy ||
        !datePlan ||
        !datePlate
      ) {
        return res.json({
          err: true,
          msg: "Data is required!",
        });
      }

      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const results = await pool
        .request()
        .input("partNo", sql.NVarChar, partNo)
        .input("phLine", sql.NVarChar, phLine)
        .input("glue", sql.NVarChar, glue)
        .input("qty", sql.Int, qty)
        .input("remark", sql.VarChar, remark)
        .input("createdBy", sql.NVarChar, createdBy)
        .input("datePlate", sql.Date, datePlate)
        .input("datePlan", sql.Date, datePlan)
        .input("ip", sql.NVarChar, ip)
        .query(
          `INSERT INTO [dbo].[TBL_ACTUAL_ADHESIVE] ([PART_NO],[PH_LINE],[GLUE_TYPE],[QTY],[REMARK],[CREATED_BY],[DATE_PLATE],[DATE_PLAN],[IP]) 
          VALUES (@partNo,@phLine,@glue,@qty,@remark,@createdBy,@datePlate,@datePlan,@ip)`
        );
      if (results && results.rowsAffected[0] > 0) {
        return res.json({
          err: false,
          status: "Ok",
          msg: "Actual saved!",
        });
      } else {
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

  async UpdateActual(req, res) {
    const { id } = req.params;
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    const { qty, remark, updatedBy } = req.body;
    try {
      if (!qty || !updatedBy) {
        return res.json({
          err: true,
          msg: "Data is required!",
        });
      }

      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const results = await pool
        .request()

        .input("qty", sql.Int, qty)
        .input("remark", sql.VarChar, remark)
        .input("updatedBy", sql.NVarChar, updatedBy)
        .input("ip", sql.NVarChar, ip)
        .input("id", sql.Int, id)
        .query(
          `UPDATE [dbo].[TBL_ACTUAL_ADHESIVE] SET [QTY] = @qty,[REMARK] = @remark,[UPDATED_BY] = @updatedBy,[IP] = @ip,
          [UPDATED_AT] = GETDATE() WHERE [Id] = @id`
        );
      if (results && results.rowsAffected[0] > 0) {
        return res.json({
          err: false,
          status: "Ok",
          msg: "Actual updated!",
        });
      } else {
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

  async RequestMetal(req, res) {
    const type = "RMT"; //RMT20240905001
    const now = moment(new Date()).format("YYYYMMDD");
    let inserted = 0;

    //Parts = Array
    const { factory, parts, empCode } = req.body;
    try {
      if (!factory || parts?.length == 0) {
        return res.json({
          err: true,
          msg: "Data is required!",
        });
      }

      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const results = await pool
        .request()
        .query(
          `SELECT TOP 1 *,RIGHT([REQ_NO], 3) AS LastThreeChars FROM [dbo].[TBL_METAL_REQ] ORDER BY Id DESC`
        );

      const runingNo =
        results?.recordset?.length > 0
          ? Number(results.recordset[0].LastThreeChars) + 1
          : 1;

      // Format Request Metal No.
      const format = await pool
        .request()
        .query(
          `SELECT CONCAT('${type}${now}',FORMAT(${runingNo}, '000')) as FORMAT_STR`
        );

      // Promise Function ตรวจสอบ Stock By Part
      const checkStock = await utils.CheckAdhesiveStock(parts);

      // Gen token
      const token = await utils.GenarateTokenApprove(
        format.recordset[0].FORMAT_STR
      );

      if (!checkStock.err) {
        if (!token.err) {
          const insert = await pool
            .request()
            .input("status", sql.Int, 1) // 1 = รออนุมัติ
            .input("store", sql.NVarChar, "AVP2")
            .input("picked", sql.NVarChar, "N")
            .input("factory", sql.NVarChar, factory)
            .input("requestor", sql.NVarChar, empCode)
            .input("token", sql.NVarChar, token.token)
            .query(`INSERT INTO [dbo].[TBL_METAL_REQ] ([REQ_NO],[REQUESTOR],[STATUS],[STORE],[PICKED],[CREATED_AT],[APPROVED],[FACTORY],[TOKEN]) 
              VALUES (CONCAT('${type}${now}',FORMAT(${runingNo}, '000')),@requestor,@status,@store,@picked,GETDATE(),'N',@factory,@token)`);

          for (let index = 0; index < parts.length; index++) {
            const insertDtl = await pool
              .request()
              .input("partNo", sql.NVarChar, parts[index].partNo)
              .input("qty", sql.Int, parts[index].qty)
              .query(`INSERT INTO [dbo].[TBL_METAL_REQDTL] ([REQ_NO],[PART_NO],[QTY],[CREATED_AT]) 
                VALUES (CONCAT('${type}${now}',FORMAT(${runingNo}, '000')),@partNo,@qty,GETDATE())`);
            if (insertDtl && insertDtl?.rowsAffected[0] > 0) {
              inserted++;
            }
          }
          if (
            (insert && insert.rowsAffected[0]) > 0 &&
            inserted == parts.length
          ) {
            // Send Email to Approver
            await utils.SendMailToApprover(format.recordset[0].FORMAT_STR);

            // Close SQL Connection.
            pool.close();

            //Return Json to Client Side.
            return res.json({
              err: false,
              msg: `Requested Successfully`,
              status: "Ok",
            });
          }
        }
      } else {
        console.log(checkStock);

        return res.json({
          err: true,
          msg: checkStock.msg,
          details: checkStock.details,
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

  async GetMetalRequestByFactory(req, res) {
    const { factory } = req.params;
    try {
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const results = await pool
        .request()
        .input("factory", sql.VarChar, factory)
        .query(
          `SELECT r.*,s.NAME_STATUS,u.UHR_FullName_th FROM [dbo].[TBL_METAL_REQ] r
          LEFT JOIN [dbo].[TBL_STATUS_REQ] s ON r.STATUS = s.Id
          LEFT JOIN [dbo].[V_AllUsers] u ON r.REQUESTOR COLLATE Thai_CI_AI = u.UHR_EmpCode COLLATE Thai_CI_AI
          WHERE r.[FACTORY] = @factory
          ORDER BY CREATED_AT DESC`
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
          msg: "Not Request",
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
  async GetMetalRequestByReqNo(req, res) {
    const { reqNo } = req.params;
    try {
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const results = await pool
        .request()
        .input("reqNo", sql.NVarChar, reqNo)
        .query(
          `SELECT r.*,s.NAME_STATUS,u.UHR_FullName_th FROM [dbo].[TBL_METAL_REQ] r
          LEFT JOIN [dbo].[TBL_STATUS_REQ] s ON r.STATUS = s.Id
          LEFT JOIN [dbo].[V_AllUsers] u ON r.REQUESTOR COLLATE Thai_CI_AI = u.UHR_EmpCode COLLATE Thai_CI_AI
          WHERE r.REQ_NO = @reqNo
          ORDER BY CREATED_AT DESC`
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
          msg: "Not Request",
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
  async GetRequestDetailByReq(req, res) {
    const { reqNo } = req.params;

    try {
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const results = await pool
        .request()
        .input("reqNo", sql.NVarChar, reqNo)
        .query(
          `SELECT * FROM TBL_METAL_REQDTL WHERE [REQ_NO] = @reqNo ORDER BY CREATED_AT DESC`
        );
      if (results && results.recordset?.length > 0) {
        console.log(results.recordset);

        return res.json({
          err: false,
          results: results.recordset,
          status: "Ok",
        });
      } else {
        return res.json({
          err: true,
          results: [],
          msg: "Not Request",
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

  async CancelRequestMetal(req, res) {
    const { reqNo } = req.params;
    const { empCode } = req.body;
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    try {
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const results = await pool
        .request()
        .input("reqNo", sql.NVarChar, reqNo)
        .query(`SELECT * FROM [dbo].[TBL_METAL_REQ] WHERE [REQ_NO] = @reqNo`);
      if (results && results.recordset?.length > 0) {
        const status = results.recordset[0].STATUS;
        const requestBy = results.recordset[0].REQUESTOR;

        //  Status = New Jobs
        // Id 4 = Cancel ;
        if (status == 1) {
          // Not permission
          if (requestBy !== empCode) {
            return res.json({
              err: true,
              msg: "Permission is denined!",
            });
          }

          const update = await pool
            .request()
            .input("reqNo", sql.NVarChar, reqNo)
            .query(
              `UPDATE [dbo].[TBL_METAL_REQ] SET [STATUS] = 4 WHERE [REQ_NO] = @reqNo`
            );

          if (update && update?.rowsAffected[0] > 0) {
            //Save Logs
            utils.SaveLogs(
              `Cancel Request Metal No.${reqNo} by ${empCode}`,
              ip,
              empCode
            );

            return res.json({
              err: false,
              msg: `${reqNo} Canceled!`,
              status: "Ok",
            });
          } else {
            return res.json({
              err: true,
              msg: `Something went wrong`,
            });
          }
        }
        console.log(results.recordset);

        return res.json({
          err: false,
          results: results.recordset,
          status: "Ok",
        });
      } else {
        return res.json({
          err: true,
          results: [],
          msg: "Not Request",
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

  async ApproveRequestMetal(req, res) {
    const { reqNo } = req.params;
    const { approve, device, by, remark } = req.body;
    const status = approve == "Y" ? 2 : 3; // 2= อนุมัติ 3 ไม่อนุมัติ
    try {
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const results = await pool
        .request()
        .input("reqNo", sql.NVarChar, reqNo)
        .input("approve", sql.NVarChar, approve)
        .input("device", sql.NVarChar, device)
        .input("by", sql.NVarChar, by)
        .input("remark", sql.NVarChar, remark)
        .input("status", sql.Int, status)
        .query(
          `UPDATE [dbo].[TBL_METAL_REQ] SET [APPROVED] = @approve,[APPROVED_BY] = @by, [REMARK] = @remark,[DEVICE_APPROVE] = @device,[STATUS] = @status  
           WHERE [REQ_NO] = @reqNo`
        );
      if (results && results.rowsAffected[0] > 0) {
        return res.json({
          err: false,
          msg: "Approved successfully!",
          status: "Ok",
        });
      } else {
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
module.exports = AdhesiveController;
