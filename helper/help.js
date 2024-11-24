import { onlineusers } from "../index.js";

export const getSockets = (users = []) => {
    const sockets = users.map((user) => onlineusers.get(user.toString()));
  
    return sockets;
  };

export  const  emitEvent=(req,event,users,data)=>{
    const membersockets=getSockets(users)
    const  io=req.app.get("io")
     io.to(membersockets).emit(event,data)
 
 }