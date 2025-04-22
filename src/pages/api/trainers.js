import axios from 'axios';


const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5001';

// In-memory storage for development
let mockTrainers = [
  {
    id: 1,
    name: 'John Smith',
    email: 'john.smith@example.com',
    phone: '(555) 123-4567',
  },
  {
    id: 2,
    name: 'Sarah Johnson',
    email: 'sarah.j@example.com',
    phone: '(555) 234-5678',
  },
  {
    id: 3,
    name: 'Michael Brown',
    email: 'michael.b@example.com',
    phone: '(555) 345-6789',
  },
  {
    id: 4,
    name: 'Emily Davis',
    email: 'emily.d@example.com',
    phone: '(555) 456-7890',
  },
];

export default async function handler(req, res) {
  const { method, query, body } = req;

  try {
    switch (method) {
      case 'GET':
        // In production, you would make an actual API call:
        const response = await axios.get(`${BACKEND_API_URL}/api/trainers`);
        return res.status(200).json(response.data);

        // return res.status(200).json(mockTrainers);

      case 'POST':
        const { name, email, phone } = body;

        if (!name || !email) {
          return res.status(400).json({ message: 'Name and email are required' });
        }

        // In development, add to in-memory array
        const newTrainer = {
          id: mockTrainers.length + 1,
          name: name.trim(),
          email: email.trim(),
          phone: phone?.trim() || '',
        };
        mockTrainers.push(newTrainer);

        // In production, you would make an actual API call:
        // const response = await axios.post(`${BACKEND_API_URL}/api/trainers`, { name, email, phone });
        // return res.status(201).json(response.data);

        return res.status(201).json(newTrainer);

      case 'PUT':
        const { id } = query;
        const { name: updatedName, email: updatedEmail, phone: updatedPhone,  } = body;

        if (!id || !updatedName || !updatedEmail) {
          return res.status(400).json({ message: 'ID, name, and email are required' });
        }

        // In development, update in-memory array
        // const trainerIndex = mockTrainers.findIndex((trainer) => trainer.id === parseInt(id));
        // if (trainerIndex === -1) {
        //   return res.status(404).json({ message: 'Trainer not found' });
        // }

        // mockTrainers[trainerIndex] = {
        //   ...mockTrainers[trainerIndex],
        //   name: updatedName.trim(),
        //   email: updatedEmail.trim(),
        //   phone: updatedPhone?.trim() || '',
        //   expertise: updatedExpertise?.trim() || '',
        // };

        // In production, you would make an actual API call:
        const updateTrainer = await axios.put(`${BACKEND_API_URL}/api/trainers/${id}`, { name: updatedName, email: updatedEmail, phone: updatedPhone, expertise: updatedExpertise });
        return res.status(200).json(response.data);

        // return res.status(200).json(mockTrainers[trainerIndex]);

      case 'DELETE':
        const { id: deleteId } = query;

        if (!deleteId) {
          return res.status(400).json({ message: 'Trainer ID is required' });
        }

        // In development, delete from in-memory array
        const deleteIndex = mockTrainers.findIndex((trainer) => trainer.id === parseInt(deleteId));
        if (deleteIndex === -1) {
          return res.status(404).json({ message: 'Trainer not found' });
        }

        mockTrainers = mockTrainers.filter((trainer) => trainer.id !== parseInt(deleteId));

        // In production, you would make an actual API call:
        await axios.delete(`${BACKEND_API_URL}/api/trainers/${deleteId}`);
        // return res.status(204).end();

        return res.status(204).end();

      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error handling trainer request:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
} 