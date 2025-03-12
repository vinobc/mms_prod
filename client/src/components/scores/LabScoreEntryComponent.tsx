// // // components/scores/LabScoreEntryComponent.tsx
// // import React, { useState, useEffect } from "react";
// // import {
// //   Box,
// //   Paper,
// //   Table,
// //   TableBody,
// //   TableCell,
// //   TableContainer,
// //   TableHead,
// //   TableRow,
// //   TextField,
// //   Typography,
// //   Grid,
// //   Button,
// //   Alert,
// //   IconButton,
// // } from "@mui/material";
// // import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
// // import { Student, CourseType } from "../../types";
// // import { getComponentScale, convertLabScore } from "../../utils/scoreUtils";
// // import { numberToWords } from "../../utils/formatUtils";

// // interface LabSession {
// //   date: string;
// //   maxMarks: number;
// //   obtainedMarks: number;
// //   index?: number; // Explicitly include index to ensure persistence
// // }

// // interface LabScore {
// //   componentName: string;
// //   sessions: LabSession[];
// //   maxMarks: number;
// //   totalObtained: number;
// // }

// // interface LabScoreEntryComponentProps {
// //   students: Student[];
// //   componentName: string;
// //   courseType: CourseType;
// //   onScoresChange: (scores: { [studentId: string]: LabScore }) => void;
// //   initialScores?: { [studentId: string]: LabScore };
// // }

// // const LabScoreEntryComponent: React.FC<LabScoreEntryComponentProps> = ({
// //   students,
// //   courseType,
// //   onScoresChange,
// //   initialScores = {},
// // }) => {
// //   const [error, setError] = useState<string | null>(null);
// //   const [dates, setDates] = useState<string[]>([
// //     new Date().toISOString().split("T")[0],
// //     new Date().toISOString().split("T")[0],
// //   ]);

// //   // Store scores as a dictionary of studentId -> sessions array
// //   const [studentScores, setStudentScores] = useState<{
// //     [studentId: string]: LabSession[];
// //   }>({});

// //   // Get scale configuration based on course type
// //   const scaleConfig = getComponentScale(courseType, "LAB");
// //   const maxMarks = scaleConfig.maxMarks;
// //   const passingMarks = scaleConfig.passingMarks;

// //   // Initialize from props
// //   useEffect(() => {
// //     // Initialize dates from initialScores if available
// //     let defaultDates = [...dates];

// //     if (Object.keys(initialScores).length > 0) {
// //       const firstStudentId = Object.keys(initialScores)[0];
// //       const firstStudent = initialScores[firstStudentId];

// //       if (firstStudent?.sessions && firstStudent.sessions.length > 0) {
// //         // Sort sessions by index if available to maintain order
// //         const sortedSessions = [...firstStudent.sessions].sort((a, b) =>
// //           a.index !== undefined && b.index !== undefined ? a.index - b.index : 0
// //         );

// //         defaultDates = sortedSessions.map(
// //           (s) => s.date || new Date().toISOString().split("T")[0]
// //         );
// //         setDates(defaultDates);
// //       }
// //     }

// //     // Initialize student scores from initialScores
// //     const initialStudentScores: { [studentId: string]: LabSession[] } = {};

// //     students.forEach((student) => {
// //       const studentId = student._id;
// //       const initialScore = initialScores[studentId];

// //       if (initialScore?.sessions && initialScore.sessions.length > 0) {
// //         // Sort sessions by index to maintain order
// //         const sortedSessions = [...initialScore.sessions].sort((a, b) =>
// //           a.index !== undefined && b.index !== undefined ? a.index - b.index : 0
// //         );

// //         initialStudentScores[studentId] = sortedSessions;
// //       } else {
// //         // Create default empty scores for each date
// //         initialStudentScores[studentId] = defaultDates.map((date, idx) => ({
// //           date,
// //           maxMarks: 10,
// //           obtainedMarks: 0,
// //           index: idx,
// //         }));
// //       }
// //     });

// //     setStudentScores(initialStudentScores);

// //     // Initial update to parent after setting up state
// //     setTimeout(() => {
// //       updateParent(initialStudentScores, defaultDates);
// //     }, 100);
// //   }, [initialScores]);

// //   // Calculate total for a student based on course type
// //   const calculateTotal = (sessions: LabSession[]): number => {
// //     if (!sessions || sessions.length === 0) return 0;

// //     let sum = 0;
// //     let count = 0;

// //     for (const session of sessions) {
// //       if (session.obtainedMarks !== undefined) {
// //         sum += session.obtainedMarks;
// //         count++;
// //       }
// //     }

// //     if (count === 0) return 0;

// //     // Calculate average and scale to max marks based on course type
// //     const average = sum / count;
// //     return convertLabScore(average, courseType);
// //   };

// //   // Handle date change
// //   const handleDateChange = (index: number, newDate: string) => {
// //     const newDates = [...dates];
// //     newDates[index] = newDate;
// //     setDates(newDates);

// //     // Update all student sessions with the new date
// //     const updatedScores = { ...studentScores };
// //     Object.keys(updatedScores).forEach((studentId) => {
// //       if (updatedScores[studentId][index]) {
// //         updatedScores[studentId][index] = {
// //           ...updatedScores[studentId][index],
// //           date: newDate,
// //         };
// //       }
// //     });

// //     setStudentScores(updatedScores);
// //     updateParent(updatedScores, newDates);
// //   };

