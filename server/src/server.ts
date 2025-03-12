import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import courseRoutes from "./routes/courseRoutes";
import studentRoutes from "./routes/studentRoutes";
import scoreRoutes from "./routes/scoreRoutes";
import authRoutes from "./routes/authRoutes";
import facultyRoutes from "./routes/facultyRoutes";
import systemSettingRoutes from "./routes/systemSettingRoutes";
import { initializeSystemSettings } from "./controllers/systemSettingController";

// Load environment variables
dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use("/api/settings", systemSettingRoutes);

// Database connection
mongoose
  .connect(process.env.MONGODB_URI!)
  .then(async () => {
    // Make this callback async
    console.log("Connected to MongoDB");
    // Initialize system settings after connection is established
    await initializeSystemSettings();
    console.log("System settings initialized");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });

// Routes
app.use("/api/courses", courseRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/scores", scoreRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/faculty", facultyRoutes);

// Basic route
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Welcome to Marks Management System API" });
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
