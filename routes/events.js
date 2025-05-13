const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Event = require('../models/Event');
const { auth, checkRole } = require('../middleware/auth');
const QRCode = require('qrcode');
const Category = require('../models/Category');
const Department = require('../models/Department');
const Organization = require('../models/Organization');
const mongoose = require('mongoose');

// Get all events (with filtering)
router.get('/', async (req, res) => {
    try {
        const filter = {};
        if (req.query.category) filter.category = req.query.category;
        if (req.query.date) filter.date = req.query.date;
        const events = await Event.find(filter)
            .populate('organizer', 'username fullName')
            .populate('department', 'name logo')
            .populate('organization', 'name logo')
            .sort({ date: 1 });
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get event by ID
router.get('/:id', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id)
            .populate('organizer', 'username fullName email')
            .populate('department', 'name')
            .populate('participants', 'username fullName');
        
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        
        res.json(event);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Create new event
router.post('/', [
    auth,
    checkRole(['teacher', 'admin']),
    body('title').trim().notEmpty(),
    body('description').trim().notEmpty(),
    body('date').isISO8601(),
    body('time').trim().notEmpty(),
    body('location').trim().notEmpty(),
    body('category').isIn(['school', 'department', 'organization']),
    body('maxParticipants').isInt({ min: 1 }),
    body('customRegistrationLink').optional().isURL().withMessage('Custom registration link must be a valid URL'),
    body('pubmat').optional().isString()
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const event = new Event({
            ...req.body,
            organizer: req.user._id
        });

        await event.save();
        res.status(201).json(event);
    } catch (err) {
        console.error('Event creation error:', err);
        next(err); // Pass error to the global error handler
    }
});

// Update event
router.put('/:id', [
    auth,
    checkRole(['teacher', 'admin']),
    body('title').optional().trim().notEmpty(),
    body('description').optional().trim().notEmpty(),
    body('date').optional().isISO8601(),
    body('time').optional().trim().notEmpty(),
    body('location').optional().trim().notEmpty(),
    body('category').optional().isIn(['school', 'department', 'organization']),
    body('maxParticipants').optional().isInt({ min: 1 }),
    body('status').optional().isIn(['upcoming', 'ongoing', 'completed', 'cancelled']),
    body('customRegistrationLink').optional().isURL().withMessage('Custom registration link must be a valid URL'),
    body('pubmat').optional().isString()
], async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid event ID' });
        }
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        // Check if user is the organizer or admin
        if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to update this event' });
        }
        Object.assign(event, req.body);
        await event.save();
        res.json(event);
    } catch (error) {
        console.error('Update event error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete event
router.delete('/:id', [auth, checkRole(['teacher', 'admin'])], async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid event ID' });
        }
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        // Check if user is the organizer or admin
        if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to delete this event' });
        }
        await Event.findByIdAndDelete(event._id);
        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Delete event error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get all participants for an event (with user info and attendanceStatus)
router.get('/:id/participants', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id).populate('participants.user', 'username fullName email');
        if (!event) return res.status(404).json({ message: 'Event not found' });
        res.json(event.participants);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Update a participant's attendance status
router.post('/:id/participants/:userId/attendance', auth, async (req, res) => {
    try {
        const { status } = req.body; // 'confirmed', 'not_sure', 'not_attending'
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });
        const participant = event.participants.find(p => p.user.toString() === req.params.userId);
        if (!participant) return res.status(404).json({ message: 'Participant not found' });
        participant.attendanceStatus = status;
        await event.save();
        res.json({ message: 'Attendance status updated', participant });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Update event registration to use new participants structure
router.post('/:id/register', auth, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        // Check if event is full
        if (event.currentParticipants >= event.maxParticipants) {
            return res.status(400).json({ message: 'Event is full' });
        }
        // Check if user is already registered
        if (event.participants.some(p => p.user.toString() === req.user._id.toString())) {
            return res.status(400).json({ message: 'Already registered for this event' });
        }
        event.participants.push({ user: req.user._id, attendanceStatus: 'not_sure' });
        event.currentParticipants += 1;
        await event.save();
        res.json({ message: 'Successfully registered for event' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Unregister from event
router.post('/:id/unregister', auth, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Check if user is registered
        if (!event.participants.includes(req.user._id)) {
            return res.status(400).json({ message: 'Not registered for this event' });
        }

        event.participants = event.participants.filter(
            participant => participant.toString() !== req.user._id.toString()
        );
        event.currentParticipants -= 1;
        await event.save();

        res.json({ message: 'Successfully unregistered from event' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Generate QR code for event
router.get('/:id/qr', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        // The QR code can encode a URL or event registration info
        const qrData = `${req.protocol}://${req.get('host')}/api/events/${event._id}`;
        QRCode.toDataURL(qrData, (err, url) => {
            if (err) return res.status(500).json({ message: 'QR code generation failed' });
            res.json({ qr: url });
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get event location details
router.get('/:id/location', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        res.json({
            location: event.location,
            building: event.building,
            room: event.room,
            coordinates: event.coordinates
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Validate QR code for event check-in
router.post('/scan-qr', async (req, res) => {
    try {
        const { eventId } = req.body;
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        // You can add more logic here, e.g., mark attendance, register user, etc.
        res.json({ message: 'QR code is valid', event });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all departments
router.get('/departments/all', async (req, res) => {
    try {
        const departments = await Department.find().sort({ name: 1 });
        res.json(departments);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all organizations
router.get('/organizations/all', async (req, res) => {
    try {
        const organizations = await Organization.find().sort({ name: 1 });
        res.json(organizations);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router; 