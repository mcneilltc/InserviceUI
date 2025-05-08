
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { sessionId, name, email, phone, location } = req.body;

  if (!sessionId || !name || !email || !phone || !location) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    // Mock saving the check-in data
    console.log('Check-in data:', { sessionId, name, email, phone, location });

    // In production, save the data to a database or another backend service
    res.status(200).json({ message: 'Check-in successful.' });
  } catch (error) {
    console.error('Error saving check-in:', error);
    res.status(500).json({ message: 'Failed to save check-in.' });
  }
}