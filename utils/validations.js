import Joi from "joi";

const schema = Joi.object({
  username: Joi.string().alphanum(),

  to: Joi.string().alphanum(),
  text: Joi.string(),
  type: Joi.string().valid("message", "private_message"),
})
  .with("to", "text")
  .with("text", "type");

export default schema;
