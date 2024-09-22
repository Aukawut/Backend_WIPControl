const {sqlConfigApp09,sqlConfig} = require("../config/config");
const sql = require("mssql");

class SummaryController {
    async GetProdcutionTrans(req,res) {
        const { start,end,factory } = req.params ;
        try{
        const pool = await new sql.ConnectionPool(sqlConfigApp09).connect();
        const results = await pool
        .request()
        .input("factory",sql.NVarChar,factory)
        .query(`WITH CTE_MASTER AS (
SELECT a.*,CASE WHEN a.TimeOnly >= '00:00' AND a.TimeOnly <= '07:59' -- Night Shift Create_Date - 1
THEN
CONVERT(VARCHAR(10),DATEADD(day,-1,CRTDON),120)
ELSE a.DateOnly END as PDDate
FROM (
SELECT 	
	 *,
	CONVERT(VARCHAR(5),CRTDON, 108) AS TimeOnly,
	CONVERT(VARCHAR(10), CRTDON, 120) as DateOnly FROM [dbo].[tbl_PD_InventoryTF] 
	WHERE TRNSTT IN ('OH','QA','TF')  ) a 
	)
	SELECT 
	p.PART_NO,	
	p.FACTORY,
	ISNULL(t.FCTYCD,0) as FCTYCD ,
	p.PLAN_DATE as PDDate ,
	ISNULL(t.Qty_Sum,0) as Qty_Sum_Actual ,
	ISNULL(t.ITEMNO,0) as ITEMNO ,
	ISNULL(t.PDDate,0) as PDDate ,
	ISNULL(p.Qty_Sum_Plan,0) as Qty_Sum_Plan FROM (
	SELECT ISNULL(SUM(m.PCKQTY),0) as Qty_Sum ,FCTYCD,ITEMNO,m.PDDate FROM CTE_MASTER m 
	
	GROUP BY m.FCTYCD,m.ITEMNO,m.PDDate ) t

	RIGHT JOIN (
	SELECT ISNULL(SUM(QTY),0) as Qty_Sum_Plan,FACTORY,PART_NO,PLAN_DATE 
	FROM [PSTH-SRRYAPP04].[PRD_WIPCONTROL].[dbo].[TBL_MOLDING_PLAN]
	GROUP BY FACTORY,PART_NO,PLAN_DATE

	) p 
		ON t.FCTYCD COLLATE Thai_CI_AS = p.FACTORY  COLLATE Thai_CI_AS
			AND t.ITEMNO COLLATE Thai_CI_AS = p.PART_NO  COLLATE Thai_CI_AS
			AND t.PDDate = p.[PLAN_DATE] WHERE p.PLAN_DATE BETWEEN '${start}' AND '${end}'
            AND p.FACTORY = @factory
	ORDER BY t.FCTYCD,t.PDDate DESC`) ;
        if(results && results.recordset?.length > 0 ) {
            return res.json({
                err:false,
                results:results?.recordset
            })
        }else{
            return res.json({
                err:true,
                results:[],
                msg:"Not Found"
            })
        }
        }catch(err){
            console.log(err);
            return res.json({
                err:true,
                msg:err.message
            })
        }
    }

