import express from 'express'
import { login, register } from '../controllers/user.js'
import { sendtoken } from '../utils/features.js'
import authenticateJWT from '../middleware/auth.js'
import { multerattacment, multersingle } from '../middleware/multer.js'
import { addmember, creategrpchat, editgroupsdetails, getallcall, getchatinfo, getmessages, getmychats, getmygroupsbyme, leavegroup, modifyadmins, removemember, sendattachment } from '../controllers/chat.js'
const app = express.Router()

app.use(authenticateJWT)

app.post('/newgroup', multersingle, creategrpchat)
app.get('/getmychats', getmychats)
app.get('/getmygroups', getmygroupsbyme)
app.put("/editgroupdetails", multersingle, editgroupsdetails)
app.put("/addmembers", addmember)
app.delete("/removemember", removemember)
app.put("/changeadmins", modifyadmins)
app.delete("/leave/:id", leavegroup)
app.post('/sendattachment', multerattacment, sendattachment);
app.post('/messages/:id', getmessages)
app.get('/chatdetails/:id', getchatinfo)
app.get("/getallcall",getallcall)


export default app