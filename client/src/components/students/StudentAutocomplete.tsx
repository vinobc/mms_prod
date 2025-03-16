import React, { useState, useEffect } from "react";
import {
  TextField,
  Autocomplete,
  CircularProgress,
  Box,
  Typography,
  Paper,
  Divider,
  Avatar,
} from "@mui/material";
import { studentService } from "../../services/studentService";
import { Student } from "../../types";

interface StudentAutocompleteProps {
  onStudentSelect: (student: Student) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
}

const StudentAutocomplete: React.FC<StudentAutocompleteProps> = ({
  onStudentSelect,
  placeholder = "Search by enrollment number or name",
  label = "Student",
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<Student[]>([]);
  const [inputValue, setInputValue] = useState("");

  // Debounce search
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (inputValue.trim().length > 2) {
      setLoading(true);
      timer = setTimeout(() => {
        searchStudents(inputValue);
      }, 500);
    } else if (inputValue === "") {
      setOptions([]);
      setLoading(false);
    }

    return () => clearTimeout(timer);
  }, [inputValue]);

  const searchStudents = async (query: string) => {
    try {
      if (query.trim().length > 2) {
        const results = await studentService.searchStudents(query);
        setOptions(results);
      } else {
        setOptions([]);
      }
    } catch (error) {
      console.error("Error searching students:", error);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Autocomplete
      id="student-autocomplete"
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      isOptionEqualToValue={(option, value) => option._id === value._id}
      getOptionLabel={(option) =>
        `${option.registrationNumber} - ${option.name}`
      }
      options={options}
      loading={loading}
      inputValue={inputValue}
      onInputChange={(event, newInputValue) => {
        setInputValue(newInputValue);
      }}
      onChange={(event, value) => {
        if (value) {
          onStudentSelect(value);
        }
      }}
      disabled={disabled}
      noOptionsText={
        inputValue && inputValue.length <= 2
          ? "Type at least 3 characters to search"
          : "No students found"
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          variant="outlined"
          fullWidth
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <React.Fragment>
                {loading ? (
                  <CircularProgress color="inherit" size={20} />
                ) : null}
                {params.InputProps.endAdornment}
              </React.Fragment>
            ),
          }}
        />
      )}
      renderOption={(props, option) => (
        <li {...props}>
          <Paper elevation={0} sx={{ width: "100%", p: 1 }}>
            <Box display="flex" alignItems="center">
              <Avatar
                sx={{
                  bgcolor: `hsl(${
                    option.registrationNumber.charCodeAt(0) * 10
                  }, 70%, 50%)`,
                  width: 36,
                  height: 36,
                  mr: 2,
                }}
              >
                {option.name.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="body1">{option.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {option.registrationNumber} | {option.program} | Semester{" "}
                  {option.semester}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </li>
      )}
    />
  );
};

export default StudentAutocomplete;
