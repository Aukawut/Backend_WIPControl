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
const PackController = require("./controller/PackController");
const CustomerController = require("./controller/CustomerController");
const UsersController = require("./controller/UsersController");
const FactoryController = require("./controller/FactoryController");
const RoleController = require("./controller/RoleController");
const GlueController = require("./controller/GlueController");

// <----- Middleware ------>
const jwtMiddle = require("./middleware/jwtMiddleWare");

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
const pack = new PackController();
const customer = new CustomerController();
const users = new UsersController();
const factory = new FactoryController();
const role = new RoleController();
const glue = new GlueController();

const jsonToken = new jwtMiddle();


const PORT = process.env.PORT;

// <------  Middleware  ------->
app.use(cors());
app.use(bodyParser.json({ limit: "200mb" }));
app.use(bodyParser.urlencoded({ limit: "200mb", extended: true }));
app.use("/public", express.static("public"));
app.use("/private", express.static("private"));


// <----- Glue Controller ------>
app.get("/glue",glue.GetAllGlue)

//<----- User------->
app.get("/users",users.GetUsers);
app.post("/users",jsonToken.adminAuthenticateJWT,users.AddUsers);
app.put("/users/:empCode",jsonToken.adminAuthenticateJWT,users.UpdateUsers);
app.delete("/users/:empCode",jsonToken.adminAuthenticateJWT,users.DeleteUser);

//<------- Factory -------->
app.get("/factory",factory.GetFactory);


//<-------- Role --------->
app.get("/role",role.GetAllRole)


// <------- Stock ----------->
app.get("/stock/all", stock.GetAllStock);
app.get("/stock/bypart", stock.GetAllStockByPart);
app.get("/stock/byFactory/:factory", stock.GetStockByFactory);
app.get("/stock/lot/aboutexpire/:day", stock.GetLotAboutToExpire);

//<------- WIP --------->
app.get("/wip/all", wip.GetAllProdWip);
app.get("/wip/summary/:factory/:by", wip.WipSummary);

