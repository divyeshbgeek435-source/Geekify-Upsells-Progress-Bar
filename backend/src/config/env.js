import dotenv from "dotenv";

dotenv.config();

const env = {
  nodeEnv:"mongodb://127.0.0.1:27017/cart",
  port: Number(process.env.PORT || 5000),
  mongoUri: "mongodb://127.0.0.1:27017/cart",
};

if (!env.mongoUri) {
  throw new Error("Missing MONGODB_URI environment variable");
}

export default env;