// //   // Add a new session
// //   const handleAddSession = () => {
// //     // Add a new date
// //     const newDate = new Date().toISOString().split("T")[0];
// //     const newDates = [...dates, newDate];
// //     setDates(newDates);

// //     // Add an empty score for this date for all students
// //     const updatedScores = { ...studentScores };
// //     const newIndex = dates.length;

// //     Object.keys(updatedScores).forEach((studentId) => {
// //       if (!updatedScores[studentId]) {
// //         updatedScores[studentId] = [];
// //       }

// //       updatedScores[studentId].push({
// //         date: newDate,
// //         maxMarks: 10,
// //         obtainedMarks: 0,
// //         index: newIndex,
// //       });
// //     });

// //     setStudentScores(updatedScores);
// //     updateParent(updatedScores, newDates);
// //   };

// //   // Remove a session
// //   const handleRemoveSession = (index: number) => {
// //     if (dates.length <= 2) {
// //       setError("You must have at least two lab sessions");
// //       return;
// //     }

// //     // Remove the date
// //     const newDates = dates.filter((_, i) => i !== index);
// //     setDates(newDates);

// //     // Remove the session from all students
// //     const updatedScores = { ...studentScores };

// //     Object.keys(updatedScores).forEach((studentId) => {
// //       updatedScores[studentId] = updatedScores[studentId]
// //         .filter((_, i) => i !== index)
// //         // Update indices after removal
// //         .map((session, newIdx) => ({
// //           ...session,
// //           index: newIdx,
// //         }));
// //     });

// //     setStudentScores(updatedScores);
// //     updateParent(updatedScores, newDates);
// //   };

// //   // Handle score change
// //   const handleScoreChange = (
// //     studentId: string,
// //     sessionIndex: number,
// //     value: string
// //   ) => {
// //     try {
// //       // Convert to number
// //       let numValue = parseInt(value);
// //       if (isNaN(numValue)) numValue = 0;

// //       // Ensure value is between 0 and 10
// //       numValue = Math.max(0, Math.min(10, numValue));

// //       // Update the specific student's score
// //       const updatedScores = { ...studentScores };

// //       if (!updatedScores[studentId]) {
// //         // Initialize if missing
// //         updatedScores[studentId] = dates.map((date, idx) => ({
// //           date,
// //           maxMarks: 10,
// //           obtainedMarks: 0,
// //           index: idx,
// //         }));
// //       }

// //       if (!updatedScores[studentId][sessionIndex]) {
// //         // Initialize if missing
// //         updatedScores[studentId][sessionIndex] = {
// //           date: dates[sessionIndex],
// //           maxMarks: 10,
// //           obtainedMarks: 0,
// //           index: sessionIndex,
// //         };
// //       }

// //       updatedScores[studentId][sessionIndex] = {
// //         ...updatedScores[studentId][sessionIndex],
// //         obtainedMarks: numValue,
// //       };

// //       setStudentScores(updatedScores);
// //       updateParent(updatedScores, dates);
// //     } catch (err) {
// //       console.error("Error updating score:", err);
// //     }
// //   };

// //   // Convert to parent format and update
// //   const updateParent = (
// //     currentScores: { [studentId: string]: LabSession[] } = studentScores,
// //     currentDates: string[] = dates
// //   ) => {
// //     const formattedScores: { [studentId: string]: LabScore } = {};

// //     students.forEach((student) => {
// //       const studentId = student._id;
// //       const sessions = currentScores[studentId] || [];

// //       // Ensure all dates have a session
// //       const completeSessionsArray = currentDates.map((date, idx) => {
// //         const existingSession =
// //           sessions.find((s) => s.index === idx) ||
// //           sessions.find((s) => s.date === date);

// //         if (existingSession) {
// //           return {
// //             ...existingSession,
// //             index: idx, // Update index to match position
// //           };
// //         }

// //         return {
// //           date,
// //           maxMarks: 10,
// //           obtainedMarks: 0,
// //           index: idx,
// //         };
// //       });

// //       // Calculate total
// //       const total = calculateTotal(completeSessionsArray);

// //       // Create the score object
// //       formattedScores[studentId] = {
// //         componentName: "LAB",
// //         sessions: completeSessionsArray,
// //         maxMarks: maxMarks,
// //         totalObtained: total,
// //       };
// //     });

// //     // Update parent
// //     onScoresChange(formattedScores);
// //   };

// //   return (
// //     <Box sx={{ width: "100%" }}>
// //       <Grid container spacing={2} sx={{ mb: 3 }}>
// //         <Grid item xs={12} sm={6}>
// //           <Typography variant="h6">LAB</Typography>
// //         </Grid>
// //         <Grid
// //           item
// //           xs={12}
// //           sm={6}
// //           sx={{ display: "flex", justifyContent: "flex-end" }}
// //         >
// //           <Button
// //             variant="contained"
// //             startIcon={<AddIcon />}
// //             onClick={handleAddSession}
// //             size="small"
// //           >
// //             Add Lab Session
// //           </Button>
// //         </Grid>
// //       </Grid>

// //       {error && (
// //         <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
// //           {error}
// //         </Alert>
// //       )}

// //       <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
// //         <Table size="small">
// //           <TableHead>
// //             <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
// //               <TableCell>SNo.</TableCell>
// //               <TableCell>Academic_Year</TableCell>
// //               <TableCell>Program</TableCell>
// //               <TableCell>Enrollment No.</TableCell>
// //               <TableCell>Name</TableCell>
// //               <TableCell>Semester</TableCell>

