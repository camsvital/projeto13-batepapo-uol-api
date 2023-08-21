import express from "express";
import cors from "cors";
import dayjs from "dayjs";
import { MongoClient } from "mongodb";
import Joi from "joi";
import dotenv from "dotenv";

const app = express();
dotenv.config();
app.use(cors());
app.use(express.json());
const time = dayjs().format("HH:mm:ss");

const postMessage = Joi.object({
  to: Joi.string().min(1).required(),
  text: Joi.string().min(1).required(),
  type: Joi.string().valid("message", "private_message").required(),
});

const mongoClient = new MongoClient(process.env.DATABASE_URL);

try {
  await mongoClient.connect();
  console.log("Conectado");
} catch (err) {
  console.log(err);
}

const db = mongoClient.db();

app.post("/participants", async (req, res) => {
  const { name } = req.body;

  const participantsJoi = Joi.object({
    name: Joi.string().min(1).required(),
  });

  const validation = participantsJoi.validate(req.body, { abortEarly: false });

  if (validation.error) {
    const erros = validation.error.details.map((detail) => detail.message);
    return res.status(422).send(erros);
  }

  try {
    const verifyName = await db
      .collection("participants")
      .findOne({ name: name });

    if (verifyName) return res.status(409).send({});

    await db.collection("participants").insertOne({
      name,
      lastStatus: Date.now(),
    });

    await db.collection("messages").insertOne({
      from: name,
      to: "Todos",
      text: "entra na sala...",
      time,
    });

    res.sendStatus(201);
  } catch (err) {
    console.log(err);
    return res.status(500).send(err);
  }
});

app.get("/participants", async (req, res) => {
  try {
    const getParticipants = await db.collection("participants").find().toArray();

    if (!getParticipants) {
      return [];
    }

    return res.status(201).send({ getParticipants });
  } catch (err) {
    console.err(err);
    et;
    return res.status(500).send(err.message);
  }
});

app.listen(5000, () => console.log(`Sever running at port 5000!`));
