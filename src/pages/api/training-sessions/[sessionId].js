export default async function handler(req, res) {
  const { sessionId } = req.query;

  // Mock data for development
  const mockTrainingSessions = [
    {
      id: "123",
      name: "React Basics",
      date: "2025-05-08",
      trainer: "John Doe",
      trainees: [1, 2],
    },
  ];

  const session = mockTrainingSessions.find((s) => s.id === sessionId);

  if (!session) {
    return res.status(404).json({ message: "Training session not found." });
  }

  res.status(200).json(session);
}