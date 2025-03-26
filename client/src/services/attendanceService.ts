// client/src/services/attendanceService.ts
import api from "./api";

export interface AttendanceRecord {
  date: string | Date;
  status: "present" | "absent";
  component?: "theory" | "lab";
  remarks?: string;
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
  attendanceDates: {
    date: string;
    components: string[];
  }[];
}

export const attendanceService = {
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
    remarks?: string
  ): Promise<any> => {
    try {
      const response = await api.post(`/api/attendance/course/${courseId}`, {
        date,
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

  // Delete attendance for a specific date
  deleteAttendance: async (
    courseId: string,
    date: string | Date,
    component?: "theory" | "lab"
  ): Promise<any> => {
    try {
      const response = await api.delete(`/api/attendance/course/${courseId}`, {
        data: { date, component },
      });
      return response.data;
    } catch (error) {
      console.error("Error deleting attendance:", error);
      throw error;
    }
  },
};

export default attendanceService;
