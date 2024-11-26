const sql = require("mssql");
const jwt = require("jsonwebtoken");
const { sqlConfig, sqlConfigApp02 } = require("../config/config");
const nodemailer = require("nodemailer");
const moment = require("moment");
const QRCode = require("qrcode");

require("dotenv").config();

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
        .query(`SELECT us.EMP_CODE,us.ROLE,f.Id as Id_Factory,f.FACTORY_NAME,r.NAME_ROLE, u.UHR_FirstName_en,u.UHR_EmpCode,u.UHR_LastName_en,u.UHR_Department,u.UHR_FullName_en,u.AD_Mail,u.AD_UserLogon FROM TBL_USERS us 
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
          fullName: results.recordset[0].UHR_FullName_en,
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
        .input(
          "customer",
          sql.Int,
          Number(results?.recordset[0].C_CUSTOMER_CODE) + 1
        )
        .input("partNo", sql.Int, Number(results?.recordset[0].C_PART_NO) + 1)
        .input(
          "compound",
          sql.Int,
          Number(results?.recordset[0].C_COMPOUND) + 1
        )
        .input("pack", sql.Int, Number(results?.recordset[0].C_PACK) + 1)
        .input("qty", sql.Int, Number(results?.recordset[0].C_QTY) + 1)
        .query(stmt);
      console.log(stmt);

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

  async GetTransectionNoFgSave() {
    try {
      //FG
      const prefix = "FG";
      const dateNow = moment(new Date()).format("YYYYMMDD");

      const pool = await new sql.ConnectionPool(sqlConfig).connect(); // เปิด Connection
      const resultTrans = await pool
        .request()
        .query(
          `SELECT TOP 1 * FROM [dbo].[TBL_PRD_RECORD] WHERE [TRAN_NO] LIKE '%${dateNow}%' ORDER BY TRAN_NO DESC`
        );

      if (resultTrans && resultTrans.recordset?.length > 0) {
        const lastTrans = resultTrans?.recordset[0].TRAN_NO;
        console.log(lastTrans);

        const nextTrans = Number(lastTrans.slice(-4)) + 1; // 1 + 1

        const strFormatSQL = await pool
          .request()
          .query(`SELECT FORMAT(${nextTrans}, '0000') AS FormattedNumber`);
        pool.close();
        console.log(strFormatSQL);

        return {
          err: false,
          lastTransec: `${prefix}${dateNow}${strFormatSQL.recordset[0].FormattedNumber}`,
        };
      } else {
        return {
          err: false,
          lastTransec: `${prefix}${dateNow}0001`,
        };
      }
    } catch (err) {
      console.log(err);
      return { err: true, msg: err.message };
    }
  }

  async CheckAdhesiveStock(parts) {
    try {
      let error = 0;
      let resultError = [];
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      for (let i = 0; i < parts?.length; i++) {
        const results = await pool
          .request()
          .input("partNo", sql.NVarChar, parts[i].partNo)
          .query(`SELECT * FROM [SRRYAPP02].[DB_AVP2WIPCONTROL].[dbo].[V_StockMetalByPart]
          WHERE [PartNo] = @partNo`);

        if (results && results?.recordset?.length > 0) {
          if (Number(parts[i].qty) > Number(results?.recordset[0].Total_Qty)) {
            resultError.push({
              partNo: results?.recordset[0].PartNo,
              remain: results.recordset[0].Total_Qty,
              request: Number(parts[i].qty),
            });
            error++;
          }
        } else {
          error++;
        }
      }
      if (error > 0) {
        return { err: true, msg: "Not enough stock", details: resultError };
      } else {
        return { err: false, msg: "Pass" };
      }
    } catch (err) {
      console.log(err);
      return { err: true, msg: err.message };
    }
  }

  async SaveLogs(desc, ip, activeBy) {
    try {
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const insert = await pool
        .request()
        .input("desc", sql.NVarChar, desc)
        .input("ip", sql.NVarChar, ip)
        .input("by", sql.NVarChar, activeBy)
        .query(
          `INSERT INTO [dbo].[TBL_LOGS] ([DESCRIPTION],[IP_ADDRESS],[ACTIVE_BY]) VALUES (@desc,@ip,@by)`
        );
      if (insert && insert?.rowsAffected[0] > 0) {
        console.log("Save logs danger success");

        return { err: false, msg: "Save logs danger success" };
      } else {
        return { err: true, msg: "Something went wrong" };
      }
    } catch (err) {
      console.log(err);
      return { err: true, msg: err.message };
    }
  }

  async CheckTagsSupplyFinished(tags, lotNo) {
    try {
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      let tagError = 0;
      let statusTagError = 0;

      for (let i = 0; i < tags?.length; i++) {
        const results = await pool
          .request()
          .input("tag", sql.NVarChar, tags[i].tagno)
          .input("lotNo", sql.NVarChar, lotNo)
          .query(
            `SELECT lot_no,status_supply,status_active FROM tbl_cstockdetail WHERE lot_no = @lotNo AND tagno = @tag`
          );

        if (results && results.recordset?.length > 0) {
          if (results?.recordset[0].status_supply == "Y") {
            // บาง Tag ถูก Supply
            tagError++;
          }

          // งาน HOLD หรือ NG
          if (
            results?.recordset[0].status_active == "NG" ||
            results?.recordset[0].status_active == "HOLD"
          ) {
            s;
            statusTagError++;
          }
        }
      }
      if (tagError > 0) {
        return { err: true, msg: "tag error" };
      } else if (statusTagError > 0) {
        return { err: true, msg: "tag status error" };
      } else {
        return { err: false, msg: "Done" };
      }
    } catch (err) {
      console.log(err);

      return { err: true, msg: "Something went wrong!" };
    }
  }

  async GenarateTokenApprove(reqNo) {
    const secert = process.env.TOKEN_APPROVE;
    try {
      const payload = {
        requestNo: reqNo,
        by: "wipcontrol.dev",
        iat: Date.now(),
      };

      const token = jwt.sign(payload, secert);
      return { err: false, token: token };
    } catch (err) {
      console.log(err);
      return { err: true, msg: err.message };
    }
  }

  async SendMailToApprover(reqNo) {
    try {
      const poolApp02 = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      /*
      -- ไม่ให้ส่ง Mail ไปยังปลายทาง --
      P230056 -> 	ruthchanan.rutpopthananan@prospira.com
      J22065 -> 	Taihei.gotou@prospira.com
      P240075 -> 	rattikorn.klumkum@prospira.com
      P240070 -> 	kochuen.siew@prospira.com
      000156 -> 	sirisak.jinajai@prospira.com
      PJ22001 -> tetsuji.nishino@prospira.com
      P240071 -> yuta.sakamoto@prospira.com
      */
      const approver = await pool.request()
        .query(`SELECT u.*,r.NAME_ROLE ,hr.Ad_Mail,hr.UHR_FullName_th,hr.UHR_FirstName_en,f.FACTORY_NAME
        FROM TBL_USERS u LEFT JOIN TBL_ROLE r ON u.ROLE = r.Id
		LEFT JOIN TBL_FACTORY f ON u.FACTORY = f.Id
        LEFT JOIN [dbo].[V_AllUsers] hr ON u.EMP_CODE = hr.UHR_EmpCode
        WHERE (r.NAME_ROLE = 'Admin' OR r.NAME_ROLE = 'Boss' 
		OR (r.NAME_ROLE = 'Leader' AND f.FACTORY_NAME = 'AVP2' ))
		AND (AD_Mail IS NOT NULL AND EMP_CODE NOT IN
		('J22065','P240075','P240070','P230056','000156','P240071','PJ22001'))`);

      if (approver && approver?.recordset?.length > 0) {
        const approverList = approver.recordset;
        console.log("reqNo", reqNo);

        let html = "";
        html += `<div style="font-size: 15px; font-family: 'Cordia New';">
        <h4> <b>Request No. ${reqNo} </b></h4>`;
        const response = await poolApp02
          .request()
          .input("reqNo", sql.NVarChar, reqNo)
          .query(
            `SELECT a.*,t.token  FROM [dbo].[tbl_crequestsupply] a LEFT JOIN [dbo].[tbl_token_approve] t ON a.tran_no = t.req_transection
WHERE tran_no = @reqNo ORDER BY items ASC`
          );

        if (response && response?.recordset?.length > 0) {
          html += `<h4><b>Dear, Admin WIP Control System </b></h4>
          <h4><b>ผู้ขอ : ${response.recordset[0].user_supply}</b></h4>
          <h4><b>โรงงาน : ${response.recordset[0].factory}</b></h4>
      <table style="border: 1px solid black; border-collapse: collapse; width: 100%;font-size: 15px; font-family: 'Cordia New';">
        <thead>
          <tr>
            <th style="border: 1px solid black; padding: 4px;text-align:center;">No.</th>
            <th style="border: 1px solid black; padding: 4px;text-align:center;">Part No.</th>
            <th style="border: 1px solid black; padding: 4px;text-align:center;">Qty.</th>
            <th style="border: 1px solid black; padding: 4px;text-align:center;">Roller No.</th>
          </tr>
    </thead>
    <tbody>`;
          for (let i = 0; i < response.recordset.length; i++) {
            html += `<tr>
      <td style="border: 1px solid black; padding: 4px;text-align:center;">${
        i + 1
      }</td>
      <td style="border: 1px solid black; padding: 4px;text-align:center;">${
        response?.recordset[i].partno
      }</td>
      <td style="border: 1px solid black; padding: 4px;text-align:center;">${
        response?.recordset[i].qty_supply
      }</td>
      <td style="border: 1px solid black; padding: 4px;text-align:center;">${
        response?.recordset[i].roller_no
      }</td>
    </tr>`;
          }
          html += `
    </tbody>
  </table>  
  <div>
    Go to : <a href='http://wipcontrol.psth.com/approve/request/metal/${reqNo}/${response.recordset[0].token}'>Click to Approve</a>
  </div> 
</div> 
<hr />
IT Developer - Thank you 😊`;

          const smtp = {
            host: "10.145.0.250", //set to your host name or ip
            port: 25, //25, 465, 587 depend on your
            secure: false, // not use SSL
            auth: {
              user: "it-system@prospira.local", //user account
              pass: process.env.MAIL_PASSWORD, //user password
            },
          };
          const smtpTransport = nodemailer.createTransport(smtp);

          try {
            let sended = 0;
            let notSend = 0;

            // Loop Send Email to Approver.
            for (let j = 0; j < approverList.length; j++) {
              console.log(approverList[j].Ad_Mail);
              const mail = {
                from: "Request Metal AVP2 [Alert] <it.info-psth@prospira.com>", //from email (option)
                // to: to, //to email (require)
                to: approverList[j].Ad_Mail,
                subject: "Notification Request Metal AVP2", // Subject line
                html: html, //email body
              };

              // Send Mail
              smtpTransport.sendMail(mail, function (error, _) {
                smtpTransport.close();
                if (error) {
                  // If Not send.
                  notSend++;
                } else {
                  // If Not have error.
                  sended++;
                }
              });
            }
            // Approve list == count send mail successfully.
            if (approverList.length == sended) {
              console.log(`Send email success (${approverList.length})`);

              return {
                err: false,
                msg: `Send email success (${approverList.length})`,
              };
            } else {
              console.log(`Some email isn't send.`);
              return {
                err: true,
                msg: `Some email isn't send.`,
              };
            }
          } catch (err) {
            console.log(err);

            return {
              err: true,
              msg: err,
            };
          }
        } else {
          return { err: true, msg: "Job Request is't Found" };
        }
      } else {
        console.log("Admin isn't found.");

        return { err: true, msg: "Admin isn't found." };
      }
    } catch (err) {
      console.log(err);
      return { err: true, msg: err.message };
    }
  }

  async SaveTagsNewLot(tags, tranNo, tranDate, lotNo, boxTotal, createBy) {
    try {
      // tags == Array

      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      let inserted = 0;
      //  const dateNow = moment(new Date()).utc().format("YYYY-MM-DD HH:MM");

      // <--- Start Loop -->
      for (let i = 0; i < tags?.length; i++) {
        const itemLot = tags[i].tagNo;

        const stmtInsert = await pool
          .request()
          .input("tran_no", sql.NVarChar, tranNo)
          .input("tran_date", sql.DateTime, tranDate)
          .input("lot_no", sql.NVarChar, lotNo)
          .input("partNo", sql.NVarChar, tags[i].partNo)
          .input("tagNo", sql.NVarChar, tags[i].tagNo)
          .input("itemtag", sql.Float, Number(itemLot.split("|")[2])) // 1A-0636-11|TS01-240913001|009|20 -> 9
          .input("qty_box", sql.Float, tags[i].qtyBox)
          .input("box_total", sql.Float, boxTotal)
          .input("status", sql.NVarChar, "USE")
          .input("create_by", sql.NVarChar, createBy)
          .input(
            "tag_qrcode",
            sql.Image,
            await QRCode.toBuffer(tags[i].tagNo, { type: "png" })
          )
          .input("status_rev_tag", sql.NVarChar, "N")
          .query(`INSERT INTO [dbo].[tbl_clotcontroldt]
        (tran_no,tran_date,lot_no,partno,tagno,itemtag,qty_box,box_total,status,create_by,create_date,tag_qrcode,status_rev_tag)
        VALUES (@tran_no,@tran_date,@lot_no,@partno,@tagno,@itemtag,@qty_box,@box_total,@status,@create_by,GETDATE(),@tag_qrcode,@status_rev_tag)
        `);

        if (stmtInsert && stmtInsert.rowsAffected[0] > 0) {
          // กรณีสำเร็จ inserted + 1;
          inserted++;
        }
      }

      // <--- End Loop -->

      if (inserted == tags?.length) {
        return { err: false, msg: "save tag!", status: "Ok" };
      }
    } catch (err) {
      console.log(err);
      return { err: true, msg: err, status: "Bad" };
    }
  }

  async GetTransectionStockDt(req, res) {
    try {
      const prefix = "S";
      const dateNow = moment(new Date()).format("YYYYMMDD");

      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const results = await pool
        .request()
        .query(
          `SELECT TOP 1 tran_no from tbl_cstockdetail WHERE tran_no LIKE '%${prefix}${dateNow}%' ORDER BY tran_no DESC`
        );
      if (results && results?.recordset?.length > 0) {
        const tran = results?.recordset[0].tran_no;
        const lastNo = Number(tran.slice(-5)) + 1;
        const format = await pool
          .request()
          .query(
            `SELECT RIGHT('00000' + CAST(${lastNo} AS VARCHAR(5)), 5) AS PaddedNumber`
          );
        pool.close();
        return {
          err: false,
          msg: "Ok",
          lastNo: `${prefix}${dateNow}${format.recordset[0].PaddedNumber}`,
        };
      } else {
        pool.close();
        return {
          err: false,
          msg: "Ok",
          lastNo: `${prefix}${dateNow}00001`,
        };
      }
    } catch (err) {
      console.log(err);
      return {
        err: true,
        msg: err.message,
      };
    }
  }

  async InsertToken(transection, transectionDate) {
    try {
      const token = jwt.sign(
        {
          transection: transection,
        },
        process.env.TOKEN_APPROVE
      );

      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const insert = await pool
        .request()
        .input("token", sql.NVarChar, token)
        .input("transection", sql.NVarChar, transection)
        .input("tranDate", sql.DateTime, transectionDate)
        .query(
          `INSERT INTO [dbo].[tbl_token_approve] ([token],[req_transection],[tran_date]) VALUES (@token,@transection,@tranDate)`
        );
      if (insert && insert.rowsAffected[0] > 0) {
        return { err: false, msg: "token inserted" };
      } else {
        return { err: true, msg: "token insert failed" };
      }
    } catch (err) {
      console.log(err);
    }
  }

  async AdhesiveSaveProduction(
    partNo,
    phLine,
    glue,
    qty,
    remark,
    createdBy,
    datePlate,
    machine,
    tray,
    datePlan,
    ip,
    trial
  ) {
    try {
      if(Number(qty) > 0) {
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
        .input("machine", sql.NVarChar, machine)
        .input("tray", sql.Int, tray)
        .input("datePlan", sql.Date, datePlan)
        .input("ip", sql.NVarChar, ip)
        .input("trial", sql.NVarChar, trial)
        .query(
          `INSERT INTO [dbo].[TBL_ACTUAL_ADHESIVE] ([PART_NO],[PH_LINE],[GLUE_TYPE],[QTY],[REMARK],[CREATED_BY],[DATE_PLATE],[DATE_PLAN],[IP],[BOOTH],[TRAY],[TRIAL]) 
          VALUES (@partNo,@phLine,@glue,@qty,@remark,@createdBy,@datePlate,@datePlan,@ip,@machine,@tray,@trial)`
        );
      if (results && results.rowsAffected[0] > 0) {
        return {
          err: false,
          status: "Ok",
          msg: "Actual saved!",
        };
      } else {
        return {
          err: true,
          msg: "Something went wrong!",
        };
      }
    }else{
      return {
        err: false,
        msg: "Not Qty",
        status: "Ok",
      }
    }
    } catch (err) {
      return { err: true, msg: err };
    }
  }
  async AdhesiveSaveNGProduction(planDate,plateDate,partNo,fullName,cause,remark,qty,trial) {
    try {
      if((Number(qty)) > 0) {
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const insert = await pool
          .request()
          .input("planDate", sql.Date, planDate)
          .input("plateDate", sql.Date, plateDate)
          .input("partNo", sql.NVarChar, partNo)
          .input("fullName", sql.NVarChar, fullName)
          .input("cause", sql.NVarChar, cause)
          .input("remark", sql.NVarChar, remark)
          .input("qty", sql.Int, qty)
          .input("trial", sql.NVarChar, trial)
          .query(
            `INSERT INTO [dbo].[TBL_NG_ADHESIVE] ([PART_NO],[PLAN_DATE],[PLATE_DATE],[CREATED_BY],[CAUSE],[NG_QTY],[REMARK],[FACTORY],[CREATED_AT],[TRIAL])
           VALUES (@partNo,@planDate,@plateDate,@fullName,@cause,@qty,@remark,'AVP2',GETDATE(),@trial)
         `
          );
        if (insert && insert.rowsAffected[0] > 0) {
          pool.close();
          return {
            err: false,
            msg: "Saved successfully!",
            status: "Ok",
          }
        } else {
          return {
            err: true,
            msg: "Something went wrong!",
          }
        }
      }else{
        return {
          err: false,
          msg: "Not Qty",
          status: "Ok",
        }
      }
    } catch (err) {
      return { err: true, msg: err };
    }
  }

 async UpdateNgAdhesive(id,fullName,remark,qty)  {
  try{
      const pool  = await new sql.ConnectionPool(sqlConfig).connect();

      const update = await pool
      .request()
      .input("id",sql.Int,id)
      .input("fullName",sql.NVarChar,fullName)
      .input("qty",sql.Int,qty)
      .input("remark",sql.NVarChar,remark)
      .query(`UPDATE [dbo].[TBL_NG_ADHESIVE] 
        SET [NG_QTY] = @qty,[UPDATED_BY] = @fullName , [UPDATED_AT] = GETDATE(),[CAUSE] = @remark WHERE [Id] = @id`)

        if(update && update?.rowsAffected > 0) {
          return {err :false , msg : "Updated"}
        }else{
          return {err :true , msg : "Update failed"}
        }
  }catch(err) {
    return {err : true, msg : err}
  }
 }

 async AdhesiveUpdateProduction(
  machine,qty,remark,updatedBy,tray,id,ip
) {
  try {
    if(Number(qty) > 0) {
    const pool = await new sql.ConnectionPool(sqlConfig).connect();
    const updated = await pool
      .request()
      .input("qty", sql.Int, qty)
      .input("remark", sql.VarChar, remark)
      .input("updatedBy", sql.NVarChar, updatedBy)
      .input("machine", sql.NVarChar, machine)
      .input("ip", sql.NVarChar, ip)
      .input("tray", sql.Int, tray)
      .input("id", sql.Int, id)
      .query(
        `UPDATE [dbo].[TBL_ACTUAL_ADHESIVE] SET [BOOTH] = @machine , [QTY] = @qty,[TRAY] = @tray,[REMARK] = @remark,[UPDATED_BY] = @updatedBy,
        [UPDATED_AT] = GETDATE(),[IP] = @ip
        WHERE [Id] = @id`
      );
    if (updated && updated.rowsAffected[0] > 0) {
      return {
        err: false,
        status: "Ok",
        msg: "Actual updated!",
      };
    } else {
      return {
        err: true,
        msg: "Something went wrong!",
      };
    }
  }else{
    return {
      err: false,
      msg: "Not Qty",
      status: "Ok",
    }
  }
  } catch (err) {
    return { err: true, msg: err };
  }
}
  
}

module.exports = Utils;
