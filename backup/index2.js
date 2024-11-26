const sql = require("mssql");
const jwt = require("jsonwebtoken");
const { sqlConfig ,sqlConfigApp02} = require("./config/config");
const nodemailer = require("nodemailer");
const moment = require("moment");
const QRCode = require('qrcode');
require("dotenv").config()

class SensMail {
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
      030415 -> 	yupaporn.netsopa@prospira.com
      */
      const approver = await pool.request()
        .query(`SELECT u.*,r.NAME_ROLE ,hr.Ad_Mail,hr.UHR_FullName_th,hr.UHR_FirstName_en,f.FACTORY_NAME
        FROM TBL_USERS u LEFT JOIN TBL_ROLE r ON u.ROLE = r.Id
		LEFT JOIN TBL_FACTORY f ON u.FACTORY = f.Id
        LEFT JOIN [dbo].[V_AllUsers] hr ON u.EMP_CODE = hr.UHR_EmpCode
        WHERE (r.NAME_ROLE = 'Admin' OR r.NAME_ROLE = 'Boss' 
		OR (r.NAME_ROLE = 'Leader' AND f.FACTORY_NAME = 'AVP2' ))
		AND (AD_Mail IS NOT NULL AND EMP_CODE NOT IN
		('J22065','P240075','P240070','030415','P230056')) AND AD_Mail = 'akawut.kamesuwan@prospira.com'`);

      if (approver && approver?.recordset?.length > 0) {
        const approverList = approver.recordset;
          console.log("reqNo",reqNo);
          
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
        }else{
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
}

const  m = new SensMail()
m.SendMailToApprover("RQ2411210001")