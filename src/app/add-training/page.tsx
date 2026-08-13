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
  Unarchive as UnarchiveIcon,
  Search as SearchIcon,
  ExpandMore as ExpandMoreIcon,
  Download as DownloadIcon,
  FilterList as FilterListIcon,
  QrCode2 as QrCodeIcon,
  ContentCopy as ContentCopyIcon,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import axios from "axios";
import moment from "moment";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../components/AuthContext";

const BACKEND_URL = ''; // relative — proxied through next.config.mjs's rewrite so the session cookie is same-origin, not third-party
import { QRCodeCanvas } from "qrcode.react";

// Bumps each session-row action icon's touch target from MUI's default
// ~40x40 to ~44x44 (WCAG 2.5.5 AA minimum) — these sit close together in a
// row, so a few extra px per button meaningfully cuts down on mis-taps.
const ACTION_BUTTON_SX = { p: 1.25 } as const;

const AddTraining = () => {
  const { user } = useAuth();
  const isSupervisor = user?.role === 'supervisor';

  // Form state
  const [formData, setFormData] = useState({
    date: null,
    location: "",
    startTime: "",
    length: "",
    topics: [] as string[],
    trainer: [],
    status: "scheduled", // scheduled, in-progress, completed
  });

  // Data from API
  const { data: locations = [] as any[] } = useQuery({
    queryKey: ['sites'],
    queryFn: async () => {
      const { data } = await axios.get(`${BACKEND_URL}/api/sites`);
      return data.map((s: any) => s.name);
    }
  });

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
      return data;
    }
  });

  // Free-text detail captured for any selected topic flagged requiresDetail
  // (e.g. "First Aid", "Other") — keyed by topic name.
  const [topicDetails, setTopicDetails] = useState<Record<string, string>>({});

  // Trainers are employees with isTrainer === true, plus supervisors (who can
  // also lead training) — no separate collection. isTrainer still separately
  // controls who lands on the Trainer Portal vs. Manager Portal.
  const trainers = employees.filter((e: any) => e.isTrainer || e.isSupervisor);

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
  const [qrDialogSession, setQrDialogSession] = useState(null);
  // A single confirm dialog reused for actions that are hard to undo (Archive,
  // Cancel Training) — a safety net so a mis-tap among the tightly clustered
  // action icons doesn't silently take effect.
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    confirmColor?: "error" | "warning" | "primary";
    onConfirm: () => void;
  } | null>(null);

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

  // Whichever topics are mandatory for the selected date's week (set in
  // Manage Topics > Mandatory Topics Schedule) — locked into formData.topics
  // below, can't be unchecked. Refetched whenever the date changes since a
  // different date can fall in a different week/month.
  const [mandatoryTopicsForWeek, setMandatoryTopicsForWeek] = useState<string[]>([]);
  useEffect(() => {
    if (!formData.date) {
      setMandatoryTopicsForWeek([]);
      return;
    }
    const dateStr = moment(formData.date).format('YYYY-MM-DD');
    let cancelled = false;
    axios.get('/api/mandatory-topics/for-date', { params: { date: dateStr } })
      .then(({ data }) => {
        if (!cancelled) setMandatoryTopicsForWeek(data.topics || []);
      })
      .catch(() => {
        if (!cancelled) setMandatoryTopicsForWeek([]);
      });
    return () => { cancelled = true; };
  }, [formData.date]);

  // Auto-add any newly-mandatory topics as soon as they're known, so they're
  // pre-selected without the trainer needing to touch the Topics field.
  useEffect(() => {
    if (mandatoryTopicsForWeek.length === 0) return;
    setFormData((prev) => {
      const merged = Array.from(new Set([...(prev.topics || []), ...mandatoryTopicsForWeek]));
      if (merged.length === (prev.topics || []).length) return prev;
      return { ...prev, topics: merged };
    });
  }, [mandatoryTopicsForWeek]);

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
        topics: [],
        trainer: [],
        status: "scheduled",
      });
      setTopicDetails({});
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
    if (!formData.topics || formData.topics.length === 0) {
        setSnackbar({ open: true, message: "Please select at least one topic", severity: "error" });
        return;
    }
    if (!formData.length) {
        setSnackbar({ open: true, message: "Please enter session length", severity: "error" });
        return;
    }
    const missingDetail = formData.topics.find(
      (name) => topics.find((t: any) => t.name === name)?.requiresDetail && !topicDetails[name]?.trim()
    );
    if (missingDetail) {
      setSnackbar({ open: true, message: `Please describe what was covered under "${missingDetail}"`, severity: "error" });
      return;
    }
    const resolvedTopics = formData.topics.map((name) => {
      const detail = topicDetails[name]?.trim();
      return detail ? `${name} — ${detail}` : name;
    });
    const sessionData = {
      date: moment(formData.date).format('YYYY-MM-DD'),
      location: formData.location,
      startTime: formData.startTime || undefined,
      // Form collects minutes; every other producer of `length` (close-out,
      // Upload Sheet) stores hours, so convert here to keep the field
      // unit-consistent wherever it's later read as hours.
      length: Math.round((parseInt(formData.length, 10) / 60) * 100) / 100,
      topics: resolvedTopics,
      trainer: formData.trainer,
      trainees: []
    };
    createSessionMutation.mutate(sessionData);
  };

  const handleAddTrainees = async () => {
    try {
      const BACKEND_URL = ''; // relative — proxied through next.config.mjs's rewrite so the session cookie is same-origin, not third-party
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

      const BACKEND_URL = ''; // relative — proxied through next.config.mjs's rewrite so the session cookie is same-origin, not third-party

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
    const BACKEND_URL = ''; // relative — proxied through next.config.mjs's rewrite so the session cookie is same-origin, not third-party
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
      const BACKEND_URL = ''; // relative — proxied through next.config.mjs's rewrite so the session cookie is same-origin, not third-party
      const response = await axios.post(`${BACKEND_URL}/api/sessions/${sessionId}/close`);

      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });

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
    if (!newTopic.trim()) return;
    try {
      const { data } = await axios.post(`${BACKEND_URL}/api/training-topics`, {
        topicName: newTopic,
      });
      await queryClient.invalidateQueries({ queryKey: ['topics'] });
      setFormData((prev) => ({ ...prev, topics: [...prev.topics, data.topic.name] }));
      setOpenNewTopicModal(false);
      setNewTopic("");
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
      await axios.put(`${BACKEND_URL}/api/sessions/${sessionId}`, {
        status: 'cancelled',
      });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });

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
      await axios.put(`${BACKEND_URL}/api/sessions/${sessionId}`, {
        archived: true,
      });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });

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

  const handleUnarchiveTraining = async (sessionId) => {
    try {
      await axios.put(`${BACKEND_URL}/api/sessions/${sessionId}`, {
        archived: false,
      });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });

      setSnackbar({
        open: true,
        message: "Training unarchived successfully!",
        severity: "success",
      });
    } catch (error) {
      console.error("Error unarchiving training:", error);
      setSnackbar({
        open: true,
        message: "Failed to unarchive training",
        severity: "error",
      });
    }
  };

  const getSessionTrainerNames = (session: any): string[] => {
    if (Array.isArray(session.trainer)) {
      return session.trainer.map((trainerId: string) => {
        const trainer = trainers.find((t: any) => t.id === trainerId);
        return trainer ? trainer.name : trainerId;
      });
    }
    return session.trainer ? [session.trainer] : [];
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
    const sessionTrainerNames = getSessionTrainerNames(session);
    if (trainerFilter !== "all" && !sessionTrainerNames.includes(trainerFilter)) {
      return false;
    }

    // Apply location filter
    if (locationFilter !== "all" && session.location !== locationFilter) {
      return false;
    }

    // Apply topic filter
    const sessionTopics: string[] = session.topics || (session.topic ? [session.topic] : []);
    if (topicFilter !== "all" && !sessionTopics.includes(topicFilter)) {
      return false;
    }

    // Apply search filter
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      return (
        sessionTopics.some((t) => t.toLowerCase().includes(searchLower)) ||
        sessionTrainerNames.some((t) => t.toLowerCase().includes(searchLower)) ||
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

        const sessionTopics = session.topics || (session.topic ? [session.topic] : []);

        return [
          formattedDate,
          `"${sessionTopics.join("; ")}"`,
          `"${getSessionTrainerNames(session).join("; ")}"`,
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
            <Grid size={{ xs: 12, md: 6 }} sx={{ minWidth: '250px' }}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Training Date"
                  value={formData.date ?? null}
                  onChange={handleDateChange}
                  slotProps={{ textField: { fullWidth: true, required: true } }}
                />
              </LocalizationProvider>
            </Grid>

            {/* Location */}
            <Grid size={{ xs: 12, md: 6 }} sx={{ minWidth: '250px' }}>
              <FormControl fullWidth required>
                <InputLabel>Training Location</InputLabel>
                <Select
                  value={formData.location ?? ""}
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
            <Grid size={{ xs: 12, md: 6 }} sx={{ minWidth: '250px' }}>
              <FormControl fullWidth required>
                <InputLabel>Start Time</InputLabel>
                <Select
                  value={formData.startTime ?? ""}
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
            <Grid size={{ xs: 12, md: 6 }} sx={{ minWidth: '250px' }}>
              <TextField
                fullWidth
                required
                type="number"
                label="Training Length (minutes)"
                value={formData.length ?? ""}
                onChange={handleChange("length")}
              />
            </Grid>

            {/* Topics */}
            <Grid size={{ xs: 12, md: 6 }} sx={{ minWidth: '250px' }}>
              <FormControl fullWidth required>
                <InputLabel>Training Topics</InputLabel>
                <Select
                  multiple
                  value={formData.topics ?? []}
                  label="Training Topics"
                  onChange={(e) => {
                    const value = Array.isArray(e.target.value)
                      ? e.target.value as string[]
                      : String(e.target.value || '').split(',').filter(Boolean);
                    if (value.includes("new")) {
                      setOpenNewTopicModal(true);
                      return;
                    }
                    // Mandatory topics can't be unchecked — re-union them back
                    // in even if something managed to toggle one off, so the
                    // MenuItem's `disabled` below is belt-and-suspenders, not
                    // the only thing enforcing this.
                    const withMandatory = Array.from(new Set([...value, ...mandatoryTopicsForWeek]));
                    setFormData((prev) => ({ ...prev, topics: withMandatory }));
                  }}
                  renderValue={(selected) => (selected as string[]).join(", ")}
                >
                  {topics.map((topic: any, index) => {
                    const isMandatory = mandatoryTopicsForWeek.includes(topic.name);
                    return (
                      <MenuItem
                        key={`topic-${index}-${topic.name}`}
                        value={topic.name}
                        disabled={isMandatory && (formData.topics ?? []).includes(topic.name)}
                      >
                        {topic.name}{isMandatory ? ' (mandatory)' : ''}
                      </MenuItem>
                    );
                  })}
                  {isSupervisor && <MenuItem value="new">+ Add New Topic</MenuItem>}
                </Select>
              </FormControl>
              {mandatoryTopicsForWeek.length > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  {mandatoryTopicsForWeek.join(', ')} {mandatoryTopicsForWeek.length === 1 ? 'is' : 'are'} mandatory
                  this week and can&apos;t be removed.
                </Typography>
              )}
            </Grid>

            {/* Detail fields for any selected topic flagged "requires detail" (e.g. First Aid, Other) */}
            {formData.topics
              .filter((name) => topics.find((t: any) => t.name === name)?.requiresDetail)
              .map((name) => (
                <Grid size={12} key={`detail-${name}`}>
                  <TextField
                    fullWidth
                    required
                    label={`${name} — what was covered?`}
                    value={topicDetails[name] || ""}
                    onChange={(e) =>
                      setTopicDetails((prev) => ({ ...prev, [name]: e.target.value }))
                    }
                    helperText={`"${name}" needs a specific description of what this session actually covered.`}
                  />
                </Grid>
              ))}

            {/* Trainer */}
            <Grid size={{ xs: 12, md: 6 }} sx={{ minWidth: '250px' }}>
              <FormControl fullWidth required>
                <InputLabel>Trainers</InputLabel>
                <Select
                  multiple
                  value={formData.trainer ?? []}
                  label="Trainers"
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      trainer: Array.isArray(e.target.value)
                        ? e.target.value
                        : String(e.target.value || '').split(',').filter(Boolean),
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
            <Grid size={12}>
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
              value={searchQuery ?? ""}
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
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
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
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
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
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
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
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Topic</InputLabel>
                    <Select
                      value={topicFilter}
                      label="Topic"
                      onChange={(e) => setTopicFilter(e.target.value)}
                    >
                      <MenuItem value="all">All Topics</MenuItem>
                      {topics.map((topic: any, index) => (
                        <MenuItem key={`topic-filter-${index}-${topic.name}`} value={topic.name}>
                          {topic.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="Filter by Date"
                      value={dateFilter ?? null}
                      onChange={setDateFilter}
                      slotProps={{ textField: { size: 'small', fullWidth: true } }}
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
          <Tab label="Cancelled" />
          <Tab label="Archived" />
        </Tabs>

        <List>
          {filteredSessions
            .filter((session) => {
              if (activeTab === 0)
                return !session.archived && session.status !== "completed" && session.status !== "cancelled";
              if (activeTab === 1)
                return !session.archived && session.status === "completed";
              if (activeTab === 2)
                return !session.archived && session.status === "cancelled";
              if (activeTab === 3) return session.archived;
              return true;
            })
            .map((session, index) => (
              <React.Fragment key={`session-${session.id || index}-${(session.topics || [session.topic]).join('-') || 'unknown'}-${session.date || 'nodate'}-${index}`}>
                <ListItem
                  sx={{
                    flexWrap: "wrap",
                    alignItems: "flex-start",
                    rowGap: 1,
                  }}
                >
                  <ListItemText
                    sx={{ flex: "1 1 260px", minWidth: 0, pr: 2 }}
                    primary={
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Typography variant="subtitle1" component="span">
                          {(session.topics || (session.topic ? [session.topic] : [])).join(', ')}
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
                          {session.date} - {getSessionTrainerNames(session).join(', ')}
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

                  <Box sx={{ display: "flex", gap: 1.5, flexShrink: 0 }}>
                      {session.status !== "completed" &&
                        session.status !== "cancelled" && (
                          <Tooltip title="Show Check-In QR Code">
                            <IconButton
                              edge="end"
                              onClick={() => setQrDialogSession(session)}
                              sx={ACTION_BUTTON_SX}
                            >
                              <QrCodeIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      {session.status !== "completed" &&
                        session.status !== "cancelled" && (
                          <>
                            <Tooltip title="Update Trainees">
                              <IconButton
                                edge="end"
                                onClick={() => handleUpdateTrainees(session.id)}
                                sx={ACTION_BUTTON_SX}
                              >
                                <GroupIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Manually Add Employee">
                              <IconButton
                                edge="end"
                                onClick={() => handleManualAddEmployee(session.id)}
                                color="primary"
                                sx={ACTION_BUTTON_SX}
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
                                sx={ACTION_BUTTON_SX}
                              >
                                <CheckCircleIcon />
                              </IconButton>
                            </Tooltip>
                            {/* Cancel is hard to undo, so it's set apart from
                                the routine actions above (extra left margin)
                                and requires confirming instead of firing
                                immediately on click — the routine actions
                                stay single-click since a mis-tap there just
                                means redoing something harmless. */}
                            <Tooltip title="Cancel Training">
                              <IconButton
                                edge="end"
                                onClick={() =>
                                  setConfirmDialog({
                                    title: "Cancel this training?",
                                    message: `This will mark "${(session.topics || [session.topic]).join(', ')}" on ${session.date} as cancelled. This can't be undone from here.`,
                                    confirmLabel: "Cancel Training",
                                    confirmColor: "error",
                                    onConfirm: () => handleCancelTraining(session.id),
                                  })
                                }
                                color="error"
                                sx={{ ...ACTION_BUTTON_SX, ml: 1 }}
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
                            onClick={() =>
                              setConfirmDialog({
                                title: "Archive this training?",
                                message: `This will move "${(session.topics || [session.topic]).join(', ')}" on ${session.date} to the Archived tab. You can unarchive it later from there.`,
                                confirmLabel: "Archive",
                                confirmColor: "warning",
                                onConfirm: () => handleArchiveTraining(session.id),
                              })
                            }
                            color="warning"
                            sx={ACTION_BUTTON_SX}
                          >
                            <ArchiveIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {session.archived && (
                        <Tooltip title="Unarchive Training">
                          <IconButton
                            edge="end"
                            onClick={() => handleUnarchiveTraining(session.id)}
                            sx={ACTION_BUTTON_SX}
                          >
                            <UnarchiveIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                  </Box>
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
        </List>
      </Paper>

      {/* Shared confirmation for hard-to-undo actions (Cancel, Archive) */}
      <Dialog open={!!confirmDialog} onClose={() => setConfirmDialog(null)}>
        <DialogTitle>{confirmDialog?.title}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {confirmDialog?.message}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(null)}>Never Mind</Button>
          <Button
            variant="contained"
            color={confirmDialog?.confirmColor || "primary"}
            onClick={() => {
              confirmDialog?.onConfirm();
              setConfirmDialog(null);
            }}
          >
            {confirmDialog?.confirmLabel}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Check-In QR Code */}
      <Dialog open={!!qrDialogSession} onClose={() => setQrDialogSession(null)}>
        <DialogTitle>Check-In QR Code</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, py: 1 }}>
            <Typography variant="body2" color="text.secondary" align="center">
              {(qrDialogSession?.topics || (qrDialogSession?.topic ? [qrDialogSession.topic] : [])).join(', ')}
              {qrDialogSession?.date ? ` — ${qrDialogSession.date}` : ''}
            </Typography>
            {qrDialogSession && (
              <QRCodeCanvas
                value={`${window.location.origin}/checkin/${qrDialogSession.id}`}
                size={240}
              />
            )}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, maxWidth: 320 }}>
              <Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-all" }}>
                {qrDialogSession ? `${window.location.origin}/checkin/${qrDialogSession.id}` : ''}
              </Typography>
              <Tooltip title="Copy Link">
                <IconButton
                  size="small"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/checkin/${qrDialogSession.id}`);
                    setSnackbar({ open: true, message: "Check-in link copied", severity: "success" });
                  }}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrDialogSession(null)}>Close</Button>
        </DialogActions>
      </Dialog>

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
            value={newTopic ?? ""}
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
                <Grid size={12} key={employee.id || `employee-${index}-${employee.name}`}>
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
              value={manualEmployeeData.employeeId ?? ""}
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
