import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js"; // <-- Import DB connection
import loginRoute from "./routes/loginRoutes.js"; // <-- Add routes
import employeeRoute from "./routes/employeeRoutes.js"; // <-- Add employee routes

dotenv.config();
connectDB(); // <-- Call DB connection

const app = express();
app.use(cors());
app.use(express.json());

// Test API Endpoint
app.get("/", (req, res) => {
    res.send("Backend running successfully!");
});

// Routes
app.use("/api/Login", loginRoute);
app.use("/api/Employee", employeeRoute);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
