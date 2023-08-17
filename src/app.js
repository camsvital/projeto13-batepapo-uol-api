import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from dotenv;

const app = express();

app.use(cors());
app.use(express.json());

app.listen( PORT, () => console.log(`Sever running at port ${PORT}`))

const mongoClient = new MongoClient(process.env.DATABASE_URL);
mongoClient.connect()
 .then(() => db = mongoClient.db())
 .catch((err) => console.log(err.message));


app.post("/participants", (req, res) => {
    const { name } = req.body;
  
    if (name === "xxx") {
      users.push({ name: name });
      res.status(201).send("OK");
      return;
    }
    res.status(400).send("Todos os campos são obrigatórios!");
  });