//<------ Plan -------->
app.get("/plan/adhesive", plan.GetAllAdhesivePlan);
app.get("/plan/adhesive/plateDate/:date", plan.GetAdhesivePlanByPlateDate);
app.get("/plan/adhesive/:start/:end", plan.GetAdhesivePlanByDuration);
app.post("/plan/adhesive",upload.single("file"), plan.SaveAdhesivePlan);
app.get("/plan/rawmaterial/:factory/:start/:end",plan.GetPlanByRawMaterial)
app.get("/plan/metalRequest/:factory/:start/:end/:reqOnly",plan.GetMetalRequestComparePlan)


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
app.get("/adhesive/request/running",adhesive.GetRunningNumber)
app.get("/adhesive/supply/running",adhesive.GetSupplyRunningNumber)
app.get('/stock/adhesive/roller/:partNo',adhesive.GetRollerByPart);
app.get("/adhesive/check/boxNotFull/:partNo/:qty",adhesive.CheckBoxNotFull)
app.get("/adhesive/lot/forRequest",adhesive.SearchLotForRequest)
app.get("/adhesive/lot/forRequest/:partNo",adhesive.SearchLotForRequestByPart)
app.get("/adhesive/rollerDetail",adhesive.SearchRollerDetailByPart)
app.post("/adhesive/notgood/save",adhesive.SaveNotGoodAdhesive)
app.get("/adhesive/notgood/:start/:end",adhesive.GetNotGoodAdhesiveByDate)
app.put("/adhesive/notgood/update/:id",adhesive.UpdateNotGoodAdhesive)
app.delete("/adhesive/notgood/:id",adhesive.DeleteNotGoodById)
app.put("/adhesive/stock/setup",adhesive.SetUpdateStockMetal)
app.get("/metal/request/:start/:end/:notFinished",adhesive.GetAllRequestMetal)
app.get("/metal/req/:factory/:start/:end/:notFinished",adhesive.GetAllRequestMetalByFactory)
app.get("/request/metal/trans/:transecNo",adhesive.GetAllRequestMetalByTrans)
app.put("/request/metal/cancel/:transecNo",adhesive.CancelRequestMetalByTrans);
app.get("/tags/adhesive/:partNo",adhesive.GetStockTagNoByPart);
app.get("/adhesive/lotdetail/:partNo",adhesive.GetLotDetailByPartNo);
app.get("/roller/search/:lotNo",adhesive.SearchRollerByLot);
app.get("/request/outstand/:partNo",adhesive.GetRequestOutStand);
app.get("/roller/summary/qty/:partNo",adhesive.SumQtyInRollerByPartNo);
app.post("/save/request/supplymetal",adhesive.SaveRequestSupply);
app.get("/adhesive/supply/:start/:end",adhesive.GetMetalSupplyByDate);
app.get("/metal/request/waitingClose",adhesive.SeachRequestMetalWaitClose)
app.get("/metal/request/lot",adhesive.SeachRequestMetalAllLot)
app.get("/metal/lotDetail/:lotNo/:tranNo",adhesive.SearchLotDetailByTranNo)
app.get("/metal/supply/requestDetail/:tranNo",adhesive.SearchSupplyDetailByTranNo)
app.post("/supply/metal",adhesive.SupplyMetal);
app.get("/request/supply/status/:reqNo",adhesive.GetStatusApprove);
app.get("/requests/metal/:status",adhesive.GetAllRequestByStatus);
app.put("/approve/requestMetal/:tranNo",adhesive.ApproveMetalRequest);
app.get("/supply/detail/:tranNo",adhesive.GetSupplyDetailByTrans);
app.get("/request/detail/:tranNo",adhesive.GetMetalRequestDetail);
app.put("/cancel/supply/:tranNo",adhesive.CancelSupplyMetal);
app.get("/roller/checkPart/:partNo",adhesive.CheckRollerUsedByPart)
app.get("/reqMetal/detail/:tranNo",adhesive.SearchRequestDetailByTrans);
app.get("/request/detailTag/:tagNo",adhesive.GetTagDetailByTag)
app.get("/request/amountRequest/:partNo/:tranNo",adhesive.SearchAmountRequestByPart);
app.get("/request/summaryRequest/:partNo/:tranNo",adhesive.SearchSumQtyRequestByPart);
app.put("/mobile/confirm/supply/:tranNo",adhesive.SupplyMetalByReqNo);
app.get("/check/lot/fifo/:part/:dateExp",adhesive.CheckLotFiFO);
app.post("/save/handler/supply",adhesive.SaveSupplyByTagNo);
app.delete("/plan/adhesive/delete/:id",adhesive.DeleteAdhesivePlan);
app.post("/plan/adhesive/add",adhesive.AddAdhesivePlan);
app.put("/plan/adhesive/update/:id",adhesive.UpdateAdhesivePlan);




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
app.get("/production/metal/used/:factory/:start/:end",prodution.GetMetalLogUsed);
app.get("/production/metalpart/used/:factory/:start/:end/:avp2only",prodution.GetMetalLogUsedByFacPart);
app.put("/production/update/plan/:id",prodution.UpdatePlan);
app.post("/production/add/plan",prodution.AddPlan)
app.delete("/production/delete/plan/:id",prodution.DeletePlan)
app.get("/production/actual/:start/:end/:factory",prodution.GetFgActualByFactory)
app.post("/production/fg/save",prodution.SaveFg)
app.put("/production/fg/update/:id",prodution.UpdateFgPrd);
app.delete("/production/fg/delete/:id",prodution.DeleteFg);
app.post("/production/ng/upload",prodution.UploadNg)

 
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
app.get("/machineMaster",mc.GetMachineMaster)
app.get("/machine",mc.GetMachine)
app.get("/machine/:name",mc.GetMachineNoByName)

