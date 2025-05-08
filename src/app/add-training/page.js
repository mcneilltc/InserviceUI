"use client";

import React, { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Grid,
  FormControlLabel,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Alert,
  Snackbar,
  Link,
  Chip,
  IconButton,
  Tooltip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tabs,
  Tab,
  InputAdornment,
  Collapse,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  Group as GroupIcon,
  Archive as ArchiveIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  Download as DownloadIcon,
  FilterList as FilterListIcon,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import axios from "axios";
import moment from "moment";
import { QRCodeCanvas } from "qrcode.react";
const AddTraining = () => {
  // Form state
  const [formData, setFormData] = useState({
    date: null,
    location: "",
    startTime: "",
    length: "",
    topic: "",
    trainer: [],
    status: "scheduled", // scheduled, in-progress, completed
  });

  // Data from API
  const [employees, setEmployees] = useState([]);
  const [topics, setTopics] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [locations, setLocations] = useState([
    "MCAC",
    "Cordelia",
    "Double Oaks",
    "Ramsey Creek Beach",
  ]);

  // Modal state
  const [openNewTopicModal, setOpenNewTopicModal] = useState(false);
  const [newTopic, setNewTopic] = useState("");
  const [openTraineeDialog, setOpenTraineeDialog] = useState(false);
  const [selectedTrainees, setSelectedTrainees] = useState([]);
  const [createdTrainingId, setCreatedTrainingId] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [trainingSessions, setTrainingSessions] = useState([]);

  // New state variables for filtering and tabs
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState(null);

  // New state variables for additional filters
  const [trainerFilter, setTrainerFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [topicFilter, setTopicFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Generate time options (every 30 minutes from 8 AM to 6 PM)
  const timeOptions = Array.from({ length: 21 }, (_, i) => {
    const hour = Math.floor(i / 2) + 8;
    const minute = i % 2 === 0 ? "00" : "30";
    const period = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour > 12 ? hour - 12 : hour; // Convert to 12-hour format
    return `${formattedHour.toString().padStart(2, "0")}:${minute} ${period}`;
  });

  useEffect(() => {
    // Fetch data from API
    const fetchData = async () => {
      try {
        // In development, use mock data
        const mockEmployees = [
          { id: 1, name: "John Doe" },
          { id: 2, name: "Jane Smith" },
          { id: 3, name: "Mike Johnson" },
        ];

        const mockTopics = [
          "Safety Procedures",
          "Equipment Maintenance",
          "Emergency Response",
          "First Aid",
        ];

        const mockTrainers = [
          { id: 1, name: "Sarah Wilson" },
          { id: 2, name: "Tom Brown" },
          { id: 3, name: "Lisa Davis" },
        ];

        const mockTrainingSessions = [
          {
            id: "123",
            date: "2024-03-20",
            topic: "Safety Procedures",
            trainer: "Sarah Wilson",
            status: "in-progress",
            trainees: [1, 2],
          },
        ];

        setEmployees(mockEmployees);
        setTopics(mockTopics);
        setTrainers(mockTrainers);
        setTrainingSessions(mockTrainingSessions);

        // In production, uncomment these API calls:
        // const employeesResponse = await axios.get('/api/employees');
        // const topicsResponse = await axios.get('/api/topics');
        // const trainersResponse = await axios.get('/api/trainers');
        // const sessionsResponse = await axios.get('/api/training-sessions');
        // setEmployees(employeesResponse.data);
        // setTopics(topicsResponse.data);
        // setTrainers(trainersResponse.data);
        // setTrainingSessions(sessionsResponse.data);
      } catch (error) {
        console.error("Error fetching data:", error);
        setSnackbar({
          open: true,
          message: "Failed to fetch data",
          severity: "error",
        });
      }
    };

    fetchData();
  }, []);

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleDateChange = (date) => {
    setFormData((prev) => ({
      ...prev,
      date,
    }));
  };

  const handleTraineeChange = (employeeId) => (event) => {
    setSelectedTrainees((prev) => {
      if (event.target.checked) {
        return [...prev, employeeId];
      }
      return prev.filter((id) => id !== employeeId);
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    // try {
    //   // In development, log the form data
    //   console.log('Form submitted:', formData);

    //   // In production, uncomment this API call:
    //   // const response = await axios.post('/api/training-sessions', formData);
    //   // setCreatedTrainingId(response.data.id);

    //   // Mock response for development
    //   const mockResponse = { id: '123', ...formData };
    //   setCreatedTrainingId(mockResponse.id);

    //   setSnackbar({
    //     open: true,
    //     message: 'Training session created successfully! You can now add trainees.',
    //     severity: 'success',
    //   });

    //   // Reset form
    //   setFormData({
    //     date: null,
    //     location: '',
    //     startTime: '',
    //     length: '',
    //     topic: '',
    //     trainer: '',
    //     status: 'scheduled',
    //   });

    //   // Open trainee dialog
    //   setOpenTraineeDialog(true);
    // } catch (error) {
    //   console.error('Error submitting form:', error);
    //   setSnackbar({
    //     open: true,
    //     message: 'Failed to create training session',
    //     severity: 'error',
    //   });
    // }
    try {
      const response = await axios.post(
        `/api/training-sessions/${selectedEmployeeId}`,
        formData
      ); // Replace with your backend endpoint
      setSnackbar({
        open: true,
        message: "Training session created successfully!",
        severity: "success",
      });
      setCreatedTrainingId(response.data.sessionId);
    } catch (error) {
      console.error("Error creating training session:", error);
      setSnackbar({
        open: true,
        message: "Failed to create training session",
        severity: "error",
      });
    }
  };

    const handleAddTrainees = async (qrCodeValue) => {
    try {
      // Extract the session ID from the QR code value
      const sessionId = qrCodeValue.split("/checkin/")[1];
  
      // Find the corresponding training session
      const session = trainingSessions.find((s) => s.id === sessionId);
      if (!session) {
        setSnackbar({
          open: true,
          message: "Training session not found!",
          severity: "error",
        });
        return;
      }
  
      // Update the session with the new trainees
      const updatedTrainees = [...new Set([...session.trainees, ...selectedTrainees])];
  
      // In production, uncomment this API call:
      await axios.put(`/api/training-sessions/${sessionId}`, {
        trainees: updatedTrainees,
      });
  
      // Update the local state
      setTrainingSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, trainees: updatedTrainees } : s
        )
      );
  
      setSnackbar({
        open: true,
        message: "Trainees added successfully!",
        severity: "success",
      });
      setOpenTraineeDialog(false);
      setSelectedTrainees([]);
    } catch (error) {
      console.error("Error adding trainees:", error);
      setSnackbar({
        open: true,
        message: "Failed to add trainees",
        severity: "error",
      });
    }
  };

  const handleUpdateTrainees = async (sessionId) => {
    setCreatedTrainingId(sessionId);
    const session = trainingSessions.find((s) => s.id === sessionId);
    setSelectedTrainees(session.trainees || []);
    setOpenTraineeDialog(true);
  };

  const handleCompleteTraining = async (sessionId) => {
    try {
      // In production, uncomment this API call:
      // await axios.put(`/api/training-sessions/${sessionId}`, {
      //   status: 'completed',
      // });

      setSnackbar({
        open: true,
        message: "Training marked as completed!",
        severity: "success",
      });
    } catch (error) {
      console.error("Error completing training:", error);
      setSnackbar({
        open: true,
        message: "Failed to complete training",
        severity: "error",
      });
    }
  };

  const handleAddNewTopic = async () => {
    try {
      // In development, add to local state
      setTopics((prev) => [...prev, newTopic]);
      setFormData((prev) => ({ ...prev, topic: newTopic }));
      setOpenNewTopicModal(false);
      setNewTopic("");

      // In production, uncomment this API call:
      // await axios.post('/api/topics', { name: newTopic });
    } catch (error) {
      console.error("Error adding new topic:", error);
      setSnackbar({
        open: true,
        message: "Failed to add new topic",
        severity: "error",
      });
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleCancelTraining = async (sessionId) => {
    try {
      // In production, uncomment this API call:
      // await axios.put(`/api/training-sessions/${sessionId}`, {
      //   status: 'cancelled',
      // });

      setSnackbar({
        open: true,
        message: "Training cancelled successfully!",
        severity: "success",
      });
    } catch (error) {
      console.error("Error cancelling training:", error);
      setSnackbar({
        open: true,
        message: "Failed to cancel training",
        severity: "error",
      });
    }
  };

  const handleArchiveTraining = async (sessionId) => {
    try {
      // In production, uncomment this API call:
      // await axios.put(`/api/training-sessions/${sessionId}`, {
      //   archived: true,
      // });

      setSnackbar({
        open: true,
        message: "Training archived successfully!",
        severity: "success",
      });
    } catch (error) {
      console.error("Error archiving training:", error);
      setSnackbar({
        open: true,
        message: "Failed to archive training",
        severity: "error",
      });
    }
  };

  const filteredSessions = trainingSessions.filter((session) => {
    // Apply status filter
    if (statusFilter !== "all" && session.status !== statusFilter) {
      return false;
    }

    // Apply date filter
    if (
      dateFilter &&
      moment(session.date).format("YYYY-MM-DD") !==
        moment(dateFilter).format("YYYY-MM-DD")
    ) {
      return false;
    }

    // Apply trainer filter
    if (trainerFilter !== "all" && session.trainer !== trainerFilter) {
      return false;
    }

    // Apply location filter
    if (locationFilter !== "all" && session.location !== locationFilter) {
      return false;
    }

    // Apply topic filter
    if (topicFilter !== "all" && session.topic !== topicFilter) {
      return false;
    }

    // Apply search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        session.topic.toLowerCase().includes(searchLower) ||
        session.trainer.toLowerCase().includes(searchLower) ||
        session.location.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "success";
      case "in-progress":
        return "primary";
      case "cancelled":
        return "error";
      default:
        return "default";
    }
  };

  const handleExport = () => {
    // Create CSV content
    const headers = [
      "Date",
      "Topic",
      "Trainer",
      "Location",
      "Status",
      "Number of Trainees",
      "Trainee Names",
    ];
    const csvContent = [
      headers.join(","),
      ...filteredSessions.map((session) => {
        // Get trainee names by matching IDs with employees
        const traineeNames =
          session.trainees
            ?.map((id) => employees.find((emp) => emp.id === id)?.name)
            .filter(Boolean)
            .join("; ") || "";

        // Format date as MM-DD-YYYY
        const formattedDate = moment(session.date).format("MM-DD-YYYY");

        return [
          formattedDate,
          session.topic,
          session.trainer,
          session.location,
          session.status,
          session.trainees?.length || 0,
          `"${traineeNames}"`, // Wrap in quotes to handle commas in names
        ].join(",");
      }),
    ].join("\n");

    // Create and trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `inservice_training_sessions_${moment().format("MM-DD-YYYY")}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Container maxWidth="md">
      <Paper sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Add New Training Session
        </Typography>

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Date Picker */}
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Training Date"
                  value={formData.date}
                  onChange={handleDateChange}
                  renderInput={(params) => (
                    <TextField {...params} fullWidth required />
                  )}
                />
              </LocalizationProvider>
            </Grid>

            {/* Location */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Training Location</InputLabel>
                <Select
                  value={formData.location}
                  label="Training Location"
                  onChange={handleChange("location")}
                >
                  {locations.map((location) => (
                    <MenuItem key={location} value={location}>
                      {location}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Start Time */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Start Time</InputLabel>
                <Select
                  value={formData.startTime}
                  label="Start Time"
                  onChange={handleChange("startTime")}
                >
                  {timeOptions.map((time) => (
                    <MenuItem key={time} value={time}>
                      {time}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Training Length */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                type="number"
                label="Training Length (minutes)"
                value={formData.length}
                onChange={handleChange("length")}
              />
            </Grid>

            {/* Topic */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Training Topic</InputLabel>
                <Select
                  value={formData.topic}
                  label="Training Topic"
                  onChange={handleChange("topic")}
                >
                  {topics.map((topic) => (
                    <MenuItem key={topic} value={topic}>
                      {topic}
                    </MenuItem>
                  ))}
                  <MenuItem value="new">+ Add New Topic</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Trainer */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>Trainers</InputLabel>
                <Select
                  multiple
                  value={formData.trainer}
                  label="Trainers"
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      trainer: e.target.value,
                    }))
                  }
                  renderValue={(selected) =>
                    selected
                      .map(
                        (trainerId) =>
                          trainers.find((trainer) => trainer.id === trainerId)
                            ?.name
                      )
                      .join(", ")
                  }
                >
                  {trainers.map((trainer) => (
                    <MenuItem key={trainer.id} value={trainer.id}>
                      <Checkbox
                        checked={formData.trainer.includes(trainer.id)}
                      />
                      {trainer.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Submit Button */}
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                fullWidth
              >
                Create Training Session
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>

      {/* Active Training Sessions */}
      <Paper sx={{ p: 4, mt: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography variant="h5">Training Sessions</Typography>
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              size="small"
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
            <Tooltip title="Toggle Filters">
              <IconButton onClick={() => setShowFilters(!showFilters)}>
                <FilterListIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Export to CSV">
              <IconButton onClick={handleExport}>
                <DownloadIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Collapse in={showFilters}>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Filters</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={statusFilter}
                      label="Status"
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="scheduled">Scheduled</MenuItem>
                      <MenuItem value="in-progress">In Progress</MenuItem>
                      <MenuItem value="completed">Completed</MenuItem>
                      <MenuItem value="cancelled">Cancelled</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Trainer</InputLabel>
                    <Select
                      value={trainerFilter}
                      label="Trainer"
                      onChange={(e) => setTrainerFilter(e.target.value)}
                    >
                      <MenuItem value="all">All Trainers</MenuItem>
                      {trainers.map((trainer) => (
                        <MenuItem key={trainer.id} value={trainer.name}>
                          {trainer.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Location</InputLabel>
                    <Select
                      value={locationFilter}
                      label="Location"
                      onChange={(e) => setLocationFilter(e.target.value)}
                    >
                      <MenuItem value="all">All Locations</MenuItem>
                      {locations.map((location) => (
                        <MenuItem key={location} value={location}>
                          {location}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Topic</InputLabel>
                    <Select
                      value={topicFilter}
                      label="Topic"
                      onChange={(e) => setTopicFilter(e.target.value)}
                    >
                      <MenuItem value="all">All Topics</MenuItem>
                      {topics.map((topic) => (
                        <MenuItem key={topic} value={topic}>
                          {topic}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="Filter by Date"
                      value={dateFilter}
                      onChange={setDateFilter}
                      renderInput={(params) => (
                        <TextField {...params} size="small" fullWidth />
                      )}
                    />
                  </LocalizationProvider>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Collapse>

        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}
        >
          <Tab label="Active" />
          <Tab label="Completed" />
          <Tab label="Archived" />
        </Tabs>

        <List>
          {filteredSessions
            .filter((session) => {
              if (activeTab === 0)
                return !session.archived && session.status !== "completed";
              if (activeTab === 1)
                return !session.archived && session.status === "completed";
              if (activeTab === 2) return session.archived;
              return true;
            })
            .map((session) => (
              <React.Fragment key={session.id}>
                <ListItem>
                  <ListItemText
                    primary={
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Typography variant="subtitle1" component="span">
                          {session.topic}
                        </Typography>
                        <Chip
                          label={session.status}
                          color={getStatusColor(session.status)}
                          size="small"
                        />
                      </Box>
                    }
                    secondary={
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mt: 0.5,
                        }}
                      >
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          component="span"
                        >
                          {session.date} - {session.trainer}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          component="span"
                        >
                          • {session.trainees?.length || 0} trainees
                        </Typography>
                      </Box>
                    }
                  />

                  <ListItemSecondaryAction>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <QRCodeCanvas
                        value={`${window.location.origin}/checkin/${session.id}`}
                        size={64}
                      />
                      {session.status !== "completed" &&
                        session.status !== "cancelled" && (
                          <>
                            <Tooltip title="Update Trainees">
                              <IconButton
                                edge="end"
                                onClick={() => handleUpdateTrainees(session.id)}
                              >
                                <GroupIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Mark as Completed">
                              <IconButton
                                edge="end"
                                onClick={() =>
                                  handleCompleteTraining(session.id)
                                }
                              >
                                <CheckCircleIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Cancel Training">
                              <IconButton
                                edge="end"
                                onClick={() => handleCancelTraining(session.id)}
                                color="error"
                              >
                                <CancelIcon />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      {session.status === "completed" && !session.archived && (
                        <Tooltip title="Archive Training">
                          <IconButton
                            edge="end"
                            onClick={() => handleArchiveTraining(session.id)}
                          >
                            <ArchiveIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
        </List>
      </Paper>

      {/* New Topic Modal */}
      <Dialog
        open={openNewTopicModal}
        onClose={() => setOpenNewTopicModal(false)}
      >
        <DialogTitle>Add New Training Topic</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Topic Name"
            fullWidth
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNewTopicModal(false)}>Cancel</Button>
          <Button onClick={handleAddNewTopic} variant="contained">
            Add Topic
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add/Update Trainees Dialog */}
      <Dialog
        open={openTraineeDialog}
        onClose={() => setOpenTraineeDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {createdTrainingId
            ? "Update Trainees"
            : "Add Trainees to Training Session"}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            {createdTrainingId
              ? "Update the list of trainees for this training session."
              : "Select the trainees who have arrived for the training session."}
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              {employees.map((employee) => (
                <Grid item xs={12} key={employee.id}>
                  <Paper
                    sx={{
                      p: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      bgcolor: selectedTrainees.includes(employee.id)
                        ? "primary.light"
                        : "background.paper",
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedTrainees.includes(employee.id)}
                          onChange={handleTraineeChange(employee.id)}
                        />
                      }
                      label={employee.name}
                    />
                    {selectedTrainees.includes(employee.id) && (
                      <Chip
                        label="Selected"
                        color="primary"
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTraineeDialog(false)}>Cancel</Button>
          <Button onClick={handleAddTrainees} variant="contained">
            {createdTrainingId ? "Update Trainees" : "Add Selected Trainees"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AddTraining;
