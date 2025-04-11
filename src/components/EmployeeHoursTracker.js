'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';

const EmployeeHoursTracker = () => {
  const [employees, setEmployees] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [traineesByHours, setTraineesByHours] = useState({
    completed: [],
    atRisk: [],
  });

  useEffect(() => {
    // Mock data for employees
    const mockEmployees = [
      { id: 1, name: 'John Doe', location: 'MCAC', hours: 5 },
      { id: 2, name: 'Jane Smith', location: 'Cordelia', hours: 3 },
      { id: 3, name: 'Mike Johnson', location: 'MCAC', hours: 2 },
    ];
    setEmployees(mockEmployees);

    // Mock data for locations
    const mockLocations = ['MCAC', 'Cordelia', 'Double Oaks', 'Ramsey Creek Beach'];
    setLocations(mockLocations);
  }, []);

  useEffect(() => {
    filterTraineesByLocationAndHours();
  }, [selectedLocation, employees]);

  const filterTraineesByLocationAndHours = () => {
    if (!selectedLocation) return;

    const filteredTrainees = employees.filter(
      (employee) => employee.location === selectedLocation
    );

    const completed = filteredTrainees.filter((trainee) => trainee.hours >= 4);
    const atRisk = filteredTrainees.filter((trainee) => trainee.hours < 4);

    setTraineesByHours({ completed, atRisk });
  };

  return (
    <Container maxWidth="md">
      <Paper sx={{ p: 4, mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Trainee Hours by Location
        </Typography>

        <Grid container spacing={3}>
          {/* Location Filter */}
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Select Location</InputLabel>
              <Select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
              >
                <MenuItem value="">All Locations</MenuItem>
                {locations.map((location) => (
                  <MenuItem key={location} value={location}>
                    {location}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Completed Hours */}
          <Grid item xs={12}>
            <Typography variant="h6">Completed Hours</Typography>
            {traineesByHours.completed.length > 0 ? (
              <List>
                {traineesByHours.completed.map((trainee) => (
                  <ListItem key={trainee.id}>
                    <ListItemText primary={trainee.name} secondary={`Hours: ${trainee.hours}`} />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography>No trainees have completed their hours.</Typography>
            )}
          </Grid>

          {/* At Risk */}
          <Grid item xs={12}>
            <Typography variant="h6">At Risk</Typography>
            {traineesByHours.atRisk.length > 0 ? (
              <List>
                {traineesByHours.atRisk.map((trainee) => (
                  <ListItem key={trainee.id}>
                    <ListItemText primary={trainee.name} secondary={`Hours: ${trainee.hours}`} />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography>No trainees are at risk.</Typography>
            )}
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default EmployeeHoursTracker;




// import React, { useState, useEffect } from 'react';
// import {
//   Container,
//   Paper,
//   Typography,
//   Grid,
//   FormControl,
//   InputLabel,
//   Select,
//   MenuItem,
//   Box,
//   Alert,
//   CircularProgress,
//   TextField,
// } from '@mui/material';
// import { DatePicker } from '@mui/x-date-pickers/DatePicker';
// import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
// import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
// import moment from 'moment';
// import axios from 'axios';

// const EmployeeHoursTracker = () => {
//   const [employees, setEmployees] = useState([]);
//   const [selectedEmployee, setSelectedEmployee] = useState('');
//   const [selectedMonth, setSelectedMonth] = useState(moment().startOf('month'));
//   const [selectedYear, setSelectedYear] = useState(moment().year());
//   const [viewMode, setViewMode] = useState('monthly');
//   const [hours, setHours] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const [locations, setLocations] = useState([]);
//   const [selectedLocation, setSelectedLocation] = useState('');
//   const [traineesByHours, setTraineesByHours] = useState({
//   completed: [],
//   atRisk: [],
// });

//   // Fetch employees on component mount
//   useEffect(() => {
//     fetchEmployees();
//   }, []);

//   // Fetch hours when employee, month/year, or view mode changes
//   useEffect(() => {
//     if (selectedEmployee) {
//       fetchEmployeeHours();
//     }
//   }, [selectedEmployee, selectedMonth, selectedYear, viewMode]);

//   const fetchEmployees = async () => {
//     try {
//       const response = await axios.get('/api/employees');
//       setEmployees(response.data);
//     } catch (error) {
//       console.error('Error fetching employees:', error);
//       setError('Failed to fetch employees');
//     }
//   };

//   useEffect(() => {
//     const fetchLocations = async () => {
//       try {
//         // Replace with your API call
//         const mockLocations = ['MCAC', 'Cordelia', 'Double Oaks', 'Ramsey Creek Beach'];
//         setLocations(mockLocations);
//       } catch (error) {
//         console.error('Error fetching locations:', error);
//         setError('Failed to fetch locations');
//       }
//     };
  
//     fetchLocations();
//   }, []);

//   useEffect(() => {
//     filterTraineesByLocationAndHours();
//   }, [selectedLocation, employees]);

//   const fetchEmployeeHours = async () => {
//     try {
//       setLoading(true);
//       setError(null);

//       let startDate, endDate;
//       if (viewMode === 'monthly') {
//         startDate = moment(selectedMonth).startOf('month').format('YYYY-MM-DD');
//         endDate = moment(selectedMonth).endOf('month').format('YYYY-MM-DD');
//       } else {
//         startDate = moment().year(selectedYear).startOf('year').format('YYYY-MM-DD');
//         endDate = moment().year(selectedYear).endOf('year').format('YYYY-MM-DD');
//       }

//       const response = await axios.get(`/api/employee-hours/${selectedEmployee}`, {
//         params: {
//           startDate,
//           endDate,
//         },
//       });

//       setHours(response.data);
//     } catch (error) {
//       console.error('Error fetching employee hours:', error);
//       setError('Failed to fetch employee hours');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const filterTraineesByLocationAndHours = () => {
//     if (!selectedLocation) return;
  
//     const filteredTrainees = employees.filter(
//       (employee) => employee.location === selectedLocation
//     );
  
//     const completed = filteredTrainees.filter((trainee) => trainee.hours >= 4);
//     const atRisk = filteredTrainees.filter((trainee) => trainee.hours < 4);
  
//     setTraineesByHours({ completed, atRisk });
//   };

//   const handleMonthChange = (newValue) => {
//     if (newValue && moment.isMoment(newValue)) {
//       setSelectedMonth(newValue.startOf('month'));
//     }
//   };

//   return (
//     <Container maxWidth="md">
//       <Paper sx={{ p: 4, mt: 4 }}>
//         <Typography variant="h5" gutterBottom>
//           Employee Hours Tracker
//         </Typography>

//         <Grid container spacing={3}>
//           {/* Employee Selection */}
//           <Grid item xs={12} md={4}>
//             <FormControl fullWidth>
//               <InputLabel>Select Employee</InputLabel>
//               <Select
//                 value={selectedEmployee}
//                 label="Select Employee"
//                 onChange={(e) => setSelectedEmployee(e.target.value)}
//               >
//                 {employees.map((employee) => (
//                   <MenuItem key={employee.id} value={employee.id}>
//                     {employee.name}
//                   </MenuItem>
//                 ))}
//               </Select>
//             </FormControl>
//           </Grid>

//           {/* View Mode Selection */}
//           <Grid item xs={12} md={4}>
//             <FormControl fullWidth>
//               <InputLabel>View Mode</InputLabel>
//               <Select
//                 value={viewMode}
//                 label="View Mode"
//                 onChange={(e) => setViewMode(e.target.value)}
//               >
//                 <MenuItem value="monthly">Monthly</MenuItem>
//                 <MenuItem value="yearly">Yearly</MenuItem>
//               </Select>
//             </FormControl>
//           </Grid>

//           {/* Date/Year Selection */}
//           <Grid item xs={12} md={4}>
//             {viewMode === 'monthly' ? (
//               <LocalizationProvider dateAdapter={AdapterMoment}>
//                 <DatePicker
//                   views={['year', 'month']}
//                   value={selectedMonth}
//                   onChange={handleMonthChange}
//                   slotProps={{
//                     textField: {
//                       fullWidth: true,
//                       label: 'Select Month',
//                     },
//                   }}
//                 />
//               </LocalizationProvider>
//             ) : (
//               <FormControl fullWidth>
//                 <InputLabel>Select Year</InputLabel>
//                 <Select
//                   value={selectedYear}
//                   label="Select Year"
//                   onChange={(e) => setSelectedYear(e.target.value)}
//                 >
//                   {Array.from({ length: 5 }, (_, i) => moment().year() - 2 + i).map((year) => (
//                     <MenuItem key={year} value={year}>
//                       {year}
//                     </MenuItem>
//                   ))}
//                 </Select>
//               </FormControl>
//             )}
//           </Grid>

     
//           {/* Results Display */}
//           <Grid item xs={12}>
//             {loading ? (
//               <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
//                 <CircularProgress />
//               </Box>
//             ) : error ? (
//               <Alert severity="error">{error}</Alert>
//             ) : hours ? (
//               <Box>
//                 <Typography variant="h6" gutterBottom>
//                   Hours Summary
//                 </Typography>
//                 <Typography variant="body1">
//                   Total Hours: {hours.totalHours}
//                 </Typography>
//                 <Typography variant="body1">
//                   Training Sessions: {hours.sessions}
//                 </Typography>
//               </Box>
//             ) : (
//               <Typography variant="body1" color="text.secondary">
//                 Select an employee to view their hours
//               </Typography>
//             )}
//           </Grid>
//         </Grid>
//       </Paper>
//     </Container>
//   );
// };

// export default EmployeeHoursTracker; 