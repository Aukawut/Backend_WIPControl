const sql = require("mssql");
const jwt = require("jsonwebtoken");
const { sqlConfig ,sqlConfigApp02} = require("../config/config");
const nodemailer = require("nodemailer");
const moment = require("moment");
const QRCode = require('qrcode');


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
          fullName:results.recordset[0].UHR_FullName_en

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

  async GenarateTokenApprove(reqNo) {
    const secert = process.env.TOKEN_APPROVE;
    try {
      const payload = {
        requestNo: reqNo,
        by:"wipcontrol.dev",
        iat:Date.now()
      };

      const token = jwt.sign(payload, secert);
      return {err:false,token:token} ;

    } catch (err) {
      console.log(err);
      return { err: true, msg: err.message };
    }
  }

  async SendMailToApprover(reqNo) {
    try {
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const approver = await pool.request()
        .query(`SELECT u.*,r.NAME_ROLE ,hr.UHR_Email,hr.UHR_FullName_th,hr.UHR_FirstName_en
        FROM TBL_USERS u LEFT JOIN TBL_ROLE r ON u.ROLE = r.Id
        LEFT JOIN [dbo].[V_AllUsers] hr ON u.EMP_CODE = hr.UHR_EmpCode
        WHERE r.NAME_ROLE = 'Admin'`);
      if (approver && approver?.recordset?.length > 0) {
        const approverList = approver.recordset;

        let html = "";
        html += `<div style="font-size: 15px; font-family: 'Cordia New';">
        <h4> <b>Request No. ${reqNo} </b></h4>`;
        const response = await pool
          .request()
          .input("reqNo", sql.NVarChar, reqNo)
          .query(
            `SELECT rd.*,r.REQUESTOR,r.TOKEN,h.UHR_FullName_th FROM [dbo].[TBL_METAL_REQDTL] rd
          LEFT JOIN TBL_METAL_REQ r ON r.REQ_NO = rd.REQ_NO
          LEFT JOIN V_AllUsers h ON r.REQUESTOR COLLATE Thai_CI_AI = h.UHR_EmpCode COLLATE Thai_CI_AI
          WHERE rd.[REQ_NO] = @reqNo`
          );
        if (response && response?.recordset?.length > 0) {
          html += `<h4><b>Dear, Admin WIP Control System </b></h4>
          <h4><b>ผู้ขอ : ${response.recordset[0].UHR_FullName_th}</b></h4>
      <table style="border: 1px solid black; border-collapse: collapse; width: 100%;font-size: 15px; font-family: 'Cordia New';">
        <thead>
          <tr>
            <th style="border: 1px solid black; padding: 4px;text-align:center;">No.</th>
            <th style="border: 1px solid black; padding: 4px;text-align:center;">Part No.</th>
            <th style="border: 1px solid black; padding: 4px;text-align:center;">Qty.</th>
          </tr>
    </thead>
    <tbody>`;
          for (let i = 0; i < response.recordset.length; i++) {
            html += `<tr>
      <td style="border: 1px solid black; padding: 4px;text-align:center;">${
        i + 1
      }</td>
      <td style="border: 1px solid black; padding: 4px;text-align:center;">${
        response?.recordset[i].PART_NO
      }</td>
      <td style="border: 1px solid black; padding: 4px;text-align:center;">${
        response?.recordset[i].QTY
      }</td>
    </tr>`;
          }
          html += `
    </tbody>
  </table>  
  <div>
    Go to : <a href='http://localhost:5173/approve/request/metal/${reqNo}/${response.recordset[0].TOKEN}'>Click to Approve</a>
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
              const mail = {
                from: "Request Metal AVP2 [Alert] <it.info-psth@prospira.com>", //from email (option)
                // to: to, //to email (require)
                to: approverList[j].UHR_Email,
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
              return {
                err: false,
                msg: `Send email success (${approverList.length})`,
              };
            } else {
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
        }
      } else {
        return { err: true, msg: "Admin isn't found." };
      }
    } catch (err) {
      console.log(err);
      return { err: true, msg: err.message };
    }
  }
  
  async SaveTagsNewLot(tags,tranNo,tranDate,lotNo,boxTotal,createBy) {
    try {
      // tags == Array

      const pool = await new sql.ConnectionPool(sqlConfig).connect();
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
          .input("tag_qrcode",sql.Image,await QRCode.toBuffer(tags[i].tagNo, { type: "png" }))
          .input("status_rev_tag",sql.NVarChar,"N")
          .query(`INSERT INTO [SRRYAPP02].[DB_AVP2WIPCONTROL].[dbo].[tbl_clotcontroldt]
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
        }
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
      return  {
        err: true,
        msg: err.message,
      };
    }
  }

}

module.exports = Utils;
