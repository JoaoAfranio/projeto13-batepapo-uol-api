import Joi from "joi";

const user = Joi.object({
  username: Joi.string().alphanum().required(),
});

const message = Joi.object({
  to: Joi.string().alphanum().required(),
  text: Joi.string().required(),
  type: Joi.string().valid("message", "private_message").required(),
});

export { user, message };
