const sql = require("mssql");
const { sqlConfig,sqlConfigApp02 } = require("../config/config");
const moment = require("moment");
const Utils = require("../utils/Utils");

const utils = new Utils() ;

class LotController {
  async GetLotControlTrans(req, res) {
    try {
      const page = parseInt(req.params.page);
      const rowsPerPage = parseInt(req.params.limit);
      const offset = (page - 1) * rowsPerPage;
      const sort = req.query.sort || "Tran_No"; // Default sort column
      const order = req.query.order === "desc" ? "DESC" : "ASC"; // Default sort order

      // Validate and sanitize `sort` parameter to prevent SQL injection
      const allowedSortColumns = [
        "Tran_No",
        "Lot_no",
        "partno",
        "Mach_Name",
        "status",
        "qty_total",
      ];
      if (!allowedSortColumns.includes(sort)) {
        throw new Error("Invalid sort column");
      }

      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();

      // Dynamic SQL Query with Sorting
      const query = `
        WITH PaginatedData AS (
          SELECT 
            Tran_No AS Transaction_No,
            Lot_no AS Lot_No,
            partno AS Part_No,
            Mach_Name AS Mach_Name,
            status AS Status,
            tran_date AS Transaction_Date,
            qty_total AS Qty_Total,
            box_total AS Box_Total,
            create_by AS Create_By,
            create_date AS Create_Date,
            ROW_NUMBER() OVER (ORDER BY ${sort} ${order}) AS RowNumber
          FROM [dbo].[tbl_clotcontrolHd]
          WHERE status LIKE '%USE%'
        )
        SELECT * 
        FROM PaginatedData
        WHERE RowNumber BETWEEN ${offset + 1} AND ${offset + rowsPerPage};
      `;

      // Get Total Count
      const totalCountResult = await pool.request().query(`
        SELECT COUNT(*) AS totalCount 
        FROM [dbo].[tbl_clotcontrolHd]
        WHERE status LIKE '%USE%'
      `);

      const totalCount = totalCountResult.recordset[0].totalCount;

      // Get Paginated Results
      const results = await pool.request().query(query);
      if (results && results.recordset?.length > 0) {
        pool.close();
        return res.json({
          err: false,
          results: results.recordset,
          totalCount: totalCount,
          currentPage: page,
          rowsPerPage: rowsPerPage,
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

  async GetLotControlTransByDate(req, res) {
    try {
      const { start, end } = req.params;
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const result = await pool.request()
        .query(`SELECT a.[tran_no],a.[tran_date],a.[lot_no],a.[item_lot],a.[fact_no],a.[mach_name],a.[partno],a.[date_lot],
        b.QA_DateExpire as date_expire,a.[amount_dateexpire],a.[qty_total],a.[box_total],a.[qty_box],a.[status],a.[create_by],
        a.[create_date],a.[create_time],a.[lastupdate_by],a.[lastupdate_date],a.[status_rev_tag],a.[com_name]
        FROM [dbo].[tbl_clotcontrolHd] a 
        LEFT JOIN [dbo].[V_AdhesiveLotControl] b ON a.partno = b.Part_No AND 
        a.lot_no = b.Lot_No
        WHERE a.[tran_date] BETWEEN '${start}' AND '${end}'`);

      if (result && result?.recordset?.length > 0) {
        pool.close();
        return res.json({
          err: false,
          result: result?.recordset,
          status: "Ok",
        });
      } else {
        pool.close();
        return res.json({
          err: true,
          msg: "Lot isn't found",
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

  async GetLotControlTransByPart(req, res) {
    try {
      const { partNo } = req.params;

      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const result = await pool
        .request()
        .input("partNo", sql.NVarChar, partNo)
        .query(
          `SELECT a.[tran_no],a.[tran_date],a.[lot_no],a.[item_lot],a.[fact_no],a.[mach_name],a.[partno],a.[date_lot],
          b.QA_DateExpire as date_expire,a.[amount_dateexpire],a.[qty_total],a.[box_total],a.[qty_box],a.[status],a.[create_by],
          a.[create_date],a.[create_time],a.[lastupdate_by],a.[lastupdate_date],a.[status_rev_tag],a.[com_name]
          FROM [dbo].[tbl_clotcontrolHd] a 
          LEFT JOIN [dbo].[V_AdhesiveLotControl] b ON a.partno = b.Part_No AND 
          a.lot_no = b.Lot_No
          WHERE a.[partno] = @partNo`
        );

      if (result && result?.recordset?.length > 0) {
        return res.json({
          err: false,
          result: result?.recordset,
          status: "Ok",
        });
      } else {
        return res.json({
          err: true,
          msg: "No records found", // Use a meaningful message here
          status: "Ok",
        });
      }
    } catch (err) {
      console.log(err);
      return res.json({
        err: true,
        msg: err.message, // Return the error message in case of failure
      });
    }
  }
  async GetDetailByLotNo(req, res) {
    try {
      const { lotNo } = req.params;
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const result = await pool
        .request()
        .input("lotNo", sql.NVarChar, lotNo)
        .query(
          `SELECT * FROM [dbo].[tbl_clotcontrolhd] WHERE lot_no = @lotNo`
        );

      if (result && result?.recordset?.length > 0) {
        return res.json({
          err: false,
          result: result?.recordset,
          status: "Ok",
        });
      } else {
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

  async GetPartDetailByLotNo(req, res) {
    try {
      const { lotNo } = req.params;
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const result = await pool.request().input("lotNo", sql.NVarChar, lotNo)
        .query(`SELECT partno,tagno,itemtag,qty_box,status_rev_tag FROM [dbo].[tbl_clotcontroldt] WHERE lot_no = @lotNo AND [status] = 'USE'
                ORDER BY itemtag`);

      if (result && result?.recordset?.length > 0) {
        return res.json({
          err: false,
          result: result?.recordset,
          status: "Ok",
        });
      } else {
        return res.json({
          err: true,
          msg: "Not Found",
          result:[],
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

  async GetRunningNo(req, res) {
    try {
      const now = moment(new Date()).format("YYYYMMDD");
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const result = await pool
        .request()
        .query(
          `SELECT TOP 1 * from [dbo].[tbl_clotcontrolhd] ORDER BY tran_no DESC`
        );

      if (result && result?.recordset?.length > 0) {
        const tran = result?.recordset[0].tran_no;
        const lastNo = Number(tran.slice(-4)) + 1;
        const format = await pool
          .request()
          .query(
            `SELECT RIGHT('0000' + CAST(${lastNo} AS VARCHAR(4)), 4) AS PaddedNumber;`
          );

        return res.json({
          err: false,
          msg: "Ok",
          lastNo: `L${now}${format.recordset[0].PaddedNumber}`,
        });
      } else {
        return res.json({
          err: false,
          msg: "Ok",
          lastNo: `L${now}0001`,
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

  async GetRunningLotNo(req, res) {
    try {
      const { lotStr } = req.params;

      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const result = await pool.request()
        .query(`SELECT TOP 1 [lot_no] from [dbo].[tbl_clotcontrolhd] 
          WHERE [lot_no] LIKE '%${lotStr}%' ORDER BY [lot_no] DESC`);

      if (result && result?.recordset?.length > 0) {
        const tran = result?.recordset[0].lot_no;
        const lastNo = Number(tran.slice(-3)) + 1;
        const format = await pool
          .request()
          .query(
            `SELECT RIGHT('000' + CAST(${lastNo} AS VARCHAR(3)), 3) AS PaddedNumber`
          );

        return res.json({
          err: false,
          msg: "Ok",
          lastNo: `${format.recordset[0].PaddedNumber}`,
        });
      } else {
        return res.json({
          err: false,
          msg: "Ok",
          lastNo: `001`,
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
  async SaveLot(req, res) {
    try {
      const factory = "AVP2";
      const status = "USE";
      const dateLot = moment(new Date()).format("YYYY-MM-DD");
      const expireDate = moment(new Date()).add(4, "days").format("YYYY-MM-DD"); // +  4 วัน

      const {
        tranNo,
        lotNo,
        tags,
        partNo,
        machineName,
        boxTotal,
        expireDay,
        totalQty,
        boxQty,
        createBy,
        comName,
      } = req.body;

      const itemLot = Number(lotNo.slice(-3));
      
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const checkDuplicate = await pool
        .request()
        .input("lotNo", sql.NVarChar, lotNo)
        .input("transNo", sql.NVarChar, tranNo)
        .query(`SELECT lot_no,tran_no  FROM [dbo].[tbl_clotcontrolhd]
        WHERE [lot_no] = @lotNo OR [tran_no] = @transNo
        `);
      if (checkDuplicate && checkDuplicate?.recordset?.length > 0) {
        return res.json({
          err: true,
          msg: "lot duplicate",
        });
      }
      console.log(dateLot);
      
      // บันทึก Lot 
      const saveLot = await pool
      .request()
      .input("tran_no",sql.NVarChar,tranNo)
      .input("tran_date",sql.DateTime,dateLot)
      .input("lot_no",sql.NVarChar,lotNo)
      .input("item_lot",sql.Float,itemLot)
      .input("fact_no",sql.NVarChar,factory)
      .input("mach_name",sql.NVarChar,machineName)
      .input("partno",sql.NVarChar,partNo)
      .input("date_lot",sql.DateTime,dateLot)
      .input("qty_total",sql.Float,totalQty)
      .input("box_total",sql.Float,boxTotal)
      .input("qty_box",sql.Float,boxQty)
      .input("status",sql.NVarChar,status)
      .input("create_by",sql.NVarChar,createBy)
      .input("date_expire",sql.DateTime,expireDate)
      .input("amount_dateexpire",sql.Float,expireDay)
      .input("com_name",sql.NVarChar,comName)
      .query(`INSERT INTO [dbo].[tbl_clotcontrolhd]
        (tran_no,tran_date,lot_no,item_lot,fact_no,mach_name,partno,date_lot,qty_total,box_total,qty_box,status,create_by,create_date,date_expire,amount_dateexpire,com_name,create_time)
        VALUES (@tran_no,@tran_date,@lot_no,@item_lot,@fact_no,@mach_name,@partno,@date_lot,@qty_total,@box_total,@qty_box,@status,@create_by,GETDATE(),@date_expire,@amount_dateexpire,@com_name,GETDATE())
        `)

        // บันทึก Lot Detail
       const saveTag = await utils.SaveTagsNewLot(tags,tranNo,dateLot,lotNo,boxTotal,createBy) ;

        
        if((saveLot && saveLot?.rowsAffected[0] > 0 ) && !saveTag.err && saveTag.status == "Ok") {
          return res.json({
            err:false,
            msg : "Lot saved successfully",
            status : "Ok"
          })
        }

    } catch (err) {
      console.log(err);
      return res.json({
        err: true,
        msg: err.message,
      });
    }
  }

  async GetTagLotControlByDate(req, res) {
    try {
      const { start, end } = req.params;

      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const result = await pool.request()
        .query(`SELECT h.tran_no,h.tran_date,h.lot_no,h.partno,dt.tagno,dt.itemtag,dt.qty_box,
        h.fact_no,h.mach_name,h.qty_total,h.box_total,h.qty_box as qty_box_std ,
        h.date_lot,h.date_expire,dt.create_by,dt.create_date,dt.status,dt.status_rev_tag 
        FROM [dbo].[tbl_clotcontrolhd] h,[dbo].[tbl_clotcontroldt] dt WHERE h.tran_no = dt.tran_no
        AND  h.partno = dt.partno and h.status = 'USE'
        AND h.tran_date BETWEEN '${start}' AND '${end}'
        order by h.tran_no,h.lot_no,dt.itemtag`);

      if (result && result?.recordset?.length > 0) {
        return res.json({
          err: false,
          results: result.recordset,
          status: "Ok",
        });
      } else {
        return res.json({
          err: true,
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
  async GetAllLotControlNotExpire(req, res) {
    try {
      const now = moment(new Date()).format("YYYY-MM-DD");

      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const result = await pool.request()
        .query(`SELECT l.Tran_No as Transaction_No,l.Lot_no as Lot_No,l.partno as Part_NO
        ,l.Mach_Name as Machine_NO,l.status as Status,al.[QA_DateExpire] FROM [dbo].[tbl_clotcontrolHd] l
        LEFT JOIN [dbo].[V_AdhesiveLotControl] al ON l.Lot_no = al.Lot_No AND l.partno = al.Part_No
        WHERE l.STATUS like '%USE%'
        and al.[QA_DateExpire] >= '${now}' ORDER BY transaction_no DESC`);

      if (result && result?.recordset?.length > 0) {
        return res.json({
          err: false,
          results: result.recordset,
          status: "Ok",
        });
      } else {
        return res.json({
          err: true,
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
  async GetAllLotControlWaitReceive(req, res) {
    try {
      const now = moment(new Date()).format("YYYY-MM-DD");

      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const result = await pool.request()
        .query(`SELECT  DISTINCT tbl_clotcontroldt.Tran_No as Transection_No,tbl_clotcontroldt.Lot_no as Lot_No,
        tbl_clotcontroldt.partno as Part_No, tbl_clotcontroldt.status as Status
        FROM tbl_clotcontrolhd, tbl_clotcontroldt,V_AdhesiveLotControl
        WHERE tbl_clotcontrolhd.tran_no=tbl_clotcontroldt.tran_no AND tbl_clotcontrolhd.tran_no = V_AdhesiveLotControl.[Transaction_No]
        and  tbl_clotcontroldt.status like '%USE%' AND tbl_clotcontroldt.status_rev_tag
        not like '%Y%' and V_AdhesiveLotControl.[QA_DateExpire] >= '${now}'`);

      if (result && result?.recordset?.length > 0) {
        return res.json({
          err: false,
          results: result.recordset,
          status: "Ok",
        });
      } else {
        return res.json({
          err: true,
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
  async GetTagLotControlByLot(req, res) {
    try {
      const { lotNo } = req.params;

      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const result = await pool.request().input("lotNo", sql.NVarChar, lotNo)
        .query(`SELECT h.tran_no,h.tran_date,h.lot_no,h.partno,dt.tagno,dt.itemtag,dt.qty_box,
        h.fact_no,h.mach_name,h.qty_total,h.box_total,h.qty_box as qty_box_std ,
        h.date_lot,h.date_expire,dt.create_by,dt.create_date,dt.status,dt.status_rev_tag 
        FROM [dbo].[tbl_clotcontrolhd] h,[dbo].[tbl_clotcontroldt] dt  WHERE h.tran_no = dt.tran_no
        AND  h.partno = dt.partno and h.status = 'USE'
        AND h.[lot_no] = @lotNo
        order by h.tran_no,h.lot_no,dt.itemtag`);

      if (result && result?.recordset?.length > 0) {
        return res.json({
          err: false,
          results: result.recordset,
          status: "Ok",
        });
      } else {
        return res.json({
          err: true,
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

  async SearchTagByLot(req, res) {
    try {
      const { lotNo } = req.params;

      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();
      const result = await pool
      .request()
      .input("lotNo", sql.NVarChar, lotNo)
      .query(`SELECT tbl_clotcontrolhd.lot_no,tbl_clotcontrolhd.partno,tbl_clotcontrolhd.mach_name,tbl_clotcontrolhd.date_lot ,tbl_clotcontroldt.tagno,tbl_clotcontroldt.itemtag,tbl_clotcontroldt.qty_box,[dbo].[V_AdhesiveLotControl].[QA_DateExpire] as date_expire  FROM tbl_clotcontrolhd,tbl_clotcontroldt,[dbo].[V_AdhesiveLotControl]
        WHERE tbl_clotcontrolhd.lot_no = tbl_clotcontroldt.lot_no AND 
		    tbl_clotcontrolhd.lot_no = [dbo].[V_AdhesiveLotControl].[Lot_No]
        AND  tbl_clotcontrolhd.lot_no = @lotNo
        AND tbl_clotcontroldt.status_rev_tag not like '%Y%'
        ORDER BY tbl_clotcontroldt.itemtag`);

      if (result && result?.recordset?.length > 0) {
        return res.json({
          err: false,
          results: result.recordset,
          status: "Ok",
        });
      } else {
        return res.json({
          err: true,
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

  async CancelLot(req, res) {
    try {
      console.log(req.params);
      
      const { lotNo } = req.params;
      const pool = await new sql.ConnectionPool(sqlConfigApp02).connect();

      const checkReceive = await pool
      .request()
      .input("lotNo",sql.NVarChar,lotNo)
      .query(`SELECT [status_rev_tag] FROM [tbl_clotcontroldt] WHERE lot_no = @lotNo AND status = 'USE' AND status_rev_tag = 'Y'`) ;
      
      if(checkReceive && checkReceive?.recordset?.length > 0) { 
      
      const statusRev = checkReceive.recordset[0].status_rev_tag;
      if(statusRev == "Y" || statusRev == "y") {
        pool.close();
        // ถูกทำรับไปแล้ว
        return res.json({
          err: true,
          msg:`Lot received`
        })
      }
      

    }
    const checkLot = await pool
    .request()
    .input("lotNo",sql.NVarChar,lotNo)
    .query(`SELECT  * FROM [tbl_clotcontrolhd] WHERE [lot_no] = @lotNo`) ;
    if(checkLot && checkLot?.recordset?.length > 0) {
      const isCancel = checkLot.recordset[0].status ;
      
      if(isCancel == "CANCEL" || isCancel == "cancel") {
        pool.close();
        return res.json({
          err:true,
          msg: `Lot is canceled`
        })
      }
      
    }

    // Update 
    const update = await pool.request().input("lotNo", sql.NVarChar, lotNo)
        .query(`UPDATE [dbo].[tbl_clotcontrolhd] SET [status] = 'CANCEL' WHERE [lot_no] = @lotNo`);

      const updateDetail = await pool.request().input("lotNo", sql.NVarChar, lotNo)
        .query(`UPDATE [dbo].[tbl_clotcontroldt] SET [status] = 'CANCEL' WHERE [lot_no] = @lotNo`);

      if ((update && update?.rowsAffected[0] > 0) && (updateDetail && updateDetail?.rowsAffected[0] > 0)) {
        pool.close();
        return res.json({
          err: false,
          msg: `${lotNo} Canceled`,
          status: "Ok",
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
}

module.exports = LotController;
