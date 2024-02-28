import { Router } from "express";
import {CreateAccount, CreateUser, addParent, addSeiveMaster, addShape, addStoneColor, addStoneMaster, addStoneQualityfile, addSubData, deletBalaceSheet, deleteAccountDetail, deleteBankObject, deleteSeiveMaster, deleteStoneColor, deleteStoneMaster, deleteStoneQualityFile, deleteStoneShape, getAccountDetailsById, getAllBss, getBalanceSheet, getBankDetails, getParents, getSeiveMasterdetails, getSelectedAccountData, getStoneColor, getStoneMaster, getStoneQualityFile, getStoneShape, getdetails, login, updateAccount, updateSeiveMaster, updateStoneColor, updateStoneMaster, updateStoneQualityFile, updateStoneShape} from "../controller/balanceSheet";
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
router.post("/addParent",addParent)
router.post("/addStoneQuality",addStoneQualityfile)
router.get("/getStoneQuality",getStoneQualityFile)
router.post("/addStoneMaster",addStoneMaster)
router.get("/getStoneMaster",getStoneMaster)


router.delete("/deleteSeiveMaster",deleteSeiveMaster)
router.delete("/deleteStoneShape",deleteStoneShape)
router.delete("/deleteStoneColor",deleteStoneColor)
router.delete("/deleteStoneQualityFile",deleteStoneQualityFile)
router.delete("/deleteStoneMaster",deleteStoneMaster)


router.put("/updateSeiveMaster",updateSeiveMaster)
router.put("/updateStoneShape",updateStoneShape)
router.put("/updateStoneColor",updateStoneColor)
router.put("/updateStoneQualityFile",updateStoneQualityFile)
router.put("/updateStoneMaster",updateStoneMaster)

export default router;
