const sql = require("mssql");
const { sqlConfig } = require("../config/config");
const Utils = require("../utils/Utils");
const fs = require("fs");

const utils = new Utils();

class ProductionController {
  async GetProdTrnByDate(req, res) {
    const { start, end } = req.params;
    try {
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const results = await pool.request().query(
        `SELECT a.* FROM (SELECT TRNNO,TRNDT,TRNSTT,REMARK,CRTDBY,CRTDON,LUPDBY,LUPDON,FCTYCD 
        FROM [BSNCRAPP09].[DCS_IM].[dbo].[tbl_PD_TransferHdr] WHERE TRNDT BETWEEN '${start}' AND '${end}') a  ORDER BY a.FCTYCD,a.TRNNO DESC`
      );
      if (results && results?.recordset?.length > 0) {
        pool.close();
        return res.json({
          err: false,
          results: results?.recordset,
          status: "Ok",
        });
      } else {
        pool.close();
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
  async GetProdTrnDetailByTranNo(req, res) {
    const { tranNo, factory } = req.params;

    try {
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const results = await pool
        .request()
        .input("tranNo", sql.NVarChar, tranNo)
        .input("factory", sql.NVarChar, factory)
        .query(
          `SELECT * FROM [BSNCRAPP09].[DCS_IM].[dbo].[tbl_PD_TransferDtl] WHERE [TRNNO] = @tranNo AND [FCTYCD] = @factory`
        );
      if (results && results?.recordset?.length > 0) {
        pool.close();
        return res.json({
          err: false,
          results: results?.recordset,
          status: "Ok",
        });
      } else {
        pool.close();
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

  async GetProdTrnSummaryByTranNo(req, res) {
    const { tranNo, factory } = req.params;

    try {
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const results = await pool
        .request()
        .input("tranNo", sql.NVarChar, tranNo)
        .input("factory", sql.NVarChar, factory)
        .query(
          `SELECT a.* , t.TRNDT FROM (SELECT FCTYCD,TRNNO,LOTNO,ITEMNO,CFMDOC,SUM(PCKQTY) as _SUM  
            FROM [BSNCRAPP09].[DCS_IM].[dbo].tbl_PD_TransferDtl 
            GROUP BY FCTYCD,TRNNO,LOTNO,ITEMNO,CFMDOC ) a 
            LEFT JOIN [BSNCRAPP09].[DCS_IM].[dbo].tbl_PD_TransferHdr t ON a.FCTYCD = t.FCTYCD AND a.TRNNO = t.TRNNO
            WHERE a.TRNNO = @tranNo
            AND a.FCTYCD = @factory ORDER BY t.TRNDT DESC`
        );
      if (results && results?.recordset?.length > 0) {
        pool.close();
        return res.json({
          err: false,
          results: results?.recordset,
          status: "Ok",
        });
      } else {
        pool.close();
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
  async GetProdClosedDetailByTranNo(req, res) {
    const { tranNo, factory } = req.params;

    try {
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const results = await pool
        .request()
        .input("tranNo", sql.NVarChar, tranNo)
        .input("factory", sql.NVarChar, factory)
        .query(
          `SELECT * FROM [BSNCRAPP09].[DCS_IM].[dbo].[tbl_PD_DailyClosedDtl] WHERE [TRNNO] = @tranNo 
          AND [FCTYCD] = @factory`
        );
      if (results && results?.recordset?.length > 0) {
        pool.close();
        return res.json({
          err: false,
          results: results?.recordset,
          status: "Ok",
        });
      } else {
        pool.close();
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
  async GetProdClosedByFactory(req, res) {
    const { start, end, factory } = req.params;

    try {
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const results = await pool
        .request()

        .input("factory", sql.NVarChar, factory)
        .query(
          `SELECT * FROM [BSNCRAPP09].[DCS_IM].[dbo].[tbl_PD_DailyClosedHdr] WHERE TRNDT BETWEEN '${start}' AND '${end}' 
          AND FCTYCD = @factory ORDER BY CRTDON DESC`
        );
      if (results && results?.recordset?.length > 0) {
        pool.close();
        return res.json({
          err: false,
          results: results?.recordset,
          status: "Ok",
        });
      } else {
        pool.close();
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

  async GetProdPlanFactory(req, res) {
    const { start, end, factory } = req.params;
    try {
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const results = await pool
        .request()

        .input("factory", sql.NVarChar, factory)
        .query(
          `SELECT * FROM [dbo].[TBL_MOLDING_PLAN] WHERE (PLAN_DATE BETWEEN '${start}' AND '${end}' ) 
          AND [FACTORY] = @factory ORDER BY PLAN_DATE DESC`
        );
      if (results && results?.recordset?.length > 0) {
        pool.close();
        return res.json({
          err: false,
          results: results?.recordset,
          status: "Ok",
        });
      } else {
        pool.close();
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
  async GetProdPlanByFactory(req, res) {
    const { start, end, factory } = req.params;
    try {
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const results = await pool
        .request()

        .input("factory", sql.NVarChar, factory)
        .query(
          `SELECT p.*, 
       u.UHR_FullName_th AS FNAME_CREATED, 
       ur.UHR_FullName_th AS FNAME_UPDATED FROM TBL_MOLDING_PLAN p LEFT JOIN V_AllUsers u ON p.CREATED_BY = u.UHR_EmpCode
      LEFT JOIN V_AllUsers ur ON p.UPDATED_BY = ur.UHR_EmpCode WHERE FACTORY = @factory AND PLAN_DATE BETWEEN '${start}' AND '${end}' 
      ORDER BY PLAN_DATE DESC`
        );
      if (results && results?.recordset?.length > 0) {
        pool.close();
        return res.json({
          err: false,
          results: results?.recordset,
          status: "Ok",
        });
      } else {
        pool.close();
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
  async SaveProductionPlan(req, res) {
    try {
      const { plan, empCode, factory } = req.body;

      // แปลง JSON string เป็น JS Object
      const data = JSON.parse(plan);

      const pool = await new sql.ConnectionPool(sqlConfig).connect(); // new Instance Class Connect

      // Loop ข้อมูล Plan การผลิต
      for (let i = 0; i < data?.length; i++) {
        const partNo = data[i].PartNo;
        const mc = data[i].Mc;
        const mcGroup = data[i].GroupMC;
        const compound = data[i].Compound;
        const pack = data[i].Packing;
        const customer = data[i].Cus;
        const plan = data[i].Plan;

        for (let j = 0; j < plan?.length; j++) {
          // ข้อมูลที่มีการเปลี่ยนแปลง type = {fieldName:string,bind:string}[]
          let isChanged = [];
          const resultLastId = await pool
            .request()
            .query(
              `SELECT TOP 1 * FROM [dbo].[TBL_MOLDING_PLAN] ORDER BY Id DESC`
            );

          // เลือกข้อมูล แผนที่มีข้อมูลอยู่แล้วขอวแต่ละ Part
          const results = await pool
            .request()
            .input("mc", sql.NVarChar, mc)
            .input("mcGroup", sql.NVarChar, mcGroup)
            .input("partNo", sql.NVarChar, partNo)
            .input("compound", sql.NVarChar, compound)
            .input("pack", sql.NVarChar, pack)
            .input("customer", sql.NVarChar, customer)
            .input("planDate", sql.Date, plan[j].dateOnly)
            .query(`SELECT * FROM [dbo].[TBL_MOLDING_PLAN] 
            WHERE [MC] = @mc AND [PART_NO] = @partNo AND [COMPOUND] = @compound AND [CUSTOMER_CODE] = @customer
            AND [MC_GROUP] = @mcGroup AND [PACK] = @pack
            AND [PLAN_DATE] = @planDate`);
          if (results && results?.recordset?.length > 0) {
            const id = results.recordset[0].Id; //Id
            const oldMc = results.recordset[0].MC;
            const oldMcGroup = results.recordset[0].MC_GROUP;
            const oldPartNo = results.recordset[0].PART_NO;
            const oldCustomerCode = results.recordset[0].CUSTOMER_CODE;
            const oldCompound = results.recordset[0].COMPOUND;
            const oldPack = results.recordset[0].PACK;
            const oldQty = results.recordset[0].QTY;
            if (typeof plan[j].qty == "number") {
              // Update เฉพาะข้อมูลที่เปลี่ยนแปลง
              await pool
                .request()
                .input("id", sql.Int, id)
                .input("code", sql.NVarChar, empCode)
                .input("mc", sql.NVarChar, mc == oldMc ? oldMc : mc)
                .input(
                  "mcGroup",
                  sql.NVarChar,
                  mcGroup == oldMcGroup ? oldMcGroup : mcGroup
                )
                .input(
                  "customer",
                  sql.NVarChar,
                  customer == oldCustomerCode ? oldCustomerCode : customer
                )
                .input(
                  "partNo",
                  sql.NVarChar,
                  partNo == oldPartNo ? oldPartNo : partNo
                )
                .input(
                  "compound",
                  sql.NVarChar,
                  compound == oldCompound ? oldCompound : compound
                )
                .input("pack", sql.NVarChar, pack == oldPack ? oldPack : pack)
                .input(
                  "qty",
                  sql.Int,
                  Number(plan[j].qty) == Number(oldQty)
                    ? Number(oldQty)
                    : Number(plan[j].qty)
                )
                .query(`UPDATE [dbo].[TBL_MOLDING_PLAN] SET [MC] = @mc,[MC_GROUP] = @mcGroup, [PART_NO] = @partNo, [CUSTOMER_CODE] = @customer,
            [COMPOUND] = @compound,[PACK] = @pack,[QTY] = @qty,
            [UPDATED_AT] = GETDATE(),[UPDATED_BY] = @code
            WHERE [Id] = @id`);

              // Push Field ที่มีการเปลี่ยนแปลง
              if (mc != oldMc) {
                isChanged.push({ fieldName: "[C_MC]", bind: "@mc" });
              }
              if (mcGroup != oldMcGroup) {
                isChanged.push({ fieldName: "[C_MC_GROUP]", bind: "@mcGroup" });
              }
              if (customer != oldCustomerCode) {
                isChanged.push({
                  fieldName: "[C_CUSTOMER_CODE]",
                  bind: "@customer",
                });
              }
              if (partNo != oldPartNo) {
                isChanged.push({ fieldName: "[C_PART_NO]", bind: "@partNo" });
              }
              if (compound != oldCompound) {
                isChanged.push({
                  fieldName: "[C_COMPOUND]",
                  bind: "@compound",
                });
              }
              if (pack != oldPack) {
                isChanged.push({ fieldName: "[C_PACK]", bind: "@pack" });
              }
              if (Number(plan[j].qty) != Number(oldQty)) {
                isChanged.push({ fieldName: "[C_QTY]", bind: "@qty" });
              }

              //บันทึก Logs ติดตามการเปลี่ยนแปลงข้อมูล -> Forma Rev. Weekly Plan
              if (isChanged.length > 0) {
                const saveLogs = await utils.SaveLogsChangePlan(id, isChanged);
                if (saveLogs.err) {
                  console.log(saveLogs.msg);
                }
              }
            } else {
              continue;
            }
          } else {
            if (typeof plan[j].qty == "number") {
              // ถ้าไม่มีให้ Insert Plan
              await pool
                .request()
                .input("mc", sql.NVarChar, mc)
                .input(
                  "id",
                  sql.Int,
                  resultLastId.recordset.length > 0
                    ? resultLastId.recordset[0].Id + 1
                    : 1
                )
                .input("mcGroup", sql.NVarChar, mcGroup)
                .input("partNo", sql.NVarChar, partNo)
                .input("customer", sql.NVarChar, customer)
                .input("compound", sql.NVarChar, compound)
                .input("pack", sql.NVarChar, pack)
                .input("planDate", sql.Date, plan[j].dateOnly)
                .input("qty", sql.Int, parseInt(plan[j].qty))
                .input("code", sql.NVarChar, empCode)
                .input("factory", sql.NVarChar, factory)
                .query(`INSERT INTO [dbo].[TBL_MOLDING_PLAN] ([Id],[QTY],[PLAN_DATE],[MC],[MC_GROUP],[PART_NO],
              [CUSTOMER_CODE],[COMPOUND],[PACK],[CREATED_BY],[CREATED_AT],[FACTORY]) 
              VALUES (@id,@qty,@planDate,@mc,@mcGroup,@partNo,@customer,@compound,@pack,@code,GETDATE(),@factory)`);

              await pool
                .request()
                .input(
                  "id",
                  sql.Int,
                  resultLastId.recordset.length > 0
                    ? resultLastId.recordset[0].Id + 1
                    : 1
                )
                .query(
                  `INSERT INTO [dbo].[TBL_PN_LOGCHANGE] ([Id_Plan]) VALUES (@id)`
                );
            } else {
              continue;
            }
          }
        }
      }
      pool.close();
      return res.json({
        err: false,
        msg: "Plan saved!",
        status: "Ok",
      });
    } catch (err) {
      console.log(err);
      return res.json({
        err: true,
        msg: err.message,
      });
    }
  }

  async GetWeeklyPlan(req, res) {
    const { start, end, factory } = req.params;
    try {
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const results = await pool
        .request()

        .input("factory", sql.NVarChar, factory)
        .query(`EXEC GetMoldingPlanData '${start}', '${end}', '${factory}'`);
      if (results && results?.recordset?.length > 0) {
        pool.close();
        return res.json({
          err: false,
          results: results?.recordset,
          status: "Ok",
        });
      } else {
        pool.close();
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
  async UpdatePlan(req, res) {
    const { id } = req.params; // API Params :id
    const { partNo, customer, compound, pack, code,qty,planDate,mc,mcGroup } = req.body;

    // ถ้าไม่ได้มีการส่ง Json มา
    if (!partNo || !customer || !compound || !pack || !code) {
      return res.json({
        err: true,
        msg: "Data is required!",
      });
    }
    // Init Count Logs Data Change
    let mcChange = 0;
    let mcGroupChange = 0;
    let mcPartNo = 0;
    let mcCustomer = 0;
    let mcCompound = 0;
    let mcPack = 0;
    let mcQty = 0;
  

    try {
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const results = await pool
        .request()
        .input("id", sql.Int, id)
        .query(
          `SELECT * FROM [PRD_WIPCONTROL].[dbo].[TBL_MOLDING_PLAN] WHERE Id = @id`
        );
        const logChange = await pool
        .request()
        .input("id", sql.Int, id)
        .query(
          `SELECT * FROM [dbo].[TBL_PN_LOGCHANGE] WHERE [Id_Plan] = @id`
        );

        // Update Plan
      if (results && results?.recordset?.length > 0) {
        const update = await pool
        .request()
        .input("qty",sql.Int,qty)
        .input("planDate",sql.NVarChar,planDate)
        .input("mc",sql.NVarChar,mc)
        .input("mcGroup",sql.NVarChar,mcGroup)
        .input("partNo",sql.NVarChar,partNo)
        .input("customer",sql.NVarChar,customer)
        .input("compound",sql.NVarChar,compound)
        .input("code",sql.NVarChar,code)
        .input("id",sql.Int,id)
        .query(`UPDATE INTO [dbo].[TBL_MOLDING_PLAN] 
            SET [QTY] = @qty,[PLAN_DATE] = @planDate,[MC] = @mc,[MC_GROUP] = @mcGroup,[PART_NO] = @partNo
            [CUSTOMER_CODE] = @customer,[COMPOUND] @compound,[PACK] = @pack,[UPDATED_BY] = @code
            ,UPDATED_AT = GETDATE() WHERE [Id] = @id`);

          // จำนวนการเปลี่ยนแปลงเก่า + 1
        if(Number(results?.recordset[0].QTY) !== Number(qty)) {
          mcQty += Number(logChange?.recordset[0].C_QTY) + 1 ;
        }
        if(results?.recordset[0].MC !== mc) {
          mcChange += Number(logChange?.recordset[0].C_MC) + 1 ;
        }
        if(results?.recordset[0].MC_GROUP !== mcGroup) {
          mcGroupChange += Number(logChange?.recordset[0].C_MC_GROUP) + 1 ;
        }
        if(results?.recordset[0].PACK !== pack) {
          mcPack += Number(logChange?.recordset[0].C_PACK) + 1 ;
        }
        if(results?.recordset[0].COMPOUND !== compound) {
          mcCompound += Number(logChange?.recordset[0].C_COMPOUND) + 1 ;
        }
        if(results?.recordset[0].CUSTOMER_CODE !== mcCustomer) {
          mcCustomer += Number(logChange?.recordset[0].C_CUSTOMER_CODE) + 1 ;
        }
        if(results?.recordset[0].PART_NO !== partNo) {
          mcPartNo += Number(logChange?.recordset[0].C_PART_NO) + 1 ;
        }

        // บันทึก Logs Change (Count Rev.)
        const updateLog = await pool
        .request()
        .input("cMC",sql.Int,mcChange)
        .input("mcGroup",sql.Int,mcGroup)
        .input("cPartNo",sql.Int,mcPartNo)
        .input("cCustomer",sql.Int,mcCustomer)
        .input("cCompound",sql.Int,mcCompound)
        .input("cPack",sql.Int,mcPack)
        .input("cQty",sql.Int,mcQty)
        .input("id",sql.Int,id)
        .query(`UPDATE [dbo].[TBL_PN_LOGCHANGE] 
          SET [C_MC] = @cMC, [C_MC_GROUP] = @mcGroup ,[C_PART_NO] = @cPartNo,[C_CUSTOMER_CODE] = @cCustomer,
          [C_COMPOUND] = @cCompound,[C_PACK] = @cPack,[C_QTY] = @cQty
          WHERE [Id_Plan] = @id`);

        if ((update && update.rowsAffected[0]  > 0 ) && (updateLog && updateLog?.rowsAffected[0] > 0)) {
          return res.json({
            err:false,
            msg:"Plan updated"
          })

        } else {
          pool.close();
          return res.json({
            err: true,
            msg: "Something is went wrong",
          });
        }
      } else {
        pool.close();
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

module.exports = ProductionController;
