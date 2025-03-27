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
      const { component, startDate, endDate, academicYear } = req.query;

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

      // Add academic year filter if provided
      if (academicYear) {
        query.academicYear = academicYear;
      }

      // Fetch attendance records
      const attendanceRecords = await Attendance.find(query)
        .populate("studentId", "registrationNumber name program")
        .sort({ "studentId.registrationNumber": 1 });

      // Group by studentId to handle multiple enrollments
      const studentMap = new Map();

      // Process each attendance record
      attendanceRecords.forEach((record) => {
        const studentId = record.studentId?._id?.toString();
        if (!studentId) return;

        const filteredRecords = record.records.filter(
          (r: IAttendanceRecord) => {
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
          }
        );

        // Group records by date to count unique class sessions
        const uniqueSessions = new Set();
        filteredRecords.forEach((record: IAttendanceRecord) => {
          const sessionKey = `${record.date.toISOString().split("T")[0]}_${
            record.startTime || ""
          }${record.endTime || ""}_${record.component || "default"}`;
          uniqueSessions.add(sessionKey);
        });

        const totalClasses = uniqueSessions.size;

        // Calculate present sessions
        const presentSessions = new Set();
        filteredRecords
          .filter((r: IAttendanceRecord) => r.status === "present")
          .forEach((record: IAttendanceRecord) => {
            const sessionKey = `${record.date.toISOString().split("T")[0]}_${
              record.startTime || ""
            }${record.endTime || ""}_${record.component || "default"}`;
            presentSessions.add(sessionKey);
          });

        const presentClasses = presentSessions.size;
        const attendancePercentage = totalClasses
          ? (presentClasses / totalClasses) * 100
          : 0;

        const studentData = {
          studentId: record.studentId,
          attendancePercentage: Math.round(attendancePercentage * 100) / 100,
          belowThreshold: attendancePercentage < 75,
          records: filteredRecords,
          totalClasses,
          presentClasses,
        };

        // If student already exists in map, merge records
        if (studentMap.has(studentId)) {
          const existingData = studentMap.get(studentId);

          // Merge records from both enrollments
          existingData.records = [...existingData.records, ...filteredRecords];

          // Recalculate sessions using all records
          const allSessions = new Set();
          existingData.records.forEach((r: IAttendanceRecord) => {
            const sessionKey = `${r.date.toISOString().split("T")[0]}_${
              r.startTime || ""
            }${r.endTime || ""}_${r.component || "default"}`;
            allSessions.add(sessionKey);
          });

          // Recalculate present sessions
          const allPresentSessions = new Set();
          existingData.records
            .filter((r: IAttendanceRecord) => r.status === "present")
            .forEach((r: IAttendanceRecord) => {
              const sessionKey = `${r.date.toISOString().split("T")[0]}_${
                r.startTime || ""
              }${r.endTime || ""}_${r.component || "default"}`;
              allPresentSessions.add(sessionKey);
            });

          // Update calculations
          existingData.totalClasses = allSessions.size;
          existingData.presentClasses = allPresentSessions.size;
          existingData.attendancePercentage = existingData.totalClasses
            ? (existingData.presentClasses / existingData.totalClasses) * 100
            : 0;
          existingData.belowThreshold = existingData.attendancePercentage < 75;

          // Store updated data
          studentMap.set(studentId, existingData);
        } else {
          // First time seeing this student
          studentMap.set(studentId, studentData);
        }
      });

      // Convert map to array for response
      const processedRecords = Array.from(studentMap.values());

      res.json(processedRecords);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      res
        .status(500)
        .json({ message: "Error fetching attendance records", error });
    }
  },

  // Get attendance summary for a course
  getAttendanceSummary: async (req: Request, res: Response): Promise<void> => {
    try {
      const { courseId } = req.params;
      const { component, academicYear } = req.query;

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

      // Add academic year filter if provided
      if (academicYear) {
        query.academicYear = academicYear;
      }

      // Fetch all attendance records for this course
      const attendanceRecords = await Attendance.find(query).populate(
        "studentId",
        "registrationNumber name program"
      );

      // Get unique students by ID
      const uniqueStudentIds = new Set();
      attendanceRecords.forEach((record) => {
        if (record.studentId && record.studentId._id) {
          uniqueStudentIds.add(record.studentId._id.toString());
        }
      });

      // Get unique dates and time slots on which attendance was taken
      const sessionsMap = new Map<string, Set<string>>();

      attendanceRecords.forEach((record) => {
        record.records.forEach((r: IAttendanceRecord) => {
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

      // Group by student to calculate attendance statistics properly
      const studentAttendanceMap = new Map();

      attendanceRecords.forEach((record) => {
        const studentId = record.studentId?._id?.toString();
        if (!studentId) return;

        // Group records by unique sessions to count properly
        const uniqueSessions = new Set();
        const presentSessions = new Set();

        record.records
          .filter((r: IAttendanceRecord) => {
            // Apply filters
            if (component && r.component !== component) return false;
            if (isIntegratedCourse && !r.component) return false;
            if (isIntegratedCourse && component && r.component !== component)
              return false;
            return true;
          })
          .forEach((r: IAttendanceRecord) => {
            // Create a unique session key
            const sessionKey = `${r.date.toISOString().split("T")[0]}_${
              r.startTime || ""
            }${r.endTime || ""}_${r.component || "default"}`;
            uniqueSessions.add(sessionKey);

            if (r.status === "present") {
              presentSessions.add(sessionKey);
            }
          });

        // If student already exists in map, merge session data
        if (studentAttendanceMap.has(studentId)) {
          const existingData = studentAttendanceMap.get(studentId);

          // Add all sessions to the sets
          uniqueSessions.forEach((session) =>
            existingData.uniqueSessions.add(session)
          );
          presentSessions.forEach((session) =>
            existingData.presentSessions.add(session)
          );

          studentAttendanceMap.set(studentId, existingData);
        } else {
          // First time seeing this student
          studentAttendanceMap.set(studentId, {
            uniqueSessions,
            presentSessions,
            student: record.studentId,
          });
        }
      });

      // Calculate overall stats
      const totalStudents = uniqueStudentIds.size;
      let belowThresholdCount = 0;
      let totalAttendancePercentage = 0;

      studentAttendanceMap.forEach((data) => {
        const total = data.uniqueSessions.size;
        const present = data.presentSessions.size;
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

      // Get all attendance records for this student in this course
      const attendanceRecords = await Attendance.find({
        courseId,
        studentId,
      })
        .populate("studentId", "registrationNumber name program")
        .populate("courseId", "code name type");

      if (!attendanceRecords || attendanceRecords.length === 0) {
        res.status(404).json({ message: "Attendance record not found" });
        return;
      }

      // Combine records from all enrollment periods
      let allRecords: IAttendanceRecord[] = [];
      attendanceRecords.forEach((record) => {
        allRecords = [...allRecords, ...record.records];
      });

      // Filter records by component if needed
      let filteredRecords = allRecords;
      if (component) {
        filteredRecords = filteredRecords.filter(
          (r: IAttendanceRecord) => r.component === component
        );
      } else if (isIntegratedCourse) {
        // For integrated courses without component specified, separate by component
        const theoryRecords = filteredRecords.filter(
          (r: IAttendanceRecord) => r.component === "theory"
        );
        const labRecords = filteredRecords.filter(
          (r: IAttendanceRecord) => r.component === "lab"
        );

        // Count unique sessions for both components
        const theoryUniqueSessions = new Set();
        theoryRecords.forEach((r: IAttendanceRecord) => {
          const sessionKey = `${r.date.toISOString().split("T")[0]}_${
            r.startTime || ""
          }${r.endTime || ""}`;
          theoryUniqueSessions.add(sessionKey);
        });

        const theoryPresentSessions = new Set();
        theoryRecords
          .filter((r: IAttendanceRecord) => r.status === "present")
          .forEach((r: IAttendanceRecord) => {
            const sessionKey = `${r.date.toISOString().split("T")[0]}_${
              r.startTime || ""
            }${r.endTime || ""}`;
            theoryPresentSessions.add(sessionKey);
          });

        const labUniqueSessions = new Set();
        labRecords.forEach((r: IAttendanceRecord) => {
          const sessionKey = `${r.date.toISOString().split("T")[0]}_${
            r.startTime || ""
          }${r.endTime || ""}`;
          labUniqueSessions.add(sessionKey);
        });

        const labPresentSessions = new Set();
        labRecords
          .filter((r: IAttendanceRecord) => r.status === "present")
          .forEach((r: IAttendanceRecord) => {
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
          student: attendanceRecords[0].studentId,
          course: attendanceRecords[0].courseId,
          academicYear: attendanceRecords
            .map((rec) => rec.academicYear)
            .join(", "),
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
      filteredRecords.forEach((r: IAttendanceRecord) => {
        const sessionKey = `${r.date.toISOString().split("T")[0]}_${
          r.startTime || ""
        }${r.endTime || ""}_${r.component || "default"}`;
        uniqueSessions.add(sessionKey);
      });

      const presentSessions = new Set();
      filteredRecords
        .filter((r: IAttendanceRecord) => r.status === "present")
        .forEach((r: IAttendanceRecord) => {
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
        student: attendanceRecords[0].studentId,
        course: attendanceRecords[0].courseId,
        academicYear: attendanceRecords
          .map((rec) => rec.academicYear)
          .join(", "),
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
      const {
        date,
        startTime,
        endTime,
        component,
        attendanceData,
        academicYear,
        remarks,
      } = req.body;

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
      const currentAcademicYear = academicYear || "2023-24"; // Default or from request

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
              academicYear: currentAcademicYear,
            });

            if (!doc) {
              doc = new Attendance({
                courseId,
                studentId,
                academicYear: currentAcademicYear,
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

              const recordIndex = updatedRecords.findIndex(
                (r: IAttendanceRecord) => {
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
                }
              );

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

  //modify attendance
  modifyAttendance: async (req: Request, res: Response): Promise<void> => {
    try {
      const { courseId } = req.params;
      const {
        originalDate,
        originalStartTime,
        originalEndTime,
        originalComponent,
        date,
        startTime,
        endTime,
        component,
        attendanceData,
        academicYear,
      } = req.body;

      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        res.status(400).json({ message: "Invalid course ID format" });
        return;
      }

      if (
        !originalDate ||
        !date ||
        !attendanceData ||
        !Array.isArray(attendanceData)
      ) {
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
      if (isIntegratedCourse && (!component || !originalComponent)) {
        res.status(400).json({
          message: "Component (theory/lab) is required for integrated courses",
        });
        return;
      }

      // Parse dates
      const origAttendanceDate = new Date(originalDate);
      const newAttendanceDate = new Date(date);

      if (
        isNaN(origAttendanceDate.getTime()) ||
        isNaN(newAttendanceDate.getTime())
      ) {
        res.status(400).json({ message: "Invalid date format" });
        return;
      }

      // Validate time formats if provided
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

      // Current academic year
      const currentAcademicYear = academicYear || "2023-24"; // Default or from request

      // Create date ranges for the original day
      const origStartOfDay = new Date(origAttendanceDate);
      origStartOfDay.setHours(0, 0, 0, 0);
      const origEndOfDay = new Date(origAttendanceDate);
      origEndOfDay.setHours(23, 59, 59, 999);

      // Process each student attendance
      for (const record of attendanceData) {
        const { studentId, status, remarks } = record;

        if (!mongoose.Types.ObjectId.isValid(studentId)) {
          continue; // Skip invalid IDs
        }

        if (status !== "present" && status !== "absent") {
          continue; // Skip invalid status
        }

        // Find the attendance document
        const attendanceDoc = await Attendance.findOne({
          courseId,
          studentId,
          academicYear: currentAcademicYear,
        });

        if (attendanceDoc) {
          // Find the index of the original record
          const recordIndex = attendanceDoc.records.findIndex(
            (r: IAttendanceRecord) => {
              const recordDate = new Date(r.date);
              const sameDate =
                recordDate >= origStartOfDay && recordDate <= origEndOfDay;
              const sameTime =
                (!originalStartTime || r.startTime === originalStartTime) &&
                (!originalEndTime || r.endTime === originalEndTime);

              // Match based on date, time, and component
              if (isIntegratedCourse && originalComponent) {
                return (
                  sameDate && sameTime && r.component === originalComponent
                );
              }
              // For non-integrated courses, match on date and time
              return sameDate && sameTime;
            }
          );

          // If we found the record, update it instead of removing/adding
          if (recordIndex !== -1) {
            // Create new attendance record
            const updatedRecord: IAttendanceRecord = {
              date: newAttendanceDate,
              status,
              remarks,
            };

            // Add time fields if provided
            if (startTime) updatedRecord.startTime = startTime;
            if (endTime) updatedRecord.endTime = endTime;

            // Add component if applicable
            if (component) {
              updatedRecord.component = component as "theory" | "lab";
            }

            // Update the existing record
            attendanceDoc.records[recordIndex] = updatedRecord;
            await attendanceDoc.save();
          }
        }
      }

      // Return success
      res.json({
        message: `Attendance records modified successfully`,
        originalDate: origAttendanceDate,
        newDate: newAttendanceDate,
        originalTimeSlot:
          originalStartTime && originalEndTime
            ? `${originalStartTime} - ${originalEndTime}`
            : null,
        newTimeSlot: startTime && endTime ? `${startTime} - ${endTime}` : null,
        originalComponent,
        newComponent: component,
      });
    } catch (error) {
      console.error("Error modifying attendance:", error);
      res.status(500).json({ message: "Error modifying attendance", error });
    }
  },
};

export default attendanceController;
