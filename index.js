require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const multer = require("multer"); 

//<----- Storage ------>
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "upload");
  },
  filename: function (_, file, cb) {
    const fileName = `${Date.now()}-${file.originalname}`;
    cb(null, fileName);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5, // 5 Mb
  },

  fileFilter: (_, file, cb) => {
    // pdf excel word powerpoint
    if (
      file.mimetype == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || //xlsx
      file.mimetype == "application/vnd.ms-excel" //xls
    ) {
      //allowed
      cb(null, true);
    } else {
      cb(new Error("File not allow!"), false);
    }
  },
});

const uploadPlan = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5, // 5 Mb
  },

  fileFilter: (_, file, cb) => {
    // pdf excel word powerpoint
    if (
      file.mimetype == "application/vnd.ms-excel" //xls 
    || file.mimetype == "application/pdf" // Pdf
    ) {
      //allowed
      cb(null, true);
    } else {
      cb(new Error("File not allow!"), false);
    }
  },
});



// <------ Controller -------->
const StockController = require("./controller/StockController");
const WipController = require("./controller/WipController");
const PlanController = require("./controller/PlanController");
const AuthController = require("./controller/AuthController");
const AdhesiveController = require("./controller/AdhesiveController");
const ProductionController = require("./controller/ProductionController");
const LotController = require("./controller/LotController");
const MachineController = require("./controller/MachineController");
const PartController = require("./controller/PartController");
const ReceiveController = require("./controller/ReceiveController");
const RollerController = require("./controller/RollerController");
const SummaryController = require("./controller/SummaryController");
const BomController = require("./controller/BomController");

//<----- Instance ----->
const stock = new StockController();
const wip = new WipController();
const plan = new PlanController();
const auth = new AuthController();
const adhesive = new AdhesiveController();
const prodution = new ProductionController() ;
const lotControl = new LotController() ;
const mc = new MachineController() ;
const part = new PartController() ;
const receive = new ReceiveController() ;
const roller = new RollerController() ;
const summary = new SummaryController() ;
const bom = new BomController() ;

const PORT = process.env.PORT;

// <------  Middleware  ------->
app.use(cors());
app.use(bodyParser.json({ limit: "200mb" }));
app.use(bodyParser.urlencoded({ limit: "200mb", extended: true }));
app.use("/public", express.static("public"));
app.use("/private", express.static("private"));

// <------- Stock ----------->
app.get("/stock/all", stock.GetAllStock);
app.get("/stock/bypart", stock.GetAllStockByPart);
app.get("/stock/byFactory/:factory", stock.GetStockByFactory);
app.get("/stock/lot/aboutexpire/:day", stock.GetLotAboutToExpire);

//<------- WIP --------->
app.get("/wip/all", wip.GetAllProdWip);
app.get("/wip/summary/:factory/:by", wip.WipSummary);

//<------ Adhesive Plan -------->
app.get("/plan/adhesive", plan.GetAllAdhesivePlan);
app.get("/plan/adhesive/:start/:end", plan.GetAdhesivePlanByDuration);
app.post("/plan/adhesive",upload.single("file"), plan.SaveAdhesivePlan);


//<------ Adhesive Controller -------> 
app.get("/adhesive/actual",adhesive.GetAdhesiveActual);
app.get("/adhesive/actual/:start/:end",adhesive.GetAdhesiveActualByDate);
app.post("/adhesive/actual/save",adhesive.SaveActual);
app.put("/adhesive/actual/update/:id",adhesive.UpdateActual);
app.post("/adhesive/request/metal",adhesive.RequestMetal);
app.get("/adhesive/request/metal/:reqNo",adhesive.GetMetalRequestByReqNo);
app.get("/request/metal/:factory",adhesive.GetMetalRequestByFactory);
app.get("/request/metal/detail/:reqNo",adhesive.GetRequestDetailByReq);
app.put("/request/cancel/:reqNo",adhesive.CancelRequestMetal)
app.put("/request/metal/approve/:reqNo",adhesive.ApproveRequestMetal)
app.get("/adhesive/request/running",adhesive.GetRunningNumber)
app.get('/stock/adhesive/roller/:partNo',adhesive.GetRollerByPart);
app.get("/adhesive/check/boxNotFull/:partNo/:qty",adhesive.CheckBoxNotFull)
app.get("/adhesive/lot/forRequest",adhesive.SearchLotForRequest)
app.get("/adhesive/lot/forRequest/:partNo",adhesive.SearchLotForRequestByPart)
app.get("/adhesive/rollerDetail",adhesive.SearchRollerDetailByPart)

