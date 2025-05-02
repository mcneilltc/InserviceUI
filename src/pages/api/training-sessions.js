import axios from 'axios';

// This would be your actual backend API URL
const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5001';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // In development, return mock data
    // In production, this would be replaced with actual API call
    // const mockData = [
    //   {
    //     id: '1',
    //     topic: 'Safety Procedures',
    //     trainer: 'John Smith',
    //     date: '2024-04-01',
    //     participants: 15,
    //     status: 'Completed'
    //   },
    //   {
    //     id: '2',
    //     topic: 'Equipment Maintenance',
    //     trainer: 'Sarah Johnson',
    //     date: '2024-04-02',
    //     participants: 12,
    //     status: 'Scheduled'
    //   },
    //   {
    //     id: '3',
    //     topic: 'Emergency Response',
    //     trainer: 'Mike Wilson',
    //     date: '2024-04-03',
    //     participants: 20,
    //     status: 'In Progress'
    //   },
    //   {
    //     id: '4',
    //     topic: 'Safety Procedures',
    //     trainer: 'John Smith',
    //     date: '2024-04-04',
    //     participants: 18,
    //     status: 'Scheduled'
    //   },
    //   {
    //     id: '5',
    //     topic: 'Equipment Maintenance',
    //     trainer: 'Sarah Johnson',
    //     date: '2024-04-05',
    //     participants: 14,
    //     status: 'Completed'
    //   }
    // ];

    // In production, you would make an actual API call:
    const response = await axios.get(`${BACKEND_API_URL}/api/training-sessions`);
    return res.status(200).json(response.data);

    // For development, return mock data
    // return res.status(200).json(mockData);
  } catch (error) {
    console.error('Error fetching training sessions:', error);
    return res.status(500).json({ 
      message: 'Error fetching training sessions',
      error: error.message 
    });
  }
} 