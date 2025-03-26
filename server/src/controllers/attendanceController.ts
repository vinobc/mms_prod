// // server/src/controllers/attendanceController.ts
// import { Request, Response } from "express";
// import Attendance, {
//   IAttendance,
//   IAttendanceRecord,
// } from "../models/Attendance";
// import Course from "../models/Course";
// import Student from "../models/Student";
// import mongoose from "mongoose";

// export const attendanceController = {
//   // Get attendance records for a course
//   getAttendanceByCourse: async (req: Request, res: Response): Promise<void> => {
//     try {
//       const { courseId } = req.params;
//       const { component, startDate, endDate } = req.query;

//       if (!mongoose.Types.ObjectId.isValid(courseId)) {
//         res.status(400).json({ message: "Invalid course ID format" });
//         return;
//       }

//       // Get course type to check if it's integrated
//       const course = await Course.findById(courseId);
//       if (!course) {
//         res.status(404).json({ message: "Course not found" });
//         return;
//       }

//       const isIntegratedCourse = course.type.includes("Integrated");

//       // For integrated courses, component is required
//       if (isIntegratedCourse && !component) {
//         res.status(400).json({
//           message: "Component (theory/lab) is required for integrated courses",
//         });
//         return;
//       }

//       // Build query
//       const query: any = { courseId };

//       // Fetch attendance records
//       const attendanceRecords = await Attendance.find(query)
//         .populate("studentId", "registrationNumber name program")
//         .sort({ "studentId.registrationNumber": 1 });

//       // Calculate attendance percentages
//       const processedRecords = attendanceRecords.map((record) => {
//         const filteredRecords = record.records.filter((r) => {
//           // Filter by component if specified
//           if (component && r.component !== component) return false;

//           // For integrated courses, always filter by component
//           if (isIntegratedCourse && !r.component) return false;
//           if (isIntegratedCourse && component && r.component !== component)
//             return false;

//           // Filter by date range if specified
//           if (startDate && new Date(r.date) < new Date(startDate as string))
//             return false;
//           if (endDate && new Date(r.date) > new Date(endDate as string))
//             return false;

//           return true;
//         });

//         const totalClasses = filteredRecords.length;
//         const presentClasses = filteredRecords.filter(
//           (r) => r.status === "present"
//         ).length;
//         const attendancePercentage = totalClasses
//           ? (presentClasses / totalClasses) * 100
//           : 0;

//         return {
//           studentId: record.studentId,
//           attendancePercentage: Math.round(attendancePercentage * 100) / 100,
//           belowThreshold: attendancePercentage < 75,
//           records: filteredRecords,
//           totalClasses,
//           presentClasses,
//         };
//       });

//       res.json(processedRecords);
//     } catch (error) {
//       console.error("Error fetching attendance:", error);
//       res
//         .status(500)
//         .json({ message: "Error fetching attendance records", error });
//     }
//   },

//   // Get attendance summary for a course
//   getAttendanceSummary: async (req: Request, res: Response): Promise<void> => {
//     try {
//       const { courseId } = req.params;
//       const { component } = req.query;

//       if (!mongoose.Types.ObjectId.isValid(courseId)) {
//         res.status(400).json({ message: "Invalid course ID format" });
//         return;
//       }

//       // Get course type to check if it's integrated
//       const course = await Course.findById(courseId);
//       if (!course) {
//         res.status(404).json({ message: "Course not found" });
//         return;
//       }

//       const isIntegratedCourse = course.type.includes("Integrated");

//       // For integrated courses, component is required
//       if (isIntegratedCourse && !component) {
//         res.status(400).json({
//           message: "Component (theory/lab) is required for integrated courses",
//         });
//         return;
//       }

//       // Fetch all attendance records for this course
//       const attendanceRecords = await Attendance.find({ courseId }).populate(
//         "studentId",
//         "registrationNumber name program"
//       );

//       // Get unique dates on which attendance was taken
//       const datesMap = new Map<string, Set<string>>();

//       attendanceRecords.forEach((record) => {
//         record.records.forEach((r) => {
//           // Skip if component filter is active and doesn't match
//           if (component && r.component !== component) return;

//           // For integrated courses, always filter by component
//           if (isIntegratedCourse && !r.component) return;
//           if (isIntegratedCourse && component && r.component !== component)
//             return;

//           const dateStr = r.date.toISOString().split("T")[0];
//           const componentStr = r.component || "default";

