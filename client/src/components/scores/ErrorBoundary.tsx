import { /*React,*/ Component, ErrorInfo, ReactNode } from "react";
import { /*Box,*/ Typography, Button, Paper } from "@mui/material";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <Paper
          elevation={3}
          sx={{
            p: 3,
            m: 2,
            backgroundColor: "#fff8f8",
            borderLeft: "4px solid #f44336",
          }}
        >
          <Typography variant="h5" color="error" gutterBottom>
            Something went wrong
          </Typography>
          <Typography variant="body1" paragraph>
            There was an error in the component.
          </Typography>
          {this.state.error && (
            <Typography
              variant="body2"
              component="pre"
              sx={{
                mt: 2,
                p: 2,
                backgroundColor: "#f5f5f5",
                overflowX: "auto",
                maxWidth: "100%",
                fontFamily: "monospace",
              }}
            >
              {this.state.error.toString()}
            </Typography>
          )}
          <Button
            variant="contained"
            color="primary"
            onClick={this.handleReset}
            sx={{ mt: 2 }}
          >
            Try Again
          </Button>
        </Paper>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
