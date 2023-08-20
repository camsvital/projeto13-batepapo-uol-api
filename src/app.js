import express from "express";
import cors from "cors";
import dayjs from "dayjs";
import { MongoClient } from "mongodb";
import joi from "joi";
import dotenv from "dotenv";
import { get } from "http";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const participantsJoi = joi.object({
  name: joi.string().min(1).required(),
});

const time = dayjs().format("HH/mm/ss");

const mongoClient = new MongoClient(process.env.DATABASE_URL);

try {
  await mongoClient.connect();
  console.log("Conectado");
} catch (err) {
  console.log(err);
}

const db = mongoClient.db("batepapouol");
const participantsCollection = db.collection("participants");
const messagesCollection = db.collection("messages");

app.post("/participants", async (req, res) => {
  const { name } = req.body;

  const validation = participantsJoi.validate(name, { abortEarly: false });

  if (validation.error) {
    const erros = validation.error.details.map((detail) => detail.message);
    return res.status(422).send(erros);
  }

  try {
    const verifyName = await participantsCollection.findOne({
      name: name,
    });

    if (verifyName) {
      return res.status(409).send({});
    }

    await participantsCollection.insertOne({
      name: name,
      lastStatus: time,
    });

    await messagesCollection.insertOne({
      from: name,
      to: "Todos",
      text: "entra na sala...",
      time,
    });

    res.status(201).send({});
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
});

app.get("/participants", async (req, res) => {
  try {
    const getParticipants = await messagesCollection.find().toArray();

    if (!getParticipants) {
      return [];
    }

    return res.status(201).send({ getParticipants });
  } catch (err) {
    console.err(err);
    return res.status(500).send(err.message);
  }
});

app.post("/messages", (req, res) => {
  const { name } = req.body;


});

app.get("/messages", (req, res) => {
  const { name } = req.body;

  // res.send()

  res.status(400).send("All fields are required!");
});

app.listen(5000, () => console.log(`Sever running at port 5000!`));