//           if (!datesMap.has(dateStr)) {
//             datesMap.set(dateStr, new Set());
//           }
//           datesMap.get(dateStr)!.add(componentStr);
//         });
//       });

//       // Format dates and components
//       const attendanceDates = Array.from(datesMap.entries())
//         .map(([date, components]) => ({
//           date,
//           components: Array.from(components),
//         }))
//         .sort(
//           (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
//         ); // Sort by date (newest first)

//       // Calculate overall stats
//       const totalStudents = attendanceRecords.length;
//       let belowThresholdCount = 0;
//       let totalAttendancePercentage = 0;

//       attendanceRecords.forEach((record) => {
//         const filteredRecords = record.records.filter((r) => {
//           // Apply same filters as above
//           if (component && r.component !== component) return false;
//           if (isIntegratedCourse && !r.component) return false;
//           if (isIntegratedCourse && component && r.component !== component)
//             return false;
//           return true;
//         });

//         const total = filteredRecords.length;
//         const present = filteredRecords.filter(
//           (r) => r.status === "present"
//         ).length;
//         const percentage = total ? (present / total) * 100 : 0;

//         totalAttendancePercentage += percentage;
//         if (percentage < 75) belowThresholdCount++;
//       });

//       const averageAttendance = totalStudents
//         ? totalAttendancePercentage / totalStudents
//         : 0;

//       res.json({
//         totalStudents,
//         totalClasses: attendanceDates.length,
//         belowThresholdCount,
//         averageAttendance: Math.round(averageAttendance * 100) / 100,
//         attendanceDates,
//       });
//     } catch (error) {
//       console.error("Error fetching attendance summary:", error);
//       res
//         .status(500)
//         .json({ message: "Error fetching attendance summary", error });
//     }
//   },

//   // Get attendance records for a specific student in a course
//   getStudentAttendance: async (req: Request, res: Response): Promise<void> => {
//     try {
//       const { courseId, studentId } = req.params;
//       const { component } = req.query;

//       if (
//         !mongoose.Types.ObjectId.isValid(courseId) ||
//         !mongoose.Types.ObjectId.isValid(studentId)
//       ) {
//         res.status(400).json({ message: "Invalid ID format" });
//         return;
//       }

//       // Get course type to check if it's integrated
//       const course = await Course.findById(courseId);
//       if (!course) {
//         res.status(404).json({ message: "Course not found" });
//         return;
//       }

//       const isIntegratedCourse = course.type.includes("Integrated");

//       // For integrated courses, component is required
//       if (isIntegratedCourse && !component) {
//         res.status(400).json({
//           message: "Component (theory/lab) is required for integrated courses",
//         });
//         return;
//       }

//       const attendance = await Attendance.findOne({ courseId, studentId })
//         .populate("studentId", "registrationNumber name program")
//         .populate("courseId", "code name type");

//       if (!attendance) {
//         res.status(404).json({ message: "Attendance record not found" });
//         return;
//       }

//       // Filter records by component if needed
//       let filteredRecords = attendance.records;

//       if (component) {
//         filteredRecords = filteredRecords.filter(
//           (r) => r.component === component
//         );
//       } else if (isIntegratedCourse) {
//         // For integrated courses without component specified, separate by component
//         const theoryRecords = filteredRecords.filter(
//           (r) => r.component === "theory"
//         );
//         const labRecords = filteredRecords.filter((r) => r.component === "lab");

//         // Calculate attendance percentages
//         const theoryAttendance = theoryRecords.length
//           ? (theoryRecords.filter((r) => r.status === "present").length /
//               theoryRecords.length) *
//             100
//           : 0;

//         const labAttendance = labRecords.length
//           ? (labRecords.filter((r) => r.status === "present").length /
//               labRecords.length) *
//             100
//           : 0;

//         res.json({
//           student: attendance.studentId,
//           course: attendance.courseId,
//           academicYear: attendance.academicYear,
//           theory: {
//             records: theoryRecords,
//             attendancePercentage: Math.round(theoryAttendance * 100) / 100,
//             belowThreshold: theoryAttendance < 75,
//             totalClasses: theoryRecords.length,
//             presentClasses: theoryRecords.filter((r) => r.status === "present")
//               .length,
//           },
//           lab: {
//             records: labRecords,
//             attendancePercentage: Math.round(labAttendance * 100) / 100,
//             belowThreshold: labAttendance < 75,
//             totalClasses: labRecords.length,
//             presentClasses: labRecords.filter((r) => r.status === "present")
//               .length,
//           },
//         });
//         return;
//       }

