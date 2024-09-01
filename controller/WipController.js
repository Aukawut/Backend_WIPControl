const sql = require("mssql");

const { sqlConfig } = require("../config/config");
const Utils = require("../utils/Utils");

const utils = new Utils();

class WipController {
  async GetAllProdWip(_, res) {
    try {
      const pool = await new sql.ConnectionPool(sqlConfig).connect();
      const results = await pool.request()
        .query(`SELECT itemno as ItemNo,lotno as LotNo,itypcd,packcd as Pack,trnstt as Status_TF,sum(pckqty) as Qty FROM [BSNCRAPP09].[DCS_IM].[dbo].v_pd_status_summary_byfac
                    WHERE ITYPCD <> 'SEMI' GROUP BY itemno,lotno,itypcd,packcd,trnstt ORDER BY itemno,lotno,itypcd,packcd,trnstt`);
      if (results && results?.recordset?.length > 0) {
        return res.json({
          err: false,
          results: results?.recordset,
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
        results: err.message,
      });
    }
  }

  async WipSummary(req, res) {
    const { factory, by } = req.params;

    try {

      if (factory == "All") {
        // by : "part" | "lot"
        const results = await utils.SearchAllFactory(by);

        if (!results.err && results.status == "Ok") {
          return res.json({
            err: false,
            results: results.results,
            status: "Ok",
          });
        } else {
          return res.json({
            err: true,
            results: [],
            msg: results.msg,
          });
        }
      } else {
        // เลือก  / Factory
        const results = await utils.SearchByFactory(by, factory); // by : "part" | "lot" 
        
        if (!results.err && results.status == "Ok") {
          return res.json({
            err: false,
            results: results.results,
            status: "Ok",
          });
        } else {
          return res.json({
            err: true,
            results: [],
            msg: results.msg,
          });
        }
      }
    } catch (err) {
      console.log(err);
      return res.json({
        err: true,
        results: err.message,
      });
    }
  }
}

module.exports = WipController;
