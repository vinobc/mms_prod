import React, { useState, useEffect, useRef } from "react";
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  Alert,
  Divider,
  CircularProgress,
  Grid,
  TextField,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Pagination,
  InputAdornment,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import {
  Upload as UploadIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import * as XLSX from "xlsx";
import { studentService } from "../../services/studentService";
import { Student, ProgramType } from "../../types";
import { useAuth } from "../../context/AuthContext";
import { mapProgramName } from "../../utils/programMapping";

// Define the expected Excel structure
interface StudentImportRow {
  "ENROLLMENT NUMBER": string;
  "STUDENT NAME": string;
  PROGRAM?: string;
  SCHOOL?: string;
  SEMESTER?: string | number;
  "ACADEMIC YEAR"?: string;
}

// Program options
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

// Academic year options
const academicYearOptions = [
  "2023-24",
  "2024-25",
  "2025-26",
  "2026-27",
  "2027-28",
];

const GlobalStudentManagement: React.FC = () => {
  // State for file upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importProcessing, setImportProcessing] = useState(false);
  const [importPreview, setImportPreview] = useState<StudentImportRow[]>([]);
  const [showImportDialog, setShowImportDialog] = useState(false);

  // State for student listing and management
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const rowsPerPage = 20;

  // Edit student state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get auth context for admin check
  const { user } = useAuth();
  const isAdmin = user?.isAdmin || false;

  // Load students on component mount
  useEffect(() => {
    fetchStudents();
  }, []);

  // Filter students when search term changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredStudents(students);
    } else {
      const lowercasedTerm = searchTerm.toLowerCase();
      const filtered = students.filter(
        (student) =>
          student.registrationNumber.toLowerCase().includes(lowercasedTerm) ||
          student.name.toLowerCase().includes(lowercasedTerm) ||
          (student.program &&
            student.program.toLowerCase().includes(lowercasedTerm)) ||
          (student.school &&
            student.school.toLowerCase().includes(lowercasedTerm))
      );
      setFilteredStudents(filtered);
    }

    // Reset pagination when search changes
    setPage(1);
  }, [searchTerm, students]);

  // Update total pages when filtered students change
  useEffect(() => {
    setTotalPages(Math.ceil(filteredStudents.length / rowsPerPage));
  }, [filteredStudents]);

  // Fetch all students from the database
  const fetchStudents = async () => {
    try {
      setLoading(true);
      const data = await studentService.getAllStudents();
      setStudents(data);
      setFilteredStudents(data);
      setTotalPages(Math.ceil(data.length / rowsPerPage));
    } catch (err: any) {
      console.error("Error fetching students:", err);
      setError(err.message || "Failed to fetch students");
    } finally {
      setLoading(false);
    }
  };

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      setImportError(null);

      // Parse file for preview
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (!evt.target) return;

        try {
          console.log("File loaded, parsing...");
          // Parse the Excel file
          const workbook = XLSX.read(evt.target.result, { type: "binary" });
          console.log("Workbook sheets:", workbook.SheetNames);

          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          // Convert to JSON with raw: false to handle headers
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });
          console.log("Raw parsed data:", jsonData.slice(0, 2)); // Log the first two entries

          // Check if we have data
          if (jsonData.length === 0) {
            setImportError("No data found in the Excel file");
            return;
          }

          // Transform data to correct column mapping regardless of casing
          const transformedData = jsonData.map((row: any) => {
            // Find the actual header keys from the Excel file
            const enrollmentKey = Object.keys(row).find(
              (key) =>
                key.toUpperCase().includes("ENROLLMENT") ||
                key.toUpperCase().includes("NUMBER") ||
                key.toUpperCase().includes("ID")
            );

            const nameKey = Object.keys(row).find(
              (key) =>
                key.toUpperCase().includes("NAME") ||
                key.toUpperCase().includes("STUDENT")
            );

            const programKey = Object.keys(row).find(
              (key) =>
                key.toUpperCase().includes("PROGRAM") ||
                key.toUpperCase().includes("COURSE") ||
                key.toUpperCase().includes("DEGREE")
            );

            const schoolKey = Object.keys(row).find(
              (key) =>
                key.toUpperCase().includes("SCHOOL") ||
                key.toUpperCase().includes("DEPARTMENT") ||
                key.toUpperCase().includes("FACULTY")
            );

            // Map the program to a valid program type
            const programValue = programKey ? row[programKey] : null;
            const mappedProgram = mapProgramName(programValue);

            console.log("Program from Excel:", programValue);
            console.log("Mapped to:", mappedProgram);

            return {
              "ENROLLMENT NUMBER": enrollmentKey ? row[enrollmentKey] : null,
              "STUDENT NAME": nameKey ? row[nameKey] : null,
              PROGRAM: mappedProgram,
              SCHOOL: schoolKey ? row[schoolKey] : null,
            };
          });

          console.log("Transformed data:", transformedData.slice(0, 2));

          // Set preview data
          setImportPreview(transformedData.slice(0, 5));
          setShowImportDialog(true);
        } catch (error) {
          console.error("Error parsing Excel file:", error);
          setImportError(
            "Failed to parse the Excel file. Please ensure it's a valid Excel file."
          );
        }
      };

      // Use binary string for better compatibility
      reader.readAsBinaryString(event.target.files[0]);
    }
  };

  // Handle file upload and processing
  const handleImport = async () => {
    if (!selectedFile) {
      setImportError("Please select a file first");
      return;
    }

    try {
      setImportProcessing(true);
      setImportError(null);

      // Read the file
      const reader = new FileReader();

      reader.onload = async (evt) => {
        if (!evt.target) return;

        try {
          console.log("Import started, reading file...");

          // Parse the Excel file with the same approach as preview
          const workbook = XLSX.read(evt.target.result, { type: "binary" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          // Get raw data
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });
          console.log(`Excel file contains ${jsonData.length} rows`);

          // Transform to correct format
          const transformedData = jsonData.map((row: any) => {
            // Find the actual header keys
            const enrollmentKey = Object.keys(row).find(
              (key) =>
                key.toUpperCase().includes("ENROLLMENT") ||
                key.toUpperCase().includes("NUMBER") ||
                key.toUpperCase().includes("ID")
            );

            const nameKey = Object.keys(row).find(
              (key) =>
                key.toUpperCase().includes("NAME") ||
                key.toUpperCase().includes("STUDENT")
            );

            const programKey = Object.keys(row).find(
              (key) =>
                key.toUpperCase().includes("PROGRAM") ||
                key.toUpperCase().includes("COURSE") ||
                key.toUpperCase().includes("DEGREE")
            );

            const schoolKey = Object.keys(row).find(
              (key) =>
                key.toUpperCase().includes("SCHOOL") ||
                key.toUpperCase().includes("DEPARTMENT") ||
                key.toUpperCase().includes("FACULTY")
            );

            const academicYearKey = Object.keys(row).find(
              (key) =>
                key.toUpperCase().includes("ACADEMIC") ||
                key.toUpperCase().includes("YEAR")
            );

            const semesterKey = Object.keys(row).find(
              (key) =>
                key.toUpperCase().includes("SEMESTER") ||
                key.toUpperCase().includes("TERM")
            );

            // Map the program to a valid program type using our utility
            const programValue = programKey ? row[programKey] : null;
            const mappedProgram = mapProgramName(programValue);

            return {
              registrationNumber: enrollmentKey
                ? String(row[enrollmentKey]).trim()
                : "",
              name: nameKey ? String(row[nameKey]).trim() : "",
              program: mappedProgram,
              school: schoolKey ? String(row[schoolKey]).trim() : "",
              semester: semesterKey ? Number(row[semesterKey]) : 1,
              academicYear: academicYearKey
                ? String(row[academicYearKey])
                : "2023-24",
              courseIds: [], // Empty because we're just importing the student
            };
          });

          console.log(`Transformed ${transformedData.length} rows`);

          // Filter out any entries without registration number or name
          const validStudents = transformedData.filter(
            (student) => student.registrationNumber && student.name
          );

          console.log(
            `Valid students after filtering: ${validStudents.length}`
          );
          console.log(
            `Rejected entries: ${transformedData.length - validStudents.length}`
          );

          if (validStudents.length < transformedData.length) {
            // Log rejected entries
            const rejectedEntries = transformedData.filter(
              (student) => !student.registrationNumber || !student.name
            );
            console.log("Rejected entries:", rejectedEntries);
          }

          if (validStudents.length === 0) {
            setImportError(
              "No valid student data found. Students must have enrollment number and name."
            );
            setImportProcessing(false);
            return;
          }

          // Bulk create/update students
          const result = await studentService.bulkCreateStudents(validStudents);

          // Show import results with details of rejected entries
          setImportSuccess(
            `Import processed: ${jsonData.length} entries found, ${validStudents.length} valid entries, ` +
              `${result.created?.length || 0} students created, ${
                result.updatedCount || 0
              } students updated. ` +
              `${
                transformedData.length - validStudents.length
              } entries were rejected due to missing data.`
          );
          setShowImportDialog(false);

          // Refresh the students list
          await fetchStudents();

          // Clear the file input
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
          setSelectedFile(null);
        } catch (error: any) {
          console.error("Error processing Excel data:", error);
          setImportError(error.message || "Failed to process the Excel file");
        } finally {
          setImportProcessing(false);
        }
      };

      reader.onerror = (error) => {
        console.error("FileReader error:", error);
        setImportError("Error reading the file");
        setImportProcessing(false);
      };

      reader.readAsBinaryString(selectedFile);
    } catch (error: any) {
      console.error("Error during import:", error);
      setImportError(error.message || "An error occurred during import");
      setImportProcessing(false);
    }
  };

  // Handle closing import dialog
  const handleCloseImportDialog = () => {
    setShowImportDialog(false);
    setImportPreview([]);
    // Don't clear selectedFile so it can still be imported
  };

  // Handle search input change
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchTerm("");
  };

  // Handle pagination change
  const handlePageChange = (
    event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    setPage(value);
  };

  // Handle student edit
  const handleEditStudent = (student: Student) => {
    setStudentToEdit(student);
    setEditDialogOpen(true);
  };

  // Handle saving edited student
  const handleSaveStudent = async () => {
    if (!studentToEdit) return;

    try {
      setLoading(true);
      await studentService.updateStudent(studentToEdit._id, {
        name: studentToEdit.name,
        registrationNumber: studentToEdit.registrationNumber,
        program: studentToEdit.program,
        school: studentToEdit.school,
        semester: studentToEdit.semester,
        academicYear: studentToEdit.academicYear,
      });

      setSuccess("Student updated successfully");
      setEditDialogOpen(false);
      await fetchStudents(); // Refresh list
    } catch (error: any) {
      console.error("Error updating student:", error);
      setError(error.message || "Failed to update student");
    } finally {
      setLoading(false);
    }
  };

  // Close snackbars
  const handleCloseAlert = () => {
    setError(null);
    setSuccess(null);
    setImportError(null);
    setImportSuccess(null);
  };

  // Get current page of students
  const getCurrentPageStudents = () => {
    const startIndex = (page - 1) * rowsPerPage;
    return filteredStudents.slice(startIndex, startIndex + rowsPerPage);
  };

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom sx={{ my: 3 }}>
        Global Student Management
      </Typography>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          <Typography variant="h5">Student Database</Typography>
          <Box display="flex" gap={2}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<UploadIcon />}
              onClick={() => fileInputRef.current?.click()}
            >
              Import Students
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: "none" }}
              accept=".xlsx, .xls"
            />
          </Box>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Search Students"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search by enrollment number, name, or program"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton onClick={handleClearSearch} edge="end">
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
        </Grid>

        {loading && students.length === 0 ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Enrollment Number</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Program</TableCell>
                    <TableCell>School</TableCell>
                    <TableCell>Semester</TableCell>
                    <TableCell>Academic Year</TableCell>
                    <TableCell>Courses</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getCurrentPageStudents().map((student) => (
                    <TableRow
                      key={student._id}
                      sx={{
                        "&:hover": { backgroundColor: "#f5f5f5" },
                      }}
                    >
                      <TableCell>{student.registrationNumber}</TableCell>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>{student.program}</TableCell>
                      <TableCell>{student.school || "N/A"}</TableCell>
                      <TableCell>{student.semester}</TableCell>
                      <TableCell>{student.academicYear}</TableCell>
                      <TableCell>
                        {student.courseIds?.length || 0} course(s)
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleEditStudent(student)}
                        >
                          <EditIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredStudents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                        No students found
                        {searchTerm ? " matching the search criteria" : ""}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
              />
            </Box>

            <Box mt={2} display="flex" justifyContent="flex-end">
              <Typography variant="body2" color="textSecondary">
                Showing {filteredStudents.length} of {students.length} students
              </Typography>
            </Box>
          </>
        )}
      </Paper>

      {/* Import Preview Dialog */}
      <Dialog
        open={showImportDialog}
        onClose={handleCloseImportDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Import Preview</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            The following data will be imported from your Excel file. Please
            review before proceeding.
          </Typography>

          {importPreview.length > 0 && (
            <TableContainer sx={{ mt: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Enrollment Number</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Program</TableCell>
                    <TableCell>School</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {importPreview.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{row["ENROLLMENT NUMBER"]}</TableCell>
                      <TableCell>{row["STUDENT NAME"]}</TableCell>
                      <TableCell>{row["PROGRAM"] || "BBA"}</TableCell>
                      <TableCell>{row["SCHOOL"] || "N/A"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <Typography variant="body2" sx={{ mt: 2, color: "text.secondary" }}>
            Note: This is showing the first 5 rows from your Excel file. The
            import will process all rows.
          </Typography>

          {importError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {importError}
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                Please ensure your Excel file has columns for enrollment number
                and student name.
              </Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseImportDialog}>Cancel</Button>
          <Button
            onClick={handleImport}
            variant="contained"
            color="primary"
            disabled={importProcessing || !!importError}
          >
            {importProcessing ? <CircularProgress size={24} /> : "Import All"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Student</DialogTitle>
        <DialogContent>
          {studentToEdit && (
            <Box component="form" sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Enrollment Number"
                    value={studentToEdit.registrationNumber}
                    onChange={(e) =>
                      setStudentToEdit({
                        ...studentToEdit,
                        registrationNumber: e.target.value,
                      })
                    }
                    disabled={!isAdmin} // Only admin can change enrollment numbers
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Name"
                    value={studentToEdit.name}
                    onChange={(e) =>
                      setStudentToEdit({
                        ...studentToEdit,
                        name: e.target.value,
                      })
                    }
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Program</InputLabel>
                    <Select
                      value={studentToEdit.program}
                      onChange={(e) =>
                        setStudentToEdit({
                          ...studentToEdit,
                          program: e.target.value as ProgramType,
                        })
                      }
                      label="Program"
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
                    fullWidth
                    label="School"
                    value={studentToEdit.school || ""}
                    onChange={(e) =>
                      setStudentToEdit({
                        ...studentToEdit,
                        school: e.target.value,
                      })
                    }
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Semester"
                    value={studentToEdit.semester}
                    onChange={(e) =>
                      setStudentToEdit({
                        ...studentToEdit,
                        semester: Number(e.target.value),
                      })
                    }
                    InputProps={{ inputProps: { min: 1, max: 8 } }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Academic Year</InputLabel>
                    <Select
                      value={studentToEdit.academicYear}
                      onChange={(e) =>
                        setStudentToEdit({
                          ...studentToEdit,
                          academicYear: e.target.value,
                        })
                      }
                      label="Academic Year"
                    >
                      {academicYearOptions.map((year) => (
                        <MenuItem key={year} value={year}>
                          {year}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSaveStudent}
            variant="contained"
            color="primary"
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Alerts */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={handleCloseAlert}
      >
        <Alert onClose={handleCloseAlert} severity="error">
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={handleCloseAlert}
      >
        <Alert onClose={handleCloseAlert} severity="success">
          {success}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!importSuccess}
        autoHideDuration={6000}
        onClose={handleCloseAlert}
      >
        <Alert onClose={handleCloseAlert} severity="success">
          {importSuccess}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default GlobalStudentManagement;
