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

//<----- Instance ----->
const stock = new StockController();
const wip = new WipController();
const plan = new PlanController();
const auth = new AuthController();
const adhesive = new AdhesiveController();
const prodution = new ProductionController() ;

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
app.get("/stock/lot/aboutexpire", stock.GetLotAboutToExpire);

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

 
//<------- Auth --------->
app.post("/login/domain",auth.DomainLogin);
app.get("/auth/token/approve/metal/:reqNo",auth.AuthApproveReqMetal);

app.listen(PORT, () => {
  console.log(`Server is running on port : ${PORT}`);
});
