import app from "./app.js";
import { connectDatabase } from "./config/db.js";
import env from "./config/env.js";

async function startServer() {
  try {
    await connectDatabase(env.mongoUri);
    app.listen(env.port, () => {
      console.log(`Backend listening on port ${env.port}`);
    });
  } catch (error) {
    console.error("Failed to start backend:", error);
    process.exit(1);
  }
}

startServer();
