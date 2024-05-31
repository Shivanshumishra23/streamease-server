
import mongoose from 'mongoose';
import { DB_NAME } from '../constants.js';


const connectDB = async ()=>{
   
    try{
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}?retryWrites=true&w=majority`);

        console.log(`\n MongoDB connected !! DB HOST : ${connectionInstance.connection.host}`)

    } catch(error) {
      console.log("MONGODB connection Failed: " ,error);
      process.exit(1);
    }
}

// connectDB()
// .then()
// .catch((err)=>{
//     console.log("MONGODB connection Failed: " ,err);
// })

export default connectDB