//       // Calculate attendance percentage
//       const totalClasses = filteredRecords.length;
//       const presentClasses = filteredRecords.filter(
//         (r) => r.status === "present"
//       ).length;
//       const attendancePercentage = totalClasses
//         ? (presentClasses / totalClasses) * 100
//         : 0;

//       res.json({
//         student: attendance.studentId,
//         course: attendance.courseId,
//         academicYear: attendance.academicYear,
//         overall: {
//           attendancePercentage: Math.round(attendancePercentage * 100) / 100,
//           belowThreshold: attendancePercentage < 75,
//           totalClasses,
//           presentClasses,
//         },
//         records: filteredRecords,
//       });
//     } catch (error) {
//       console.error("Error fetching student attendance:", error);
//       res
//         .status(500)
//         .json({ message: "Error fetching student attendance", error });
//     }
//   },

//   // Take/update attendance for a course on a specific date
//   takeAttendance: async (req: Request, res: Response): Promise<void> => {
//     try {
//       const { courseId } = req.params;
//       const { date, component, attendanceData, remarks } = req.body;

//       if (!mongoose.Types.ObjectId.isValid(courseId)) {
//         res.status(400).json({ message: "Invalid course ID format" });
//         return;
//       }

//       if (!date || !attendanceData || !Array.isArray(attendanceData)) {
//         res.status(400).json({ message: "Invalid attendance data" });
//         return;
//       }

//       // Validate course
//       const course = await Course.findById(courseId);
//       if (!course) {
//         res.status(404).json({ message: "Course not found" });
//         return;
//       }

//       // Check if course type requires component
//       const isIntegratedCourse = course.type.includes("Integrated");
//       if (isIntegratedCourse && !component) {
//         res
//           .status(400)
//           .json({
//             message:
//               "Component (theory/lab) is required for integrated courses",
//           });
//         return;
//       }

//       // Parse attendance date
//       const attendanceDate = new Date(date);
//       if (isNaN(attendanceDate.getTime())) {
//         res.status(400).json({ message: "Invalid date format" });
//         return;
//       }

//       // Get current academic year (could be passed from client too)
//       const academicYear = req.body.academicYear || "2023-24"; // Default or from request

//       // Process each student attendance
//       const updates = [];
//       for (const record of attendanceData) {
//         const { studentId, status } = record;

//         if (!mongoose.Types.ObjectId.isValid(studentId)) {
//           continue; // Skip invalid IDs
//         }

//         if (status !== "present" && status !== "absent") {
//           continue; // Skip invalid status
//         }

//         const attendanceRecord: IAttendanceRecord = {
//           date: attendanceDate,
//           status,
//           remarks: record.remarks || remarks,
//         };

//         // Add component if applicable
//         if (component) {
//           attendanceRecord.component = component as "theory" | "lab";
//         }

//         // Find existing attendance document or create new one
//         updates.push(
//           (async () => {
//             // First, find the document or create a new one if it doesn't exist
//             let doc = await Attendance.findOne({
//               courseId,
//               studentId,
//               academicYear,
//             });

//             if (!doc) {
//               doc = new Attendance({
//                 courseId,
//                 studentId,
//                 academicYear,
//                 records: [], // Start with empty records
//               });
//             }

//             // For integrated courses, ensure we're only modifying the correct component
//             if (doc.records && doc.records.length > 0) {
//               // Create a copy of the records array to modify
//               const updatedRecords = [...doc.records];

//               // Find the index of any existing record for this date and component
//               const startOfDay = new Date(attendanceDate);
//               startOfDay.setHours(0, 0, 0, 0);

//               const endOfDay = new Date(attendanceDate);
//               endOfDay.setHours(23, 59, 59, 999);

//               const recordIndex = updatedRecords.findIndex((r) => {
//                 const recordDate = new Date(r.date);
//                 const sameDate =
//                   recordDate >= startOfDay && recordDate <= endOfDay;

//                 // For integrated courses, match on both date AND component
//                 if (isIntegratedCourse && component) {
//                   return sameDate && r.component === component;
//                 }
//                 // For non-integrated courses, just match on date
//                 return sameDate;
//               });

//               if (recordIndex >= 0) {
//                 // Replace existing record
//                 updatedRecords[recordIndex] = attendanceRecord;
//               } else {
//                 // Add new record
//                 updatedRecords.push(attendanceRecord);
//               }

