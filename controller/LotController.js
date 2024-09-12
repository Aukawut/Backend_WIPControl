const sql = require("mssql");
const { sqlConfig } = require("../config/config");
const moment = require("moment") ;

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

      const pool = await new sql.ConnectionPool(sqlConfig).connect();

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
          FROM [SRRYAPP02].[DB_AVP2WIPCONTROL].[dbo].[tbl_clotcontrolHd]
          WHERE status LIKE '%USE%'
        )
        SELECT * 
        FROM PaginatedData
        WHERE RowNumber BETWEEN ${offset + 1} AND ${offset + rowsPerPage};
      `;

      // Get Total Count
      const totalCountResult = await pool.request().query(`
        SELECT COUNT(*) AS totalCount 
        FROM [SRRYAPP02].[DB_AVP2WIPCONTROL].[dbo].[tbl_clotcontrolHd]
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
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const result = await pool.request()
        .query(`SELECT * FROM [SRRYAPP02].[DB_AVP2WIPCONTROL].[dbo].[tbl_clotcontrolHd] WHERE [tran_date] 
        BETWEEN '${start}' AND '${end}'`);

      if (result && result?.recordset?.length > 0) {
        return res.json({
          err: false,
          result: result?.recordset,
          status: "Ok",
        });
      } else {
        return res.json({
          err: true,
          msg: res.json(),
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

      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const result = await pool
        .request()
        .input("partNo", sql.NVarChar, partNo)
        .query(
          `SELECT * FROM [SRRYAPP02].[DB_AVP2WIPCONTROL].[dbo].[tbl_clotcontrolHd] WHERE [partno] = @partNo`
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
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const result = await pool
        .request()
        .input("lotNo", sql.NVarChar, lotNo)
        .query(
          `SELECT  * FROM [SRRYAPP02].[DB_AVP2WIPCONTROL].[dbo].[tbl_clotcontrolhd] WHERE lot_no = @lotNo`
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
          msg: res.json(),
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
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const result = await pool.request().input("lotNo", sql.NVarChar, lotNo)
        .query(`SELECT partno,tagno,itemtag,qty_box FROM [SRRYAPP02].[DB_AVP2WIPCONTROL].[dbo].[tbl_clotcontroldt] WHERE lot_no = @lotNo AND [status] = 'USE'
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
          msg: res.json(),
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
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const result = await pool
        .request()
        .query(
          `SELECT TOP 1 * from [SRRYAPP02].[DB_AVP2WIPCONTROL].[dbo].[tbl_clotcontrolhd] ORDER BY tran_no DESC`
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

      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const result = await pool.request()
        .query(`SELECT TOP 1 [lot_no] from [SRRYAPP02].[DB_AVP2WIPCONTROL].[dbo].[tbl_clotcontrolhd] 
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
      console.log(itemLot);

      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const checkDuplicate = await pool
        .request()
        .input("lotNo", sql.NVarChar, lotNo)
        .input("transNo", sql.NVarChar, tranNo)
        .query(`SELECT lot_no,tran_no  from [SRRYAPP02].[DB_AVP2WIPCONTROL].[dbo].[tbl_clotcontrolhd]
        WHERE [lot_no] = @lotNo OR [tran_no] = @transNo
        `);
      if (checkDuplicate && checkDuplicate?.recordset?.length > 0) {
        return res.json({
          err: true,
          msg: "lot duplicate",
        });
      }
      console.log(req.body);

      // const saveLot = await pool
      // .request()
      // .input("tran_no",sql.NVarChar,tranNo)
      // .input("tran_date",sql.DateTime,dateLot)
      // .input("lot_no",sql.DateTime,lotNo)
      // .input("item_lot",sql.Float,itemLot)
      // .input("fact_no",sql.NVarChar,factory)
      // .input("mach_name",sql.NVarChar,machineName)
      // .input("partno",sql.NVarChar,partNo)
      // .input("date_lot",sql.DateTime,dateLot)
      // .input("qty_total",sql.Float,totalQty)
      // .input("box_total",sql.Float,boxTotal)
      // .input("qty_box",sql.Float,boxQty)
      // .input("status",sql.NVarChar,status)
      // .input("create_by",sql.NVarChar,createBy)
      // .input("date_expire",sql.DateTime,expireDate)
      // .input("amount_dateexpire",sql.Float,expireDay)
      // .input("com_name",sql.NVarChar,comName)
      // .query(`INSERT INTO [SRRYAPP02].[DB_AVP2WIPCONTROL].[dbo].[tbl_clotcontrolhd]
      //   (tran_no,tran_date,lot_no,item_lot,fact_no,mach_name,partno,date_lot,qty_total,box_total,qty_box,status,create_by,create_date,date_expire,amount_dateexpire,com_name,create_time)
      //   VALUES (@tran_no,@tran_date,@lot_no,@item_lot,@fact_no,@mach_name,@partno,@date_lot,@qty_total,@box_total,@qty_box,@status,@create_by,GETDATE(),@date_expire,@amount_dateexpire,@com_name,GETDATE())
      //   `)
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

      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const result = await pool.request()
        .query(`SELECT h.tran_no,h.tran_date,h.lot_no,h.partno,dt.tagno,dt.itemtag,dt.qty_box,
        h.fact_no,h.mach_name,h.qty_total,h.box_total,h.qty_box as qty_box_std ,
        h.date_lot,h.date_expire,dt.create_by,dt.create_date,dt.status,dt.status_rev_tag 
        FROM  [SRRYAPP02].[DB_AVP2WIPCONTROL].[dbo].[tbl_clotcontrolhd] h,[SRRYAPP02].[DB_AVP2WIPCONTROL].[dbo].[tbl_clotcontroldt] dt  WHERE h.tran_no = dt.tran_no
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
}

module.exports = LotController;