    async CountPlanByDate(req,res) {
        const {factory,start,end } = req.params ;
        try{
        const pool = await new sql.ConnectionPool(sqlConfigApp09).connect();
        const results = await pool
        .request()
        .input("factory",sql.NVarChar,factory)
        .query(`SELECT SUM(QTY) as sum_Qty,PLAN_DATE FROM [PSTH-SRRYAPP04].[PRD_WIPCONTROL].[dbo].[TBL_MOLDING_PLAN]
        WHERE PLAN_DATE  BETWEEN '${start}' AND '${end}' AND FACTORY = @factory GROUP BY PLAN_DATE ORDER BY PLAN_DATE ASC`) ;
        if(results && results.recordset?.length > 0 ) {
            return res.json({
                err:false,
                results:results?.recordset,
                status:"Ok"
            })
        }else{
            return res.json({
                err:true,
                results:[],
                msg:"Not Found"
            })
        }
        }catch(err){
            console.log(err);
            return res.json({
                err:true,
                msg:err.message
            })
        }
    }
    async CountProductionActualByDate(req,res) {
        const {factory,start,end } = req.params ;
        try{
        const pool = await new sql.ConnectionPool(sqlConfigApp09).connect();
        const results = await pool
        .request()
        .input("factory",sql.NVarChar,factory)
        .query(`SELECT SUM(PCKQTY) as sum_Qty,m.PdDate FROM (
            SELECT DISTINCT  a.* ,
            b.CRTDON,
            CASE WHEN CONVERT(VARCHAR(5),b.CRTDON, 108) >='00:00' AND CONVERT(VARCHAR(5),b.CRTDON, 108) <= '07:59'
            THEN CONVERT(VARCHAR(10),DATEADD(day,-1,b.CRTDON),120) ELSE CONVERT(VARCHAR(10),DATEADD(day,0,b.CRTDON),120) END AS PdDate,
            CONVERT(VARCHAR(5),b.CRTDON, 108) AS TimeOnly,
            CONVERT(VARCHAR(10), b.CRTDON, 120) as DateOnly
            FROM [dbo].[tbl_PD_DailyClosedDtl] a 
            LEFT JOIN [dbo].[tbl_PD_DailyClosedHdr] b ON a.TRNNO = b.TRNNO AND a.FCTYCD = b.FCTYCD ) m
            WHERE m.PdDate  BETWEEN '${start}' AND '${end}'AND m.FCTYCD = @factory
            GROUP BY m.PdDate ORDER BY m.PdDate ASC`) ;
        if(results && results.recordset?.length > 0 ) {
            return res.json({
                err:false,
                results:results?.recordset,
                status:"Ok"
            })
        }else{
            return res.json({
                err:true,
                results:[],
                msg:"Not Found"
            })
        }
        }catch(err){
            console.log(err);
            return res.json({
                err:true,
                msg:err.message
            })
        }
    }

    async CountProductionPlanDiffByDate(req,res) {
        const {factory,start,end } = req.params ;
        try{
        const pool = await new sql.ConnectionPool(sqlConfigApp09).connect();
        const results = await pool
        .request()
        .input("factory",sql.NVarChar,factory)
        .query(`WITH CTE_ AS (
            SELECT a.PART_NO,a.Qty_Plan,a.PLAN_DATE,ISNULL(bb.Qty_Prd,0) as Qty_Prd FROM (
            SELECT SUM(QTY) as Qty_Plan,PART_NO,PLAN_DATE FROM [PSTH-SRRYAPP04].[PRD_WIPCONTROL].[dbo].[TBL_MOLDING_PLAN]
            WHERE PLAN_DATE  BETWEEN '${start}' AND '${end}' AND FACTORY = @factory GROUP BY PART_NO,PLAN_DATE ) a
            LEFT JOIN (
            SELECT SUM(PCKQTY) as Qty_Prd,m.ITEMNO,m.PdDate FROM (
                SELECT DISTINCT  a.* ,
                b.CRTDON,
                CASE WHEN CONVERT(VARCHAR(5),b.CRTDON, 108) >='00:00' AND CONVERT(VARCHAR(5),b.CRTDON, 108) <= '07:59'
                THEN CONVERT(VARCHAR(10),DATEADD(day,-1,b.CRTDON),120) ELSE CONVERT(VARCHAR(10),DATEADD(day,0,b.CRTDON),120) END AS PdDate,
                CONVERT(VARCHAR(5),b.CRTDON, 108) AS TimeOnly,
                CONVERT(VARCHAR(10), b.CRTDON, 120) as DateOnly
                FROM [dbo].[tbl_PD_DailyClosedDtl] a 
                LEFT JOIN [dbo].[tbl_PD_DailyClosedHdr] b ON a.TRNNO = b.TRNNO AND a.FCTYCD = b.FCTYCD ) m
            WHERE m.PdDate  BETWEEN '${start}' AND '${end}'
            GROUP BY m.ITEMNO,m.PdDate

            ) bb ON a.PART_NO COLLATE Thai_CI_AS = bb.ITEMNO COLLATE Thai_CI_AS AND a.PLAN_DATE = bb.PdDate )
            SELECT CTE_.PLAN_DATE,SUM(CTE_.Qty_Plan) as Sum_Plan_Qty,
            SUM(CTE_.Qty_Prd) as Sum_Qty_Prd, SUM(CTE_.Qty_Prd) - SUM(CTE_.Qty_Plan) as sum_Qty
            FROM CTE_  GROUP BY CTE_.PLAN_DATE 
            ORDER BY CTE_.PLAN_DATE`) ;
        if(results && results.recordset?.length > 0 ) {
            return res.json({
                err:false,
                results:results?.recordset,
                status:"Ok"
            })
        }else{
            return res.json({
                err:true,
                results:[],
                msg:"Not Found"
            })
        }
        }catch(err){
            console.log(err);
            return res.json({
                err:true,
                msg:err.message
            })
        }
    }