//               // Update the document with the modified records
//               doc.records = updatedRecords;
//             } else {
//               // No existing records, just add the new one
//               doc.records = [attendanceRecord];
//             }

//             // Save the document
//             return doc.save();
//           })()
//         );
//       }

//       // Execute all updates
//       await Promise.all(updates);

//       // Return success
//       res.json({
//         message: `Attendance recorded for ${updates.length} students`,
//         date: attendanceDate,
//         component,
//       });
//     } catch (error) {
//       console.error("Error recording attendance:", error);
//       res.status(500).json({ message: "Error recording attendance", error });
//     }
//   },

//   // Delete attendance record for a specific date
//   deleteAttendanceRecord: async (
//     req: Request,
//     res: Response
//   ): Promise<void> => {
//     try {
//       const { courseId } = req.params;
//       const { date, component } = req.body;

//       if (!mongoose.Types.ObjectId.isValid(courseId)) {
//         res.status(400).json({ message: "Invalid course ID format" });
//         return;
//       }

//       if (!date) {
//         res.status(400).json({ message: "Date is required" });
//         return;
//       }

//       // Parse date
//       const attendanceDate = new Date(date);
//       if (isNaN(attendanceDate.getTime())) {
//         res.status(400).json({ message: "Invalid date format" });
//         return;
//       }

//       // Get course to check if it's integrated
//       const course = await Course.findById(courseId);
//       if (!course) {
//         res.status(404).json({ message: "Course not found" });
//         return;
//       }

//       const isIntegratedCourse = course.type.includes("Integrated");

//       // For integrated courses, component is required
//       if (isIntegratedCourse && !component) {
//         res.status(400).json({
//           message:
//             "Component (theory/lab) is required for deleting attendance in integrated courses",
//         });
//         return;
//       }

//       // Create date range for the day
//       const startOfDay = new Date(attendanceDate);
//       startOfDay.setHours(0, 0, 0, 0);
//       const endOfDay = new Date(attendanceDate);
//       endOfDay.setHours(23, 59, 59, 999);

//       // Build query to remove records for this date
//       const query = { courseId };

//       // For integrated courses, we MUST filter by component to avoid affecting the other component
//       // For non-integrated courses, component is optional
//       const pullCondition: {
//         date: { $gte: Date; $lte: Date };
//         component?: string;
//       } = {
//         date: { $gte: startOfDay, $lte: endOfDay },
//       };

//       // Always include component in the condition if provided
//       if (component) {
//         pullCondition.component = component;
//       }

//       const update = {
//         $pull: { records: pullCondition },
//       };

//       // Execute update on all attendance records for this course
//       const result = await Attendance.updateMany(query, update);

//       res.json({
//         message: `Deleted attendance records for ${result.modifiedCount} students`,
//         date: attendanceDate,
//         component,
//         modifiedCount: result.modifiedCount,
//       });
//     } catch (error) {
//       console.error("Error deleting attendance records:", error);
//       res
//         .status(500)
//         .json({ message: "Error deleting attendance records", error });
//     }
//   },
// };

// server/src/controllers/attendanceController.ts
import { Request, Response } from "express";
import Attendance, {
  IAttendance,
  IAttendanceRecord,
} from "../models/Attendance";
import Course from "../models/Course";
import Student from "../models/Student";
import mongoose from "mongoose";

