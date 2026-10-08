import ContactMessage from '../models/ContactMessage.js';

export async function createContact(req, res) {
  const { name, email, message, phone } = req.body;
  if (!name || !email || !message) return res.status(400).json({ success: false, message: 'Name, email and message are required.' });
  await ContactMessage.create({ name, email, phone, message });
  res.status(201).json({ success: true, message: 'Thank you. Your message has been received.' });
}