// //               {dates.map((date, index) => (
// //                 <TableCell key={`date-${index}`} align="center">
// //                   <Box sx={{ display: "flex", alignItems: "center" }}>
// //                     <TextField
// //                       type="date"
// //                       value={date}
// //                       onChange={(e) => handleDateChange(index, e.target.value)}
// //                       size="small"
// //                       InputProps={{ sx: { fontSize: "0.875rem" } }}
// //                     />
// //                     {dates.length > 2 && (
// //                       <IconButton
// //                         size="small"
// //                         color="error"
// //                         onClick={() => handleRemoveSession(index)}
// //                       >
// //                         <DeleteIcon fontSize="small" />
// //                       </IconButton>
// //                     )}
// //                   </Box>
// //                 </TableCell>
// //               ))}

// //               <TableCell align="center">
// //                 Out_of_{maxMarks} (pass {passingMarks})
// //               </TableCell>
// //               <TableCell>Marks in Words</TableCell>
// //             </TableRow>
// //           </TableHead>
// //           <TableBody>
// //             {students.map((student, studentIndex) => {
// //               const sessions = studentScores[student._id] || [];
// //               const total = calculateTotal(sessions);
// //               const isPassing = total >= passingMarks;

// //               return (
// //                 <TableRow key={student._id} hover>
// //                   <TableCell>{studentIndex + 1}</TableCell>
// //                   <TableCell>{student.academicYear}</TableCell>
// //                   <TableCell>{student.program}</TableCell>
// //                   <TableCell>{student.registrationNumber}</TableCell>
// //                   <TableCell>{student.name}</TableCell>
// //                   <TableCell>{student.semester}</TableCell>

// //                   {dates.map((date, sessionIndex) => {
// //                     const session =
// //                       sessions.find((s) => s.index === sessionIndex) ||
// //                       sessions.find((s) => s.date === date);
// //                     const value = session?.obtainedMarks || 0;

// //                     return (
// //                       <TableCell key={`score-${sessionIndex}`} align="center">
// //                         <TextField
// //                           type="number"
// //                           value={value}
// //                           onChange={(e) =>
// //                             handleScoreChange(
// //                               student._id,
// //                               sessionIndex,
// //                               e.target.value
// //                             )
// //                           }
// //                           inputProps={{
// //                             min: 0,
// //                             max: 10,
// //                             style: { textAlign: "center" },
// //                           }}
// //                           size="small"
// //                           sx={{ width: 60 }}
// //                         />
// //                       </TableCell>
// //                     );
// //                   })}

// //                   <TableCell align="center">
// //                     <Typography
// //                       variant="body1"
// //                       fontWeight="bold"
// //                       color={isPassing ? "success.main" : "error.main"}
// //                     >
// //                       {total}
// //                     </Typography>
// //                   </TableCell>

// //                   <TableCell>{numberToWords(total)}</TableCell>
// //                 </TableRow>
// //               );
// //             })}

// //             {students.length === 0 && (
// //               <TableRow>
// //                 <TableCell colSpan={8 + dates.length} align="center">
// //                   No students enrolled in this course
// //                 </TableCell>
// //               </TableRow>
// //             )}
// //           </TableBody>
// //         </Table>
// //       </TableContainer>
// //     </Box>
// //   );
// // };

// // export default LabScoreEntryComponent;

// import React, { useState, useEffect, useCallback, memo } from "react";
// import {
//   Box,
//   Paper,
//   Table,
//   TableBody,
//   TableCell,
//   TableContainer,
//   TableHead,
//   TableRow,
//   TextField,
//   Typography,
//   Grid,
//   Button,
//   Alert,
//   IconButton,
// } from "@mui/material";
// import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
// import { Student, CourseType } from "../../types";
// import { getComponentScale, convertLabScore } from "../../utils/scoreUtils";
// import { numberToWords } from "../../utils/formatUtils";

// interface LabSession {
//   date: string;
//   maxMarks: number;
//   obtainedMarks: number;
//   index?: number;
// }

// interface LabScore {
//   componentName: string;
//   sessions: LabSession[];
//   maxMarks: number;
//   totalObtained: number;
// }

// interface LabScoreEntryComponentProps {
//   students: Student[];
//   componentName: string;
//   courseType: CourseType;
//   onScoresChange: (scores: { [studentId: string]: LabScore }) => void;
//   initialScores?: { [studentId: string]: LabScore };
// }

// // Create a memoized cell component to prevent unnecessary re-renders
// const ScoreCell = memo(
//   ({
//     value,
//     onChange,
//   }: {
//     value: number;
//     onChange: (value: string) => void;
//   }) => {
//     return (
//       <TextField
//         type="number"
//         value={value}
//         onChange={(e) => onChange(e.target.value)}
//         inputProps={{
//           min: 0,
//           max: 10,
//           style: { textAlign: "center" },
//         }}
//         size="small"
//         sx={{ width: 60 }}
//       />
//     );
//   }
// );

// const LabScoreEntryComponent: React.FC<LabScoreEntryComponentProps> = ({
//   students,
//   courseType,
//   onScoresChange,
//   initialScores = {},
// }) => {
//   const [error, setError] = useState<string | null>(null);
//   const [dates, setDates] = useState<string[]>([
//     new Date().toISOString().split("T")[0],
//     new Date().toISOString().split("T")[0],
//   ]);

