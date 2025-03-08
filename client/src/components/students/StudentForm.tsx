import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Chip,
  Box,
  SelectChangeEvent,
  Typography,
  CircularProgress,
  IconButton,
  InputAdornment,
  // Autocomplete,
} from "@mui/material";
import { Course, Student, ProgramType } from "../../types";
import { Search as SearchIcon } from "@mui/icons-material";
import { studentService } from "../../services/studentService";

interface StudentFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (student: Partial<Student>) => void;
  student?: Student;
  courses: Course[];
}

interface StudentFormData {
  registrationNumber: string;
  name: string;
  program: ProgramType;
  courseIds: string[];
  semester: number;
  academicYear: string;
}

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const programOptions: ProgramType[] = [
  "BBA",
  "B.Com.",
  "B.Tech (CSE)",
  "B.Tech (AI&ML)",
  "B.Tech CSE (AI & ML)",  
  "B.Tech CSE (IoT)",
  "B.Tech CSE (Robotics)",     
  "B.Tech.(Biotechnology)",
  "B.Pharm",
  "BA Applied Psychology",
  "B.Sc. Clinical Psychology",
  "BA LLB",
  "BA",
  "B.Sc.",
  "B.A. LLB",
  "B.Des.",
  "BCA",
  "M.Sc. Data Science",
  "M.Sc. Cyber Security",
  "M.Tech.",
  "MCA",
  "LLM",
  "MBA",
  "M.Sc. Clinical Psychology",
  "M.Sc(Biotechnology)",
];

const academicYearOptions = [
  "2023-24",
  "2024-25",
  "2025-26",
  "2026-27",
  "2027-28",
];

