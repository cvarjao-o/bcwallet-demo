import express,{Application} from 'express'
const app:Application=express();
import route from './Routes/index'
import faber from './routes/issuer-faber'
const PORT:number=8000 || process.env.PORT;
import cors from 'cors'

//Middlewares
app.use(cors())
app.use(express.json())


//Router
app.use(route)
app.use(faber)
app.use(function(req, res){
    console.log(`request.url: ${req.url}`)
    console.log(`response.statusCode: 404`)
    res.send(404);
});

app.listen(PORT,():void=>{
    console.log("server is running successfully at",PORT);
})