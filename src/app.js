import express from "express";
import cors from "cors";

import schema from "./validations.js";
import dayjs from "dayjs";

const participants = [];
const messages = [];

const app = express();
app.use(cors());
app.use(express.json());

app.post("/participants", (req, res) => {
  const { username } = req.body;
  const validation = schema.validate({ username });
  const hasUser = participants.find((user) => user.name === username);

  if (validation.error) {
    res.status(422).send("Usuário não pode ser vazio");
    return;
  }

  if (hasUser) {
    res.status(409).send("Usuário já cadastrado");
    return;
  }

  const time = dayjs().format("HH:mm:ss");

  participants.push({ name: username, lastStatus: Date.now() });
  messages.push({ from: username, to: "Todos", text: "entra na sala...", type: "status", time });

  res.sendStatus(201);
});

app.get("/participants", (req, res) => {
  res.send(participants);
});

app.get("/messages", (req, res) => {
  res.send(messages);
});

app.post("/messages", (req, res) => {
  const { to, text, type } = req.body;
  const name = req.headers.user;

  const validation = schema.validate({ to, text, type });
  const hasUser = participants.find((user) => user.name === name);

  if (validation.error || !hasUser) {
    res.sendStatus(422);
    return;
  }

  const time = dayjs().format("HH:mm:ss");
  messages.push({ from: name, to, text, type, time });

  res.sendStatus(201);
});

app.listen(5000, () => {
  console.log("Server running on 5000...");
});