const StudentForm: React.FC<StudentFormProps> = ({
  open,
  onClose,
  onSubmit,
  student,
  courses,
}) => {
  const [formData, setFormData] = useState<StudentFormData>({
    registrationNumber: "",
    name: "",
    program: "BBA", // Default value
    courseIds: [],
    semester: 1,
    academicYear: "2023-24",
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [searching, setSearching] = useState(false);
  const [existingStudentMode, setExistingStudentMode] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Debug logs for the student prop
  useEffect(() => {
    if (student) {
      console.log("Student to edit:", student);
      console.log("Student courseIds:", student.courseIds);
    }
  }, [student]);

  useEffect(() => {
    if (student) {
      // Ensure courseIds is always an array
      const courseIds = Array.isArray(student.courseIds)
        ? student.courseIds
        : [];

      setFormData({
        registrationNumber: student.registrationNumber,
        name: student.name,
        program: student.program || "BBA", // Handling any undefined values
        courseIds: courseIds,
        semester: student.semester,
        academicYear: student.academicYear,
      });
    } else {
      setFormData({
        registrationNumber: "",
        name: "",
        program: "BBA",
        courseIds: [],
        semester: 1,
        academicYear: academicYearOptions[0],
      });

      // Reset search and mode when opening a new form
      setSearchTerm("");
      setSearchResults([]);
      setExistingStudentMode(false);
    }
  }, [student, open]);

  // Handle search for existing students
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchError("Please enter a search term");
      return;
    }

    setSearching(true);
    setSearchError(null);

    try {
      // First try to find by exact registration number
      try {
        const student = await studentService.findByRegistrationNumber(
          searchTerm
        );
        if (student) {
          setSearchResults([student]);
          return;
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        // If not found by registration number, search by keyword
        console.log(
          "Student not found by registration number, searching by keyword"
        );
      }

      // Search by name or partial registration number
      const results = await studentService.searchStudents(searchTerm);
      setSearchResults(results);

      if (results.length === 0) {
        setSearchError("No students found matching your search");
      }
    } catch (error) {
      console.error("Error searching for students:", error);
      setSearchError("Error searching for students");
    } finally {
      setSearching(false);
    }
  };

  // Select an existing student
  const handleSelectExistingStudent = (student: Student) => {
    setFormData({
      registrationNumber: student.registrationNumber,
      name: student.name,
      program: student.program || "BBA",
      // courseIds: Array.isArray(student.courseIds)
      //   ? student.courseIds.map((id) => (typeof id === "string" ? id : id._id))
      //   : [],
      courseIds: Array.isArray(student.courseIds) ? student.courseIds : [],

      semester: student.semester,
      academicYear: student.academicYear,
    });

    setExistingStudentMode(true);
    setSearchResults([]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev: StudentFormData) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProgramChange = (event: SelectChangeEvent<string>) => {
    setFormData((prev: StudentFormData) => ({
      ...prev,
      program: event.target.value as ProgramType,
    }));
  };

  const handleCourseChange = (event: SelectChangeEvent<string[]>) => {
    const {
      target: { value },
    } = event;

    // On autofill we get a stringified value
    const courseIds = typeof value === "string" ? value.split(",") : value;

    console.log("Selected course IDs:", courseIds);

    setFormData((prev: StudentFormData) => ({
      ...prev,
      courseIds: courseIds,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting form data:", formData);
    onSubmit(formData);
  };

  // Check if each course exists in the courses array
  const validateCourseIds = () => {
    if (!formData.courseIds || formData.courseIds.length === 0) return true;

    return formData.courseIds.every((id) =>
      courses.some((course) => course._id === id)
    );
  };

  const isCoursesValid = validateCourseIds();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{student ? "Edit Student" : "Add Student"}</DialogTitle>
        <DialogContent>
          {!student && (
            <Box sx={{ mb: 3, mt: 1 }}>
              <Typography variant="subtitle1" gutterBottom>
                Search for an existing student or add a new one
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={9}>
                  <TextField
                    fullWidth
                    label="Search by Registration Number or Name"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    variant="outlined"
                    placeholder="Enter registration number or name"
                    helperText={
                      searchError ||
                      "Press enter or search button to find existing students"
                    }
                    error={!!searchError}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={handleSearch}
                            edge="end"
                            disabled={searching}
                          >
                            {searching ? (
                              <CircularProgress size={24} />
                            ) : (
                              <SearchIcon />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSearch();
                      }
                    }}
                  />
                </Grid>
              </Grid>

              {/* Search results */}
              {searchResults.length > 0 && (
                <Box
                  sx={{
                    mt: 2,
                    mb: 2,
                    p: 2,
                    bgcolor: "#f5f5f5",
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="subtitle1" gutterBottom>
                    Search Results:
                  </Typography>
                  {searchResults.map((student) => (
                    <Box
                      key={student._id}
                      sx={{
                        p: 1,
                        borderBottom: "1px solid #e0e0e0",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Box>
                        <Typography variant="body1">
                          {student.name} ({student.registrationNumber})
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {student.program} - Semester {student.semester},{" "}
                          {student.academicYear}
                        </Typography>
                      </Box>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleSelectExistingStudent(student)}
                      >
                        Select
                      </Button>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          )}

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                name="registrationNumber"
                label="Registration Number"
                value={formData.registrationNumber}
                onChange={handleChange}
                fullWidth
                required
                disabled={existingStudentMode || !!student} // Disable if using existing student
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="name"
                label="Student Name"
                value={formData.name}
                onChange={handleChange}
                fullWidth
                required
                disabled={existingStudentMode || !!student} // Disable if using existing student
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="program-label">Program</InputLabel>
                <Select
                  labelId="program-label"
                  name="program"
                  value={formData.program}
                  onChange={handleProgramChange}
                  label="Program"
                  required
                  disabled={existingStudentMode || !!student} // Disable if using existing student
                >
                  {programOptions.map((program) => (
                    <MenuItem key={program} value={program}>
                      {program}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="semester"
                label="Semester"
                type="number"
                value={formData.semester}
                onChange={handleChange}
                fullWidth
                required
                InputProps={{ inputProps: { min: 1, max: 8 } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="academic-year-label">Academic Year</InputLabel>
                <Select
                  labelId="academic-year-label"
                  name="academicYear"
                  value={formData.academicYear}
                  onChange={(e) =>
                    handleChange(e as React.ChangeEvent<HTMLInputElement>)
                  }
                  label="Academic Year"
                  required
                >
                  {academicYearOptions.map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!isCoursesValid}>
                <InputLabel id="courses-label">Courses</InputLabel>
                <Select
                  labelId="courses-label"
                  multiple
                  value={formData.courseIds}
                  onChange={handleCourseChange}
                  input={<OutlinedInput label="Courses" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {selected.map((courseId) => {
                        const course = courses.find((c) => c._id === courseId);
                        return course ? (
                          <Chip
                            key={courseId}
                            label={`${course.code} - ${course.name}`}
                          />
                        ) : (
                          <Chip
                            key={courseId}
                            label={`ID: ${courseId.substring(0, 8)}...`}
                            color="error"
                          />
                        );
                      })}
                    </Box>
                  )}
                  MenuProps={MenuProps}
                >
                  {courses.map((course) => (
                    <MenuItem key={course._id} value={course._id}>
                      {course.code} - {course.name}
                    </MenuItem>
                  ))}
                </Select>
                {!isCoursesValid && (
                  <Typography color="error" variant="caption">
                    One or more selected courses are invalid
                  </Typography>
                )}
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={!isCoursesValid}
          >
            {student
              ? "Update Student"
              : existingStudentMode
              ? "Add to Courses"
              : "Add Student"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default StudentForm;