    async CountProductionPlanNgByDate(req,res) {
        const {factory,start,end } = req.params ;
        try{
        const pool = await new sql.ConnectionPool(sqlConfig).connect();
        const results = await pool
        .request()
        .input("factory",sql.NVarChar,factory)
        .query(`WITH DateRange AS (
    SELECT CAST('${start}' AS DATE) AS PLAN_DATE
    UNION ALL
    SELECT DATEADD(DAY, 1, PLAN_DATE) FROM DateRange WHERE PLAN_DATE < '${end}')
    SELECT 
        DR.PLAN_DATE, 
        ISNULL(SUM(TNR.NG_QTY), 1) AS sum_Qty
    FROM DateRange DR
    LEFT JOIN [dbo].[TBL_NG_RECORD] TNR 
        ON DR.PLAN_DATE = TNR.PLAN_DATE 
        AND TNR.[FACTORY] = @factory
    GROUP BY DR.PLAN_DATE
    ORDER BY DR.PLAN_DATE`) ;
        if(results && results.recordset?.length > 0 ) {
            return res.json({
                err:false,
                results:results?.recordset,
                status:"Ok"
            })
        }else{
            return res.json({
                err:true,
                results:[],
                msg:"Not Found"
            })
        }
        }catch(err){
            console.log(err);
            return res.json({
                err:true,
                msg:err.message
            })
        }
    }

    async GetActualReportByFactory(req,res) {
        const {factory,start,end } = req.params ;
        try{
        const pool = await new sql.ConnectionPool(sqlConfigApp09).connect();
        const results = await pool
        .request()
        .input("factory",sql.NVarChar,factory)
        .query(`WITH CTE_ AS (
        SELECT a.PART_NO,a.Qty_Plan,a.PLAN_DATE,ISNULL(bb.Qty_Prd,0) as Qty_Prd FROM (
        SELECT SUM(QTY) as Qty_Plan,PART_NO,PLAN_DATE FROM [PSTH-SRRYAPP04].[PRD_WIPCONTROL].[dbo].[TBL_MOLDING_PLAN]
        WHERE PLAN_DATE BETWEEN '${start}' AND '${end}'AND FACTORY = @factory GROUP BY PART_NO,PLAN_DATE ) a
        LEFT JOIN (
        SELECT SUM(PCKQTY) as Qty_Prd,m.ITEMNO,m.PdDate FROM (
            SELECT DISTINCT  a.* ,
            b.CRTDON,
            CASE WHEN CONVERT(VARCHAR(5),b.CRTDON, 108) >='00:00' AND CONVERT(VARCHAR(5),b.CRTDON, 108) <= '07:59'
            THEN CONVERT(VARCHAR(10),DATEADD(day,-1,b.CRTDON),120) ELSE CONVERT(VARCHAR(10),DATEADD(day,0,b.CRTDON),120) END AS PdDate,
            CONVERT(VARCHAR(5),b.CRTDON, 108) AS TimeOnly,
            CONVERT(VARCHAR(10), b.CRTDON, 120) as DateOnly
            FROM [dbo].[tbl_PD_DailyClosedDtl] a 
            LEFT JOIN [dbo].[tbl_PD_DailyClosedHdr] b ON a.TRNNO = b.TRNNO AND a.FCTYCD = b.FCTYCD ) m
        WHERE m.PdDate BETWEEN '${start}' AND '${end}'
        GROUP BY m.ITEMNO,m.PdDate

        ) bb ON a.PART_NO COLLATE Thai_CI_AS = bb.ITEMNO COLLATE Thai_CI_AS AND a.PLAN_DATE = bb.PdDate )
        SELECT CTE_.PLAN_DATE,SUM(CTE_.Qty_Plan) as Sum_Plan_Qty,
        SUM(CTE_.Qty_Prd) as Sum_Qty_Prd
        FROM CTE_  GROUP BY CTE_.PLAN_DATE 
        ORDER BY CTE_.PLAN_DATE`) ;
        if(results && results.recordset?.length > 0 ) {
            return res.json({
                err:false,
                results:results?.recordset,
                status:"Ok"
            })
        }else{
            return res.json({
                err:true,
                results:[],
                msg:"Not Found"
            })
        }
        }catch(err){
            console.log(err);
            return res.json({
                err:true,
                msg:err.message
            })
        }
    }

