import { Router } from "express";
import {CreateAccount, CreateUser, addSubData, deletBalaceSheet, deleteAccountDetail, getAccountDetailsById, getBalanceSheet, getBankDetails, getParents, getSelectedAccountData, getdetails, login, updateAccount} from "../controller/balanceSheet";
import { jwtAuth, VerifyJwt } from "../middelware/auth";

// import { signinMiddleware } from "../middlewares/signin";

const router = Router();

router.post("/addSubData", addSubData)
router.post("/CreateAccount",CreateAccount)
router.get("/getDetails", getdetails)
router.get("/balanceSheet",getBalanceSheet)
router.get("/getParents", getParents)
router.post("/createUser",CreateUser)
router.post("/login",login)
router.get("/getSelectedData",getSelectedAccountData)
router.delete("/deleteAccount",deleteAccountDetail)
router.put("/updateAccountDetails",updateAccount)
router.get("/getAccountDetailById/:id",getAccountDetailsById)
router.get("/getbankDetails",getBankDetails)
router.post("/deletBalanceSheet",deletBalaceSheet)

export default router;
