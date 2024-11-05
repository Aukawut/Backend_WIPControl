const sql = require("mssql");
const { sqlConfigApp02 } = require("../config/config");
const moment = require("moment");
const Utils = require("../utils/Utils");


const utils = new Utils();


class ReceiveController {
  async GetRunningNumber(req, res) {
    try {
      const prefix = "R";
      const dateNow = moment(new Date()).format("YYYYMMDD");

      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const results = await pool
        .request()
        .query(
          `SELECT TOP 1 tran_no from tbl_creceive WHERE LEFT(tran_no,9) = '${prefix}${dateNow}' ORDER BY tran_no DESC`
        );
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
          lastNo: `R${dateNow}${format.recordset[0].PaddedNumber}`,
        });
      } else {
        pool.close();
        return res.json({
          err: false,
          msg: "Ok",
          lastNo: `R${dateNow}0001`,
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

  async GetReceiveByTransDate(req, res) {
    try {
      const { start, end } = req.params;

      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const results = await pool.request()
        .query(`SELECT Tran_no,Tran_date,lot_no,partno,mach_name,sum(qty_box) as sumqty,date_lot,status,create_by,create_date,lastupdate_by,lastupdate_date  
                FROM [dbo].[tbl_creceive] WHERE tran_date BETWEEN '${start}' AND '${end}'
                GROUP BY Tran_no,Tran_date,lot_no,partno,mach_name, date_lot,status,create_by,create_date,lastupdate_by,lastupdate_date
                ORDER BY tran_no`);
      if (results && results.recordset?.length > 0) {
        return res.json({
          err: false,
          status: "Ok",
          results: results?.recordset,
        });
      } else {
        return res.json({
          err: true,
          msg: "Receive not found!",
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

  async GetReceiveByPart(req, res) {
    try {
      const { partNo } = req.params;
      console.log(partNo);

      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const results = await pool.request().input("partNo", sql.NVarChar, partNo)
        .query(`SELECT Tran_no,Tran_date,lot_no,partno,mach_name,sum(qty_box) as sumqty,date_lot,status,create_by,create_date,lastupdate_by,lastupdate_date  
                FROM [dbo].[tbl_creceive] 
				        WHERE partno = @partNo
                GROUP BY Tran_no,Tran_date,lot_no,partno,mach_name, date_lot,status,create_by,create_date,lastupdate_by,lastupdate_date
                ORDER BY tran_no`);
      if (results && results.recordset?.length > 0) {
        return res.json({
          err: false,
          status: "Ok",
          results: results?.recordset,
        });
      } else {
        return res.json({
          err: true,
          msg: "Receive not found!",
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

  async GetReceiveDetailByTranNo(req, res) {
    try {
      const { tranNo } = req.params;
      console.log(tranNo);

      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const results = await pool
        .request()
        .input("tranNo", sql.NVarChar, tranNo)
        .query(
          `SELECT * FROM [dbo].[tbl_creceive] WHERE [tran_no] = @tranNo ORDER BY item_no`
        );
      if (results && results.recordset?.length > 0) {
        return res.json({
          err: false,
          status: "Ok",
          results: results?.recordset,
        });
      } else {
        return res.json({
          err: true,
          msg: "Receive detail is'nt found!",
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

  async ReceiveMetal(req, res) {
    const { rollerNo, transNo,remark ,tags,dateReceive,fullName} = req.body;
    let sumrev = 0;
    
    if(!rollerNo || !transNo || !tags || !dateReceive || !fullName){
      return res.json({
        err:true,
        msg:"Please, input infomation"
      })
    }

    try {

      if (tags?.length > 0) {
      
        const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
        const checkRoller = await pool
          .request()
          .input("rollerNo", sql.NVarChar, rollerNo)
          .query(`SELECT a.roller_no,a.roller_detail,b.partno FROM tbl_croller a 
                LEFT JOIN (SELECT distinct roller_no,roller_detail,partno FROM tbl_cstockdetail
                WHERE status_supply = 'N') b ON a.roller_no = b.roller_no
                WHERE a.Status = 'USE' AND a.roller_no = @rollerNo
                ORDER BY a.names,a.items_roller`);

     
                
        if (checkRoller && checkRoller.recordset?.length > 0) {
        if(checkRoller.recordset[0].partno !== null && checkRoller.recordset[0].partno !== ""){
          if (checkRoller.recordset[0].partno !== tags[0].partno) {
            // ถ้า Roller ไม่ว่าง
            return res.json({
              err: true,
              msg: "Roller isn't empty",
              partNo: checkRoller?.recordset[0].partno,
            });
          }
        }

          const checkTransectionNo = await pool
            .request()
            .input("transNo", sql.NVarChar, transNo)
            .query(`SELECT * FROM tbl_creceive WHERE tran_no = @transNo`);

          if (checkTransectionNo && checkTransectionNo?.recordset?.length > 0) {
            // Transection No ซ้ำ
            return res.json({
              err: true,
              msg: "Transection No Duplicated",
            });
          }

          // Stock Detail Running
          const stockRunningNo = await utils.GetTransectionStockDt();

          for (let index = 0; index < tags?.length; index++) {
            sumrev += tags[index].qty_box; // Loop Sum ค่า
          }

          if (!stockRunningNo.err) {
            const stockTransNo = stockRunningNo.lastNo;

            for (let i = 0; i < tags?.length; i++) {
              // Insert Table tbl_creceive รับของ
              await pool
                .request()
                .input("tran_no", sql.NVarChar, transNo)
                .input("tran_date", sql.DateTime, dateReceive)
                .input("lot_no", sql.NVarChar, tags[i].lot_no)
                .input("partno", sql.NVarChar, tags[i].partno)
                .input("mach_name", sql.NVarChar, tags[i].mach_name)
                .input("tagno", sql.NVarChar, tags[i].tagno)
                .input("itemtag", sql.Int, Number(tags[i].itemtag))
                .input("date_lot", sql.DateTime, tags[i].date_lot)
                .input("qty_box", sql.Float, tags[i].qty_box)
                .input("status", sql.NVarChar, "USE")
                .input("create_by", sql.NVarChar, fullName)
                .input("roller_no", sql.NVarChar, rollerNo)
                .input("roller_detail",sql.NVarChar,checkRoller?.recordset[0].roller_detail)
                .input("item_no", sql.Float, i + 1)
                .input("date_expire", sql.DateTime, tags[i].date_expire)
                .query(`INSERT INTO tbl_creceive (tran_no,tran_date,lot_no,partno,mach_name,tagno,itemtag,date_lot,qty_box,status,create_by,create_date,roller_no,roller_detail,item_no,date_expire)
                    VALUES (@tran_no,@tran_date,@lot_no,@partno,@mach_name,@tagno,@itemtag,@date_lot,@qty_box,@status,@create_by,CONVERT(varchar(16),Getdate(),120),@roller_no,@roller_detail,@item_no,@date_expire)`);

              // Update Table tbl_clotcontroldt อัพเดทว่าถูกทำรับแล้ว status_rev_tag = 'Y'
              await pool
                .request()
                .input("tagNo", sql.NVarChar, tags[i].tagno)
                .input("lotNo", sql.NVarChar, tags[i].lot_no)
                .query(
                  `UPDATE tbl_clotcontroldt SET status_rev_tag = 'Y' WHERE [tagno] = @tagNo AND [lot_no] = @lotNo`
                );

              await pool
                .request()
                .input("tran_no", sql.NVarChar, stockTransNo)
                .input("tran_date", sql.DateTime, dateReceive)
                .input("items", sql.Int, Number(stockTransNo.slice(-5))) // S2024091600001 -> 00001 -> 1
                .input("lot_no", sql.NVarChar, tags[i].lot_no)
                .input("partno", sql.NVarChar, tags[i].partno)
                .input("mach_name", sql.NVarChar, tags[i].mach_name)
                .input("tagno", sql.NVarChar, tags[i].tagno)
                .input("qty_box", sql.Float, tags[i].qty_box)
                .input("roller_no", sql.NVarChar, rollerNo)
                .input("roller_detail",sql.NVarChar,checkRoller?.recordset[0].roller_detail)
                .input("date_lot", sql.DateTime, tags[i].date_lot)
                .input("status", sql.NVarChar, "USE")
                .input("status_supply", sql.NVarChar, "N") // ยังไม่ถูก Supply
                .input("create_by", sql.NVarChar, fullName)
                .input("create_date", sql.DateTime, dateReceive)
                .input("tran_rev", sql.NVarChar, transNo)
                .input("itemtag", sql.Int, Number(tags[i].itemtag))
                .input("date_expire", sql.DateTime, tags[i].date_expire)
                .input("status_active", sql.NVarChar, "FG")
                .query(`INSERT INTO tbl_cstockdetail (tran_no,tran_date,items,lot_no,partno,mach_name,tagno,qty_box,roller_no,roller_detail,status,status_supply,create_by,create_date,tran_rev,itemtag,date_expire,date_lot,status_active)
            VALUES (@tran_no,@tran_date,@items,@lot_no,@partno,@mach_name,@tagno,@qty_box,@roller_no,@roller_detail,@status,@status_supply,@create_by,@create_date,@tran_rev,@itemtag,@date_expire,@date_lot,@status_active)`);
            }

            // <----- Update Metal Stock ------>
            const partNo = tags[0].partno;

            const checkRemain  = await pool
            .request()
            .input("partNo",sql.NVarChar,partNo)
            .input("rollerNo",sql.NVarChar,rollerNo)
            .query(`SELECT SUM(receive) as sum_rev ,partno,roller_no,remain FROM tbl_cstockmetal
                    WHERE [partno] = @partNo AND roller_no = @rollerNo
                    GROUP BY partno,roller_no,remain`);
              if(checkRemain && checkRemain?.recordset?.length > 0){
                // Update Stock
                const sumRoller = checkRemain?.recordset[0].sum_rev;  // ของเดิม
                const totalQty = sumrev + sumRoller ;
                const rollerNumber  =  checkRemain?.recordset[0].roller_no ;
                const remain  =  checkRemain?.recordset[0].remain ;  // ของเดิม
                const remainTotal = remain + sumrev ;

                await pool
                .request()
                .input("totalQty",sql.Int,totalQty)
                .input("remainTotal",sql.Int,remainTotal)
                .input("partNo",sql.NVarChar,partNo)
                .input("rollerNumber",sql.NVarChar,rollerNumber)
                .input("fullName",sql.NVarChar,fullName)
                .query(`UPDATE tbl_cstockmetal set [receive] = @totalQty, 
                  [remain] = @remainTotal,[lastupdate_by] = @fullName, lastupdate_date = GETDATE()
                  WHERE [partno] = @partNo AND [roller_no] = @rollerNumber`)



              }else{
                console.log("Insert");
                
                // Insert
               await pool
                .request()
                .input("partno",sql.NVarChar,partNo)
                .input("roller_no",sql.NVarChar,rollerNo)
                .input("roller_detail",sql.NVarChar,checkRoller?.recordset[0].roller_detail)
                .input("basic",sql.Int,0)
                .input("receive",sql.Int,Number(sumrev))
                .input("supply",sql.Int,0)
                .input("remain",sql.Int,Number(sumrev))
                .input("remark",sql.NVarChar,remark)
                .input("lastupdate_by",sql.NVarChar,fullName)
                .input("request_supply",sql.Int,0)
                .query(`INSERT INTO tbl_cstockmetal(partno,roller_no,roller_detail,basic,receive,supply,remain,remark,lastupdate_by,lastupdate_date,request_supply) 
                  VALUES (@partno,@roller_no,@roller_detail,@basic,@receive,@supply,@remain,@remark,@lastupdate_by,GETDATE(),@request_supply)
                  `)
                
              }
              pool.close();

              return res.json({
                err:false,
                status : "Ok",
                msg : "Stock saved!"
              })

          } else {
            return res.json({
              err: true,
              msg: "Error, Stock detail running No.",
            });
          }
        }
      }else{
        return res.json({
          err:true,
          msg:"Roller isn't Found!"
        })
      }
    } catch (err) {
      console.log(err);
      return res.json({
        err: false,
        msg: err.message,
      });
    }
  }

  async CancelReceive(req,res) {
    try{
      // Params Endpoint
      const {tranNo} = req.params ; 

      // Body Json
      const {tags,rollerNo,partNo,lotNo,fullName} = req.body;

      // STMT : SQL
      let sqlm = ``;
      let sqldel = ``;

      // Number Value
      let sumRoller,rollerNos,remain,sumQtyTotal,remainTotal ;
      
      if(!rollerNo || tags?.length == 0 || !partNo){
        return res.json({
          err:true,
          msg:"Data is required!"
        })
      }

      if(tags?.length > 0) {
        
        let sumRev = 0;
        let part = "";
        let qtyBox = 0;

        // Open Connection
        const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
   

        for(let i = 0; i < tags?.length ; i++) {
            qtyBox = tags[i].qty_box ;
            part = tags[i].partno;
            sumRev += qtyBox;
        }

      // Check Tag ถูก Supply แล้ว Return Bool
      const tagSupplyFinished = await utils.CheckTagsSupplyFinished(tags,lotNo);

      if(tagSupplyFinished.err && tagSupplyFinished.msg == "tag error"){
        console.log("tag error");
        return res.json({
          err:true,
          msg:"Some tag supply finished"
        })
      }

      if(tagSupplyFinished.err && tagSupplyFinished.msg == "tag status error"){
        console.log("tag status error");
        
        return res.json({
          err:true,
          msg:"Error, tag status"
        })
      }

      // Update Status to CANCEL
      await pool
      .request()
      .input("fullName",sql.NVarChar,fullName)
      .input("tranNo",sql.NVarChar,tranNo)
      .query(`UPDATE tbl_creceive SET status = 'CANCEL', lastupdate_by = @fullName,lastupdate_date = GETDATE() WHERE [tran_no] = @tranNo`)

      // <--- Start Loop Update --->
      for(let index = 0; index < tags?.length ; index ++) {
        
        await pool
        .request()
        .input("lotNo",sql.NVarChar,lotNo)
        .input("tag",sql.NVarChar,tags[index].tagno)
        .input("fullName",sql.NVarChar,fullName)
        .query(`UPDATE tbl_clotcontroldt SET status_rev_tag = 'N', lastupdate_by = @fullName, lastupdate_date = GETDATE() WHERE lot_no = @lotNo AND [tagno] = @tag`);
        
        
        // Delete from tbl_cstockdetail
        await pool
        .request()
        .input("lotNo",sql.NVarChar,tags[index].lot_no)
        .input("tagNo",sql.NVarChar,tags[index].tagno)
        .query(`DELETE FROM tbl_cstockdetail WHERE tagno = @tagNo AND [lot_no] = @lotNo`)
      } 

        // <--- End Loop Update --->

        //ถ้า part =  partNo
        if(part == partNo) {
          sqlm = `SELECT sum(receive) AS sum_rev ,partno,roller_no,remain FROM tbl_cstockmetal`
          sqlm += ` WHERE [partno] = @partNo and [roller_no] = @rollerNo GROUP BY partno,roller_no,remain`
        }

          const resultStock = await pool.request()
          .input("partNo",sql.NVarChar,partNo)
          .input("rollerNo",sql.NVarChar,rollerNo)
          .query(sqlm)
          
          // ถ้ามีข้อมูล Part บน Roller
          if(resultStock && resultStock.recordset?.length > 0) {
            sumRoller = resultStock.recordset[0]?.sum_rev;
            rollerNos = resultStock.recordset[0]?.roller_no;
            remain = resultStock.recordset[0]?.remain;
            sumQtyTotal = Number(sumRoller) - Number(sumRev);
            remainTotal = Number(remain) - Number(sumRev);

            // ถ้ายอดคงเหลือเป็น 0 ทำการลบออกจาก Stock
            if(remainTotal == 0) {
              sqldel = `DELETE FROM tbl_cstockmetal`
            }else{
              //ถ้าไม่ให้ทำการ Update
              sqldel = `UPDATE tbl_cstockmetal`
              sqldel += ` SET receive = @receive ,remain = @remain,lastupdate_by = @fullName,lastupdate_date = GETDATE() WHERE [partno] = @partNo AND [roller_no] = @rollerNo`
            }

            const stockUpdate = await pool
            .request()
            .input("receive",sql.Float,sumQtyTotal)
            .input("remain",sql.Float,remainTotal)
            .input("fullName",sql.NVarChar,fullName)
            .input("partNo",sql.NVarChar,part)
            .input("rollerNo",sql.NVarChar,rollerNos)
            .query(sqldel);
           
            
            if(stockUpdate) {
              pool.close()
              return res.json({
                err:false,
                msg:"Canceled successfully!",
                status: "Ok"
              })
            }
            
          }


      }else{
        return res.json({
          err:true,
          msg:"Tags isn't found!"
        })
      }
    }catch (err) {
      console.log(err);
      return res.json({
        err: false,
        msg: err.message,
      });
    }
  }
}
module.exports = ReceiveController;
