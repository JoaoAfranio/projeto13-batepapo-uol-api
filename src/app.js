import express from "express";
import cors from "cors";
import dayjs from "dayjs";
import dotenv from "dotenv"
import { MongoClient } from "mongodb";
import schema from "../utils/validations.js";

dotenv.config()

const participants = [];
const messages = [];

let db;

const mongoClient = new MongoClient(process.env.MONGO_URI)

mongoClient.connect().then(() => {
    db = mongoClient.db("teste")
}).catch(err => console.log(err))

const app = express();
app.use(cors());
app.use(express.json());


app.post("/participants", (req, res) => {
  const { username } = req.body;
  const validation = schema.validate({ username });

  if (validation.error) {
    res.sendStatus(422);
    return;
  }

  db.collection("participants").find().toArray().then((participants) => {
    const hasUser = participants.find((user) => user.name === username);

    if (hasUser) {
      res.sendStatus(409);
      return;
    }
  
    const time = dayjs().format("HH:mm:ss");

    db.collection("participants").insert({ name: username, lastStatus: Date.now() }).then(() => {
        db.collection("messages").insert({ from: username, to: "Todos", text: "entra na sala...", type: "status", time }).then(() => {
          res.sendStatus(201);
        })
    })
    
  }).catch(err => {
    console.log(err)
    res.sendStatus(500)
  })
});

app.get("/participants", (req, res) => {
  db.collection("participants").find().toArray().then((participants) => {
    res.send(participants);
  }).catch(err => console.log(err))
});

app.get("/messages", (req, res) => {
  const limit = req.query.limit;
  const user = req.headers.user;

  db.collection("messages").find().toArray().then((messages) => {
    const messagesUser = messages.filter((message) => message.type === "status" || message.to === "Todos" || message.from === user || message.to === user);

    if (limit) {
      res.send(messagesUser.slice(messages.length - limit, messages.length));
      return;
    }
    res.send(messagesUser);
  }).catch(err => {
    console.log(err)
    res.sendStatus(500)
  })
});

app.post("/messages", (req, res) => {
  const { to, text, type } = req.body;
  const name = req.headers.user;

  const validation = schema.validate({ to, text, type });

  if (validation.error) {
    res.sendStatus(422);
    return;
  }

  db.collection("participants").findOne({name}).then(participant => {

    if (!participant) {
      res.sendStatus(422);
      return;
    }
  
    const time = dayjs().format("HH:mm:ss");

    db.collection("messages").insertOne({ from: name, to, text, type, time }).then(() => {
      res.sendStatus(201);
    })
  }).catch((err) => {
    console.log(err)
    res.sendStatus(500)
  })

});

app.post("/status", (req, res) => {
  const name = req.headers.user;


  db.collection("participants").findOne({name}).then(user => {
    if (!user) {
      res.sendStatus(404);
      return;
    }

    db.collection("participants").updateOne({name : user.name}, { $set: {lastStatus : Date.now()}}).then(() => {
      res.sendStatus(200);
    })

  }).catch(err => {
    console.log(err)
    res.sendStatus(500)
  })

});


setInterval(() => {
  db.collection("participants").find().toArray().then(participants => {
    participants.forEach(p => {
      const lastCheck = Math.ceil(Date.now() - 10000)
      const name = p.name

      if(p.lastStatus < lastCheck) {
        db.collection("participants").deleteOne({name}).then(() => {
          const time = dayjs().format("HH:mm:ss");

          db.collection("messages").insertOne({from: name, to: 'Todos', text: 'sai da sala...', type: 'status', time: time})
        })
      }
    })
  })
}, 15000)

app.listen(5000, () => {
  console.log("Server running on 5000...");
});
