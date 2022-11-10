import express from "express";
import cors from "cors";
import dayjs from "dayjs";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import schema from "../utils/validations.js";

dotenv.config();

const participants = [];
const messages = [];

let db;

const mongoClient = new MongoClient(process.env.MONGO_URI);

mongoClient
  .connect()
  .then(() => {
    db = mongoClient.db("batepapo");
  })
  .catch((err) => console.log(err));

const app = express();
app.use(cors());
app.use(express.json());

app.post("/participants", async (req, res) => {
  const { username } = req.body;
  const validation = schema.validate({ username });

  if (validation.error) {
    res.sendStatus(422);
    return;
  }
  try {
    const userExists = await db.collection("participants").findOne({ name: username });

    if (userExists) {
      res.sendStatus(409);
      return;
    }

    const time = dayjs().format("HH:mm:ss");

    await db.collection("participants").insert({ name: username, lastStatus: Date.now() });
    await db.collection("messages").insert({ from: username, to: "Todos", text: "entra na sala...", type: "status", time });

    res.sendStatus(201);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.get("/participants", async (req, res) => {
  try {
    const participants = await db.collection("participants").find().toArray();
    res.send(participants);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.get("/messages", async (req, res) => {
  const limit = req.query.limit;
  const user = req.headers.user;

  try {
    const messages = await db.collection("messages").find().toArray();
    const messagesUser = messages.filter((message) => message.type === "status" || message.to === "Todos" || message.from === user || message.to === user);

    if (limit) {
      res.send(messagesUser.slice(messages.length - limit, messages.length));
      return;
    }
    res.send(messagesUser);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.post("/messages", async (req, res) => {
  const { to, text, type } = req.body;
  const name = req.headers.user;

  const validation = schema.validate({ to, text, type });

  if (validation.error) {
    res.sendStatus(422);
    return;
  }

  try {
    const participant = await db.collection("participants").findOne({ name });

    if (!participant) {
      res.sendStatus(422);
      return;
    }

    const time = dayjs().format("HH:mm:ss");
    await db.collection("messages").insertOne({ from: name, to, text, type, time });

    res.sendStatus(201);
  } catch (err) {
    res.status(500).send(err);
  }
});

app.post("/status", (req, res) => {
  const name = req.headers.user;

  db.collection("participants")
    .findOne({ name })
    .then((user) => {
      if (!user) {
        res.sendStatus(404);
        return;
      }

      db.collection("participants")
        .updateOne({ name: user.name }, { $set: { lastStatus: Date.now() } })
        .then(() => {
          res.sendStatus(200);
        });
    })
    .catch((err) => {
      console.log(err);
      res.sendStatus(500);
    });
});

setInterval(() => {
  db.collection("participants")
    .find()
    .toArray()
    .then((participants) => {
      participants.forEach((p) => {
        const lastCheck = Math.ceil(Date.now() - 10000);
        const name = p.name;

        if (p.lastStatus < lastCheck) {
          db.collection("participants")
            .deleteOne({ name })
            .then(() => {
              const time = dayjs().format("HH:mm:ss");

              db.collection("messages").insertOne({ from: name, to: "Todos", text: "sai da sala...", type: "status", time: time });
            });
        }
      });
    });
}, 15000);

app.listen(5000, () => {
  console.log("Server running on 5000...");
});
