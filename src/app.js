import express from "express";
import cors from "cors";
import schema from "./validations.js";

const participants = [];
const messages = [];

const app = express();
app.use(cors());
app.use(express.json());

app.post("/participants", (req, res) => {
  const { username } = req.body;
  const validation = schema.validate({ username });

  res.send(validation);
});

app.listen(5000, () => {
  console.log("Server running on 5000...");
});