export const attendanceController = {
  // Get attendance records for a course
  getAttendanceByCourse: async (req: Request, res: Response): Promise<void> => {
    try {
      const { courseId } = req.params;
      const { component, startDate, endDate } = req.query;

      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        res.status(400).json({ message: "Invalid course ID format" });
        return;
      }

      // Get course type to check if it's integrated
      const course = await Course.findById(courseId);
      if (!course) {
        res.status(404).json({ message: "Course not found" });
        return;
      }

      const isIntegratedCourse = course.type.includes("Integrated");

      // For integrated courses, component is required
      if (isIntegratedCourse && !component) {
        res.status(400).json({
          message: "Component (theory/lab) is required for integrated courses",
        });
        return;
      }

      // Build query
      const query: any = { courseId };

      // Fetch attendance records
      const attendanceRecords = await Attendance.find(query)
        .populate("studentId", "registrationNumber name program")
        .sort({ "studentId.registrationNumber": 1 });

      // Calculate attendance percentages
      const processedRecords = attendanceRecords.map((record) => {
        const filteredRecords = record.records.filter((r) => {
          // Filter by component if specified
          if (component && r.component !== component) return false;

          // For integrated courses, always filter by component
          if (isIntegratedCourse && !r.component) return false;
          if (isIntegratedCourse && component && r.component !== component)
            return false;

          // Filter by date range if specified
          if (startDate && new Date(r.date) < new Date(startDate as string))
            return false;
          if (endDate && new Date(r.date) > new Date(endDate as string))
            return false;

          return true;
        });

        // Group records by date to count unique class sessions
        // A unique session is defined by a unique combination of date, startTime, endTime and component
        const uniqueSessions = new Set();
        filteredRecords.forEach((record) => {
          const sessionKey = `${record.date.toISOString().split("T")[0]}_${
            record.startTime || ""
          }${record.endTime || ""}_${record.component || "default"}`;
          uniqueSessions.add(sessionKey);
        });

        const totalClasses = uniqueSessions.size;

        // Calculate present sessions
        const presentSessions = new Set();
        filteredRecords
          .filter((r) => r.status === "present")
          .forEach((record) => {
            const sessionKey = `${record.date.toISOString().split("T")[0]}_${
              record.startTime || ""
            }${record.endTime || ""}_${record.component || "default"}`;
            presentSessions.add(sessionKey);
          });

        const presentClasses = presentSessions.size;
        const attendancePercentage = totalClasses
          ? (presentClasses / totalClasses) * 100
          : 0;

        return {
          studentId: record.studentId,
          attendancePercentage: Math.round(attendancePercentage * 100) / 100,
          belowThreshold: attendancePercentage < 75,
          records: filteredRecords,
          totalClasses,
          presentClasses,
        };
      });

      res.json(processedRecords);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      res
        .status(500)
        .json({ message: "Error fetching attendance records", error });
    }
  },

  // Get attendance summary for a course
  // server/src/controllers/attendanceController.ts (getAttendanceSummary method)

  // Get attendance summary for a course
  getAttendanceSummary: async (req: Request, res: Response): Promise<void> => {
    try {
      const { courseId } = req.params;
      const { component } = req.query;

      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        res.status(400).json({ message: "Invalid course ID format" });
        return;
      }

      // Get course type to check if it's integrated
      const course = await Course.findById(courseId);
      if (!course) {
        res.status(404).json({ message: "Course not found" });
        return;
      }

      const isIntegratedCourse = course.type.includes("Integrated");

      // For integrated courses, component is required
      if (isIntegratedCourse && !component) {
        res.status(400).json({
          message: "Component (theory/lab) is required for integrated courses",
        });
        return;
      }

      // Fetch all attendance records for this course
      const attendanceRecords = await Attendance.find({ courseId }).populate(
        "studentId",
        "registrationNumber name program"
      );

      // Get unique dates and time slots on which attendance was taken
      const sessionsMap = new Map<string, Set<string>>();

      attendanceRecords.forEach((record) => {
        record.records.forEach((r) => {
          // Skip if component filter is active and doesn't match
          if (component && r.component !== component) return;

          // For integrated courses, always filter by component
          if (isIntegratedCourse && !r.component) return;
          if (isIntegratedCourse && component && r.component !== component)
            return;

          const dateStr = r.date.toISOString().split("T")[0];
          const timeStr =
            r.startTime && r.endTime
              ? `${r.startTime}-${r.endTime}`
              : "unknown";
          const componentStr = r.component || "default";

          // Create a unique session key combining date, time and component
          const sessionKey = `${dateStr}_${timeStr}_${componentStr}`;

          if (!sessionsMap.has(sessionKey)) {
            sessionsMap.set(sessionKey, new Set());
          }
          sessionsMap.get(sessionKey)!.add(componentStr);
        });
      });

      // Format unique sessions (date + time slots)
      const attendanceSessions = Array.from(sessionsMap.entries())
        .map(([sessionKey, components]) => {
          const [dateStr, timeStr, defaultComponent] = sessionKey.split("_");
          return {
            date: dateStr,
            timeSlot: timeStr !== "unknown" ? timeStr : null,
            components: Array.from(components),
          };
        })
        .sort((a, b) => {
          // First sort by date (newest first)
          const dateComparison =
            new Date(b.date).getTime() - new Date(a.date).getTime();
          if (dateComparison !== 0) return dateComparison;

          // If dates are the same, sort by time slot
          if (a.timeSlot && b.timeSlot) {
            return a.timeSlot.localeCompare(b.timeSlot);
          }
          return 0;
        });

      // Calculate overall stats
      const totalStudents = attendanceRecords.length;
      let belowThresholdCount = 0;
      let totalAttendancePercentage = 0;

      attendanceRecords.forEach((record) => {
        // Group records by unique sessions to count properly
        const uniqueSessions = new Set();
        const presentSessions = new Set();

        record.records
          .filter((r) => {
            // Apply filters
            if (component && r.component !== component) return false;
            if (isIntegratedCourse && !r.component) return false;
            if (isIntegratedCourse && component && r.component !== component)
              return false;
            return true;
          })
          .forEach((r) => {
            // Create a unique session key
            const sessionKey = `${r.date.toISOString().split("T")[0]}_${
              r.startTime || ""
            }${r.endTime || ""}_${r.component || "default"}`;
            uniqueSessions.add(sessionKey);

            if (r.status === "present") {
              presentSessions.add(sessionKey);
            }
          });

        const total = uniqueSessions.size;
        const present = presentSessions.size;
        const percentage = total ? (present / total) * 100 : 0;

        totalAttendancePercentage += percentage;
        if (percentage < 75) belowThresholdCount++;
      });

      const averageAttendance = totalStudents
        ? totalAttendancePercentage / totalStudents
        : 0;

      // Ensure we always return an array, even if empty
      res.json({
        totalStudents,
        totalClasses: attendanceSessions.length,
        belowThresholdCount,
        averageAttendance: Math.round(averageAttendance * 100) / 100,
        attendanceSessions: attendanceSessions || [],
      });
    } catch (error) {
      console.error("Error fetching attendance summary:", error);
      res.status(500).json({
        message: "Error fetching attendance summary",
        error,
        // Always return a valid structure even in error cases
        attendanceSessions: [],
      });
    }
  },

  // Get attendance records for a specific student in a course
  getStudentAttendance: async (req: Request, res: Response): Promise<void> => {
    try {
      const { courseId, studentId } = req.params;
      const { component } = req.query;

      if (
        !mongoose.Types.ObjectId.isValid(courseId) ||
        !mongoose.Types.ObjectId.isValid(studentId)
      ) {
        res.status(400).json({ message: "Invalid ID format" });
        return;
      }

      // Get course type to check if it's integrated
      const course = await Course.findById(courseId);
      if (!course) {
        res.status(404).json({ message: "Course not found" });
        return;
      }

      const isIntegratedCourse = course.type.includes("Integrated");

      // For integrated courses, component is required
      if (isIntegratedCourse && !component) {
        res.status(400).json({
          message: "Component (theory/lab) is required for integrated courses",
        });
        return;
      }

      const attendance = await Attendance.findOne({ courseId, studentId })
        .populate("studentId", "registrationNumber name program")
        .populate("courseId", "code name type");

      if (!attendance) {
        res.status(404).json({ message: "Attendance record not found" });
        return;
      }

      // Filter records by component if needed
      let filteredRecords = attendance.records;

      if (component) {
        filteredRecords = filteredRecords.filter(
          (r) => r.component === component
        );
      } else if (isIntegratedCourse) {
        // For integrated courses without component specified, separate by component
        const theoryRecords = filteredRecords.filter(
          (r) => r.component === "theory"
        );
        const labRecords = filteredRecords.filter((r) => r.component === "lab");

        // Count unique sessions for both components
        const theoryUniqueSessions = new Set();
        theoryRecords.forEach((r) => {
          const sessionKey = `${r.date.toISOString().split("T")[0]}_${
            r.startTime || ""
          }${r.endTime || ""}`;
          theoryUniqueSessions.add(sessionKey);
        });

        // Continuing the attendance controller
        const theoryPresentSessions = new Set();
        theoryRecords
          .filter((r) => r.status === "present")
          .forEach((r) => {
            const sessionKey = `${r.date.toISOString().split("T")[0]}_${
              r.startTime || ""
            }${r.endTime || ""}`;
            theoryPresentSessions.add(sessionKey);
          });

        const labUniqueSessions = new Set();
        labRecords.forEach((r) => {
          const sessionKey = `${r.date.toISOString().split("T")[0]}_${
            r.startTime || ""
          }${r.endTime || ""}`;
          labUniqueSessions.add(sessionKey);
        });

        const labPresentSessions = new Set();
        labRecords
          .filter((r) => r.status === "present")
          .forEach((r) => {
            const sessionKey = `${r.date.toISOString().split("T")[0]}_${
              r.startTime || ""
            }${r.endTime || ""}`;
            labPresentSessions.add(sessionKey);
          });

        // Calculate attendance percentages
        const theoryAttendance = theoryUniqueSessions.size
          ? (theoryPresentSessions.size / theoryUniqueSessions.size) * 100
          : 0;

        const labAttendance = labUniqueSessions.size
          ? (labPresentSessions.size / labUniqueSessions.size) * 100
          : 0;

        res.json({
          student: attendance.studentId,
          course: attendance.courseId,
          academicYear: attendance.academicYear,
          theory: {
            records: theoryRecords,
            attendancePercentage: Math.round(theoryAttendance * 100) / 100,
            belowThreshold: theoryAttendance < 75,
            totalClasses: theoryUniqueSessions.size,
            presentClasses: theoryPresentSessions.size,
          },
          lab: {
            records: labRecords,
            attendancePercentage: Math.round(labAttendance * 100) / 100,
            belowThreshold: labAttendance < 75,
            totalClasses: labUniqueSessions.size,
            presentClasses: labPresentSessions.size,
          },
        });
        return;
      }

      // Count unique sessions
      const uniqueSessions = new Set();
      filteredRecords.forEach((r) => {
        const sessionKey = `${r.date.toISOString().split("T")[0]}_${
          r.startTime || ""
        }${r.endTime || ""}_${r.component || "default"}`;
        uniqueSessions.add(sessionKey);
      });

      const presentSessions = new Set();
      filteredRecords
        .filter((r) => r.status === "present")
        .forEach((r) => {
          const sessionKey = `${r.date.toISOString().split("T")[0]}_${
            r.startTime || ""
          }${r.endTime || ""}_${r.component || "default"}`;
          presentSessions.add(sessionKey);
        });

      const totalClasses = uniqueSessions.size;
      const presentClasses = presentSessions.size;
      const attendancePercentage = totalClasses
        ? (presentClasses / totalClasses) * 100
        : 0;

      res.json({
        student: attendance.studentId,
        course: attendance.courseId,
        academicYear: attendance.academicYear,
        overall: {
          attendancePercentage: Math.round(attendancePercentage * 100) / 100,
          belowThreshold: attendancePercentage < 75,
          totalClasses,
          presentClasses,
        },
        records: filteredRecords,
      });
    } catch (error) {
      console.error("Error fetching student attendance:", error);
      res
        .status(500)
        .json({ message: "Error fetching student attendance", error });
    }
  },

  // Take/update attendance for a course on a specific date and time
  takeAttendance: async (req: Request, res: Response): Promise<void> => {
    try {
      const { courseId } = req.params;
      const { date, startTime, endTime, component, attendanceData, remarks } =
        req.body;

      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        res.status(400).json({ message: "Invalid course ID format" });
        return;
      }

      if (!date || !attendanceData || !Array.isArray(attendanceData)) {
        res.status(400).json({ message: "Invalid attendance data" });
        return;
      }

      // Validate course
      const course = await Course.findById(courseId);
      if (!course) {
        res.status(404).json({ message: "Course not found" });
        return;
      }

      // Check if course type requires component
      const isIntegratedCourse = course.type.includes("Integrated");
      if (isIntegratedCourse && !component) {
        res.status(400).json({
          message: "Component (theory/lab) is required for integrated courses",
        });
        return;
      }

      // Parse attendance date
      const attendanceDate = new Date(date);
      if (isNaN(attendanceDate.getTime())) {
        res.status(400).json({ message: "Invalid date format" });
        return;
      }

      // Validate time format if provided
      if (startTime && !startTime.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
        res
          .status(400)
          .json({ message: "Invalid start time format. Use HH:MM format" });
        return;
      }

      if (endTime && !endTime.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
        res
          .status(400)
          .json({ message: "Invalid end time format. Use HH:MM format" });
        return;
      }

      // Get current academic year (could be passed from client too)
      const academicYear = req.body.academicYear || "2023-24"; // Default or from request

      // Process each student attendance
      const updates = [];
      for (const record of attendanceData) {
        const { studentId, status } = record;

        if (!mongoose.Types.ObjectId.isValid(studentId)) {
          continue; // Skip invalid IDs
        }

        if (status !== "present" && status !== "absent") {
          continue; // Skip invalid status
        }

        const attendanceRecord: IAttendanceRecord = {
          date: attendanceDate,
          status,
          remarks: record.remarks || remarks,
        };

        // Add time fields if provided
        if (startTime) attendanceRecord.startTime = startTime;
        if (endTime) attendanceRecord.endTime = endTime;

        // Add component if applicable
        if (component) {
          attendanceRecord.component = component as "theory" | "lab";
        }

        // Find existing attendance document or create new one
        updates.push(
          (async () => {
            // First, find the document or create a new one if it doesn't exist
            let doc = await Attendance.findOne({
              courseId,
              studentId,
              academicYear,
            });

            if (!doc) {
              doc = new Attendance({
                courseId,
                studentId,
                academicYear,
                records: [], // Start with empty records
              });
            }

            // For integrated courses, ensure we're only modifying the correct component
            if (doc.records && doc.records.length > 0) {
              // Create a copy of the records array to modify
              const updatedRecords = [...doc.records];

              // Find the index of any existing record for this date, time, and component
              const startOfDay = new Date(attendanceDate);
              startOfDay.setHours(0, 0, 0, 0);

              const endOfDay = new Date(attendanceDate);
              endOfDay.setHours(23, 59, 59, 999);

              const recordIndex = updatedRecords.findIndex((r) => {
                const recordDate = new Date(r.date);
                const sameDate =
                  recordDate >= startOfDay && recordDate <= endOfDay;
                const sameTime =
                  (!startTime || r.startTime === startTime) &&
                  (!endTime || r.endTime === endTime);

                // Match based on date, time, and component
                if (isIntegratedCourse && component) {
                  return sameDate && sameTime && r.component === component;
                }
                // For non-integrated courses, match on date and time
                return sameDate && sameTime;
              });

              if (recordIndex >= 0) {
                // Replace existing record
                updatedRecords[recordIndex] = attendanceRecord;
              } else {
                // Add new record
                updatedRecords.push(attendanceRecord);
              }

              // Update the document with the modified records
              doc.records = updatedRecords;
            } else {
              // No existing records, just add the new one
              doc.records = [attendanceRecord];
            }

            // Save the document
            return doc.save();
          })()
        );
      }

      // Execute all updates
      await Promise.all(updates);

      // Return success
      res.json({
        message: `Attendance recorded for ${updates.length} students`,
        date: attendanceDate,
        startTime,
        endTime,
        component,
      });
    } catch (error) {
      console.error("Error recording attendance:", error);
      res.status(500).json({ message: "Error recording attendance", error });
    }
  },

  // Delete attendance record for a specific date and time
  deleteAttendanceRecord: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { courseId } = req.params;
      const { date, startTime, endTime, component } = req.body;

      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        res.status(400).json({ message: "Invalid course ID format" });
        return;
      }

      if (!date) {
        res.status(400).json({ message: "Date is required" });
        return;
      }

      // Parse date
      const attendanceDate = new Date(date);
      if (isNaN(attendanceDate.getTime())) {
        res.status(400).json({ message: "Invalid date format" });
        return;
      }

      // Get course to check if it's integrated
      const course = await Course.findById(courseId);
      if (!course) {
        res.status(404).json({ message: "Course not found" });
        return;
      }

      const isIntegratedCourse = course.type.includes("Integrated");

      // For integrated courses, component is required
      if (isIntegratedCourse && !component) {
        res.status(400).json({
          message:
            "Component (theory/lab) is required for deleting attendance in integrated courses",
        });
        return;
      }

      // Create date range for the day
      const startOfDay = new Date(attendanceDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(attendanceDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Build query to remove records for this date
      const query = { courseId };

      // Build the pull condition based on date, time, and component
      const pullCondition: {
        date: { $gte: Date; $lte: Date };
        startTime?: string;
        endTime?: string;
        component?: string;
      } = {
        date: { $gte: startOfDay, $lte: endOfDay },
      };

      // Add time fields if provided
      if (startTime) pullCondition.startTime = startTime;
      if (endTime) pullCondition.endTime = endTime;

      // Always include component in the condition if provided
      if (component) {
        pullCondition.component = component;
      }

      const update = {
        $pull: { records: pullCondition },
      };

      // Execute update on all attendance records for this course
      const result = await Attendance.updateMany(query, update);

      res.json({
        message: `Deleted attendance records for ${result.modifiedCount} students`,
        date: attendanceDate,
        startTime,
        endTime,
        component,
        modifiedCount: result.modifiedCount,
      });
    } catch (error) {
      console.error("Error deleting attendance records:", error);
      res
        .status(500)
        .json({ message: "Error deleting attendance records", error });
    }
  },
};
