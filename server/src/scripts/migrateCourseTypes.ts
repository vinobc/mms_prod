import mongoose from "mongoose";
import dotenv from "dotenv";
import Course, { CourseType } from "../models/Course";

dotenv.config();

const migrateCourseTypes = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("Connected to MongoDB");

    // Find all courses with the old UGPG-Lab-Only type
    const oldCourses = await Course.find({ type: "UGPG-Lab-Only" });
    console.log(`Found ${oldCourses.length} courses with old type`);

    // For each course, determine if it should be UG or PG based on name/code
    for (const course of oldCourses) {
      // This is a simplified logic - you might want to adjust based on your naming conventions
      const newType: CourseType =
        course.code.startsWith("M") ||
        course.name.startsWith("M") ||
        course.name.includes("PG")
          ? "PG-Lab-Only"
          : "UG-Lab-Only";

      // Update the course type
      await Course.findByIdAndUpdate(course._id, { type: newType });
      console.log(
        `Updated course ${course.code} from UGPG-Lab-Only to ${newType}`
      );
    }

    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Error during migration:", error);
  } finally {
    // Close the MongoDB connection
    await mongoose.connection.close();
    console.log("Disconnected from MongoDB");
  }
};

// Run the migration
migrateCourseTypes();
