import multer from  "multer"


export const multerupload=multer({
     limits:{
        fieldSize:1024*1024*10
     }
})

export const multersingle=multerupload.single("avatar")
export const multerattacment=multerupload.array("files",5)