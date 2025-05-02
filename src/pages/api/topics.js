import axios from 'axios';

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:5001';

// In-memory storage for development
let mockTopics = [
  { id: 1, name: 'Safety Procedures' },
  { id: 2, name: 'Equipment Maintenance' },
  { id: 3, name: 'Emergency Response' },
  { id: 4, name: 'First Aid' },
];

export default async function handler(req, res) {
  const { method, query, body } = req;

  try {
    switch (method) {
      case 'GET':
        // In production, you would make an actual API call:
        const response = await axios.get(`${BACKEND_API_URL}/api/topics`);
        return res.status(200).json(response.data);

        // return res.status(200).json(mockTopics);

      case 'POST':
        const { name } = body;

        if (!name) {
          return res.status(400).json({ message: 'Topic name is required' });
        }

        // In development, add to in-memory array
        // const newTopic = {
        //   id: mockTopics.length + 1,
        //   name: name.trim(),
        // };
        // mockTopics.push(newTopic);

        // In production, you would make an actual API call:
        const newTopic = await axios.post(`${BACKEND_API_URL}/api/topics`, { name });
        return res.status(201).json(newTopic.data);

        // return res.status(201).json(newTopic);

      case 'PUT':
        const { id } = query;
        const { name: updatedName } = body;

        if (!id || !updatedName) {
          return res.status(400).json({ message: 'Topic ID and name are required' });
        }

        // In development, update in-memory array
        // const topicIndex = mockTopics.findIndex((topic) => topic.id === parseInt(id));
        // if (topicIndex === -1) {
        //   return res.status(404).json({ message: 'Topic not found' });
        // }

        // mockTopics[topicIndex] = {
        //   ...mockTopics[topicIndex],
        //   name: updatedName.trim(),
        // };

        // In production, you would make an actual API call:
        const updateTopic = await axios.put(`${BACKEND_API_URL}/api/topics/${id}`, { name: updatedName });
        return res.status(200).json(updateTopic.data);

        // return res.status(200).json(mockTopics[topicIndex]);

      case 'DELETE':
        const { id: deleteId } = query;

        if (!deleteId) {
          return res.status(400).json({ message: 'Topic ID is required' });
        }

        // In development, delete from in-memory array
        // const deleteIndex = mockTopics.findIndex((topic) => topic.id === parseInt(deleteId));
        // if (deleteIndex === -1) {
        //   return res.status(404).json({ message: 'Topic not found' });
        // }

        // mockTopics = mockTopics.filter((topic) => topic.id !== parseInt(deleteId));

        // In production, you would make an actual API call:
        await axios.delete(`${BACKEND_API_URL}/api/topics/${deleteId}`);
        // return res.status(204).end();

        return res.status(204).end();

      default:
        return res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error handling topic request:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
} 