//   // Store scores as a dictionary of studentId -> sessions array
//   const [studentScores, setStudentScores] = useState<{
//     [studentId: string]: LabSession[];
//   }>({});

//   // Track whether initialization has occurred
//   const [isInitialized, setIsInitialized] = useState(false);

//   // Get scale configuration based on course type
//   const scaleConfig = getComponentScale(courseType, "LAB");
//   const maxMarks = scaleConfig.maxMarks;
//   const passingMarks = scaleConfig.passingMarks;

//   // Calculate total for a student (memoized to improve performance)
//   const calculateTotal = useCallback(
//     (sessions: LabSession[]): number => {
//       if (!sessions || sessions.length === 0) return 0;

//       let sum = 0;
//       let count = 0;

//       for (const session of sessions) {
//         if (session.obtainedMarks !== undefined) {
//           sum += session.obtainedMarks;
//           count++;
//         }
//       }

//       if (count === 0) return 0;

//       // Calculate average and scale to max marks based on course type
//       const average = sum / count;
//       return convertLabScore(average, courseType);
//     },
//     [courseType]
//   );

//   // Convert to parent format and update (memoized to reduce recreations)
//   const updateParent = useCallback(
//     (
//       currentScores: { [studentId: string]: LabSession[] },
//       currentDates: string[]
//     ) => {
//       const formattedScores: { [studentId: string]: LabScore } = {};

//       students.forEach((student) => {
//         const studentId = student._id;
//         const sessions = currentScores[studentId] || [];

//         // Ensure all dates have a session
//         const completeSessionsArray = currentDates.map((date, idx) => {
//           const existingSession =
//             sessions.find((s) => s.index === idx) ||
//             sessions.find((s) => s.date === date);

//           if (existingSession) {
//             return {
//               ...existingSession,
//               index: idx,
//             };
//           }

//           return {
//             date,
//             maxMarks: 10,
//             obtainedMarks: 0,
//             index: idx,
//           };
//         });

//         // Calculate total
//         const total = calculateTotal(completeSessionsArray);

//         // Create the score object
//         formattedScores[studentId] = {
//           componentName: "LAB",
//           sessions: completeSessionsArray,
//           maxMarks: maxMarks,
//           totalObtained: total,
//         };
//       });

//       // Update parent
//       onScoresChange(formattedScores);
//     },
//     [students, calculateTotal, maxMarks, onScoresChange]
//   );

//   // Initialize from props
//   useEffect(() => {
//     if (isInitialized) return;

//     // Initialize dates from initialScores if available
//     let defaultDates = [...dates];

//     if (Object.keys(initialScores).length > 0) {
//       const firstStudentId = Object.keys(initialScores)[0];
//       const firstStudent = initialScores[firstStudentId];

//       if (firstStudent?.sessions && firstStudent.sessions.length > 0) {
//         // Sort sessions by index if available to maintain order
//         const sortedSessions = [...firstStudent.sessions].sort((a, b) =>
//           a.index !== undefined && b.index !== undefined ? a.index - b.index : 0
//         );

//         defaultDates = sortedSessions.map(
//           (s) => s.date || new Date().toISOString().split("T")[0]
//         );
//         setDates(defaultDates);
//       }
//     }

//     // Initialize student scores from initialScores
//     const initialStudentScores: { [studentId: string]: LabSession[] } = {};

//     students.forEach((student) => {
//       const studentId = student._id;
//       const initialScore = initialScores[studentId];

//       if (initialScore?.sessions && initialScore.sessions.length > 0) {
//         // Sort sessions by index to maintain order
//         const sortedSessions = [...initialScore.sessions].sort((a, b) =>
//           a.index !== undefined && b.index !== undefined ? a.index - b.index : 0
//         );

//         initialStudentScores[studentId] = sortedSessions;
//       } else {
//         // Create default empty scores for each date
//         initialStudentScores[studentId] = defaultDates.map((date, idx) => ({
//           date,
//           maxMarks: 10,
//           obtainedMarks: 0,
//           index: idx,
//         }));
//       }
//     });

//     setStudentScores(initialStudentScores);
//     setIsInitialized(true);

//     // Initial update to parent after setting up state
//     updateParent(initialStudentScores, defaultDates);
//   }, [initialScores, students, dates, isInitialized, updateParent]);

//   // Handle date change
//   const handleDateChange = useCallback(
//     (index: number, newDate: string) => {
//       setDates((prevDates) => {
//         const newDates = [...prevDates];
//         newDates[index] = newDate;

//         // Update all student sessions with the new date in a single operation
//         setStudentScores((prevScores) => {
//           const updatedScores = { ...prevScores };

//           Object.keys(updatedScores).forEach((studentId) => {
//             if (updatedScores[studentId][index]) {
//               updatedScores[studentId] = [...updatedScores[studentId]];
//               updatedScores[studentId][index] = {
//                 ...updatedScores[studentId][index],
//                 date: newDate,
//               };
//             }
//           });

//           // Schedule the parent update outside of the state update to avoid re-renders
//           setTimeout(() => updateParent(updatedScores, newDates), 0);

//           return updatedScores;
//         });

//         return newDates;
//       });
//     },
//     [updateParent]
//   );

//   // Add a new session
//   const handleAddSession = useCallback(() => {
//     const newDate = new Date().toISOString().split("T")[0];

//     setDates((prevDates) => {
//       const newDates = [...prevDates, newDate];

