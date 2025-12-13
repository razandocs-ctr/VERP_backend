import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js"; // <-- Import DB connection
import loginRoute from "./routes/loginRoutes.js"; // <-- Add routes
import employeeRoute from "./routes/employeeRoutes.js"; // <-- Add employee routes
import documentAIRoute from "./routes/documentAIRoutes.js";
import userRoute from "./routes/userRoutes.js";

dotenv.config();
connectDB(); // <-- Call DB connection

const app = express();
app.use(cors({
    origin: '*',
}));
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// Test API Endpoint
app.get("/", (req, res) => {
    res.send("Backend running successfully!");
});

// Routes
app.use("/api/Login", loginRoute);
app.use("/api/Employee", employeeRoute);
app.use("/api/document-ai", documentAIRoute);
app.use("/api/User", userRoute);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
