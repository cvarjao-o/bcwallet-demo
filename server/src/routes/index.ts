import express ,{Response,Request,Router} from 'express'
const route=Router()
// Handling '/' Request
route.get("/",async (req:Request,res:Response):Promise<any>=>{
    res.send("TypeScript With Expresss");
});
export default route