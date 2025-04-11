import axios from 'axios';

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5001';

// Mock data for development
const mockTrainingSessions = [
  {
    id: 1,
    employeeId: 1,
    employeeName: 'John Doe',
    date: '2024-03-15',
    startTime: '09:00',
    endTime: '11:00',
    topic: 'Safety Procedures',
    location: 'Training Room A',
    trainer: 'John Smith',
    status: 'completed',
  },
  {
    id: 2,
    employeeId: 2,
    employeeName: 'Jane Smith',
    date: '2024-03-15',
    startTime: '09:00',
    endTime: '11:00',
    topic: 'Safety Procedures',
    location: 'Training Room A',
    trainer: 'John Smith',
    status: 'completed',
  },
  {
    id: 3,
    employeeId: 3,
    employeeName: 'Mike Johnson',
    date: '2024-03-20',
    startTime: '13:00',
    endTime: '15:00',
    topic: 'Equipment Maintenance',
    location: 'Training Room B',
    trainer: 'Sarah Johnson',
    status: 'scheduled',
  },
  {
    id: 4,
    employeeId: 4,
    employeeName: 'Sarah Williams',
    date: '2024-03-25',
    startTime: '10:00',
    endTime: '12:00',
    topic: 'Emergency Response',
    location: 'Training Room C',
    trainer: 'Michael Brown',
    status: 'scheduled',
  },
];

export default async function handler(req, res) {
  const { method, query } = req;

  if (method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // In production, you would make an actual API call:
    // const response = await axios.get(`${BACKEND_API_URL}/api/training-sessions/report`, { params: query });
    // return res.status(200).json(response.data);

    // Filter mock data based on query parameters
    let filteredSessions = [...mockTrainingSessions];

    // Apply date range filter
    if (query.startDate) {
      filteredSessions = filteredSessions.filter(session => 
        session.date >= query.startDate
      );
    }
    if (query.endDate) {
      filteredSessions = filteredSessions.filter(session => 
        session.date <= query.endDate
      );
    }

    // Apply topic filter
    if (query.topic) {
      filteredSessions = filteredSessions.filter(session => 
        session.topic === query.topic
      );
    }

    // Apply trainer filter
    if (query.trainer) {
      filteredSessions = filteredSessions.filter(session => 
        session.trainer === query.trainer
      );
    }

    // Apply status filter
    if (query.status && query.status !== 'all') {
      filteredSessions = filteredSessions.filter(session => 
        session.status === query.status
      );
    }

    return res.status(200).json(filteredSessions);
  } catch (error) {
    console.error('Error handling training sessions report request:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
} 