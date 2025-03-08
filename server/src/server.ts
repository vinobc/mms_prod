import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import courseRoutes from "./routes/courseRoutes";
import studentRoutes from "./routes/studentRoutes";
import scoreRoutes from "./routes/scoreRoutes";
import authRoutes from "./routes/authRoutes";
import facultyRoutes from "./routes/facultyRoutes";

// Load environment variables
dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware
//app.use(cors());
// Update CORS configuration
app.use(cors({
  origin: '*', // For testing; in production you might want to limit this
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose
  .connect(process.env.MONGODB_URI!)
  .then(() => {
    console.log("Connected to MongoDB");
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