// <------ Part Controller -------->
app.get("/parts",part.GetPartMaster);
app.get("/partsFG",part.GetFGPartMaster);
app.get("/part/:partNo",part.GetPartByPartNo);
app.post("/download/fg/part",part.DownloadFGPartFromIM);
app.post("/parts/adhesive/add",part.AddPartAdhesive)
app.put("/parts/adhesive/update/:tranNo",part.UpdatePartAdhesive)
app.put("/parts/adhesive/cancel/:transecNo",part.CancelAdhesivePart)
app.get("/parts/adhesive",part.GetAdhesivePart)
app.get("/parts/runningNo",part.GetAdhesivePartRunningNo)

//<-------- Receive Controller ---------->
app.get("/runningNo/receive",receive.GetRunningNumber)
app.get("/receive/:start/:end",receive.GetReceiveByTransDate);
app.get("/receive/tran/part/:partNo",receive.GetReceiveByPart);
app.get("/receive/tran/detail/:tranNo",receive.GetReceiveDetailByTranNo);
app.post("/receive",receive.ReceiveMetal)

// <------- Roller Controller -------->
app.get("/roller",roller.GetAllRollerEmpty);
app.get("/rollers",roller.GetAllRoller);
app.get("/lastTran/roller",roller.GetLastTranNo);
app.get("/lastTran/roller/:rollerName",roller.GetLastRoller);
app.post("/roller",roller.InsertRoller);
app.put("/roller/:rollerId",jsonToken.LeaderAuthenticateJWT,roller.CancelRoller);
app.put("/roller/update/:rollerId",jsonToken.LeaderAuthenticateJWT,roller.UpdateRoller);

//<------- Pack Controller -------->
app.get("/pack",pack.GetPack);

// <------ Customer ------>
app.get("/customer",customer.GetCustommer)


//<-------- Summary Report ------->
app.get("/production/report/:factory/:start/:end",summary.GetProdcutionTrans);
app.get("/summary/report/:factory/:start/:end",summary.GetActualReportByFactory);
app.get("/adhesive/summary/report/:start/:end",summary.GetActualAdhesiveReportByDate);
app.get("/summary/actual/:factory/:start/:end",summary.SummaryActualPlanByFactory);
app.get("/adhesive/summary/actual/:start/:end",summary.SummaryActualAdhesivePlanByFactory);
app.get("/count/plan/:factory/:start/:end",summary.CountPlanByDate);
app.get("/adhesive/count/plan/:start/:end",summary.CountAdhesivePlanByDate);
app.get("/count/actual/:factory/:start/:end",summary.CountProductionActualByDate);
app.get("/adhesive/count/actual/:start/:end",summary.CountAdhesiveActualByDate);
app.get("/count/diff/:factory/:start/:end",summary.CountProductionPlanDiffByDate);
app.get("/adhesive/count/diff/:start/:end",summary.CountAdhesiveDiffByDate);
app.get("/count/ng/:factory/:start/:end",summary.CountProductionPlanNgByDate);
app.get("/adhesive/count/ng/:start/:end",summary.CountAdhesivePlanNgByDate);
app.get("/metal/used/:factory/:start/:end",summary.SummaryRMUsed);
app.get("/part/notgood/:factory/:start/:end/:top",summary.SummaryProductionNgPart);
app.get("/adhesive/part/notgood/:start/:end/:top",summary.SummaryAdhesiveNgPart);
app.get("/summary/adhesive/actual/:start/:end",summary.SummaryActualAdhesive);

//<------ BomController ------>
app.get("/bom",bom.GetAllBom);
app.get("/bom/partMaster",bom.GetPartBomMaster);
app.post("/bom",bom.AddBom)
app.delete("/bom/:fgPart",bom.DeleteBom)
app.put("/bom/:fgPartNo",bom.UpdateBom)

//<------- Auth --------->
app.post("/login/domain",auth.DomainLogin);
app.post("/login/employeeCode",auth.LoginByEmployeeCode);
app.get("/auth/token/approve/metal/:reqNo",auth.AuthApproveReqMetal);
app.get("/auth/token",auth.authenticateJWT);

app.listen(PORT, () => {
  console.log(`Server is running on port : ${PORT}`);
});
