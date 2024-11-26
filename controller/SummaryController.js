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

    async CountAdhesivePlanByDate(req,res) {
        const {start,end } = req.params ;
        try{
        const pool = await new sql.ConnectionPool(sqlConfig).connect();
        const results = await pool
        .request()
        .query(`SELECT SUM(QTY) as sum_Qty,DATE_PLATE as PLAN_DATE FROM [dbo].[TBL_ADHESIVE_PLAN] 
            WHERE DATE_PLATE BETWEEN '${start}' AND '${end}'
            GROUP BY DATE_PLATE ORDER BY DATE_PLATE ASC`) ;
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

    async CountAdhesiveActualByDate(req,res) {
        const {start,end } = req.params ;
        try{
        const pool = await new sql.ConnectionPool(sqlConfig).connect();
        const results = await pool
        .request()
        .query(`SELECT SUM(QTY) as sum_Qty,DATE_PLATE FROM [dbo].[TBL_ACTUAL_ADHESIVE] 
            WHERE DATE_PLATE BETWEEN '${start}' AND '${end}'
            GROUP BY DATE_PLATE
            ORDER BY DATE_PLATE ASC`) ;
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

    async CountAdhesiveDiffByDate(req,res) {
        const {start,end } = req.params ;
        try{
        const pool = await new sql.ConnectionPool(sqlConfig).connect();
        const results = await pool
        .request()
        .query(`SELECT m.DATE_PLATE,SUM(m.Diff) as sum_Qty FROM (
                SELECT p.*,ISNULL(a.QTY,0) as QtyActual,
                CASE WHEN 
                p.QTY - ISNULL(a.QTY,0) < 0 THEN 0 ELSE p.QTY - ISNULL(a.QTY,0) END as Diff FROM [dbo].[TBL_ADHESIVE_PLAN] p
                LEFT JOIN [dbo].[TBL_ACTUAL_ADHESIVE] a
                ON p.PART_NO = a.PART_NO AND p.DATE_PLATE = a.DATE_PLATE ) m
                WHERE m.DATE_PLATE BETWEEN '${start}' AND '${end}'
                GROUP BY m.DATE_PLATE ORDER BY DATE_PLATE ASC`) ;
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
        ISNULL(SUM(TNR.QTY), 1) AS sum_Qty
    FROM DateRange DR
    LEFT JOIN (SELECT * FROM TBL_PRD_RECORD WHERE STATUS_PRD = 'NG')TNR 
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

    async CountAdhesivePlanNgByDate(req,res) {
        const {start,end } = req.params ;
        try{
        const pool = await new sql.ConnectionPool(sqlConfig).connect();
        const results = await pool
        .request()
        .query(`SELECT PLATE_DATE,SUM(NG_QTY) as  sum_Qty FROM [dbo].[TBL_NG_ADHESIVE]
                WHERE PLATE_DATE BETWEEN '${start}' AND '${end}'
                GROUP BY PLATE_DATE`) ;
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
        SELECT a.Qty_Plan,a.PLAN_DATE,
		ISNULL(bb.Qty_Prd,0) as Qty_Prd,
		ISNULL(ng.SUM_NG,0) as SUM_NG  FROM (
        SELECT SUM(QTY) as Qty_Plan,PLAN_DATE FROM [PSTH-SRRYAPP04].[PRD_WIPCONTROL].[dbo].[TBL_MOLDING_PLAN]
        WHERE PLAN_DATE BETWEEN '${start}' AND '${end}' AND FACTORY = @factory GROUP BY PLAN_DATE ) a
        LEFT JOIN (
        SELECT SUM(PCKQTY) as Qty_Prd,m.PdDate FROM (
		   SELECT mm.* 
				FROM (
				SELECT DISTINCT a.*, 
			   b.CRTDON,
			   CASE 
				   WHEN CONVERT(VARCHAR(5), b.CRTDON, 108) >= '00:00' AND CONVERT(VARCHAR(5), b.CRTDON, 108) <= '07:59' 
				   THEN CONVERT(VARCHAR(10), DATEADD(day, -1, b.CRTDON), 120) 
				   ELSE CONVERT(VARCHAR(10), DATEADD(day, 0, b.CRTDON), 120) 
			   END AS PdDate,
			   CONVERT(VARCHAR(5), b.CRTDON, 108) AS TimeOnly,
			   CONVERT(VARCHAR(10), b.CRTDON, 120) AS DateOnly
				FROM [dbo].[tbl_PD_DailyClosedDtl] a 
				LEFT JOIN [dbo].[tbl_PD_DailyClosedHdr] b 
				ON a.TRNNO = b.TRNNO 
				AND a.FCTYCD = b.FCTYCD 
	) mm

		UNION ALL 

		SELECT pd.FACTORY COLLATE Thai_CI_AI as FCTYCD,
			   pd.[TRAN_NO] COLLATE Thai_CI_AI as TRNNO,
			   '' AS TRNLNO,
			   '' AS LOTNO,
			   pd.PART_NO COLLATE Thai_CI_AI as ITEMNO,
			   pd.PACK COLLATE Thai_CI_AI as PACKCD,
			   pd.[QTY] as PCKQTY,
			   0 as TOTQTY,
			   'PCS' as UOMCD,
			   pd.[CREATED_AT] as CRTDON,
			   pd.[PLAN_DATE] as PdDate,
			   '00:00' as TimeOnly,
			   pd.[PLAN_DATE] as DateOnly
		FROM [PSTH-SRRYAPP04].[PRD_WIPCONTROL].[dbo].[TBL_PRD_RECORD] pd 
		WHERE pd.[STATUS_PRD] = 'FG'
			
			) m
			
        WHERE m.PdDate BETWEEN '${start}' AND '${end}' AND m.FCTYCD = @factory

        GROUP BY m.PdDate

        ) bb ON a.PLAN_DATE = bb.PdDate
		LEFT JOIN 
			(SELECT SUM(QTY) as SUM_NG,CONVERT(DATE,PLAN_DATE) as PLAN_DATE FROM [PSTH-SRRYAPP04].[PRD_WIPCONTROL].[dbo].[TBL_PRD_RECORD]
		WHERE [STATUS_PRD] = 'NG' AND FACTORY = @factory AND CONVERT(DATE,PLAN_DATE) BETWEEN '${start}' AND '${end}'
		GROUP BY CONVERT(DATE,PLAN_DATE)) ng 
		ON a.PLAN_DATE = ng.PLAN_DATE
		)
		
        SELECT CTE_.PLAN_DATE,SUM(CTE_.Qty_Plan) as Sum_Plan_Qty,
        SUM(CTE_.Qty_Prd) as Sum_Qty_Prd,
		SUM(CTE_.SUM_NG) as Sum_Qty_NG
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

    async GetActualAdhesiveReportByDate(req,res) {
        const {start,end } = req.params ;
        try{
        const pool = await new sql.ConnectionPool(sqlConfig).connect();
        const results = await pool
        .request()
        .query(`WITH CTE_ACTUAL as (
                SELECT m.DATE_PLATE,SUM(m.ActualQty) as SumActual,SUM(m.QTY) as SumQtyPlan FROM (
                SELECT p.*,ISNULL(
				CASE WHEN a.TRIAL != 'Y' THEN a.QTY ELSE 0 END
				
				,0) as ActualQty FROM [dbo].[TBL_ADHESIVE_PLAN] p LEFT JOIN  
                [dbo].[TBL_ACTUAL_ADHESIVE] a ON p.PART_NO = a.PART_NO AND p.PH_LINE = a.PH_LINE AND 
                p.DATE_PLATE = a.DATE_PLATE  ) m 
                GROUP BY m.DATE_PLATE ) 
                SELECT ca.*,ISNULL(ng.Qty_NG,0) as SumQtyNG,ISNULL(ca.SumQtyPlan,0) - ISNULL(ca.SumActual,0) as SumDiff  FROM CTE_ACTUAL ca
                LEFT JOIN  (
                SELECT SUM(NG_QTY) as Qty_NG,nga.PLATE_DATE FROM [dbo].[TBL_NG_ADHESIVE] nga WHERE nga.TRIAL != 'Y' GROUP BY nga.PLATE_DATE
                ) ng ON ca.DATE_PLATE = ng.PLATE_DATE WHERE ca.DATE_PLATE BETWEEN '${start}' AND '${end}'`) ;
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
			SELECT mm.* FROM (
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
                    AND a.FCTYCD = b.FCTYCD ) mm 
						UNION ALL
					SELECT pd.FACTORY COLLATE Thai_CI_AI as FCTYCD,
			   pd.[TRAN_NO] COLLATE Thai_CI_AI as TRNNO,
			   '' AS TRNLNO,
			   '' AS LOTNO,
			   pd.PART_NO COLLATE Thai_CI_AI as ITEMNO,
			   pd.PACK COLLATE Thai_CI_AI as PACKCD,
			   pd.[QTY] as PCKQTY,
			   0 as TOTQTY,
			   'PCS' as UOMCD,
			   pd.[CREATED_AT] as CRTDON,
			   pd.[PLAN_DATE] as PdDate
		FROM [PSTH-SRRYAPP04].[PRD_WIPCONTROL].[dbo].[TBL_PRD_RECORD] pd 
		WHERE pd.[STATUS_PRD] = 'FG'


            ) m
            WHERE m.PdDate  BETWEEN '${start}' AND '${end}'
            AND m.FCTYCD = @factory
        ),
		ProductionNgRecord AS (SELECT ISNULL(SUM(n.[QTY]),0) as Ng_Qty 
		FROM [PSTH-SRRYAPP04].[PRD_WIPCONTROL].[dbo].[TBL_PRD_RECORD] n WHERE (n.PLAN_DATE BETWEEN '${start}' AND '${end}') AND [STATUS_PRD] = 'NG' AND [FACTORY] = @factory) 
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

    async SummaryActualAdhesivePlanByFactory(req,res) {
        const {start,end } = req.params ;

        try{
        const pool = await new sql.ConnectionPool(sqlConfig).connect();
        const results = await pool
        .request()
        .query(`SELECT a.*,a.Qty_Plan - a.Qty_Prd as DiffQty FROM (
                SELECT ( SELECT SUM(QTY) as Qty_Plan FROM [dbo].[TBL_ADHESIVE_PLAN] WHERE DATE_PLATE BETWEEN '${start}' AND '${end}') as Qty_Plan,
                (SELECT SUM(QTY) as Qty_Prd FROM [dbo].[TBL_ACTUAL_ADHESIVE] WHERE (DATE_PLATE BETWEEN '${start}' AND '${end}') AND TRIAL != 'Y')  as Qty_Prd,
                (SELECT SUM(NG_QTY) as Ng_Qty FROM [dbo].[TBL_NG_ADHESIVE] WHERE (PLATE_DATE BETWEEN '${start}' AND '${end}') AND TRIAL != 'Y')  as Ng_Qty) a`) ;
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
								LEFT JOIN (	SELECT SUM(QTY) as Qty_Ng,PART_NO,PLAN_DATE,FACTORY FROM [PSTH-SRRYAPP04].[PRD_WIPCONTROL].[dbo].[TBL_PRD_RECORD]
								WHERE STATUS_PRD = 'NG'
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
        .query(`SELECT TOP ${top} SUM(QTY) as SUM_NG,PART_NO  FROM [dbo].[TBL_PRD_RECORD]
                WHERE [PLAN_DATE] BETWEEN '${start}' AND '${end}' AND FACTORY = @factory AND [STATUS_PRD] = 'NG'
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

    async SummaryAdhesiveNgPart(req,res) {
        const {top,start,end} = req.params ;
        
        try{
        const pool = await new sql.ConnectionPool(sqlConfig).connect();
        const results = await pool
        .request()
        .query(`SELECT TOP ${top} SUM(NG_QTY) as SUM_NG,PART_NO  FROM [dbo].[TBL_NG_ADHESIVE]
                WHERE PLATE_DATE BETWEEN '${start}' AND '${end}'
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

    async SummaryActualAdhesive(req,res) {
        const {start,end } = req.params ;

        try{
        const pool = await new sql.ConnectionPool(sqlConfig).connect();
        const results = await pool
        .request()
        .query(`SELECT (SELECT SUM(QTY) FROM TBL_ADHESIVE_PLAN WHERE DATE_PLATE BETWEEN '${start}' AND '${end}') AS Qty_Plan,
					(SELECT SUM(QTY) FROM TBL_ACTUAL_ADHESIVE WHERE (DATE_PLATE BETWEEN '${start}' AND '${end}') AND [TRIAL] != 'Y') AS Qty_Prd,
					(SELECT SUM(QTY) FROM TBL_ADHESIVE_PLAN WHERE DATE_PLATE BETWEEN '${start}' AND '${end}') - (SELECT SUM(QTY) FROM TBL_ACTUAL_ADHESIVE WHERE DATE_PLATE BETWEEN '${start}' AND '${end}')  as  DiffQty,
					(SELECT SUM(NG_QTY) FROM TBL_NG_ADHESIVE WHERE (PLATE_DATE BETWEEN '${start}' AND '${end}') AND [TRIAL] != 'Y') AS Ng_Qty`) ;
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
}
module.exports = SummaryController