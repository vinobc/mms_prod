import { Request, Response } from "express";
import Student, { IStudent, ProgramType } from "../models/Student";
import Course from "../models/Course";
import mongoose from "mongoose";

interface StudentInput {
  registrationNumber: string;
  name: string;
  program: ProgramType;
  courseIds: string[];
  semester: number;
  academicYear: string;
}

export const studentController = {
  // Get all students
  getAllStudents: async (req: Request, res: Response): Promise<void> => {
    try {
      const students = await Student.find()
        .populate("courseIds", "code name type")
        .sort({ createdAt: -1 });
      res.json(students);
    } catch (error) {
      console.error("Error fetching all students:", error);
      res.status(500).json({ message: "Error fetching students", error });
    }
  },

  // Find a student by registration number
  findByRegistrationNumber: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { registrationNumber } = req.params;

      if (!registrationNumber || registrationNumber.trim() === "") {
        res.status(400).json({ message: "Registration number is required" });
        return;
      }

      const student = await Student.findOne({ registrationNumber }).populate(
        "courseIds",
        "code name type"
      );

      if (!student) {
        res.status(404).json({ message: "Student not found" });
        return;
      }

      res.json(student);
    } catch (error) {
      console.error("Error finding student by registration number:", error);
      res.status(500).json({ message: "Error finding student", error });
    }
  },

  // Get students by course
  getStudentsByCourse: async (req: Request, res: Response): Promise<void> => {
    try {
      const courseId = req.params.courseId;

      // Validate courseId format
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        res.status(400).json({ message: "Invalid course ID format" });
        return;
      }

      // Verify the course exists
      const courseExists = await Course.exists({ _id: courseId });
      if (!courseExists) {
        res.status(404).json({ message: "Course not found" });
        return;
      }

      // Find students enrolled in this course
      const students = await Student.find({ courseIds: courseId })
        .populate("courseIds", "code name type")
        .sort({ registrationNumber: 1 });

      res.json(students);
    } catch (error) {
      console.error(
        `Error fetching students for course ${req.params.courseId}:`,
        error
      );
      res.status(500).json({ message: "Error fetching students", error });
    }
  },

  // Get a single student
  getStudent: async (req: Request, res: Response): Promise<void> => {
    try {
      const studentId = req.params.id;

      // Validate studentId format
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        res.status(400).json({ message: "Invalid student ID format" });
        return;
      }

      const student = await Student.findById(studentId).populate(
        "courseIds",
        "code name type"
      );

      if (!student) {
        res.status(404).json({ message: "Student not found" });
        return;
      }

      res.json(student);
    } catch (error) {
      console.error(`Error fetching student ${req.params.id}:`, error);
      res.status(500).json({ message: "Error fetching student", error });
    }
  },

  // Create a new student
  createStudent: async (req: Request, res: Response): Promise<void> => {
    try {
      const studentData = req.body as StudentInput;
      console.log("Received student data:", studentData);

      // Check if student with this registration number already exists
      const existingStudent = await Student.findOne({
        registrationNumber: studentData.registrationNumber,
      });

      if (existingStudent) {
        res.status(409).json({
          message: "A student with this registration number already exists",
          studentId: existingStudent._id,
          existing: true,
        });
        return;
      }

      // Ensure courseIds is an array of strings
      let courseIdsArray: string[] = [];

      if (
        Array.isArray(studentData.courseIds) &&
        studentData.courseIds.length > 0
      ) {
        // Validate course ID formats
        const invalidIds = studentData.courseIds.filter(
          (id) => !mongoose.Types.ObjectId.isValid(id)
        );

        if (invalidIds.length > 0) {
          res.status(400).json({
            message: "One or more course IDs have invalid format",
            invalidIds,
          });
          return;
        }

        // Verify that all courseIds exist
        const courses = await Course.find({
          _id: { $in: studentData.courseIds },
        });

        if (courses.length !== studentData.courseIds.length) {
          // Find which course IDs are missing
          const foundIds = courses.map((course) => course._id.toString());
          const missingIds = studentData.courseIds.filter(
            (id) => !foundIds.includes(id)
          );

          res.status(400).json({
            message: "One or more course IDs are invalid",
            missingIds,
          });
          return;
        }

        courseIdsArray = studentData.courseIds;
      }

      // Create new student with validated courseIds
      // The mongoose schema will handle converting strings to ObjectIds
      const newStudent = new Student({
        ...studentData,
        courseIds: courseIdsArray,
      });

      const savedStudent = await newStudent.save();

      // Return populated student data
      const populatedStudent = await Student.findById(
        savedStudent._id
      ).populate("courseIds", "code name type");

      res.status(201).json(populatedStudent);
    } catch (error: any) {
      console.error("Error creating student:", error);

      // Handle duplicate registration number error
      if (error.code === 11000) {
        res.status(400).json({
          message: "A student with this registration number already exists",
        });
      }
      // Handle validation errors
      else if (error.name === "ValidationError") {
        const validationErrors = Object.values(error.errors).map(
          (err: any) => err.message
        );
        res.status(400).json({
          message: "Validation error",
          errors: validationErrors,
        });
      }
      // Handle other errors
      else {
        res.status(400).json({
          message: "Error creating student",
          error: error.message,
        });
      }
    }
  },

  // Update a student
  updateStudent: async (req: Request, res: Response): Promise<void> => {
    try {
      const studentId = req.params.id;
      const studentData = req.body as Partial<StudentInput>;

      // Validate studentId format
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        res.status(400).json({ message: "Invalid student ID format" });
        return;
      }

      // Check if student exists
      const existingStudent = await Student.findById(studentId);
      if (!existingStudent) {
        res.status(404).json({ message: "Student not found" });
        return;
      }

      // Process courseIds if provided - but don't convert them to ObjectIds yet
      // The mongoose model will handle string to ObjectId conversion
      if (studentData.courseIds !== undefined) {
        // Ensure courseIds is an array
        const courseIds = Array.isArray(studentData.courseIds)
          ? studentData.courseIds
          : [];

        // Validate course ID formats if there are any
        if (courseIds.length > 0) {
          const invalidIds = courseIds.filter(
            (id) => !mongoose.Types.ObjectId.isValid(id)
          );

          if (invalidIds.length > 0) {
            res.status(400).json({
              message: "One or more course IDs have invalid format",
              invalidIds,
            });
            return;
          }

          // Verify that all courseIds exist
          const courses = await Course.find({
            _id: { $in: courseIds },
          });

          if (courses.length !== courseIds.length) {
            // Find which course IDs are missing
            const foundIds = courses.map((course) => course._id.toString());
            const missingIds = courseIds.filter((id) => !foundIds.includes(id));

            res.status(400).json({
              message: "One or more course IDs are invalid",
              missingIds,
            });
            return;
          }
        }
      }

      // Perform the update
      const updatedStudent = await Student.findByIdAndUpdate(
        studentId,
        studentData,
        { new: true, runValidators: true }
      ).populate("courseIds", "code name type");

      res.json(updatedStudent);
    } catch (error: any) {
      console.error(`Error updating student ${req.params.id}:`, error);

      // Handle duplicate registration number error
      if (error.code === 11000) {
        res.status(400).json({
          message: "A student with this registration number already exists",
        });
      }
      // Handle validation errors
      else if (error.name === "ValidationError") {
        const validationErrors = Object.values(error.errors).map(
          (err: any) => err.message
        );
        res.status(400).json({
          message: "Validation error",
          errors: validationErrors,
        });
      }
      // Handle other errors
      else {
        res.status(400).json({
          message: "Error updating student",
          error: error.message,
        });
      }
    }
  },

  // Delete a student
  deleteStudent: async (req: Request, res: Response): Promise<void> => {
    try {
      const studentId = req.params.id;

      // Validate studentId format
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        res.status(400).json({ message: "Invalid student ID format" });
        return;
      }

      const deletedStudent = await Student.findByIdAndDelete(studentId);

      if (!deletedStudent) {
        res.status(404).json({ message: "Student not found" });
        return;
      }

      res.json({ message: "Student deleted successfully" });
    } catch (error: any) {
      console.error(`Error deleting student ${req.params.id}:`, error);
      res.status(500).json({
        message: "Error deleting student",
        error: error.message,
      });
    }
  },

  // Add a student to a course
  addStudentToCourse: async (req: Request, res: Response): Promise<void> => {
    try {
      const { studentId, courseId } = req.body;

      // Validate IDs
      if (
        !mongoose.Types.ObjectId.isValid(studentId) ||
        !mongoose.Types.ObjectId.isValid(courseId)
      ) {
        res
          .status(400)
          .json({ message: "Invalid student or course ID format" });
        return;
      }

      // Check if student exists
      const student = await Student.findById(studentId);
      if (!student) {
        res.status(404).json({ message: "Student not found" });
        return;
      }

      // Check if course exists
      const course = await Course.findById(courseId);
      if (!course) {
        res.status(404).json({ message: "Course not found" });
        return;
      }

      // Add course to student if not already enrolled
      const courseObjectId = new mongoose.Types.ObjectId(courseId);
      if (!student.courseIds.some((id) => id.equals(courseObjectId))) {
        student.courseIds.push(courseObjectId);
        await student.save();
      }

      res.json({
        message: "Student added to course successfully",
        student: {
          _id: student._id,
          name: student.name,
          registrationNumber: student.registrationNumber,
        },
        course: {
          _id: course._id,
          code: course.code,
          name: course.name,
        },
      });
    } catch (error: any) {
      console.error("Error adding student to course:", error);
      res.status(500).json({
        message: "Error adding student to course",
        error: error.message,
      });
    }
  },

  // Remove a student from a course
  removeStudentFromCourse: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { studentId, courseId } = req.body;

      // Validate IDs
      if (
        !mongoose.Types.ObjectId.isValid(studentId) ||
        !mongoose.Types.ObjectId.isValid(courseId)
      ) {
        res
          .status(400)
          .json({ message: "Invalid student or course ID format" });
        return;
      }

      // Check if student exists
      const student = await Student.findById(studentId);
      if (!student) {
        res.status(404).json({ message: "Student not found" });
        return;
      }

      // Remove course from student's courseIds
      const courseObjectId = new mongoose.Types.ObjectId(courseId);
      student.courseIds = student.courseIds.filter(
        (id) => !id.equals(courseObjectId)
      );

      await student.save();

      res.json({
        message: "Student removed from course successfully",
        student: {
          _id: student._id,
          name: student.name,
          registrationNumber: student.registrationNumber,
        },
      });
    } catch (error: any) {
      console.error("Error removing student from course:", error);
      res.status(500).json({
        message: "Error removing student from course",
        error: error.message,
      });
    }
  },

  // Bulk create students
  bulkCreateStudents: async (req: Request, res: Response): Promise<void> => {
    try {
      const students = req.body.students as StudentInput[];

      // Validate student data
      if (!Array.isArray(students) || students.length === 0) {
        res
          .status(400)
          .json({ message: "Valid student data array is required" });
        return;
      }

      // Process each student's courseIds
      const processedStudents = await Promise.all(
        students.map(async (student) => {
          // Check if student with this registration number already exists
          const existingStudent = await Student.findOne({
            registrationNumber: student.registrationNumber,
          });

          // If student exists, update with new courses rather than creating
          if (existingStudent) {
            // Combine existing courses with new ones
            const courseIds = Array.isArray(student.courseIds)
              ? student.courseIds
              : [];

            for (const courseId of courseIds) {
              if (mongoose.Types.ObjectId.isValid(courseId)) {
                // Check if course is already in student's courses
                const courseObjectId = new mongoose.Types.ObjectId(courseId);
                if (
                  !existingStudent.courseIds.some((id) =>
                    id.equals(courseObjectId)
                  )
                ) {
                  existingStudent.courseIds.push(courseObjectId);
                }
              }
            }

            // Update other fields
            existingStudent.name = student.name || existingStudent.name;
            existingStudent.program =
              student.program || existingStudent.program;
            existingStudent.semester =
              student.semester || existingStudent.semester;
            existingStudent.academicYear =
              student.academicYear || existingStudent.academicYear;

            await existingStudent.save();
            return null; // Skip creating a new student
          }

          // Ensure courseIds is an array
          const courseIds = Array.isArray(student.courseIds)
            ? student.courseIds
            : [];

          // Skip empty courseIds
          if (courseIds.length === 0) {
            return {
              ...student,
              courseIds: [],
            };
          }

          // Validate course ID formats
          const invalidIds = courseIds.filter(
            (id) => !mongoose.Types.ObjectId.isValid(id)
          );

          if (invalidIds.length > 0) {
            throw new Error(
              `Student ${student.registrationNumber} has invalid course ID formats`
            );
          }

          // Verify courses exist
          const courses = await Course.find({
            _id: { $in: courseIds },
          });

          if (courses.length !== courseIds.length) {
            throw new Error(
              `Student ${student.registrationNumber} has invalid course IDs`
            );
          }

          // Return student with validated courseIds
          return {
            ...student,
            // Don't convert to ObjectIds here - let Mongoose handle it
            courseIds: courseIds,
          };
        })
      );

      // Filter out null values (existing students that were updated)
      const studentsToCreate = processedStudents.filter(Boolean);

      // Create new students
      let createdStudents: IStudent[] = []; // Specify type explicitly
      if (studentsToCreate.length > 0) {
        createdStudents = await Student.insertMany(studentsToCreate);
      }

      // Count how many were updated vs created
      const updatedCount = processedStudents.length - studentsToCreate.length;

      res.status(201).json({
        message: `${createdStudents.length} students created and ${updatedCount} students updated`,
        created: createdStudents,
        updatedCount,
      });
    } catch (error: any) {
      console.error("Error bulk creating students:", error);

      if (error.code === 11000) {
        res.status(400).json({
          message: "One or more students have duplicate registration numbers",
        });
      } else {
        res.status(400).json({
          message: "Error creating students",
          error: error.message,
        });
      }
    }
  },
};
