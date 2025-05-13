const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');

// GET /api/notifications - get relevant notifications for the logged-in user
router.get('/', auth, async (req, res) => {
  try {
    const user = req.user;
    const query = [ { type: 'school' } ];
    if (user.department) query.push({ type: 'department', department: user.department });
    if (user.organization) query.push({ type: 'organization', organization: user.organization });
    const notifications = await Notification.find({ $or: query }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 