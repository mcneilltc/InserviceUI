import axios from 'axios';

// The backend issues the session as an httpOnly cookie — this makes it ride
// along on every request made through the shared axios instance, app-wide.
axios.defaults.withCredentials = true;
