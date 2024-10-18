const sql = require("mssql");
const { sqlConfig, sqlConfigApp02 } = require("../config/config");
const moment = require("moment");
const Utils = require("../utils/Utils");
const QRCode = require("qrcode");

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
  async GetMetalSupplyByDate(req, res) {
    const { start, end } = req.params;
    try {
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const results = await pool.request()
        .query(`SELECT  Tran_no,Tran_date,partno,mach_name,sum(qty_box) as sumqty,fac_supply,user_supply,status,create_by,convert(varchar(16),create_date,120) as create_date,system_machine
        from  tbl_csupply where  tran_date  between '${start}' AND '${end}'
        group by Tran_no,Tran_date,lot_no,partno,mach_name, fac_supply,user_supply,status,create_by,convert(varchar(16),create_date,120),system_machine
        order by tran_no`);
      if (results && results.recordset?.length > 0) {
        // console.log(results?.recordset);

        return res.json({
          err: false,
          status: "Ok",
          results: results?.recordset,
        });
      } else {
        return res.json({
          err: true,
          msg: "Supply not found!",
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

  async GetRunningNumber(req, res) {
    try {
      const prefix = "RQ"; //RQ1706300001
      const dateNow = moment(new Date()).format("YYMMDD");

      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const results = await pool
        .request()
        .query(
          `SELECT TOP 1 tran_no from tbl_crequestsupply WHERE tran_no like '%${prefix}${dateNow}%' ORDER BY tran_no DESC`
        );
      console.log(results?.recordset);
      if (results && results?.recordset?.length > 0) {
        const tran = results?.recordset[0].tran_no;
        const lastNo = Number(tran.slice(-4)) + 1;
        const format = await pool
          .request()
          .query(
            `SELECT RIGHT('0000' + CAST(${lastNo} AS VARCHAR(4)), 4) AS PaddedNumber`
          );
        pool.close();
        return res.json({
          err: false,
          msg: "Ok",
          lastNo: `RQ${dateNow}${format.recordset[0].PaddedNumber}`,
        });
      } else {
        pool.close();
        return res.json({
          err: false,
          msg: "Ok",
          lastNo: `RQ${dateNow}0001`,
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

  async GetSupplyRunningNumber(req, res) {
    try {
      const prefix = "SUP"; //SUP1706300001
      const dateNow = moment(new Date()).format("YYMMDD");

      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const results = await pool
        .request()
        .query(
          `select top 1 tran_no from tbl_csupply WHERE tran_no like '%${prefix}${dateNow}%' ORDER BY tran_no DESC`
        );
      console.log(results?.recordset);
      if (results && results?.recordset?.length > 0) {
        const tran = results?.recordset[0].tran_no;
        const lastNo = Number(tran.slice(-5)) + 1;
        const format = await pool
          .request()
          .query(
            `SELECT RIGHT('00000' + CAST(${lastNo} AS VARCHAR(5)), 5) AS PaddedNumber`
          );
        pool.close();
        return res.json({
          err: false,
          msg: "Ok",
          lastNo: `SUP${dateNow}${format.recordset[0].PaddedNumber}`,
        });
      } else {
        pool.close();
        return res.json({
          err: false,
          msg: "Ok",
          lastNo: `SUP${dateNow}00001`,
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

  async GetRollerByPart(req, res) {
    try {
      const { partNo } = req.params;

      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const results = await pool
        .request()
        .input("partNo", sql.NVarChar, partNo)
        .query(
          `SELECT roller_no,roller_detail,partno,sum(qty_box) as sumqty  ,count(tagno) as count_tag 
          FROM tbl_cstockdetail WHERE partno = @partNo
          AND status='USE'
          AND status_supply='N'
          AND status_active = 'FG'
          GROUP BY roller_no,roller_detail,partno
          ORDER BY roller_no,roller_detail,partno`
        );

      if (results && results?.recordset?.length > 0) {
        pool.close();
        return res.json({
          err: false,
          status: "Ok",
          results: results.recordset,
        });
      } else {
        pool.close();
        return res.json({
          err: false,
          msg: "Not Found",
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

  async CheckBoxNotFull(req, res) {
    try {
      const { partNo, qty } = req.params;
      const now = moment(new Date()).format("YYYY-MM-DD");
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const results = await pool
        .request()
        .input("partNo", sql.NVarChar, partNo)
        .input("qty", sql.NVarChar, qty)
        .query(
          `SELECT qty_box FROM tbl_cstockdetail a 
          left join [dbo].[V_AdhesiveLotControl] b ON a.partno = b.[Part_No]
          AND a.lot_no = b.[Lot_No] WHERE partno = @partNo and qty_box = @qty AND
          a.status = 'USE' AND a.status_supply = 'N' AND a.status_active = 'FG'  and 
          b.[QA_DateExpire] >= '${now}'`
        );

      if (results && results?.recordset?.length > 0) {
        pool.close();
        return res.json({
          err: false,
          status: "Ok",
          results: results.recordset,
        });
      } else {
        pool.close();
        return res.json({
          err: true,
          msg: "Box Not Found",
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
  async SeachRequestMetalWaitClose(req, res) {
    try {
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const results = await pool.request().query(
        `SELECT distinct Tran_No as Transaction_No,factory,user_supply,status as Status  from  tbl_crequestsupply
          WHERE status_finish = 'N' and status = 'USE' order by tran_no 
          `
      );

      if (results && results?.recordset?.length > 0) {
        pool.close();
        return res.json({
          err: false,
          status: "Ok",
          results: results.recordset,
        });
      } else {
        pool.close();
        return res.json({
          err: true,
          msg: "Request Not Found",
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

  async SeachRequestMetalAllLot(req, res) {
    try {
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const results = await pool.request().query(
        `SELECT distinct  S.Tran_No as Transaction_No,S.Lot_no as Lot_No,S.partno as Part_NO,S.mach_name as MachineName,S.date_expire as Date_Expire, L.create_date,  sum(S.qty_box) as sumqty  from  tbl_cstockdetail S, tbl_clotcontrolhd L
          where  S.lot_no = L.lot_no
          and  S.partno=L.partno
          and   S.status like '%USE%'
          and  S.status_supply not like'%Y%'
          and S.status_active='FG'
          group by  S.Tran_No  ,S.Lot_no ,S.partno,S.mach_name,S.date_expire,L.create_date
          order by  S.Tran_No  ,S.Lot_no ,S.partno,S.mach_name,S.date_expire,L.create_date 
          `
      );

      if (results && results?.recordset?.length > 0) {
        pool.close();
        return res.json({
          err: false,
          status: "Ok",
          results: results.recordset,
        });
      } else {
        pool.close();
        return res.json({
          err: true,
          msg: "Lot Not Found",
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
  async SearchLotDetailByTranNo(req, res) {
    try {
      const { lotNo, tranNo } = req.params;

      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const results = await pool
        .request()
        .input("tranNo", sql.NVarChar, tranNo)
        .input("lotNo", sql.NVarChar, lotNo)
        .query(
          `SELECT * FROM tbl_cstockdetail WHERE tran_no = @tranNo
          and lot_no = @lotNo and status_supply not like '%Y%'
          and status_active = 'FG'
          order by  itemtag
          `
        );

      if (results && results?.recordset?.length > 0) {
        pool.close();
        return res.json({
          err: false,
          status: "Ok",
          results: results.recordset,
        });
      } else {
        pool.close();
        return res.json({
          err: true,
          msg: "Lot Not Found",
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
  async SearchSupplyDetailByTranNo(req, res) {
    try {
      const { tranNo } = req.params;

      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const results = await pool
        .request()
        .input("tranNo", sql.NVarChar, tranNo)

        .query(
          `select user_supply,tran_no,factory,partno,lot_no,roller_no,qty_supply,box_total,pcs_box  from tbl_crequestsupply
          where tran_no = @tranNo order by items
          `
        );

      if (results && results?.recordset?.length > 0) {
        pool.close();
        return res.json({
          err: false,
          status: "Ok",
          results: results.recordset,
        });
      } else {
        pool.close();
        return res.json({
          err: true,
          msg: "Lot Not Found",
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

  async SearchLotForRequest(req, res) {
    try {
      const now = moment(new Date()).format("YYYY-MM-DD");
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const results = await pool.request().query(
        `SELECT distinct  a.Tran_No as Transaction_No,a.Lot_no as Lot_No,a.partno as Part_NO,a.mach_name as MachineName,substring(a.lot_no,6,9) as lot_sup,sum(a.qty_box) as sumqty 
          FROM  tbl_cstockdetail a LEFT JOIN [dbo].[V_AdhesiveLotControl] b ON a.partno = b.[Part_No]
          AND a.Lot_no = b.[Lot_No]
          WHERE  a.status like '%USE%'
          AND a.status_supply not like'%Y%'
          AND a.status_active = 'FG'
          AND b.[QA_DateExpire] >= '${now}'
          GROUP BY  a.Tran_No ,a.Lot_no,a.partno,a.mach_name
          ORDER BY a.partno,substring(a.lot_no,6,9)`
      );

      if (results && results?.recordset?.length > 0) {
        pool.close();
        return res.json({
          err: false,
          status: "Ok",
          results: results.recordset,
        });
      } else {
        pool.close();
        return res.json({
          err: true,
          msg: "Lot Not Found",
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

  async SearchLotForRequestByPart(req, res) {
    try {
      const now = moment(new Date()).format("YYYY-MM-DD");
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const results = await pool.request().query(
        `SELECT distinct  a.Tran_No as Transaction_No,a.Lot_no as Lot_No,a.partno as Part_NO,a.mach_name as MachineName,substring(a.lot_no,6,9) as lot_sup,sum(a.qty_box) as sumqty 
          FROM  tbl_cstockdetail a LEFT JOIN [dbo].[V_AdhesiveLotControl] b ON a.partno = b.[Part_No]
          AND a.Lot_no = b.[Lot_No]
          WHERE  a.status like '%USE%'
          AND a.status_supply not like'%Y%'
          AND a.status_active = 'FG'
          AND b.[QA_DateExpire] >= '${now}'
          GROUP BY  a.Tran_No ,a.Lot_no,a.partno,a.mach_name
          ORDER BY a.partno,substring(a.lot_no,6,9)`
      );

      if (results && results?.recordset?.length > 0) {
        pool.close();
        return res.json({
          err: false,
          status: "Ok",
          results: results.recordset,
        });
      } else {
        pool.close();
        return res.json({
          err: true,
          msg: "Lot Not Found",
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

  async SearchRollerDetailByPart(req, res) {
    try {
      const now = moment(new Date()).format("YYYY-MM-DD");
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const results = await pool.request().query(
        `select distinct S.lot_no ,S.date_lot,convert(int,SUBSTRING(S.lot_no, 6, 9))  as lot_sort , L.create_date ,sum(s.qty_box) as sumamount   
          from  tbl_cstockdetail S,tbl_clotcontrolhd L,[dbo].[V_AdhesiveLotControl] V
          where  S.lot_no=L.lot_no
          and S.partno=L.partno
          and  S.partno='1G0563-12' and S.lot_no=V.[Lot_No]
          and S.partno=V.[Part_No] and
          S.status='USE' and
          S.status_supply='N'
          and S.status_active='FG' and V.[QA_DateExpire] >= '${now}'
          group by S.lot_no ,S.date_lot,L.create_date
          order by S.date_lot,L.create_date,lot_sort`
      );

      let qtys = 0;
      let sumqty = 0;
      let lottotal = "";
      let cQtyRoller = "";
      if (results && results?.recordset?.length > 0) {
        for (let i = 0; i < results?.recordset?.length; i++) {
          let lot = results?.recordset[i].lot_no;
          let roller = results?.recordset[i].roller_no;

          let datetime = moment(results?.recordset[i].create_date).format(
            "lll"
          );
          qtys = Number(results?.recordset[i].sumamount);
          sumqty += qtys;
          lottotal += "," + lot + "(" + datetime + ")";

          const stmt = `select distinct S.lot_no , S.roller_no,sum(s.qty_box) as suma  from  tbl_cstockdetail S
            where S.lot_no='${lot}'
            and S.status='USE'
            and S.status_supply='N'
            and S.status_active = 'FG'
            group by S.lot_no ,S.roller_no
`;
          const res = await pool.request().query(stmt);
          cQtyRoller = "," + roller + "(" + res.recordset[0].suma + ")";
          console.log(res.recordset);
        }
        console.log(sumqty);
        console.log(lottotal);
        console.log(cQtyRoller);

        pool.close();
        return res.json({
          err: false,
          status: "Ok",
          results: results.recordset,
        });
      } else {
        pool.close();
        return res.json({
          err: true,
          msg: "Lot Not Found",
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

  async SaveNotGoodAdhesive(req, res) {
    try {
      const { plateDate, partNo, fullName, remark, qty, cause } = req.body;

      if (!plateDate || !partNo || !fullName || !qty || !cause) {
        return res.json({
          err: true,
          msg: "Sorry, Data is required",
        });
      }

      // Open Connection
      const pool = await new sql.ConnectionPool(sqlConfig).connect();

      const results = await pool.request().input("partNo", sql.NVarChar, partNo)
        .query(`SELECT * FROM [dbo].[TBL_ADHESIVE_PLAN] 
        WHERE [DATE_PLATE] = '${plateDate}' AND [PART_NO] = @partNo`);

      if (results && results?.recordset?.length > 0) {
        const insert = await pool
          .request()
          .input("planDate", sql.Date, results.recordset[0].DATE_PLAN)
          .input("plateDate", sql.Date, plateDate)
          .input("partNo", sql.NVarChar, partNo)
          .input("fullName", sql.NVarChar, fullName)
          .input("cause", sql.NVarChar, cause)
          .input("remark", sql.NVarChar, remark)
          .input("qty", sql.Int, qty)
          .query(
            `INSERT INTO [dbo].[TBL_NG_ADHESIVE] ([PART_NO],[PLAN_DATE],[PLATE_DATE],[CREATED_BY],[CAUSE],[NG_QTY],[REMARK],[FACTORY],[CREATED_AT])
           VALUES (@partNo,@planDate,@plateDate,@fullName,@cause,@qty,@remark,'AVP2',GETDATE())
         `
          );
        if (insert && insert.rowsAffected[0] > 0) {
          pool.close();
          return res.json({
            err: false,
            msg: "Saved successfully!",
            status: "Ok",
          });
        } else {
          return res.json({
            err: true,
            msg: "Something went wrong!",
          });
        }
      } else {
        return res.json({
          err: true,
          msg: "Sorry, Adhesive Plan isn't found",
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

  async UpdateNotGoodAdhesive(req, res) {
    try {
      const { id } = req.params;
      const dateNow = moment(new Date()).utc().format("YYYY-MM-DD HH:MM");

      const { plateDate, partNo, fullName, remark, qty, cause } = req.body;

      if (!plateDate || !partNo || !fullName || !qty || !cause) {
        return res.json({
          err: true,
          msg: "Sorry, Data is required",
        });
      }

      // Open Connection
      const pool = await new sql.ConnectionPool(sqlConfig).connect();

      const results = await pool.request().input("partNo", sql.NVarChar, partNo)
        .query(`SELECT * FROM [dbo].[TBL_ADHESIVE_PLAN] 
        WHERE [DATE_PLATE] = '${plateDate}' AND [PART_NO] = @partNo`);

      if (results && results?.recordset?.length > 0) {
        const update = await pool
          .request()
          .input("planDate", sql.Date, results.recordset[0].DATE_PLAN)
          .input("plateDate", sql.Date, plateDate)
          .input("partNo", sql.NVarChar, partNo)
          .input("fullName", sql.NVarChar, fullName)
          .input("cause", sql.NVarChar, cause)
          .input("remark", sql.NVarChar, remark)
          .input("qty", sql.Int, qty)
          .input("id", sql.Int, id)
          .query(
            `UPDATE [dbo].[TBL_NG_ADHESIVE] SET [PART_NO] = @partNo,[PLAN_DATE] = @planDate,[PLATE_DATE] = @plateDate,
            [UPDATED_BY] = @fullName,[CAUSE] = @cause,[NG_QTY] = @qty,[REMARK] = @remark,[UPDATED_AT] = GETDATE() WHERE [Id] = @id`
          );
        if (update && update.rowsAffected[0] > 0) {
          pool.close();
          return res.json({
            err: false,
            msg: "Updated successfully!",
            status: "Ok",
          });
        } else {
          return res.json({
            err: true,
            msg: "Something went wrong!",
          });
        }
      } else {
        return res.json({
          err: true,
          msg: "Sorry, Adhesive Plan isn't found",
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

  async GetNotGoodAdhesiveByDate(req, res) {
    try {
      const { start, end } = req.params;

      // Open Connection
      const pool = await new sql.ConnectionPool(sqlConfig).connect();

      const results = await pool.request().query(
        ` SELECT ng.*,p.SumPlanQty as QtyPlan  FROM [dbo].[TBL_NG_ADHESIVE] ng  
            LEFT JOIN  (SELECT PART_NO,SUM(QTY) as SumPlanQty,DATE_PLATE FROM [TBL_ADHESIVE_PLAN] GROUP BY PART_NO,DATE_PLATE) p  
            ON ng.PART_NO COLLATE Thai_CI_AI = p.PART_NO COLLATE Thai_CI_AI AND ng.PLATE_DATE = p.DATE_PLATE
            WHERE ng.[PLATE_DATE] BETWEEN '${start}' AND '${end}' ORDER BY ng.CREATED_AT DESC`
      );

      if (results && results?.recordset?.length > 0) {
        pool.close();
        return res.json({
          err: false,
          status: "Ok",
          results: results?.recordset,
        });
      } else {
        pool.close();
        return res.json({
          err: true,
          msg: "Sorry, Adhesive NG isn't found",
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

  async DeleteNotGoodById(req, res) {
    try {
      const { id } = req.params;

      // Open Connection
      const pool = await new sql.ConnectionPool(sqlConfig).connect();

      const results = await pool
        .request()
        .input("id", sql.Int, id)
        .query(`DELETE FROM [dbo].[TBL_NG_ADHESIVE] WHERE [Id] = @id`);

      if (results && results?.rowsAffected[0] > 0) {
        pool.close();
        return res.json({
          err: false,
          status: "Ok",
          msg: "Deleted successfully!",
        });
      } else {
        pool.close();
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

  async SetUpdateStockMetal(req, res) {
    try {
      const { id } = req.params;

      // Open Connection
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const result = await pool
        .request()
        .query(`SELECT * FROM tbl_cstockmetal WHERE [remain] <= 0`);
      if (result && result.recordset?.length > 0) {
        const deleteStock = await pool
          .request()
          .input("id", sql.Int, id)
          .query(`DELETE FROM tbl_cstockmetal WHERE [remain] <= 0`);

        if (deleteStock && deleteStock?.rowsAffected[0] > 0) {
          pool.close();
          return res.json({
            err: false,
            status: "Ok",
            msg: "Stock updated!",
          });
        } else {
          pool.close();
          return res.json({
            err: true,
            msg: "Something went wrong!",
          });
        }
      } else {
        // ไม่มี Stock ค้าง
        return res.json({
          err: false,
          msg: "Stock is OK",
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
  async GetAllRequestMetal(req, res) {
    try {
      const { start, end, notFinished } = req.params;
      const stmt_all = `SELECT DISTINCT tran_no,tran_date,factory,user_supply ,status,status_finish,create_by,create_date,lastupdate_by,lastupdate_date,plan_date,approved  FROM tbl_crequestsupply 
      WHERE tran_date between '${start}' and '${end}' order by tran_no`;

      const stmt_wait = `SELECT DISTINCT tran_no,tran_date,factory,user_supply ,status,status_finish,create_by,create_date,lastupdate_by,lastupdate_date,plan_date,approved  FROM tbl_crequestsupply 
      WHERE tran_date between '${start}' and '${end}' AND status_finish = 'N' order by tran_no`;

      // Open Connection
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const result = await pool
        .request()
        .query(notFinished == "Y" ? stmt_wait : stmt_all);
      if (result && result.recordset?.length > 0) {
        return res.json({
          err: false,
          status: "Ok",
          results: result.recordset,
        });
      } else {
        return res.json({
          err: false,
          msg: "Not Found",
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

  async GetAllRequestMetalByTrans(req, res) {
    try {
      const { transecNo } = req.params;
      console.log(transecNo);

      // Open Connection
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const result = await pool
        .request()
        .input("transecNo", sql.NVarChar, transecNo)
        .query(`SELECT * FROM tbl_crequestsupply WHERE tran_no = @transecNo`);
      if (result && result.recordset?.length > 0) {
        return res.json({
          err: false,
          status: "Ok",
          results: result.recordset,
        });
      } else {
        return res.json({
          err: false,
          msg: "Not Found",
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

  async CancelRequestMetalByTrans(req, res) {
    try {
      const { transecNo } = req.params;

      // Open Connection
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const result = await pool
        .request()
        .input("transecNo", sql.NVarChar, transecNo)
        .query(
          `SELECT supply_code,tran_no FROM tbl_csupply WHERE supply_code = @transecNo and status = 'USE'`
        );
      if (result && result.recordset?.length > 0) {
        // สร้างใบเบิกแล้ว
        return res.json({
          err: true,
          msg: "Please Cancel supply process",
        });
      } else {
        const update = await pool
          .request()
          .input("transecNo", sql.NVarChar, transecNo)
          .query(
            `update tbl_crequestsupply set [status] = 'CANCEL' WHERE [tran_no] = @transecNo`
          );

        if (update && update.rowsAffected[0] > 0) {
          return res.json({
            err: false,
            msg: "Updated",
            status: "Ok",
          });
        } else {
          return res.json({
            err: true,
            msg: "Something went wrong",
          });
        }
      }
    } catch (err) {
      console.log(err);
      return res.json({
        err: true,
        msg: err.message,
      });
    }
  }
  async GetStockTagNoByPart(req, res) {
    try {
      const { partNo } = req.params;
      const now = moment(new Date()).format("YYYY-MM-DD");
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const results = await pool.request().input("partNo", sql.NVarChar, partNo)
        .query(`SELECT partno as Part_NO,tagno,qty_box  FROM  tbl_cstockdetail
      WHERE  status like '%USE%' AND  partno = @partNo AND  status_supply not like '%Y%' AND status_active = 'FG'
      AND date_expire >= '${now}'
      order by tagno`);
      if (results && results.recordset?.length > 0) {
        pool.close();
        return res.json({
          err: false,
          results: results.recordset,
          status: "Ok",
        });
      } else {
        pool.close();
        return res.json({
          err: true,
          msg: "Not Found",
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

  async GetLotDetailByPartNo(req, res) {
    try {
      const { partNo } = req.params;
      const now = moment(new Date()).format("YYYY-MM-DD");
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const results = await pool.request().input("partNo", sql.NVarChar, partNo)
        .query(`select distinct S.lot_no ,S.date_lot,convert(int,SUBSTRING(S.lot_no, 6, 9))  as lot_sort , L.create_date ,sum(s.qty_box) as sumamount   from  tbl_cstockdetail S,tbl_clotcontrolhd L
              where  S.lot_no=L.lot_no and S.partno=L.partno and  S.partno = @partNo
              and S.status='USE'
              and S.status_supply='N'
              and S.status_active='FG'
              and S.date_expire >= '${now}'
              group by S.lot_no ,S.date_lot,L.create_date
              order by S.date_lot,L.create_date,lot_sort`);

      if (results && results.recordset?.length > 0) {
        pool.close();
        return res.json({
          err: false,
          results: results.recordset,
          status: "Ok",
        });
      } else {
        pool.close();
        return res.json({
          err: true,
          msg: "Not Found",
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
  async SearchRollerByLot(req, res) {
    try {
      const { lotNo } = req.params;
      const now = moment(new Date()).format("YYYY-MM-DD");
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const results = await pool.request().input("lotNo", sql.NVarChar, lotNo)
        .query(`select distinct S.lot_no , S.roller_no,sum(s.qty_box) as suma    from  tbl_cstockdetail S
              where S.lot_no = @lotNo and S.status='USE'
              and S.status_supply='N'
              and S.status_active='FG'
              and S.date_expire >= '${now}'
              group by S.lot_no ,S.roller_no`);

      if (results && results.recordset?.length > 0) {
        pool.close();
        return res.json({
          err: false,
          results: results.recordset,
          status: "Ok",
        });
      } else {
        pool.close();
        return res.json({
          err: true,
          msg: "Not Found",
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
  async GetRequestOutStand(req, res) {
    try {
      const { partNo } = req.params;
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const results = await pool.request().input("partNo", sql.NVarChar, partNo)
        .query(`select tran_no,sum(qty_supply - Supply_ok)  as sum_req  from [tbl_crequestsupply] where partno = @partNo and status_finish='N'
      and status='USE' group by tran_no`);

      if (results && results.recordset?.length > 0) {
        pool.close();
        return res.json({
          err: false,
          results: results.recordset,
          status: "Ok",
        });
      } else {
        pool.close();
        return res.json({
          err: true,
          msg: "Not Found",
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

  async SumQtyInRollerByPartNo(req, res) {
    try {
      const { partNo } = req.params;
      const now = moment(new Date()).format("YYYY-MM-DD");
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const results = await pool.request().input("partNo", sql.NVarChar, partNo)
        .query(`SELECT  roller_no,roller_detail,partno,sum(qty_box) as sumqty ,count(tagno) as count_tag from tbl_cstockdetail
              where partno = @partNo and status='USE' and status_supply='N' and status_active='FG'
              and date_expire >='${now}' group by roller_no,roller_detail,partno
              order by roller_no,roller_detail,partno`);

      if (results && results.recordset?.length > 0) {
        pool.close();
        return res.json({
          err: false,
          results: results.recordset,
          status: "Ok",
        });
      } else {
        pool.close();
        return res.json({
          err: true,
          msg: "Not Found",
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

  async SaveRequestSupply(req, res) {
    try {
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const poolApp04 = await new sql.ConnectionPool(sqlConfig).connect();
      const { transecNo, items, fullName, planDate, factory, remark } = req.body;
      const dateNow = moment(new Date()).format("YYYY-MM-DD");
      let inserted = 0;
      
    
      if (
        !fullName ||
        items?.length == 0 ||
        !planDate ||
        !factory ||
        !transecNo
      ) {
        return res.json({
          err: true,
          msg: "Data is required!",
        });
      }
      const checkTransection = await pool
        .request()
        .input("transecNo", sql.NVarChar, transecNo)
        .query(
          `SELECT tran_no  FROM  tbl_crequestsupply WHERE [tran_no] = @transecNo`
        );

      if (checkTransection && checkTransection.recordset?.length > 0) {
        pool.close();
        return res.json({
          err: true,
          msg: "Transection duplicated",
        });
      } else {
        if (
          factory !== "AVP1" &&
          factory !== "AVP3" &&
          factory !== "AVP4" &&
          factory !== "AVP5" && factory !== "Expire_Lot"
        ) {
          // Expire Lot
        } else {
          let errorPlan = [];
          let limitError = [];

          //<--  Start Loop ---->
          for (let i = 0; i < items.length; i++) {
            console.log(planDate);
            let limit;
            const checkPlan = await poolApp04
              .request()
              .input("factory", sql.NVarChar, factory)
              .input("partNo", sql.NVarChar, items[i].partNo)
              .query(`SELECT DISTINCT a.*,b.FG_PARTNO,b.RM_PARTNO FROM (
            SELECT PLAN_DATE,SUM(QTY) as SumQtyPlan,PART_NO,FACTORY 
            FROM [dbo].[TBL_MOLDING_PLAN] GROUP BY PLAN_DATE,PART_NO,FACTORY ) a
            LEFT JOIN [dbo].[TBL_BOMS] b ON a.PART_NO COLLATE Thai_CI_AI  = b.FG_PARTNO COLLATE Thai_CI_AI
            WHERE b.FG_PARTNO IS NOT NULL AND b.RM_PARTNO = @partNo AND a.SumQtyPlan > 0 
            AND a.PLAN_DATE = '${planDate}' AND a.FACTORY = @factory`);
            if (checkPlan && checkPlan?.recordset?.length > 0) {
              // ถ้ามีเหล็กมีในแผน Date Plan
              const supply = await pool
                .request()
                .input("partNo", sql.NVarChar, items[i].partNo)
                .query(`SELECT SUM(qty_supply) as SumSupplyQty,
            [partno],[plan_date] FROM [DB_AVP2WIPCONTROL].[dbo].[tbl_crequestsupply] 
            WHERE partno = @partNo AND plan_date = '${planDate}'
            AND status = 'USE' GROUP BY [partno],[plan_date]`);

              // ยอดที่ได้มีการเบิกไปแล้ว
              const supplyQty =
                supply?.recordset?.length > 0
                  ? Number(supply?.recordset[0]?.SumSupplyQty)
                  : 0;
              console.log("เบิกแล้ว = ", supplyQty);

              const stdBox = Number(items[i].pcsBox);
              let qtyPlan = Number(checkPlan?.recordset[0].SumQtyPlan);
              const boxOdd = qtyPlan % stdBox;
              console.log("กล่องเศษ", boxOdd);

              if (Number(boxOdd) > 0) {
                limit =
                  (Number(qtyPlan) - Number(boxOdd) + Number(stdBox) )- supplyQty;
              
              } else {
                limit = (Number(qtyPlan) - supplyQty);
              }
              if(limit % stdBox > 0){

                limit += (stdBox - (limit % stdBox))
              }       
              console.log("limit",limit);
              
              if (Number(items[i].qty) > limit) {
                limitError.push({
                  partNo: items[i].partNo,
                  requestQty: items[i].qty,
                  limitQty: limit,
                  planQty: Number(qtyPlan) - Number(boxOdd) + Number(stdBox),
                });
              }
            } else {
              console.log("ไม่พบแผน");

              // Push item to Array
              errorPlan.push({
                planDate: planDate,
                qtyPlan: 0,
                partMetal: items[i].partNo,
                qty: items[i].qty,
              });
            }
          }
          //<--  End Loop ---->

          if (limitError.length > 0) {
            // เบิกเกิน Plan
            return res.json({
              err: true,
              msg: "Request more then plan",
              details: limitError,
            });
          } else if (errorPlan.length > 0) {
            // ไม่มีในแผน
            return res.json({
              err: true,
              msg: "Plan error",
              details: errorPlan,
            });
          } else {
            console.log("ผ่าน");
            // Start Loop
            for (let j = 0; j < items.length; j++) {
              let sumRequest;
              let part;
              // บันทึก
              const insert = await pool
                .request()
                .input("tranNo", sql.NVarChar, transecNo)
                .input("tranDate", sql.DateTime, dateNow)
                .input("items", sql.Float, items[j].no)
                .input("factory", sql.NVarChar, factory)
                .input("fullName", sql.NVarChar, fullName)
                .input("lotNo", sql.NVarChar, items[j].lotNo)
                .input("partNo", sql.NVarChar, items[j].partNo)
                .input("qty", sql.Float, items[j].qty)
                .input("boxTotal", sql.Float, items[j].boxTotal)
                .input("pcsBox", sql.Float, items[j].pcsBox)
                .input("rollerNo", sql.NVarChar, items[j].rollerNo)
                .input("rollerDetails", sql.NVarChar, items[j].rollerDetail)
                .input(
                  "qrCode",
                  sql.Image,
                  await QRCode.toBuffer(transecNo, { type: "png" })
                )
                .input("remark", sql.NVarChar, remark)
                .query(`insert into tbl_crequestsupply (tran_no,tran_date,items,factory,user_supply,lot_no,partno,qty_supply,box_total,pcs_box, roller_no,roller_detail,status,status_finish,create_by,create_date,tag_qrcode_rq,plan_date)
              values (@tranNo,@tranDate,@items,@factory,@fullName,@lotNo,@partNo,@qty,@boxTotal,@pcsBox,@rollerNo,'','USE','N',@fullName,convert(varchar(16),Getdate(),120),@qrCode,'${planDate}')
              `);
              if (insert && insert.rowsAffected[0] > 0) {
                // บันทึกสำเร็จ
                inserted++;
              }

              const resultsPart = await pool
                .request()
                .input("partNo", sql.NVarChar, items[j].partNo)
                .query(`select partno,status_finish,sum(qty_supply) as qtytotal from tbl_crequestsupply
                    where partno = @partNo and status = 'USE' and status_finish = 'N'
                    group by partno,status_finish`);
              if (resultsPart && resultsPart.recordset?.length > 0) {
                sumRequest = Number(resultsPart.recordset[0]?.qtytotal);
                part = String(resultsPart.recordset[0]?.partno);
              } else {
                sumRequest = 0;
                part = "";
              }
              console.log(part);

              // Update Stock
              await pool
                .request()
                .input("partNo", sql.NVarChar, items[j].partNo)
                .input("sumRequest", sql.Float, sumRequest)
                .query(
                  `UPDATE tbl_cstockmetal SET request_supply = @sumRequest WHERE [partno] = @partNo`
                );
            }
            // End Loop

            // items == Array
            if (inserted == items?.length) {
              // Save Token Approve
              const insertToken = await utils.InsertToken(transecNo, dateNow);

              if (!insertToken.err) {
                // Send Mail
                await utils.SendMailToApprover(transecNo);

                return res.json({
                  err: false,
                  msg: "Requested successfully!",
                  status: "Ok",
                });
              } else {
                console.log("Token บันทึกผิดพลาด");
              }
            } else {
              console.log("Transection :" + transecNo + " เกิดข้อผิดพลาด");
            }
          }
        }
      }
    } catch (err) {
      console.log(err);
      return res.json({
        err: true,
        msg: err.message,
      });
    }
  }

  async SupplyMetal(req, res) {
    try {
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const dateNow = moment(new Date()).format("YYYY-MM-DD");

      const {
        tags,
        reqNo,
        tranNo,
        factory,
        userSupply,
        fullName,
        clearExpire,
      } = req.body;

      if (
        !factory ||
        tags?.length == 0 ||
        !tranNo ||
        !userSupply ||
        !fullName ||
        !clearExpire
      ) {
        return res.json({
          err: true,
          msg: "Data is required!",
        });
      }

      let requestNo = "";

      if (!reqNo) {
        requestNo = "";
      } else {
        requestNo = reqNo;
      }
      console.log(req.body);

      if (tags?.length > 0) {
        // <--- Start Loop ---->
        for (let i = 0; i < tags?.length; i++) {
          // insert to tbl_csupply ;
          let stmtInsert = `INSERT INTO [dbo].[tbl_csupply] (tran_no,tran_date,items,item_no,tran_rev,lot_no,partno,mach_name,tagno,itemtag,
           fac_supply,user_supply,qty_box,roller_no,roller_detail,status,create_by,create_date,supply_code,system_machine)
           VALUES (@tranNo,@tranDate,@items,@itemNo,@tranRev,@lotNo,@partNo,@machineName,@tagNo,
           @itemTag,@facSupply,@userSupply,@qtyBox,@rollerNo,
           @rollerDetail,@status,@createBy,convert(varchar(16),Getdate(),120),@supplyCode,'PC')`;

          await pool
            .request()
            .input("tranNo", sql.NVarChar, tranNo)
            .input("tranDate", sql.DateTime, dateNow)
            .input("items", sql.Int, Number(tranNo.slice(-5)))
            .input("itemNo", sql.Int, i + 1)
            .input("tranRev", sql.NVarChar, tags[i].tran_no)
            .input("lotNo", sql.NVarChar, tags[i].lot_no)
            .input("partNo", sql.NVarChar, tags[i].partno)
            .input("machineName", sql.NVarChar, tags[i].mach_name)
            .input("tagNo", sql.NVarChar, tags[i].tagno)
            .input("itemTag", sql.Int, tags[i].itemtag)
            .input("facSupply", sql.NVarChar, factory)
            .input("userSupply", sql.NVarChar, userSupply)
            .input("qtyBox", sql.Float, tags[i].qty_box)
            .input("rollerNo", sql.NVarChar, tags[i].roller_no)
            .input("rollerDetail", sql.NVarChar, tags[i].roller_detail)
            .input("status", sql.NVarChar, "USE")
            .input("createBy", sql.NVarChar, fullName)
            .input("supplyCode", sql.NVarChar, requestNo)
            .query(stmtInsert);

          let stmtUpdateStock = "UPDATE tbl_cstockdetail";
          stmtUpdateStock += " set status_supply = 'Y',";

          if (clearExpire === "Y") {
            stmtUpdateStock += " status_active = 'EXP',";
          }

          stmtUpdateStock += " lastupdate_by = @fullName,";
          stmtUpdateStock +=
            " lastupdate_date = convert(varchar(16),Getdate(),120)";
          stmtUpdateStock += " WHERE tagno = @tagNo AND [lot_no] = @lotNo";

          await pool
            .request()
            .input("tagNo", sql.NVarChar, tags[i].tagno)
            .input("lotNo", sql.NVarChar, tags[i].lot_no)
            .input("fullName", sql.NVarChar, fullName)
            .query(stmtUpdateStock);

          let stmtUpdateMetal = "UPDATE tbl_cstockmetal";
          stmtUpdateMetal +=
            " SET remain = remain - " + Number(tags[i].qty_box) + ",";
          stmtUpdateMetal +=
            " supply = supply + " + Number(tags[i].qty_box) + ",";
          stmtUpdateMetal += " lastupdate_by = @fullName" + ",";
          stmtUpdateMetal +=
            " lastupdate_date = convert(varchar(16),Getdate(),120) ";
          stmtUpdateMetal +=
            " where partno = @partNo AND [roller_no] = @rollerNo";

          await pool
            .request()
            .input("fullName", sql.NVarChar, fullName)
            .input("partNo", sql.NVarChar, tags[i].partno)
            .input("rollerNo", sql.NVarChar, tags[i].roller_no)
            .query(stmtUpdateMetal);

          const stmtSelect = await pool
            .request()
            .input("partNo", sql.NVarChar, tags[i].partno)
            .input("factory", sql.NVarChar, factory)
            .query(`select tran_no,partno,qty_supply,sum(supply_ok) as sumqty  from tbl_crequestsupply 
              where partno = @partNo and tran_no = '${requestNo}' and [factory] = @factory group by tran_no,partno,qty_supply
              `);
          if (stmtSelect && stmtSelect.recordset?.length > 0) {
            let qtyrq = Number(stmtSelect?.recordset[0].qty_supply);
            let qtySum = Number(stmtSelect?.recordset[0].sumqty);

            let sqlReq = "update tbl_crequestsupply";
            sqlReq +=
              " set supply_ok = " + (Number(qtySum) + Number(tags[i].qty_box));

            //ถ้าจำนวนที่ Supply ครบ
            if (qtyrq == qtySum + Number(tags[i].qty_box)) {
              sqlReq += `, [status_finish] = 'Y'`;
            }
            sqlReq += ` WHERE [tran_no] = @tranNo AND [partno] = @partNo`;

            await pool
              .request()
              .input("tranNo", sql.NVarChar, requestNo)
              .input("partNo", sql.NVarChar, tags[i].partno)
              .query(sqlReq);
            console.log(sqlReq);
          }
        }

        // <--- End Loop ---->

        return res.json({
          err: false,
          msg: "Supply Product Successfully!",
          status: "Ok",
        });
      } else {
        return res.json({
          err: true,
          msg: "Data is required!",
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

  async GetStatusApprove(req, res) {
    const { reqNo } = req.params;
    try {
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const results = await pool
        .request()
        .query(
          `SELECT  * FROM [dbo].[tbl_crequestsupply] WHERE tran_no = '${reqNo}' AND approved = 'Y'`
        );
      if (results && results.recordset?.length > 0) {
        return res.json({
          err: false,
          msg: "Approved",
          status: "Ok",
        });
      } else {
        return res.json({
          err: true,
          msg: "Waiting approve",
        });
      }
    } catch (err) {
      return res.json({
        err: true,
        msg: err.message,
      });
    }
  }

  async GetAllRequestByStatus(req, res) {
    const { status } = req.params;
    try {
      const stmt_wait = `SELECT tran_no,approved,approved_at,COUNT(*) as items,factory,plan_date FROM [dbo].[tbl_crequestsupply] WHERE approved IS NULL GROUP BY tran_no,approved,approved_at,factory,plan_date ORDER BY tran_no DESC`;
      const stmt_not = `SELECT tran_no,approved,approved_at,COUNT(*) as items,factory,plan_date FROM [dbo].[tbl_crequestsupply] WHERE approved = 'N' GROUP BY tran_no,approved,approved_at,factory,plan_date ORDER BY tran_no DESC`;
      const stmt_approve = `SELECT tran_no,approved,approved_at,COUNT(*) as items,factory,plan_date FROM [dbo].[tbl_crequestsupply] WHERE approved = 'Y' GROUP BY tran_no,approved,approved_at,factory,plan_date ORDER BY tran_no DESC`;
      const stmt_all = `SELECT tran_no,approved,approved_at,COUNT(*) as items,factory,plan_date FROM [dbo].[tbl_crequestsupply]  GROUP BY tran_no,approved,approved_at,factory,plan_date ORDER BY tran_no DESC`;

      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const results = await pool
        .request()
        .query(
          status == "wait"
            ? stmt_wait
            : status == "not"
            ? stmt_not
            : status == "approve"
            ? stmt_approve
            : stmt_all
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
          msg: "Not Found",
        });
      }
    } catch (err) {
      return res.json({
        err: true,
        msg: err.message,
      });
    }
  }
  async ApproveMetalRequest(req, res) {
    const { fullName, approve } = req.body;
    const { tranNo } = req.params;

    if (!fullName || !approve) {
      return res.json({
        err: true,
        msg: "Body is required!",
      });
    }

    try {
      console.log(req.body);

      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const results = await pool
        .request()
        .input("tranNo", sql.NVarChar, tranNo)
        .input("approve", sql.NVarChar, approve)
        .input("fullName", sql.NVarChar, fullName)
        .query(
          `UPDATE [tbl_crequestsupply] SET [approved] = @approve,[approved_by] = @fullName WHERE [tran_no] = @tranNo`
        );
      if (results && results.rowsAffected[0] > 0) {
        return res.json({
          err: false,
          msg: "Approved",
          status: "Ok",
        });
      } else {
        return res.json({
          err: true,
          msg: "Something went wrong!",
        });
      }
    } catch (err) {
      return res.json({
        err: true,
        msg: err.message,
      });
    }
  }

  async GetSupplyDetailByTrans(req, res) {
    try {
      const { tranNo } = req.params;
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const results = await pool
        .request()
        .input("tranNo", sql.NVarChar, tranNo)
        .query(`SELECT  * FROM tbl_csupply WHERE tran_no = @tranNo`);
      if (results && results?.recordset?.length > 0) {
        return res.json({
          err: false,
          status: "Ok",
          results: results.recordset,
        });
      } else {
        return res.json({
          err: true,
          msg: "Not Found",
          results: [],
        });
      }
    } catch (err) {
      return res.json({
        err: true,
        msg: err.message,
      });
    }
  }

  async GetMetalRequestDetail(req, res) {
    try {
      const { tranNo } = req.params;
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const results = await pool
        .request()
        .input("tranNo", sql.NVarChar, tranNo)
        .query(
          `SELECT * FROM [dbo].[tbl_crequestsupply] WHERE tran_no = @tranNo`
        );
      if (results && results?.recordset?.length > 0) {
        return res.json({
          err: false,
          status: "Ok",
          results: results.recordset,
        });
      } else {
        return res.json({
          err: true,
          msg: "Not Found",
          results: [],
        });
      }
    } catch (err) {
      return res.json({
        err: true,
        msg: err.message,
      });
    }
  }

  async CancelSupplyMetal(req, res) {
    try {
      const {tags,fullName} = req.body ; // Array Object
      const { tranNo } = req.params;
      
      let updatedStockDt = 0;
      let updatedStockHd = 0;

      if(tags?.length == 0 || !tags || !fullName) {
        return res.json({
          err:true,
          msg:"Data is required!"
        })
      }
      
      // OpenConnection
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();

       // Update
      const update = await pool
      .request()
      .input("tranNo",sql.NVarChar,tranNo)
      .query(`UPDATE tbl_csupply SET status = 'CANCEL' WHERE [tran_no] = @tranNo`)

     
      if(update && update.rowsAffected[0] > 0){
        // Start Loop
        for (let i = 0; i < tags?.length; i++) {
          const qty = Number(tags[i].qty_box);
          const updateStockDetail = await pool
            .request()
            .input("tagNo", sql.NVarChar, tags[i].tagno)
            .input("lotNo", sql.NVarChar, tags[i].lot_no)
            .query(
              `UPDATE tbl_cstockdetail SET status_supply = 'N' WHERE tagno = @tagNo AND lot_no = @lotNo`
            );

          if (updateStockDetail && updateStockDetail?.rowsAffected[0] > 0) {
            updatedStockDt++; // Make Sure Data Updated in SQL
          }

          const updateStockMetal = await pool
            .request()
            .input("fullName", sql.NVarChar, fullName)
            .input("partNo", sql.NVarChar, tags[i].partno)
            .input("rollerNo", sql.NVarChar, tags[i].roller_no)
            .query(`UPDATE tbl_cstockmetal SET remain = remain + ${qty}, supply = supply - ${qty},[lastupdate_by] = @fullName
            ,lastupdate_date = GETDATE() where [partno] = @partNo AND [roller_no] = @rollerNo`);

          if (updateStockMetal && updateStockMetal?.rowsAffected[0] > 0) {
            updatedStockHd++; // Make Sure Data Updated in SQL
          }
        }//<----- End Loop---->

        // Check Tags Lenght equoa to updateStockMetal and updateStockMetal
        if (updatedStockDt == tags?.length && updatedStockHd == tags?.length) {
          pool.close() // Close Connection
          return res.json({
            err: false,
            msg: "Canceled successfully!",
            status: "Ok",
          });
        } else {
          pool.close() // Close Connection
          return res.json({
            err: true,
            msg: "Update Stock Error!",
          });
        }

        
      }

    } catch (err) {
      return res.json({
        err: true,
        msg: err.message,
      });
    }
  }

  async CheckRollerUsedByPart(req,res) {
    try{
      const{partNo} = req.params ;
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const result = await pool
      .request()
      .input("partNo",sql.NVarChar,partNo)
      .query(`SELECT distinct roller_no,roller_detail,partno  from tbl_cstockdetail WHERE partno = @partNo and status_supply = 'N'`)
    
      if(result && result.recordset?.length > 0) {
        return res.json({
          err:false,
          status:"Ok",
          results:result.recordset
        })
      }else{
        return res.json({
          err:true,
          msg:"Not Found",
          results:[]
        })
      }
    }catch (err) {
      return res.json({
        err: true,
        msg: err.message,
      });
    }
  }


  async SearchRequestDetailByTrans(req,res) {
    try{
      const {tranNo} = req.params ;
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const results = await pool
      .request()
      .input("tranNo",sql.NVarChar,tranNo)
      .query(`SELECT factory,user_supply,status_finish from tbl_crequestsupply where [tran_no] = @tranNo AND [status] = 'USE'`)
      if(results && results.recordset?.length > 0) {
        pool.close();
        return res.json({
          err:false,
          status:"Ok",
          results:results.recordset
        })
      }else{
        pool.close();
        return res.json({
          err:true,
          msg:"Not Found",
          results:[]
        })
      }

    }catch (err) {
      return res.json({
        err: true,
        msg: err.message,
      });
    }
  }
  async GetTagDetailByTag(req,res) {
    try{
      const {tagNo} = req.params ;
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const results = await pool
      .request()
      .input("tagNo",sql.NVarChar,tagNo)
      .query(`SELECT  * FROM tbl_cstockdetail WHERE tagno = @tagNo and status = 'USE'`)
      if(results && results.recordset?.length > 0) {
        pool.close();
        return res.json({
          err:false,
          status:"Ok",
          results:results.recordset
        })
      }else{
        pool.close();
        return res.json({
          err:true,
          msg:"Not Found",
          results:[]
        })
      }

    }catch (err) {
      return res.json({
        err: true,
        msg: err.message,
      });
    }
  }
  async SearchAmountRequestByPart(req,res) {
    try{
      const {tranNo,partNo} = req.params ;
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const results = await pool
      .request()
      .input("tranNo",sql.NVarChar,tranNo)
      .input("partNo",sql.NVarChar,partNo)
      .query(`SELECT tran_no,partno,qty_supply,supply_ok ,box_total ,status_finish  FROM tbl_crequestsupply 
        WHERE partno = @partNo and tran_no = @tranNo`)
      if(results && results.recordset?.length > 0) {
        pool.close();
        return res.json({
          err:false,
          status:"Ok",
          results:results.recordset
        })
      }else{
        pool.close();
        return res.json({
          err:true,
          msg:"Not Found",
          results:[]
        })
      }

    }catch (err) {
      return res.json({
        err: true,
        msg: err.message,
      });
    }
  }

  async SearchSumQtyRequestByPart(req,res) {
    try{
      const {tranNo,partNo} = req.params ;
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const results = await pool
      .request()
      .input("tranNo",sql.NVarChar,tranNo)
      .input("partNo",sql.NVarChar,partNo)
      .query(`SELECT supply_code ,partno,sum(qty_box) as sumqty ,count(tagno) as c_tag  from tbl_csupply where  partno = @partNo AND 
        supply_code = @tranNo and status = 'USE' group by supply_code,partno`)
      if(results && results.recordset?.length > 0) {
        pool.close();
        return res.json({
          err:false,
          status:"Ok",
          results:results.recordset
        })
      }else{
        pool.close();
        return res.json({
          err:true,
          msg:"Not Found",
          results:[]
        })
      }

    }catch (err) {
      return res.json({
        err: true,
        msg: err.message,
      });
    }
  }


  async SupplyMetalByReqNo(req,res) {
    try{
      const {tranNo} = req.params ;
      const {fullName,factory} = req.body ;
      if(!fullName || !factory) {
        return res.json({
          err:true,
          msg:"Data is required!"
        })
      }
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const update = await pool
      .request()
      .input("tranNo",sql.NVarChar,tranNo)
      .input("fullName",sql.NVarChar,fullName)
      .input("factory",sql.NVarChar,factory)
      .query(`UPDATE tbl_crequestsupply SET status_finish = 'Y' ,lastupdate_by = @fullName,
        lastupdate_date = convert(varchar(16),Getdate(),120) where tran_no = @tranNo AND [factory] = @factory`)
      if(update && update.rowsAffected[0] > 0) {
        pool.close();
        return res.json({
          err:false,
          status:"Ok",
          msg: "Updated!"
        })
      }else{
        pool.close();
        return res.json({
          err:true,
          msg:"Update Error!"
        })
      }

    }catch (err) {
      return res.json({
        err: true,
        msg: err.message,
      });
    }
  }

  async CheckLotFiFO(req,res) {
    try{
      const {dateExp,part} = req.params ;

      if(!dateExp || !part) {
        return res.json({
          err:true,
          msg:"Data is required!"
        })
      }
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const results = await pool
      .request()
      .input("partNo",sql.NVarChar,part)

      .query(`SELECT S.lot_no ,S.date_expire ,S.date_lot,sum(S.qty_box) as sumbox,convert(int,substring(S.lot_no,6,9)) as lot_sup ,L.create_date from tbl_cstockdetail S, tbl_clotcontrolDt L
        WHERE S.lot_no=L.lot_no and S.partno=L.partno and S.tagno=L.tagno and  S.partno = @partNo and S.status = 'USE'
        and S.status_supply = 'N' AND S.status_active = 'FG' AND S.date_expire <= '${dateExp}' group by  S.lot_no ,S.date_expire ,S.date_lot ,L.create_date order by S.date_lot,L.create_date ,convert(int,substring(S.lot_no,6,9))
        `)
      if(results && results.recordset?.length > 0) {
        pool.close();
        return res.json({
          err:false,
          status:"Ok",
          results: results.recordset
        })
      }else{
        pool.close();
        return res.json({
          err:true,
          msg:"Not Found",
          results: []
        })
      }

    }catch (err) {
      return res.json({
        err: true,
        msg: err.message,
      });
    }
  }

  async SaveSupplyByTagNo (req,res) {
    try{
      const dateNow = moment(new Date()).format("YYYY-MM-DD");
      const itemNo = 0;
      const {tranNo,requestNo,qtyBox,partNo,machine,factory,fullName,amountReq,tranSupply,lotNo,
             tagNo,rollerNo,rollerDetail,userSupply} = req.body ;
      console.log(req.body);
      let qtySum;
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const resultSupply = await pool
 
      .request()
      .query(`SELECT supply_code,partno,sum(qty_box) as sumqty from tbl_csupply where supply_code = @supplyCode and partno = @partNo
        and fac_supply = @factory and status = 'USE' group by supply_code,partno`);

        // ถ้ามีข้อมูล
        if(resultSupply && resultSupply.recordset?.length > 0) {
          qtySum = Number(resultSupply.recordset[0].sumqty);
        }else{
          qtySum = 0;
        }

        // Update Supply
        let updateSupply = ``;

        updateSupply += `UPDATE tbl_crequestsupply SET supply_ok = ${Number(qtySum) + Number(qtyBox)},`
        if(Number(amountReq) <= (Number(qtySum) + Number(qtyBox))) {
          updateSupply += `status_finish = 'Y',`
        }
          updateSupply += `lastupdate_by = @fullName,lastupdate_date = convert(varchar(16),Getdate(),120) where [tran_no] = @requestNo AND [partno] = @partNo`
       
        const update = await pool
        .request()
        .input("fullName",sql.NVarChar,fullName)
        .input("requestNo",sql.NVarChar,requestNo)
        .input("partNo",sql.NVarChar,partNo)
        .query(updateSupply)


        const insertSupply = await pool
        .request()
        .input("tran_no",sql.NVarChar,tranSupply)
        .input("tran_date",sql.DateTime,dateNow)
        .input("items",sql.Int,Number(tranSupply.slice(-5))) //SUP23110900020 -> 00020 -> 20
        .input("item_no",sql.Int,itemNo)
        .input("supply_code",sql.NVarChar,requestNo)
        .input("tran_rev",sql.NVarChar,tranNo)
        .input("lot_no",sql.NVarChar,lotNo)
        .input("partno",sql.NVarChar,partNo)
        .input("mach_name",sql.NVarChar,machine)
        .input("tagno",sql.NVarChar,tagNo)
        .input("itemtag",sql.Int,itemTag)
        .input("fac_supply",sql.NVarChar,factory)
        .input("user_supply",sql.NVarChar,userSupply)
        .input("qty_box",sql.Float,qtyBox)
        .input("roller_no",sql.NVarChar,rollerNo)
        .input("roller_detail",sql.NVarChar,rollerDetail)
        .input("status",sql.NVarChar,'USE')
        .input("create_by",sql.NVarChar,fullName)
        .query(`INSERT INTO tbl_csupply (tran_no,tran_date,items,item_no,supply_code,tran_rev,lot_no,partno,mach_name,tagno,itemtag,fac_supply,user_supply,qty_box,roller_no,roller_detail,status,create_by,create_date,status_closesupply)
          VALUES (@tran_no,@tran_date,@items,@item_no,@supply_code,@tran_rev,@lot_no,@partno,@mach_name,@tagno,@itemtag,@fac_supply,@user_supply,@qty_box,@roller_no,@roller_detail,@status,@create_by,convert(varchar(16),Getdate(),120),'NO')
          `)


          let stmtUpdateStock = `update tbl_cstockdetail set status_supply = 'Y',`;
          if(factory == "Expire_Lot") {
            stmtUpdateStock += `status_active = 'EXP',`
          }
          stmtUpdateStock += `lastupdate_by = @fullName,lastupdate_date = convert(varchar(16),Getdate(),120) WHERE [tagno] = @tagNo AND [lot_no] = @lotNo`

          const updateStockDt = await pool
          .request()
          .input("fullName",sql.NVarChar,fullName)
          .input("tagNo",sql.NVarChar,tagNo)
          .input("lotNo",sql.NVarChar,lotNo)
          .query(stmtUpdateStock);


          const updateStock = await pool
          .request()
          .input("fullName",sql.NVarChar,fullName)
          .input("partNo",sql.NVarChar,partNo)
          .input("rollerNo",sql.NVarChar,rollerNo)
          .query(`UPDATE tbl_cstockmetal SET remain = remain - ${Number(qtyBox)},
          supply = supply + ${Number(qtyBox)},lastupdate_by = @fullName,lastupdate_date = convert(varchar(16),Getdate(),120) 
          WHERE [partno] = @partNo AND [roller_no] = @rollerNo`)
          
          if((updateStock && updateStock.rowsAffected[0] > 0) && (updateStockDt && updateStockDt.rowsAffected[0] > 0)) {
            return res.json({

            })
          }else{
            return res.json({
              err:true,
              msg: "Error!, Update Stock"
            })
          }

   


    }catch (err) {
      return res.json({
        err: true,
        msg: err.message,
      });
    }
  }

  async DeleteAdhesivePlan(req,res) {
    try{
      const {id} = req.params ;
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const deletePlan = await pool
        .request()
        .input("id",sql.Int,id)
        .query(`DELETE FROM [dbo].[TBL_ADHESIVE_PLAN] WHERE [Id] = @id`);

        if(deletePlan && deletePlan.rowsAffected[0] > 0) {
          return res.json({
            err:false,
            msg:"Plan deleted!",
            status : "Ok"
          })
        }else{
          return res.json({
            err:true,
            msg:"Error, Delete plan"
          })
        }

    }catch(err) {
      console.log(err);
      return res.json({
        err: true,
        msg: err.message,
      });
      
    }
  }

  async AddAdhesivePlan(req,res) {
    try{
      const {partNo,phLine,glueType,qty,datePlate,fullName} = req.body ;
      console.log(req.body);
      
      if(!partNo || !phLine || !glueType || !qty || !datePlate || !fullName){
        return res.json({
          err:true,
          msg:"Data is required!"
        })
      }

      const pool = await new sql.ConnectionPool(sqlConfig).connect();

      const checkPlan = await pool.request()
      .input("partNo",sql.NVarChar,partNo)
      .input("glueType",sql.NVarChar,glueType)
      .query(`SELECT * FROM [dbo].[TBL_ADHESIVE_PLAN] WHERE [PART_NO] = @partNo AND [GLUE_TYPE] = @glueType AND [DATE_PLATE] = '${datePlate}'`)

      if(checkPlan && checkPlan?.recordset?.length > 0) {
        pool.close();
        return res.json({
          err:true,
          msg:"Plan Duplicated!"
        })
      }

      const insert = await pool
        .request()
        .input("partNo",sql.NVarChar,partNo)
        .input("phLine",sql.NVarChar,phLine)
        .input("glueType",sql.NVarChar,glueType)
        .input("qty",sql.Int,qty)
        .input("datePlate",sql.Date,datePlate)
        .input("datePlan",sql.Date,moment(datePlate).add(1,"days").format("YYYY-MM-DD"))
        .input("fullName",sql.NVarChar,fullName)
        .query(`INSERT INTO [dbo].[TBL_ADHESIVE_PLAN] ([PART_NO],[PH_LINE],[GLUE_TYPE],[QTY],[DATE_PLAN],[DATE_PLATE],[CREATED_AT],[CREATED_BY]) 
          VALUES (@partNo,@phLine,@glueType,@qty,@datePlan,@datePlate,GETDATE(),@fullName)`);

        if(insert && insert.rowsAffected[0] > 0) {
          pool.close();
          return res.json({
            err:false,
            msg:"Plan Added!",
            status : "Ok"
          })
        }else{
          pool.close();
          return res.json({
            err:true,
            msg:"Error, Add plan"
          })
        }

    }catch(err) {
      console.log(err);
      return res.json({
        err: true,
        msg: err.message,
      });
      
    }
  }


  async UpdateAdhesivePlan(req,res) {
    try{
      const {id} = req.params;
      const {partNo,phLine,glueType,qty,datePlate,fullName} = req.body ;
      console.log(req.body);
      
      if(!partNo || !phLine || !glueType || !qty || !datePlate || !fullName){
        return res.json({
          err:true,
          msg:"Data is required!"
        })
      }

      const pool = await new sql.ConnectionPool(sqlConfig).connect();

      const oldPlan = await pool.request()
      .input("id",sql.Int,id)
      .query(`SELECT * FROM [dbo].[TBL_ADHESIVE_PLAN] WHERE [Id] = @id`);

      if(oldPlan && oldPlan?.recordset?.length > 0) {
        
      const checkPlan = await pool.request()
      .input("partNo",sql.NVarChar,partNo)
      .input("glueType",sql.NVarChar,glueType)
      .input("id",sql.Int,id)
      .query(`SELECT * FROM [dbo].[TBL_ADHESIVE_PLAN] WHERE [PART_NO] = @partNo 
        AND [GLUE_TYPE] = @glueType AND [DATE_PLATE] = '${datePlate}' AND [Id] != @id
        `)

      if(checkPlan && checkPlan?.recordset?.length > 0) {
        pool.close();
        return res.json({
          err:true,
          msg:"Plan Duplicated!"
        })
      }

      const update = await pool
        .request()
        .input("partNo",sql.NVarChar,partNo)
        .input("phLine",sql.NVarChar,phLine)
        .input("glueType",sql.NVarChar,glueType)
        .input("qty",sql.Int,qty)
        .input("datePlate",sql.Date,datePlate)
        .input("datePlan",sql.Date,moment(datePlate).add(1,"days").format("YYYY-MM-DD"))
        .input("fullName",sql.NVarChar,fullName)
        .input("id",sql.Int,id)
        .query(`UPDATE [dbo].[TBL_ADHESIVE_PLAN] SET [PART_NO] = @partNo,
          [PH_LINE] = @phLine,[GLUE_TYPE] = @glueType,[QTY] = @qty,[DATE_PLAN] = @datePlan,
          [DATE_PLATE] = @datePlate,[UPDATED_AT] = GETDATE(),[UPDATED_BY] = @fullName WHERE [Id] = @id`);

        if(update && update.rowsAffected[0] > 0) {
          pool.close();
          return res.json({
            err:false,
            msg:"Plan Updated!",
            status : "Ok"
          })
        }else{
          pool.close();
          return res.json({
            err:true,
            msg:"Error, Update plan"
          })
        }
      }

    }catch(err) {
      console.log(err);
      return res.json({
        err: true,
        msg: err.message,
      });
      
    }
  }

}
module.exports = AdhesiveController;
