import React, { useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Grid,
  Typography,
  Divider,
  Paper,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  Chip,
  Box,
  OutlinedInput,
} from "@mui/material";
import { Course, CourseType, SlotType } from "../../types";
import { EVALUATION_SCHEMES } from "../../utils/evaluationSchemes";

interface CourseFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (course: Partial<Course>) => void;
  course?: Course;
}

// Course types array
const courseTypes: CourseType[] = [
  "PG",
  "PG-Integrated",
  "UG",
  "UG-Integrated",
  "UG-Lab-Only",
  "PG-Lab-Only",
];

// Array of all slot options
const slotOptions: SlotType[] = [
  "A1",
  "B1",
  "C1",
  "A2",
  "B2",
  "C2",
  "A1+TA1",
  "B1+TB1",
  "C1+TC1",
  "A2+TA2",
  "B2+TB2",
  "C2+TC2",
  "D1",
  "E1",
  "F1",
  "G1",
  "D2",
  "E2",
  "F2",
  "G2",
  "L1+L2",
  "L3+L4",
  "L5+L6",
  "L7+L8",
  "L9+L10",
  "L11+L12",
  "L13+L14",
  "L15+L16",
  "L17+L18",
  "L19+L20",
  "L21+L22",
  "L23+L24",
  "L25+L26",
  "L27+L28",
  "L29+L30",
  "L31+L32",
  "L33+L34",
  "L35+L36",
  "L37+L38",
  "L39+L40",
];

const CourseForm: React.FC<CourseFormProps> = ({
  open,
  onClose,
  onSubmit,
  course,
}) => {
  const [formData, setFormData] = React.useState<Partial<Course>>({
    code: "",
    name: "",
    type: "PG" as CourseType,
    slot: [] as SlotType[],
    venue: "",
    evaluationScheme: EVALUATION_SCHEMES["PG"].weights,
  });

  useEffect(() => {
    if (course) {
      setFormData({
        code: course.code,
        name: course.name,
        type: course.type,
        slot: Array.isArray(course.slot) ? course.slot : [course.slot].filter(Boolean),
        venue: course.venue || "",
        evaluationScheme: course.evaluationScheme,
      });
    } else {
      setFormData({
        code: "",
        name: "",
        type: "PG" as CourseType,
        slot: [] as SlotType[],
        venue: "",
        evaluationScheme: EVALUATION_SCHEMES["PG"].weights,
      });
    }
  }, [course]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<unknown>
  ) => {
    const { name, value } = e.target;

    if (name === "type") {
      const courseType = value as CourseType;
      setFormData((prev) => ({
        ...prev,
        type: courseType,
        evaluationScheme: EVALUATION_SCHEMES[courseType].weights,
      }));
    } else if (name === "slot") {
      // Handle slot separately since it's a multi-select
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const currentType = (formData.type as CourseType) || "PG";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{course ? "Edit Course" : "Add New Course"}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                name="code"
                label="Course Code"
                value={formData.code}
                onChange={handleChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="name"
                label="Course Name"
                value={formData.name}
                onChange={handleChange}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                name="type"
                label="Course Type"
                value={formData.type}
                onChange={handleChange}
                fullWidth
                required
              >
                {courseTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel id="slot-label">Course Slots</InputLabel>
                <Select
                  labelId="slot-label"
                  name="slot"
                  multiple
                  value={Array.isArray(formData.slot) ? formData.slot : [formData.slot].filter(Boolean)}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      slot: value,
                    }));
                  }}
                  renderValue={(selected) => {
                    // Convert selected values to a comma-delimited string
                    const selections = Array.isArray(selected) ? selected : [selected].filter(Boolean);
                    if (selections.length === 0) return "";
                    
                    // Join the slots with commas
                    return selections.join(", ");
                  }}
                  input={<OutlinedInput label="Course Slots" />}
                >
                  {slotOptions.map((slot) => (
                    <MenuItem key={slot} value={slot}>
                      {slot}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                name="venue"
                label="Venue"
                value={formData.venue}
                onChange={handleChange}
                fullWidth
                required
                placeholder="e.g., Room 301, Block A"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              {/* Any additional fields can go here */}
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Evaluation Scheme
              </Typography>
              <Paper sx={{ p: 2, bgcolor: "grey.50" }}>
                <Grid container spacing={2}>
                  {Object.entries(EVALUATION_SCHEMES[currentType].weights).map(
                    ([component, weight]) => {
                      const passingCriteria =
                        EVALUATION_SCHEMES[currentType].passingCriteria[
                          component
                        ];
                      const totalMarks =
                        EVALUATION_SCHEMES[currentType].totalScore[component];
                      return (
                        <Grid item xs={12} md={6} key={component}>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            {component.replace("_", " ")}
                          </Typography>
                          <Typography variant="h6">
                            {(weight * 100).toFixed(0)}% ({totalMarks} marks)
                          </Typography>
                          {passingCriteria && (
                            <Typography
                              variant="caption"
                              sx={{ color: "success.main" }}
                            >
                              Passing: {(passingCriteria * 100).toFixed(0)}% (
                              {Math.round(totalMarks * passingCriteria)} marks)
                            </Typography>
                          )}
                        </Grid>
                      );
                    }
                  )}
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" color="primary">
            {course ? "Update Course" : "Add Course"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CourseForm;