//       setStudentScores((prevScores) => {
//         const updatedScores = { ...prevScores };
//         const newIndex = prevDates.length;

//         Object.keys(updatedScores).forEach((studentId) => {
//           if (!updatedScores[studentId]) {
//             updatedScores[studentId] = [];
//           }

//           updatedScores[studentId] = [...updatedScores[studentId]];
//           updatedScores[studentId].push({
//             date: newDate,
//             maxMarks: 10,
//             obtainedMarks: 0,
//             index: newIndex,
//           });
//         });

//         // Schedule the parent update outside of the state update
//         setTimeout(() => updateParent(updatedScores, newDates), 0);

//         return updatedScores;
//       });

//       return newDates;
//     });
//   }, [updateParent]);

//   // Remove a session
//   const handleRemoveSession = useCallback(
//     (index: number) => {
//       setDates((prevDates) => {
//         if (prevDates.length <= 2) {
//           setError("You must have at least two lab sessions");
//           return prevDates;
//         }

//         const newDates = prevDates.filter((_, i) => i !== index);

//         setStudentScores((prevScores) => {
//           const updatedScores = { ...prevScores };

//           Object.keys(updatedScores).forEach((studentId) => {
//             updatedScores[studentId] = updatedScores[studentId]
//               .filter((_, i) => i !== index)
//               // Update indices after removal
//               .map((session, newIdx) => ({
//                 ...session,
//                 index: newIdx,
//               }));
//           });

//           // Schedule the parent update outside of the state update
//           setTimeout(() => updateParent(updatedScores, newDates), 0);

//           return updatedScores;
//         });

//         return newDates;
//       });
//     },
//     [updateParent]
//   );

//   // Handle score change
//   const handleScoreChange = useCallback(
//     (studentId: string, sessionIndex: number, value: string) => {
//       try {
//         // Convert to number
//         let numValue = parseInt(value);
//         if (isNaN(numValue)) numValue = 0;

//         // Ensure value is between 0 and 10
//         numValue = Math.max(0, Math.min(10, numValue));

//         // Update the specific student's score in a single operation
//         setStudentScores((prevScores) => {
//           const updatedScores = { ...prevScores };

//           if (!updatedScores[studentId]) {
//             // Initialize if missing
//             updatedScores[studentId] = dates.map((date, idx) => ({
//               date,
//               maxMarks: 10,
//               obtainedMarks: 0,
//               index: idx,
//             }));
//           } else {
//             // Create a new array to ensure React detects the change
//             updatedScores[studentId] = [...updatedScores[studentId]];
//           }

//           if (!updatedScores[studentId][sessionIndex]) {
//             // Initialize if missing
//             updatedScores[studentId][sessionIndex] = {
//               date: dates[sessionIndex],
//               maxMarks: 10,
//               obtainedMarks: 0,
//               index: sessionIndex,
//             };
//           } else {
//             // Create a new object to ensure React detects the change
//             updatedScores[studentId][sessionIndex] = {
//               ...updatedScores[studentId][sessionIndex],
//               obtainedMarks: numValue,
//             };
//           }

//           // Schedule parent update outside of state setter to avoid re-render chain
//           setTimeout(() => updateParent(updatedScores, dates), 0);

//           return updatedScores;
//         });
//       } catch (err) {
//         console.error("Error updating score:", err);
//       }
//     },
//     [dates, updateParent]
//   );

//   // Memoize the cell renderer function to improve performance
//   const renderScoreCell = useCallback(
//     (studentId: string, sessionIndex: number, value: number) => {
//       return (
//         <ScoreCell
//           value={value}
//           onChange={(newValue) =>
//             handleScoreChange(studentId, sessionIndex, newValue)
//           }
//         />
//       );
//     },
//     [handleScoreChange]
//   );

//   return (
//     <Box sx={{ width: "100%" }}>
//       <Grid container spacing={2} sx={{ mb: 3 }}>
//         <Grid item xs={12} sm={6}>
//           <Typography variant="h6">LAB</Typography>
//         </Grid>
//         <Grid
//           item
//           xs={12}
//           sm={6}
//           sx={{ display: "flex", justifyContent: "flex-end" }}
//         >
//           <Button
//             variant="contained"
//             startIcon={<AddIcon />}
//             onClick={handleAddSession}
//             size="small"
//           >
//             Add Lab Session
//           </Button>
//         </Grid>
//       </Grid>

//       {error && (
//         <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
//           {error}
//         </Alert>
//       )}

//       <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
//         <Table size="small">
//           <TableHead>
//             <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
//               <TableCell>SNo.</TableCell>
//               <TableCell>Academic_Year</TableCell>
//               <TableCell>Program</TableCell>
//               <TableCell>Enrollment No.</TableCell>
//               <TableCell>Name</TableCell>
//               <TableCell>Semester</TableCell>

//               {dates.map((date, index) => (
//                 <TableCell key={`date-${index}`} align="center">
//                   <Box sx={{ display: "flex", alignItems: "center" }}>
//                     <TextField
//                       type="date"
//                       value={date}
//                       onChange={(e) => handleDateChange(index, e.target.value)}
//                       size="small"
//                       InputProps={{ sx: { fontSize: "0.875rem" } }}
//                     />
//                     {dates.length > 2 && (
//                       <IconButton
//                         size="small"
//                         color="error"
//                         onClick={() => handleRemoveSession(index)}
//                       >
//                         <DeleteIcon fontSize="small" />
//                       </IconButton>
//                     )}
//                   </Box>
//                 </TableCell>
//               ))}

