import express from 'express';
import dotenv from 'dotenv';
import QRCode from 'qrcode';
import jwt from 'jsonwebtoken';
import cron from 'node-cron';

dotenv.config();
const app = express();
app.use(express.json());

const devices = new Map();
const customers = new Map();

// Add cron job here - runs every 5 minutes
cron.schedule('*/5 * * * *', () => {
  console.log('Server is alive and running at', new Date().toISOString());
  // Add any periodic task here if you want
});

app.post('/api/devices/generate-qr', async (req, res) => {
  try {
    const { deviceId } = req.body;
    if (!deviceId) {
      return res.status(400).json({ error: 'Please provide a device ID' });
    }
    if (devices.has(deviceId)) {
      return res.status(400).json({ error: 'Device already registered' });
    }
    const token = jwt.sign({ deviceId }, process.env.JWT_SECRET, { expiresIn: '30d' });
    const qrData = JSON.stringify({ deviceId, token });
    const qrCodeUrl = await QRCode.toDataURL(qrData);
    devices.set(deviceId, { deviceId, token, status: 'pending', customerId: null });
    res.json({ qrCodeUrl, deviceId });
  } catch (err) {
    console.error('Error generating QR code:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

app.post('/api/devices/enroll', async (req, res) => {
  try {
    const { deviceId, token } = req.body;
    if (!deviceId || !token) {
      return res.status(400).json({ error: 'Device ID and token are required' });
    }
    const device = devices.get(deviceId);
    if (!device || device.token !== token) {
      return res.status(400).json({ error: 'Invalid device or token' });
    }
    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Token is invalid or expired' });
    }
    device.status = 'active';
    devices.set(deviceId, device);
    res.json({ message: 'Device enrolled successfully' });
  } catch (err) {
    console.error('Error enrolling device:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

app.get('/api/devices/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const device = devices.get(deviceId);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    res.json({ status: device.status });
  } catch (err) {
    console.error('Error fetching device status:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

app.post('/api/devices/lock', async (req, res) => {
  try {
    const { deviceId } = req.body;
    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID is required' });
    }
    const device = devices.get(deviceId);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    device.status = 'locked';
    devices.set(deviceId, device);
    res.json({ message: 'Device locked successfully' });
  } catch (err) {
    console.error('Error locking device:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

app.post('/api/devices/unlock', async (req, res) => {
  try {
    const { deviceId } = req.body;
    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID is required' });
    }
    const device = devices.get(deviceId);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    device.status = 'active';
    devices.set(deviceId, device);
    res.json({ message: 'Device unlocked successfully' });
  } catch (err) {
    console.error('Error unlocking device:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

app.post('/api/customers/add', async (req, res) => {
  try {
    const { name, email, emiPerMonth, downpayment, deviceId } = req.body;
    if (!name || !email || !emiPerMonth || !downpayment || !deviceId) {
      return res.status(400).json({ error: 'All customer details are required' });
    }
    const device = devices.get(deviceId);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }
    const customerId = `customer-${Math.random().toString(36).substring(2, 15)}`;
    customers.set(customerId, { name, email, emiPerMonth: Number(emiPerMonth), downpayment: Number(downpayment), deviceId });
    device.customerId = customerId;
    devices.set(deviceId, device);
    res.json({ message: 'Customer added successfully', customer: customers.get(customerId) });
  } catch (err) {
    console.error('Error adding customer:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));