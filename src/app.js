import express from "express";
import cors from "cors";
import dayjs from "dayjs";

import db from "../utils/database.js";
import { user, message } from "../utils/validations.js";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/participants", async (req, res) => {
  const { name } = req.body;
  const validation = user.validate({ username: name });

  if (validation.error) {
    res.sendStatus(422);
    return;
  }
  try {
    const userExists = await db.collection("participants").findOne({ name });

    if (userExists) {
      res.sendStatus(409);
      return;
    }

    const time = dayjs().format("HH:mm:ss");

    await db.collection("participants").insertOne({ name, lastStatus: Date.now() });
    await db.collection("messages").insertOne({ from: name, to: "Todos", text: "entra na sala...", type: "status", time });

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

  const validation = message.validate({ to, text, type });

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

app.post("/status", async (req, res) => {
  const name = req.headers.user;

  try {
    const user = await db.collection("participants").findOne({ name });

    if (!user) {
      res.sendStatus(404);
      return;
    }

    await db.collection("participants").updateOne({ name: user.name }, { $set: { lastStatus: Date.now() } });
    res.sendStatus(200);
  } catch (err) {
    res.status(500).send(err);
  }
});

setInterval(async () => {
  const participants = await db.collection("participants").find().toArray();

  for (const p of participants) {
    const lastCheck = Math.ceil(Date.now() - 10000);
    const name = p.name;

    if (p.lastStatus < lastCheck) {
      await db.collection("participants").deleteOne({ name });

      const time = dayjs().format("HH:mm:ss");
      await db.collection("messages").insertOne({ from: name, to: "Todos", text: "sai da sala...", type: "status", time: time });
    }
  }
}, 15000);

app.listen(5000, () => {
  console.log("Server running on 5000...");
});