//               <TableCell align="center">
//                 Out_of_{maxMarks} (pass {passingMarks})
//               </TableCell>
//               <TableCell>Marks in Words</TableCell>
//             </TableRow>
//           </TableHead>
//           <TableBody>
//             {students.map((student, studentIndex) => {
//               const sessions = studentScores[student._id] || [];
//               const total = calculateTotal(sessions);
//               const isPassing = total >= passingMarks;

//               return (
//                 <TableRow key={student._id} hover>
//                   <TableCell>{studentIndex + 1}</TableCell>
//                   <TableCell>{student.academicYear}</TableCell>
//                   <TableCell>{student.program}</TableCell>
//                   <TableCell>{student.registrationNumber}</TableCell>
//                   <TableCell>{student.name}</TableCell>
//                   <TableCell>{student.semester}</TableCell>

//                   {dates.map((date, sessionIndex) => {
//                     const session =
//                       sessions.find((s) => s.index === sessionIndex) ||
//                       sessions.find((s) => s.date === date);
//                     const value = session?.obtainedMarks || 0;

//                     return (
//                       <TableCell key={`score-${sessionIndex}`} align="center">
//                         {renderScoreCell(student._id, sessionIndex, value)}
//                       </TableCell>
//                     );
//                   })}

//                   <TableCell align="center">
//                     <Typography
//                       variant="body1"
//                       fontWeight="bold"
//                       color={isPassing ? "success.main" : "error.main"}
//                     >
//                       {total}
//                     </Typography>
//                   </TableCell>

//                   <TableCell>{numberToWords(total)}</TableCell>
//                 </TableRow>
//               );
//             })}

//             {students.length === 0 && (
//               <TableRow>
//                 <TableCell colSpan={8 + dates.length} align="center">
//                   No students enrolled in this course
//                 </TableCell>
//               </TableRow>
//             )}
//           </TableBody>
//         </Table>
//       </TableContainer>
//     </Box>
//   );
// };

// // Use React.memo to prevent unnecessary re-renders
// export default memo(LabScoreEntryComponent);

import React, { useState, useEffect, useCallback, memo } from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Grid,
  Button,
  Alert,
  IconButton,
} from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { Student, CourseType } from "../../types";
import { getComponentScale, convertLabScore } from "../../utils/scoreUtils";
import { numberToWords } from "../../utils/formatUtils";

interface LabSession {
  date: string;
  maxMarks: number;
  obtainedMarks: number;
  index: number; // Make index required to ensure proper tracking
}

interface LabScore {
  componentName: string;
  sessions: LabSession[];
  maxMarks: number;
  totalObtained: number;
}

interface LabScoreEntryComponentProps {
  students: Student[];
  componentName: string;
  courseType: CourseType;
  onScoresChange: (scores: { [studentId: string]: LabScore }) => void;
  initialScores?: { [studentId: string]: LabScore };
}

// Create a memoized cell component to prevent unnecessary re-renders
const ScoreCell = memo(
  ({
    value,
    onChange,
  }: {
    value: number;
    onChange: (value: string) => void;
  }) => {
    return (
      <TextField
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputProps={{
          min: 0,
          max: 10,
          style: { textAlign: "center" },
        }}
        size="small"
        sx={{ width: 60 }}
      />
    );
  }
);