    async SummaryActualPlanByFactory(req,res) {
        const {factory,start,end } = req.params ;

        try{
        const pool = await new sql.ConnectionPool(sqlConfigApp09).connect();
        const results = await pool
        .request()
        .input("factory",sql.NVarChar,factory)
        .query(`WITH PlanData AS (
            SELECT ISNULL(SUM(QTY),0) AS Qty_Plan
            FROM [PSTH-SRRYAPP04].[PRD_WIPCONTROL].[dbo].[TBL_MOLDING_PLAN]
            WHERE PLAN_DATE BETWEEN '${start}' AND '${end}'
            AND FACTORY = @factory
        ),
        ProductionData AS (
            SELECT ISNULL(SUM(PCKQTY),0) AS Qty_Prd
            FROM (
                SELECT DISTINCT a.*, 
                                b.CRTDON,
                                CASE 
                                    WHEN CONVERT(VARCHAR(5), b.CRTDON, 108) >= '00:00' 
                                        AND CONVERT(VARCHAR(5), b.CRTDON, 108) <= '07:59'
                                    THEN CONVERT(VARCHAR(10), DATEADD(day, -1, b.CRTDON), 120) 
                                    ELSE CONVERT(VARCHAR(10), DATEADD(day, 0, b.CRTDON), 120) 
                                END AS PdDate
                FROM [dbo].[tbl_PD_DailyClosedDtl] a
                LEFT JOIN [dbo].[tbl_PD_DailyClosedHdr] b 
                    ON a.TRNNO = b.TRNNO 
                    AND a.FCTYCD = b.FCTYCD
            ) m
            WHERE m.PdDate BETWEEN '${start}' AND '${end}'
            AND m.FCTYCD = @factory
        ),
		ProductionNgRecord AS (SELECT ISNULL(SUM(n.NG_QTY),0) as Ng_Qty 
		FROM [PSTH-SRRYAPP04].[PRD_WIPCONTROL].[dbo].[TBL_NG_RECORD] n WHERE n.PLAN_DATE BETWEEN '${start}' AND '${end}') 
        SELECT pd.Qty_Plan, prd.Qty_Prd,prdNg.Ng_Qty,(prd.Qty_Prd + Ng_Qty) - pd.Qty_Plan as DiffQty
        FROM PlanData pd, ProductionData prd,ProductionNgRecord prdNg`) ;
        if(results && results.recordset?.length > 0 ) {
            pool.close();
            return res.json({
                err:false,
                results:results?.recordset,
                status:"Ok"
            })
        }else{
            pool.close();
            return res.json({
                err:true,
                results:[],
                msg:"Not Found"
            })
        }
        }catch(err){
            console.log(err);
            return res.json({
                err:true,
                msg:err.message
            })
        }
    }
    async SummaryRMUsed(req,res) {
        const {factory,start,end } = req.params ;

        try{
        const pool = await new sql.ConnectionPool(sqlConfigApp09).connect();
        const results = await pool
        .request()
        .input("factory",sql.NVarChar,factory)
        .query(`WITH CTE_T AS (
		SELECT SUM(c.PCKQTY) as Sum_Qty,c.PdDate,c.ITEMNO,c.FCTYCD FROM (
            SELECT DISTINCT a.*, b.CRTDON,
            CASE WHEN CONVERT(VARCHAR(5), b.CRTDON, 108) >= '00:00' 
            AND CONVERT(VARCHAR(5), b.CRTDON, 108) <= '07:59'
            THEN CONVERT(VARCHAR(10), DATEADD(day, -1, b.CRTDON), 120) 
            ELSE CONVERT(VARCHAR(10), DATEADD(day, 0, b.CRTDON), 120) 
        END AS PdDate
                FROM [dbo].[tbl_PD_DailyClosedDtl] a
                LEFT JOIN [dbo].[tbl_PD_DailyClosedHdr] b 
                    ON a.TRNNO = b.TRNNO 
                    AND a.FCTYCD = b.FCTYCD ) c GROUP BY c.PdDate,c.ITEMNO,c.FCTYCD
					) SELECT 
						cc.* ,b.[RM_PARTNO],ISNULL(ng.Qty_Ng,0) as Qty_Ng
							FROM CTE_T cc 
								LEFT JOIN (SELECT * FROM [PSTH-SRRYAPP04].[PRD_WIPCONTROL].[dbo].[TBL_BOMS]) b
								ON cc.ITEMNO COLLATE Thai_CI_AI = b.[FG_PARTNO] COLLATE Thai_CI_AI
								LEFT JOIN (	SELECT SUM(NG_QTY) as Qty_Ng,PART_NO,PLAN_DATE,FACTORY FROM [PSTH-SRRYAPP04].[PRD_WIPCONTROL].[dbo].[TBL_NG_RECORD]
								GROUP BY FACTORY,PART_NO,PLAN_DATE) ng
								ON cc.PdDate = ng.PLAN_DATE AND  cc.FCTYCD COLLATE Thai_CI_AI = ng.FACTORY COLLATE Thai_CI_AI
								AND cc.ITEMNO COLLATE Thai_CI_AI = ng.PART_NO COLLATE Thai_CI_AI
								WHERE b.[RM_PARTNO] IS NOT NULL AND cc.FCTYCD = @factory AND cc.PdDate BETWEEN
								'${start}' AND '${end}'
								ORDER BY cc.FCTYCD,cc.PdDate,cc.ITEMNO DESC`) ;
        if(results && results.recordset?.length > 0 ) {
            pool.close();
            return res.json({
                err:false,
                results:results?.recordset,
                status:"Ok"
            })
        }else{
            pool.close();
            return res.json({
                err:true,
                results:[],
                msg:"Not Found"
            })
        }
        }catch(err){
            console.log(err);
            return res.json({
                err:true,
                msg:err.message
            })
        }
    }

    async SummaryProductionNgPart(req,res) {
        const {top,start,end,factory} = req.params ;
        
        try{
        const pool = await new sql.ConnectionPool(sqlConfig).connect();
        const results = await pool
        .request()
        .input("factory",sql.NVarChar,factory)
        .query(`SELECT TOP ${top} SUM(NG_QTY) as SUM_NG,PART_NO  FROM [dbo].[TBL_NG_RECORD] 
                WHERE [PLAN_DATE] BETWEEN '${start}' AND '${end}' AND FACTORY = @factory
                GROUP BY PART_NO ORDER BY SUM_NG DESC`)
        if (results && results.recordset?.length > 0) {
        pool.close()
          return res.json({
            err: false,
            results: results.recordset,
            status: "Ok",
          });
        } else {
        pool.close()
          return res.json({
            err: true,
            results: [],
            msg: "Not Found",
          });
        }
    }catch(err){
            console.log(err);
            return res.json({
                err:true,
                msg:err.message
            })
        }
    }
}
module.exports = SummaryController