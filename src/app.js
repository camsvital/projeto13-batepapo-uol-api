import express from "express";
import cors from "cors";
import dayjs from "dayjs";
import { MongoClient, ObjectId } from "mongodb";
import Joi from "joi";
import dotenv from "dotenv";

const app = express();

dotenv.config();
app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient(process.env.DATABASE_URL);
try {
  await mongoClient.connect();
  console.log("Conectado");
} catch (err) {
  console.log(err);
}
const db = mongoClient.db();

const time = dayjs().format("HH:mm:ss");

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

    if (verifyName) return res.status(409).send("Essa pessoa já existe!");

    await db.collection("participants").insertOne({
      name,
      lastStatus: Date.now(),
    });

    await db.collection("messages").insertOne({
      from: name,
      to: "Todos",
      text: "entra na sala...",
      type: "status",
      time: time,
    });

    res.sendStatus(201);
  } catch (err) {
    return res.status(500).send(err);
  }
});

app.get("/participants", async (req, res) => {

  try {
    const getParticipants = await db
      .collection("participants")
      .find()
      .toArray();

    return res.status(200).send({ getParticipants });
  } catch (err) {
    return res.status(500).send(err.message);
  }
});

app.post("/messages", async (req, res) => {
  const { to, text, type } = req.body
  const { user } = req.headers
  
  const participant = await db
    .collection("participants")
    .findOne({ name: user });
  if (!participant)
    return res.status(422).send("Esse usuário não existe ou foi desconectado!");

  const messageJoi = Joi.object({
    to: Joi.string().required(),
    text: Joi.string().required(),
    type: Joi.string().valid("message", "private_message").required(),
  });

  const validation = messageJoi.validate(req.body, { abortEarly: false });

  if (validation.error) {
    const errors = validation.error.details.map((detail) => detail.message);
    return res.status(422).send(errors);
  }

  const message = {
    from: user,
    ...req.body,
    time: time
  };

  try {
    await db.collection("messages").insertOne(message);
    res.sendStatus(201);
  } catch (err) {
    res.sendStatus(422);
  }
});

app.get("/messages", async (req, res) => {
  const { limit } = req.query;
  const { user } = req.headers;

  try {
    const showMessages = await db
      .collection("messages")
      .find({ $or: [{ from: user }, { to: { $in: ["Todos", user] } }] })
      .toArray();

    if (limit) {
      const limitedJoi = Joi.number().min(1);
      const { error } = limitedJoi.validate(limit);
      if (error) {
        return res.status(422).send(error.message);
      }
      return res.send(showMessages.slice(-limit));
    }

    res.send(showMessages);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.post("/status", async (req, res) => {
  const { user } = req.headers;

  if (!user) return res.sendStatus(404);

  const participant = await db
    .collection("participants")
    .findOne({ name: user });
  if (!participant) return res.sendStatus(404);

  try {
    await db
      .collection("participants")
      .updateOne({ name: user }, { $set: { lastStatus: Date.now() } });
    res.sendStatus(200);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

setInterval(deleteAfk, 15000);

async function deleteAfk() {
  const users = await db.collection("participants").find().toArray();

  users.forEach(async (user) => {
    if (Date.now() - user.lastStatus > 10000) {
      await db.collection("participants").deleteOne({ _id: new ObjectId(user._id) });
      await db.collection("messages").insertOne({
        from: user.name,
        to: "Todos",
        text: "sai da sala...",
        type: "status",
        time: time
      });
    }
  });
}

const PORT = 5000
app.listen(PORT, () => console.log(`Sever running at port ${PORT}!`));
