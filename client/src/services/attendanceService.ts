// client/src/services/attendanceService.ts
import api from "./api";

export interface AttendanceRecord {
  date: string | Date;
  startTime?: string; // Format: "HH:MM" (24-hour)
  endTime?: string; // Format: "HH:MM" (24-hour)
  status: "present" | "absent";
  component?: "theory" | "lab";
  remarks?: string;
}

export interface AttendanceTimeSlot {
  startTime: string;
  endTime: string;
  label: string;
}

export interface StudentAttendance {
  studentId: {
    _id: string;
    registrationNumber: string;
    name: string;
    program: string;
  };
  attendancePercentage: number;
  belowThreshold: boolean;
  records: AttendanceRecord[];
  totalClasses: number;
  presentClasses: number;
}

export interface AttendanceData {
  studentId: string;
  status: "present" | "absent";
  remarks?: string;
}

export interface AttendanceSummary {
  totalStudents: number;
  totalClasses: number;
  belowThresholdCount: number;
  averageAttendance: number;
  attendanceSessions: {
    date: string;
    timeSlot: string | null;
    components: string[];
  }[];
}

// Predefined time slots that match the institution's schedule
export const THEORY_TIME_SLOTS: AttendanceTimeSlot[] = [
  { label: "9:00 - 9.50", startTime: "09:00", endTime: "09:50" },
  { label: "9:55 - 10.45", startTime: "09:55", endTime: "10:45" },
  { label: "10:50 - 11.40", startTime: "10:50", endTime: "11:40" },
  { label: "11:45 - 12.35", startTime: "11:45", endTime: "12:35" },
  { label: "1:15 - 2.05", startTime: "13:15", endTime: "14:05" },
  { label: "2:10 - 3.00", startTime: "14:10", endTime: "15:00" },
  { label: "3:05 - 3.55", startTime: "15:05", endTime: "15:55" },
  { label: "4:00 - 4.50", startTime: "16:00", endTime: "16:50" },
];

export const LAB_TIME_SLOTS: AttendanceTimeSlot[] = [
  { label: "9:00 AM - 10:40 AM", startTime: "09:00", endTime: "10:40" },
  { label: "10:50 AM - 12:30 PM", startTime: "10:50", endTime: "12:30" },
  { label: "1:15 PM - 2:55 PM", startTime: "13:15", endTime: "14:55" },
  { label: "3:05 PM - 4:45 PM", startTime: "15:05", endTime: "16:45" },
];

export const attendanceService = {
  // Get predefined time slots based on component type and course type
  getTimeSlots: (
    component?: "theory" | "lab",
    courseType?: string
  ): AttendanceTimeSlot[] => {
    // For lab-only courses, always return lab time slots
    if (courseType === "UG-Lab-Only" || courseType === "PG-Lab-Only") {
      return LAB_TIME_SLOTS;
    }

    // For other courses, return slots based on component
    return component === "lab" ? LAB_TIME_SLOTS : THEORY_TIME_SLOTS;
  },

  // Format time slot for display (e.g., "09:00 - 10:40")
  formatTimeSlot: (startTime?: string, endTime?: string): string => {
    if (!startTime || !endTime) return "No time specified";
    return `${startTime} - ${endTime}`;
  },

  // Find label for a time slot
  getTimeSlotLabel: (
    startTime: string,
    endTime: string,
    component?: "theory" | "lab"
  ): string => {
    const slots = component === "lab" ? LAB_TIME_SLOTS : THEORY_TIME_SLOTS;
    const slot = slots.find(
      (s) => s.startTime === startTime && s.endTime === endTime
    );
    return slot ? slot.label : `${startTime} - ${endTime}`;
  },

  // Get attendance for a course
  getCourseAttendance: async (
    courseId: string,
    params?: {
      component?: "theory" | "lab";
      startDate?: string;
      endDate?: string;
    }
  ): Promise<StudentAttendance[]> => {
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      if (params?.component) queryParams.append("component", params.component);
      if (params?.startDate) queryParams.append("startDate", params.startDate);
      if (params?.endDate) queryParams.append("endDate", params.endDate);

      const queryString = queryParams.toString()
        ? `?${queryParams.toString()}`
        : "";

      const response = await api.get(
        `/api/attendance/course/${courseId}${queryString}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching course attendance:", error);
      throw error;
    }
  },

  // Get attendance summary
  getAttendanceSummary: async (
    courseId: string,
    component?: "theory" | "lab"
  ): Promise<AttendanceSummary> => {
    try {
      const queryParams = component ? `?component=${component}` : "";
      const response = await api.get(
        `/api/attendance/course/${courseId}/summary${queryParams}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching attendance summary:", error);
      throw error;
    }
  },

  // Get attendance for a specific student in a course
  getStudentAttendance: async (
    courseId: string,
    studentId: string
  ): Promise<any> => {
    try {
      const response = await api.get(
        `/api/attendance/course/${courseId}/student/${studentId}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching student attendance:", error);
      throw error;
    }
  },

  // Take attendance for a course
  takeAttendance: async (
    courseId: string,
    date: string | Date,
    attendanceData: AttendanceData[],
    component?: "theory" | "lab",
    academicYear?: string,
    remarks?: string,
    startTime?: string,
    endTime?: string
  ): Promise<any> => {
    try {
      const response = await api.post(`/api/attendance/course/${courseId}`, {
        date,
        startTime,
        endTime,
        component,
        attendanceData,
        academicYear,
        remarks,
      });
      return response.data;
    } catch (error) {
      console.error("Error recording attendance:", error);
      throw error;
    }
  },

  // Delete attendance for a specific date and time slot
  deleteAttendance: async (
    courseId: string,
    date: string | Date,
    component?: "theory" | "lab",
    startTime?: string,
    endTime?: string
  ): Promise<any> => {
    try {
      const response = await api.delete(`/api/attendance/course/${courseId}`, {
        data: { date, component, startTime, endTime },
      });
      return response.data;
    } catch (error) {
      console.error("Error deleting attendance:", error);
      throw error;
    }
  },

  //modify attendance
  modifyAttendance: async (
    courseId: string,
    originalDate: string | Date,
    date: string | Date,
    attendanceData: AttendanceData[],
    originalStartTime?: string,
    originalEndTime?: string,
    startTime?: string,
    endTime?: string,
    originalComponent?: "theory" | "lab",
    component?: "theory" | "lab",
    academicYear?: string
  ): Promise<any> => {
    try {
      const response = await api.put(`/api/attendance/course/${courseId}`, {
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
      });
      return response.data;
    } catch (error) {
      console.error("Error modifying attendance:", error);
      throw error;
    }
  },
};

export default attendanceService;