//<------ Production ------>
app.get("/production/transfer/:start/:end",prodution.GetProdTrnByDate);
app.get("/production/trans/detail/:tranNo/:factory",prodution.GetProdTrnDetailByTranNo);
app.get("/production/trans/summary/:tranNo/:factory",prodution.GetProdTrnSummaryByTranNo);
app.get("/production/closed/detail/:tranNo/:factory",prodution.GetProdClosedDetailByTranNo);
app.post("/production/save/plan",uploadPlan.fields([{name : "file",maxCount:1},{name : "pdfFile",maxCount:1}]),prodution.SaveProductionPlan);
app.get("/production/closed/:factory/:start/:end",prodution.GetProdClosedByFactory);
app.get("/production/plan/:factory/:start/:end",prodution.GetProdPlanFactory);
app.get("/production/avp/:start/:end/:factory",prodution.GetProdPlanByFactory);
app.get("/production/weekly/:start/:end/:factory",prodution.GetWeeklyPlan);
app.put("production/plan/update/:id",prodution.UpdatePlan);

 
// <--------- Lot Controller -------->
app.post("/lotcontrol/add",lotControl.SaveLot)
app.get("/lotcontrol/transection/:page/:limit",lotControl.GetLotControlTrans);
app.get("/lotcontrol/transection/find/part/:partNo",lotControl.GetLotControlTransByPart);
app.get("/lotcontrol/transection/date/:start/:end",lotControl.GetLotControlTransByDate);
app.get("/lotcontrol/find/:lotNo",lotControl.GetDetailByLotNo);
app.get("/lotcontrol/part/:lotNo",lotControl.GetPartDetailByLotNo);
app.get("/lotcontrol/trans/runningNo",lotControl.GetRunningNo);
app.get("/lotcontrol/lot/runningNo/:lotStr",lotControl.GetRunningLotNo);
app.get('/lotcontrol/tags/trans/:start/:end',lotControl.GetTagLotControlByDate)
app.get("/lotcontrol/notexpire",lotControl.GetAllLotControlNotExpire)
app.get("/lotcontrol/noExpire/waitReceive",lotControl.GetAllLotControlWaitReceive)
app.get("/lotcontrol/tags/:lotNo",lotControl.GetTagLotControlByLot)
app.get("/tag/detail/:lotNo",lotControl.SearchTagByLot)
app.put("/lotcontrol/cancel/:lotNo",lotControl.CancelLot)


//<------ Machine Controller --------->
app.get("/machine",mc.GetMachine)
app.get("/machine/:name",mc.GetMachineNoByName)

// <------ Part Controller -------->
app.get("/parts",part.GetPartMaster);
app.get("/partsFG",part.GetFGPartMaster);
app.get("/part/:partNo",part.GetPartByPartNo);
app.post("/download/fg/part",part.DownloadFGPartFromIM);

//<-------- Receive Controller ---------->
app.get("/runningNo/receive",receive.GetRunningNumber)
app.get("/receive/:start/:end",receive.GetReceiveByTransDate);
app.get("/receive/tran/part/:partNo",receive.GetReceiveByPart);
app.get("/receive/tran/detail/:tranNo",receive.GetReceiveDetailByTranNo);
app.post("/receive",receive.ReceiveMetal)

// <------- Roller Controller -------->
app.get("/roller",roller.GetAllRoller);


//<-------- Sammary Report ------->
app.get("/production/report/:factory/:start/:end",summary.GetProdcutionTrans);
app.get("/summary/report/:factory/:start/:end",summary.GetActualReportByFactory);
app.get("/summary/actual/:factory/:start/:end",summary.SummaryActualPlanByFactory);
app.get("/count/plan/:factory/:start/:end",summary.CountPlanByDate);
app.get("/count/actual/:factory/:start/:end",summary.CountProductionActualByDate);
app.get("/count/diff/:factory/:start/:end",summary.CountProductionPlanDiffByDate);
app.get("/count/ng/:factory/:start/:end",summary.CountProductionPlanNgByDate);
app.get("/metal/used/:factory/:start/:end",summary.SummaryRMUsed);

//<------ BomController ------>
app.get("/bom",bom.GetAllBom);
app.get("/bom/partMaster",bom.GetPartBomMaster);

//<------- Auth --------->
app.post("/login/domain",auth.DomainLogin);
app.get("/auth/token/approve/metal/:reqNo",auth.AuthApproveReqMetal);

app.listen(PORT, () => {
  console.log(`Server is running on port : ${PORT}`);
});
