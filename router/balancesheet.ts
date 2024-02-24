import { Router } from "express";
import {CreateAccount, CreateUser, addSeiveMaster, addShape, addStoneColor, addSubData, deletBalaceSheet, deleteAccountDetail, deleteBankObject, getAccountDetailsById, getAllBss, getBalanceSheet, getBankDetails, getParents, getSeiveMasterdetails, getSelectedAccountData, getStoneColor, getStoneShape, getdetails, login, updateAccount} from "../controller/balanceSheet";
import { jwtAuth, VerifyJwt } from "../middelware/auth";

// import { signinMiddleware } from "../middlewares/signin";

const router = Router();

router.post("/addSubData", addSubData)
router.post("/CreateAccount",CreateAccount)
router.get("/getDetails", getdetails)
router.get("/balanceSheet",getBalanceSheet)
router.get("/getParents", getParents)
router.get("/getAllBssList",getAllBss)
router.post("/createUser",CreateUser)
router.post("/login",login)
router.get("/getSelectedData",getSelectedAccountData)
router.delete("/deleteAccount",deleteAccountDetail)
router.put("/updateAccountDetails",updateAccount)
router.get("/getAccountDetailById/:id",getAccountDetailsById)
router.get("/getbankDetails",getBankDetails)
router.post("/deletBalanceSheet",deletBalaceSheet)
router.post("/deleteBankObject",deleteBankObject)
router.post("/addSeiveMaster",addSeiveMaster)
router.get("/getSieveDetails",getSeiveMasterdetails)
router.post("/addStone",addShape)
router.get("/getStone",getStoneShape)
router.post("/addStoneColor",addStoneColor)
router.get("/getStoneColor",getStoneColor)


export default router;
