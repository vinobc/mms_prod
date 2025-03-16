import React, { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Typography,
  Switch,
  FormControlLabel,
  Grid,
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
} from "@mui/material";
import {
  systemSettingService,
  SystemSetting,
} from "../../services/systemSettingService";
import { useAuth } from "../../context/AuthContext";

const SystemSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [scoreEntryEnabled, setScoreEntryEnabled] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { user } = useAuth();

  // Fetch settings on component mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const settingsData = await systemSettingService.getAllSettings();
      setSettings(settingsData);

      // Find the score entry setting
      const scoreEntrySetting = settingsData.find(
        (setting) => setting.key === "scoreEntryEnabled"
      );
      if (scoreEntrySetting) {
        setScoreEntryEnabled(!!scoreEntrySetting.value);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch system settings");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleScoreEntry = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newValue = event.target.checked;
    try {
      setLoading(true);
      await systemSettingService.toggleScoreEntry(newValue);
      setScoreEntryEnabled(newValue);
      setSuccess(
        `Score entry has been ${newValue ? "enabled" : "disabled"} successfully`
      );

      // Refresh settings to get updated data
      await fetchSettings();
    } catch (err: any) {
      setError(err.message || "Failed to update setting");
      // Revert the toggle if there's an error
      setScoreEntryEnabled(!newValue);
    } finally {
      setLoading(false);
    }
  };

  if (!user?.isAdmin) {
    return (
      <Alert severity="error">
        You do not have permission to access system settings
      </Alert>
    );
  }

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" gutterBottom sx={{ my: 3 }}>
        System Settings
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          severity="success"
          sx={{ mb: 3 }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Score Entry Control
        </Typography>
        <Divider sx={{ mb: 3 }} />

        {loading ? (
          <Box display="flex" justifyContent="center" my={3}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Enable/Disable Score Entry
                  </Typography>
                  <Typography variant="body2" component="p" sx={{ mb: 2 }}>
                    When disabled, faculty members will not be able to save
                    scores. They can still view existing scores.
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={scoreEntryEnabled}
                        onChange={handleToggleScoreEntry}
                        color="primary"
                        disabled={loading}
                      />
                    }
                    label={
                      scoreEntryEnabled
                        ? "Score Entry is ENABLED"
                        : "Score Entry is DISABLED"
                    }
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Paper>

      {/* Display all system settings for debugging/advanced users */}
      {settings.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            All System Settings
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {settings.map((setting) => (
            <Box key={setting._id} sx={{ mb: 2 }}>
              <Typography variant="subtitle1">
                {setting.key}: {String(setting.value)}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Last updated: {new Date(setting.updatedAt).toLocaleString()}
              </Typography>
              {setting.description && (
                <Typography variant="body2" color="textSecondary">
                  {setting.description}
                </Typography>
              )}
              <Divider sx={{ mt: 1 }} />
            </Box>
          ))}
        </Paper>
      )}
    </Container>
  );
};

export default SystemSettingsPage;
