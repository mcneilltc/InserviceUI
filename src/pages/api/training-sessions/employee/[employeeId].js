import axios from 'axios';

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5001';

// Mock data for development
const mockTrainingSessions = [
  {
    id: 1,
    employeeId: 1,
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
    employeeId: 1,
    date: '2024-03-20',
    startTime: '13:00',
    endTime: '15:00',
    topic: 'Equipment Maintenance',
    location: 'Training Room B',
    trainer: 'Sarah Johnson',
    status: 'scheduled',
  },
  {
    id: 3,
    employeeId: 1,
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
  const { method } = req;
  const { employeeId } = req.query;

  if (!employeeId) {
    return res.status(400).json({ message: 'Employee ID is required' });
  }

  try {
    switch (method) {
      case 'GET':
        // In production, you would make an actual API call:
        // const response = await axios.get(`${BACKEND_API_URL}/api/training-sessions/employee/${employeeId}`);
        // return res.status(200).json(response.data);

        // Filter mock data for the specific employee
        const employeeSessions = mockTrainingSessions.filter(
          (session) => session.employeeId === parseInt(employeeId)
        );

        return res.status(200).json(employeeSessions);

      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error handling training sessions request:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
} 