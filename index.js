import express from "express";
import cors from "cors";
import compression from "compression";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js"; // <-- Import DB connection
import loginRoute from "./routes/loginRoutes.js"; // <-- Add routes
import employeeRoute from "./routes/employeeRoutes.js"; // <-- Add employee routes
import documentAIRoute from "./routes/documentAIRoutes.js";
import userRoute from "./routes/userRoutes.js";

dotenv.config();
connectDB(); // <-- Call DB connection

const app = express();

// Enable compression for all responses (reduces payload size by ~70-90%)
app.use(compression({
    level: 6, // Compression level (1-9, 6 is a good balance)
    threshold: 1024, // Only compress responses > 1KB
    filter: (req, res) => {
        // Don't compress if client doesn't support it
        if (req.headers['x-no-compression']) {
            return false;
        }
        // Use compression for JSON responses
        return compression.filter(req, res);
    }
}));

app.use(cors({
    origin: '*',
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Request timeout middleware - catch hanging requests
app.use((req, res, next) => {
    req.setTimeout(60000, () => {
        if (!res.headersSent) {
            res.status(504).json({ message: 'Request timeout' });
        }
    });
    next();
});

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
