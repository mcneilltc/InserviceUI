// @ts-nocheck
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5001';
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
  const [locations, setLocations] = useState([
    "MCAC",
    "Cordelia",
    "Double Oaks",
    "Ramsey Creek Beach",
    "ERRC",
    "NRRC",
    "Rays Splash Planet",
    "Marion Diehl"
  ]);

  // Modal state
  const [openNewTopicModal, setOpenNewTopicModal] = useState(false);
  const [newTopic, setNewTopic] = useState("");
  const [openTraineeDialog, setOpenTraineeDialog] = useState(false);
  const [selectedTrainees, setSelectedTrainees] = useState<string[]>([]);
  const [createdTrainingId, setCreatedTrainingId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as 'success' | 'error',
  });

  const queryClient = useQueryClient();

  const { data: employees = [] as any[] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data } = await axios.get(`${BACKEND_URL}/api/employees`);
      return data;
    }
  });

  const { data: topics = [] as any[] } = useQuery({
    queryKey: ['topics'],
    queryFn: async () => {
      const { data } = await axios.get(`${BACKEND_URL}/api/training-topics`);
      return data.map((t: any) => t.name || t);
    }
  });

  const { data: trainers = [] as any[] } = useQuery({
    queryKey: ['trainers'],
    queryFn: async () => {
      const { data } = await axios.get(`${BACKEND_URL}/api/trainers`);
      return data;
    }
  });

  const { data: trainingSessions = [] as any[] } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data } = await axios.get(`${BACKEND_URL}/api/sessions`);
      return data;
    }
  });

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
  const [openManualAddDialog, setOpenManualAddDialog] = useState(false);
  const [manualEmployeeData, setManualEmployeeData] = useState({
    employeeId: '',
  });
  const [selectedSessionForManualAdd, setSelectedSessionForManualAdd] = useState(null);

  // Generate time options (every 30 minutes from 8 AM to 6 PM)
  const timeOptions = Array.from({ length: 21 }, (_, i) => {
    const hour = Math.floor(i / 2) + 8;
    const minute = i % 2 === 0 ? "00" : "30";
    const period = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour > 12 ? hour - 12 : hour; // Convert to 12-hour format
    return `${formattedHour.toString().padStart(2, "0")}:${minute} ${period}`;
  });

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

  const upsertSessionInCache = (sessionId: string, updatedSession: any) => {
    queryClient.setQueryData(['sessions'], (oldData: any[] = []) => {
      const existingSession = oldData.find((session) => session.id === sessionId);
      if (existingSession) {
        return oldData.map((session) =>
          session.id === sessionId ? { ...session, ...updatedSession } : session
        );
      }

      return [{ id: sessionId, ...updatedSession }, ...oldData];
    });
  };

  const createSessionMutation = useMutation({
    mutationFn: (sessionData: any) => axios.post(`${BACKEND_URL}/api/training-sessions`, sessionData),
    onSuccess: (response) => {
      const createdSession = response.data?.session || { id: response.data?.sessionId };
      setSnackbar({
        open: true,
        message: "Training session created successfully!",
        severity: "success",
      });
      setCreatedTrainingId(response.data.sessionId);
      upsertSessionInCache(createdSession.id, createdSession);
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      
      setFormData({
        date: null,
        location: "",
        startTime: "",
        length: "",
        topic: "",
        trainer: [],
        status: "scheduled",
      });
    },
    onError: (error: any) => {
      console.error("Error creating training session:", error);
      const message = error?.response?.data?.message || "Failed to create training session";
      setSnackbar({
        open: true,
        message,
        severity: "error",
      });
    }
  });

  const handleSubmit = (event: any) => {
    event.preventDefault();
    if (!formData.trainer || formData.trainer.length === 0) {
        setSnackbar({ open: true, message: "Please select a trainer", severity: "error" });
        return;
    }
    if (!formData.date) {
        setSnackbar({ open: true, message: "Please select a date", severity: "error" });
        return;
    }
    if (!formData.location) {
        setSnackbar({ open: true, message: "Please select a location", severity: "error" });
        return;
    }
    if (!formData.length) {
        setSnackbar({ open: true, message: "Please enter session length", severity: "error" });
        return;
    }
    const sessionData = {
      date: moment(formData.date).format('YYYY-MM-DD'),
      location: formData.location,
      startTime: formData.startTime || undefined,
      length: parseInt(formData.length),
      topic: formData.topic,
      trainer: formData.trainer,
      trainees: []
    };
    createSessionMutation.mutate(sessionData);
  };

  const handleAddTrainees = async () => {
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5001';
      const sessionId = createdTrainingId;
      
      if (!sessionId) {
        setSnackbar({
          open: true,
          message: "No training session selected!",
          severity: "error",
        });
        return;
      }

      // Get current session
      const sessionResponse = await axios.get(`${BACKEND_URL}/api/sessions/${sessionId}`);
      const session = sessionResponse.data;
      
      // Calculate trainer count and validate 1:12 ratio
      const trainerCount = Array.isArray(session.trainer) ? session.trainer.length : (session.trainer ? 1 : 0);
      const maxTrainees = trainerCount * 12;
      const currentTrainees = session.trainees?.length || 0;
      const newTrainees = selectedTrainees.filter(id => !(session.trainees || []).includes(id));
      const totalTrainees = currentTrainees + newTrainees.length;
      
      if (totalTrainees > maxTrainees) {
        setSnackbar({
          open: true,
          message: `Training ratio exceeded! Maximum ${maxTrainees} trainees allowed for ${trainerCount} trainer(s) (1:12 ratio). Current: ${currentTrainees}, Adding: ${newTrainees.length}`,
          severity: "error",
        });
        return;
      }
      
      // Update the session with the new trainees
      const updatedTrainees = [...new Set([...(session.trainees || []), ...selectedTrainees])];
      
      const response = await axios.put(`${BACKEND_URL}/api/sessions/${sessionId}`, {
        trainees: updatedTrainees,
      });

      const updatedSession = response.data?.session || { id: sessionId, trainees: updatedTrainees };
      upsertSessionInCache(sessionId, updatedSession);
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
  
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

  const handleManualAddEmployee = (sessionId) => {
    setSelectedSessionForManualAdd(sessionId);
    setOpenManualAddDialog(true);
  };

  const handleSubmitManualEmployee = async () => {
    try {
      if (!selectedSessionForManualAdd || !manualEmployeeData.employeeId) return;

      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5001';

      // Check the employee in directly — the trainer is vouching for their attendance
      await axios.post(`${BACKEND_URL}/api/checkin`, {
        sessionId: selectedSessionForManualAdd,
        employeeId: manualEmployeeData.employeeId,
      });

      // Also add to session trainees list
      const sessionResponse = await axios.get(`${BACKEND_URL}/api/sessions/${selectedSessionForManualAdd}`);
      const session = sessionResponse.data;
      const updatedTrainees = [...new Set([...(session.trainees || []), manualEmployeeData.employeeId])];
      const response = await axios.put(`${BACKEND_URL}/api/sessions/${selectedSessionForManualAdd}`, {
        trainees: updatedTrainees,
      });
      const updatedSession = response.data?.session || { id: selectedSessionForManualAdd, trainees: updatedTrainees };
      upsertSessionInCache(selectedSessionForManualAdd, updatedSession);

      setSnackbar({
        open: true,
        message: "Employee checked in manually!",
        severity: "success",
      });

      setOpenManualAddDialog(false);
      setManualEmployeeData({ employeeId: '' });
      setSelectedSessionForManualAdd(null);

      // Refresh training sessions
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    } catch (error: any) {
      console.error("Error manually adding employee:", error);
      const message = error.response?.data?.message || "Failed to add employee manually";
      setSnackbar({
        open: true,
        message,
        severity: "error",
      });
    }
  };

  const handleUpdateTrainees = async (sessionId) => {
    setCreatedTrainingId(sessionId);
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5001';
    try {
      // Fetch the latest session data
      const sessionResponse = await axios.get(`${BACKEND_URL}/api/sessions/${sessionId}`);
      const session = sessionResponse.data;
      setSelectedTrainees(session.trainees || []);
      setOpenTraineeDialog(true);
    } catch (error) {
      console.error("Error fetching session:", error);
      setSnackbar({
        open: true,
        message: "Failed to load session data",
        severity: "error",
      });
    }
  };

  const handleCompleteTraining = async (sessionId) => {
    try {
      const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5001';
      const response = await axios.post(`${BACKEND_URL}/api/sessions/${sessionId}/close`);

      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['trainers'] });

      const { employeesCredited, totalEmployeeHours, trainersCredited } = response.data;
      setSnackbar({
        open: true,
        message: `Session closed out — ${employeesCredited} employee(s) credited (${totalEmployeeHours} total hrs), ${trainersCredited} trainer(s) credited.`,
        severity: "success",
      });
    } catch (error: any) {
      console.error("Error completing training:", error);
      const message = error.response?.data?.message || "Failed to complete training";
      setSnackbar({
        open: true,
        message,
        severity: "error",
      });
    }
  };

  const handleAddNewTopic = async () => {
    try {
      // In development, you can optionally mock appending
      queryClient.invalidateQueries({ queryKey: ['topics'] });
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
          <Grid container spacing={2}>
            {/* Date Picker */}
            <Grid item xs={12} md={6} sx={{ minWidth: '250px' }}>
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
            <Grid item xs={12} md={6} sx={{ minWidth: '250px' }}>
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
            <Grid item xs={12} md={6} sx={{ minWidth: '250px' }}>
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
            <Grid item xs={12} md={6} sx={{ minWidth: '250px' }}>
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
            <Grid item xs={12} md={6} sx={{ minWidth: '250px' }}>
              <FormControl fullWidth required>
                <InputLabel>Training Topic</InputLabel>
                <Select
                  value={formData.topic}
                  label="Training Topic"
                  onChange={handleChange("topic")}
                >
                  {topics.map((topic, index) => (
                    <MenuItem key={`topic-${index}-${topic}`} value={topic}>
                      {topic}
                    </MenuItem>
                  ))}
                  <MenuItem value="new">+ Add New Topic</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Trainer */}
            <Grid item xs={12} md={6} sx={{ minWidth: '250px' }}>
              <FormControl fullWidth required>
                <InputLabel>Trainers</InputLabel>
                <Select
                  multiple
                  value={formData.trainer}
                  label="Trainers"
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      trainer: e.target.value as any,
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
                      {topics.map((topic, index) => (
                        <MenuItem key={`topic-filter-${index}-${topic}`} value={topic}>
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
            .map((session, index) => (
              <React.Fragment key={`session-${session.id || index}-${session.topic || 'unknown'}-${session.date || 'nodate'}-${index}`}>
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
                      <>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          component="span"
                          sx={{ display: 'inline-block', mr: 1 }}
                        >
                          {session.date} - {Array.isArray(session.trainer) 
                            ? session.trainer.map(trainerId => {
                                const trainer = trainers.find(t => t.id === trainerId);
                                return trainer ? trainer.name : trainerId;
                              }).join(', ')
                            : session.trainer}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          component="span"
                        >
                          • {session.trainees?.length || 0} trainees
                        </Typography>
                      </>
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
                            <Tooltip title="Manually Add Employee">
                              <IconButton
                                edge="end"
                                onClick={() => handleManualAddEmployee(session.id)}
                                color="primary"
                              >
                                <AddIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Close Out Session & Credit Hours">
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
              ? "Update the list of trainees for this training session. Current trainees are pre-selected."
              : "Select the trainees who have arrived for the training session."}
          </Typography>
          {createdTrainingId && (() => {
            const session = trainingSessions.find(s => s.id === createdTrainingId);
            const trainerCount = Array.isArray(session?.trainer) ? session.trainer.length : (session?.trainer ? 1 : 0);
            const maxTrainees = trainerCount * 12;
            const currentCount = selectedTrainees.length;
            return (
              <Box sx={{ mt: 2, mb: 2, p: 2, bgcolor: currentCount >= maxTrainees ? 'error.light' : 'info.light', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Current Trainees: {currentCount} | Max Allowed: {maxTrainees} ({trainerCount} trainer(s) × 12)
                  {currentCount >= maxTrainees && (
                    <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                      Maximum capacity reached!
                    </Typography>
                  )}
                </Typography>
              </Box>
            );
          })()}
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              {employees.map((employee, index) => (
                <Grid item xs={12} key={employee.id || `employee-${index}-${employee.name}`}>
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

      {/* Manual Add Employee Dialog */}
      <Dialog
        open={openManualAddDialog}
        onClose={() => setOpenManualAddDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Manually Check In Employee</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom sx={{ mb: 2 }}>
            Use this when the QR code fails to scan. Select the employee from existing records —
            their check-in time is recorded as right now.
          </Typography>
          <FormControl fullWidth required sx={{ mb: 2 }}>
            <InputLabel>Employee</InputLabel>
            <Select
              value={manualEmployeeData.employeeId}
              label="Employee"
              onChange={(e) => setManualEmployeeData({ employeeId: e.target.value })}
            >
              <MenuItem value="">Select Employee</MenuItem>
              {employees.map((employee) => (
                <MenuItem key={employee.id} value={employee.id}>
                  {employee.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenManualAddDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmitManualEmployee} variant="contained" disabled={!manualEmployeeData.employeeId}>
            Check In Employee
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
