import Joi from "joi";

const schema = Joi.object({
  username: Joi.string().alphanum().required(),
});

export default schema;