const LabScoreEntryComponent: React.FC<LabScoreEntryComponentProps> = ({
  students,
  courseType,
  onScoresChange,
  initialScores = {},
}) => {
  const [error, setError] = useState<string | null>(null);

  // Initialize with today and yesterday to ensure different dates
  const [dates, setDates] = useState<string[]>(() => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    return [
      today.toISOString().split("T")[0],
      yesterday.toISOString().split("T")[0],
    ];
  });

  // Store scores as a dictionary of studentId -> sessions array
  const [studentScores, setStudentScores] = useState<{
    [studentId: string]: LabSession[];
  }>({});

  // Track whether initialization has occurred
  const [isInitialized, setIsInitialized] = useState(false);

  // Get scale configuration based on course type
  const scaleConfig = getComponentScale(courseType, "LAB");
  const maxMarks = scaleConfig.maxMarks;
  const passingMarks = scaleConfig.passingMarks;

  // Calculate total for a student (memoized to improve performance)
  const calculateTotal = useCallback(
    (sessions: LabSession[]): number => {
      if (!sessions || sessions.length === 0) return 0;

      let sum = 0;
      let count = 0;

      for (const session of sessions) {
        if (session.obtainedMarks !== undefined) {
          sum += session.obtainedMarks;
          count++;
        }
      }

      if (count === 0) return 0;

      // Calculate average and scale to max marks based on course type
      const average = sum / count;
      return convertLabScore(average, courseType);
    },
    [courseType]
  );

  // Convert to parent format and update (memoized to reduce recreations)
  const updateParent = useCallback(
    (
      currentScores: { [studentId: string]: LabSession[] },
      currentDates: string[]
    ) => {
      const formattedScores: { [studentId: string]: LabScore } = {};

      students.forEach((student) => {
        const studentId = student._id;
        const sessions = currentScores[studentId] || [];

        // Ensure all dates have a session with a distinct index
        const completeSessionsArray = currentDates.map((date, idx) => {
          // Strictly get by index first
          const existingSession = sessions.find((s) => s.index === idx);

          if (existingSession) {
            return {
              ...existingSession,
              date: date, // Update date to match current position
            };
          }

          // Create new session if none exists at this index
          return {
            date,
            maxMarks: 10,
            obtainedMarks: 0,
            index: idx,
          };
        });

        // Calculate total
        const total = calculateTotal(completeSessionsArray);

        // Create the score object
        formattedScores[studentId] = {
          componentName: "LAB",
          sessions: completeSessionsArray,
          maxMarks: maxMarks,
          totalObtained: total,
        };
      });

      // Update parent
      onScoresChange(formattedScores);
    },
    [students, calculateTotal, maxMarks, onScoresChange]
  );

  // Initialize from props
  useEffect(() => {
    if (isInitialized) return;

    // Initialize dates from initialScores if available
    let defaultDates = [...dates];

    if (Object.keys(initialScores).length > 0) {
      const firstStudentId = Object.keys(initialScores)[0];
      const firstStudent = initialScores[firstStudentId];

      if (firstStudent?.sessions && firstStudent.sessions.length > 0) {
        // Sort sessions by index if available to maintain order
        const sortedSessions = [...firstStudent.sessions].sort((a, b) =>
          a.index !== undefined && b.index !== undefined ? a.index - b.index : 0
        );

        // Make sure we have at least two unique dates
        if (sortedSessions.length >= 2) {
          defaultDates = sortedSessions.map(
            (s) => s.date || new Date().toISOString().split("T")[0]
          );
        }

        setDates(defaultDates);
      }
    }

    // Initialize student scores from initialScores
    const initialStudentScores: { [studentId: string]: LabSession[] } = {};

    students.forEach((student) => {
      const studentId = student._id;
      const initialScore = initialScores[studentId];

      if (initialScore?.sessions && initialScore.sessions.length > 0) {
        // Deep clone sessions to avoid reference issues
        const clonedSessions = initialScore.sessions.map((session) => ({
          ...session,
          // Ensure every session has a valid index
          index: session.index !== undefined ? session.index : 0,
        }));

        // Sort sessions by index to maintain order
        const sortedSessions = [...clonedSessions].sort(
          (a, b) => a.index - b.index
        );

        initialStudentScores[studentId] = sortedSessions;
      } else {
        // Create default empty scores for each date with unique indices
        initialStudentScores[studentId] = defaultDates.map((date, idx) => ({
          date,
          maxMarks: 10,
          obtainedMarks: 0,
          index: idx,
        }));
      }
    });

    setStudentScores(initialStudentScores);
    setIsInitialized(true);

    // Initial update to parent after setting up state
    updateParent(initialStudentScores, defaultDates);
  }, [initialScores, students, dates, isInitialized, updateParent]);

  // Handle date change
  const handleDateChange = useCallback(
    (index: number, newDate: string) => {
      setDates((prevDates) => {
        const newDates = [...prevDates];
        newDates[index] = newDate;

        // Update all student sessions with the new date in a single operation
        setStudentScores((prevScores) => {
          const updatedScores = { ...prevScores };

          Object.keys(updatedScores).forEach((studentId) => {
            // Create a new array for each student
            updatedScores[studentId] = [...updatedScores[studentId]];

            // Find the session with this index
            const sessionIdx = updatedScores[studentId].findIndex(
              (s) => s.index === index
            );

            if (sessionIdx >= 0) {
              // Update the session with a new object to maintain immutability
              updatedScores[studentId][sessionIdx] = {
                ...updatedScores[studentId][sessionIdx],
                date: newDate,
              };
            } else {
              // If no session with this index, create one
              updatedScores[studentId].push({
                date: newDate,
                maxMarks: 10,
                obtainedMarks: 0,
                index: index,
              });

              // Make sure sessions are sorted by index
              updatedScores[studentId].sort((a, b) => a.index - b.index);
            }
          });

          // Schedule the parent update outside of the state update to avoid re-renders
          setTimeout(() => updateParent(updatedScores, newDates), 0);

          return updatedScores;
        });

        return newDates;
      });
    },
    [updateParent]
  );

  // Add a new session
  const handleAddSession = useCallback(() => {
    const newDate = new Date().toISOString().split("T")[0];

    setDates((prevDates) => {
      const newDates = [...prevDates, newDate];
      const newIndex = prevDates.length; // Use the length as the next index

      setStudentScores((prevScores) => {
        const updatedScores = { ...prevScores };

        Object.keys(updatedScores).forEach((studentId) => {
          // Create a new array for each student
          updatedScores[studentId] = [...updatedScores[studentId]];

          // Add a new session with the correct index
          updatedScores[studentId].push({
            date: newDate,
            maxMarks: 10,
            obtainedMarks: 0,
            index: newIndex,
          });
        });

        // Schedule the parent update outside of the state update
        setTimeout(() => updateParent(updatedScores, newDates), 0);

        return updatedScores;
      });

      return newDates;
    });
  }, [updateParent]);

  // Remove a session
  const handleRemoveSession = useCallback(
    (indexToRemove: number) => {
      setDates((prevDates) => {
        if (prevDates.length <= 2) {
          setError("You must have at least two lab sessions");
          return prevDates;
        }

        const newDates = prevDates.filter((_, i) => i !== indexToRemove);

        setStudentScores((prevScores) => {
          const updatedScores = { ...prevScores };

          Object.keys(updatedScores).forEach((studentId) => {
            // Remove the session with the specified index
            updatedScores[studentId] = updatedScores[studentId]
              .filter((session) => session.index !== indexToRemove)
              // Update indices after removal to maintain consecutive ordering
              .map((session) => {
                if (session.index > indexToRemove) {
                  return { ...session, index: session.index - 1 };
                }
                return session;
              });
          });

          // Schedule the parent update outside of the state update
          setTimeout(() => updateParent(updatedScores, newDates), 0);

          return updatedScores;
        });

        return newDates;
      });
    },
    [updateParent]
  );

  // Handle score change
  const handleScoreChange = useCallback(
    (studentId: string, sessionIndex: number, value: string) => {
      try {
        // Convert to number
        let numValue = parseInt(value);
        if (isNaN(numValue)) numValue = 0;

        // Ensure value is between 0 and 10
        numValue = Math.max(0, Math.min(10, numValue));

        // Update the specific student's score in a single operation
        setStudentScores((prevScores) => {
          // Create a new object for immutability
          const updatedScores = { ...prevScores };

          if (!updatedScores[studentId]) {
            // Initialize if missing
            updatedScores[studentId] = dates.map((date, idx) => ({
              date,
              maxMarks: 10,
              obtainedMarks: 0,
              index: idx,
            }));
          } else {
            // Create a new array to ensure React detects the change
            updatedScores[studentId] = [...updatedScores[studentId]];
          }

          // Find the session with the matching index
          const sessionIdx = updatedScores[studentId].findIndex(
            (session) => session.index === sessionIndex
          );

          if (sessionIdx >= 0) {
            // Create a new object to ensure React detects the change
            updatedScores[studentId][sessionIdx] = {
              ...updatedScores[studentId][sessionIdx],
              obtainedMarks: numValue,
            };
          } else {
            // If no session found with this index, create a new one
            updatedScores[studentId].push({
              date:
                dates[sessionIndex] || new Date().toISOString().split("T")[0],
              maxMarks: 10,
              obtainedMarks: numValue,
              index: sessionIndex,
            });

            // Sort sessions by index to maintain order
            updatedScores[studentId].sort((a, b) => a.index - b.index);
          }

          // Schedule parent update outside of state setter to avoid re-render chain
          setTimeout(() => updateParent(updatedScores, dates), 0);

          return updatedScores;
        });
      } catch (err) {
        console.error("Error updating score:", err);
      }
    },
    [dates, updateParent]
  );

  // Memoize the cell renderer function to improve performance
  const renderScoreCell = useCallback(
    (studentId: string, sessionIndex: number, value: number) => {
      return (
        <ScoreCell
          value={value}
          onChange={(newValue) =>
            handleScoreChange(studentId, sessionIndex, newValue)
          }
        />
      );
    },
    [handleScoreChange]
  );

  return (
    <Box sx={{ width: "100%" }}>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <Typography variant="h6">LAB</Typography>
        </Grid>
        <Grid
          item
          xs={12}
          sm={6}
          sx={{ display: "flex", justifyContent: "flex-end" }}
        >
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddSession}
            size="small"
          >
            Add Lab Session
          </Button>
        </Grid>
      </Grid>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell>SNo.</TableCell>
              <TableCell>Academic_Year</TableCell>
              <TableCell>Program</TableCell>
              <TableCell>Enrollment No.</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Semester</TableCell>

              {dates.map((date, displayIndex) => (
                <TableCell key={`date-${displayIndex}`} align="center">
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <TextField
                      type="date"
                      value={date}
                      onChange={(e) =>
                        handleDateChange(displayIndex, e.target.value)
                      }
                      size="small"
                      InputProps={{ sx: { fontSize: "0.875rem" } }}
                    />
                    {dates.length > 2 && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemoveSession(displayIndex)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </TableCell>
              ))}

              <TableCell align="center">
                Out_of_{maxMarks} (pass {passingMarks})
              </TableCell>
              <TableCell>Marks in Words</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.map((student, studentIndex) => {
              const sessions = studentScores[student._id] || [];
              const total = calculateTotal(sessions);
              const isPassing = total >= passingMarks;

              return (
                <TableRow key={student._id} hover>
                  <TableCell>{studentIndex + 1}</TableCell>
                  <TableCell>{student.academicYear}</TableCell>
                  <TableCell>{student.program}</TableCell>
                  <TableCell>{student.registrationNumber}</TableCell>
                  <TableCell>{student.name}</TableCell>
                  <TableCell>{student.semester}</TableCell>

                  {dates.map((date, displayIndex) => {
                    // Find session with the matching index ONLY
                    const session = sessions.find(
                      (s) => s.index === displayIndex
                    );
                    const value = session?.obtainedMarks || 0;

                    return (
                      <TableCell key={`score-${displayIndex}`} align="center">
                        {renderScoreCell(student._id, displayIndex, value)}
                      </TableCell>
                    );
                  })}

                  <TableCell align="center">
                    <Typography
                      variant="body1"
                      fontWeight="bold"
                      color={isPassing ? "success.main" : "error.main"}
                    >
                      {total}
                    </Typography>
                  </TableCell>

                  <TableCell>{numberToWords(total)}</TableCell>
                </TableRow>
              );
            })}

            {students.length === 0 && (
              <TableRow>
                <TableCell colSpan={8 + dates.length} align="center">
                  No students enrolled in this course
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

// Use React.memo to prevent unnecessary re-renders
export default memo(LabScoreEntryComponent);
