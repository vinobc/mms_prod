import express, { Request, Response, Router } from "express";
import { studentController } from "../controllers/studentController";
import { protect } from "../middleware/authMiddleware";

const router: Router = express.Router();

type RequestHandler = (req: Request, res: Response) => Promise<void>;

// Apply authentication middleware to all routes
router.use(protect);

// Get all students
router.get("/", studentController.getAllStudents as RequestHandler);

// Find student by registration number - new endpoint
router.get(
  "/registration/:registrationNumber",
  studentController.findByRegistrationNumber as RequestHandler
);

// Get students by course
router.get(
  "/course/:courseId",
  studentController.getStudentsByCourse as RequestHandler
);

// Get a single student
router.get("/:id", studentController.getStudent as RequestHandler);

// Create a new student
router.post("/", studentController.createStudent as RequestHandler);

// Update a student
router.put("/:id", studentController.updateStudent as RequestHandler);

// Delete a student
router.delete("/:id", studentController.deleteStudent as RequestHandler);

// Bulk create students
router.post("/bulk", studentController.bulkCreateStudents as RequestHandler);

// Add a student to a course
router.post(
  "/add-to-course",
  studentController.addStudentToCourse as RequestHandler
);

// Remove a student from a course
router.post(
  "/remove-from-course",
  studentController.removeStudentFromCourse as RequestHandler
);

export default router;
