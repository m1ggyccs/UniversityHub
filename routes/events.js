const express = require('express');
const router = express.Router();
const { body, validationResult, param } = require('express-validator');
const Event = require('../models/Event');
const { auth, checkRole } = require('../middleware/auth');
const QRCode = require('qrcode');
const Category = require('../models/Category');
const Department = require('../models/Department');
const Organization = require('../models/Organization');
const mongoose = require('mongoose');
const Notification = require('../models/Notification');

// Helper function to create notifications
async function createNotification({ title, message, type, department, organization, recipients }) {
    try {
        const notification = new Notification({
            title,
            message,
            type,
            department: department || null,
            organization: organization || null
        });
        await notification.save();
        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
        // Don't throw error to prevent breaking event creation
        return null;
    }
}

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
    body('title').trim().notEmpty(),
    body('description').trim().notEmpty(),
    body('date').isISO8601(),
    body('time').trim().notEmpty(),
    body('location').trim().notEmpty(),
    body('category').isIn(['school', 'department', 'organization']),
    body('maxParticipants').isInt({ min: 1 }),
    body('customRegistrationLink').optional().isURL().withMessage('Custom registration link must be a valid URL'),
    body('pubmat').optional().isString(),
    body('department').optional().isMongoId(),
    body('organization').optional().isMongoId()
], async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Determine if the event needs approval based on role and category
        let needsApproval = true;
        
        if (req.user.role === 'admin') {
            needsApproval = false; // Admin events never need approval
        } 
        else if (req.user.role === 'faculty') {
            // Faculty department events don't need approval for their own department
            if (req.body.category === 'department' && 
                req.body.department && 
                req.body.department.toString() === req.user.department.toString()) {
                needsApproval = false;
            }
            // Faculty can create school and organization events (with admin approval)
            else if (req.body.category === 'school' || req.body.category === 'organization') {
                needsApproval = true;
            }
            else {
                return res.status(403).json({ message: 'Faculty can only create events for their department, school, or organizations' });
            }
        }
        else if (req.user.role === 'student_leader') {
            // Student leaders always need approval for events
            needsApproval = true;
            
            // Verify permissions for department events
            if (req.body.category === 'department') {
                if (!req.user.isDepartmentLeader) {
                    return res.status(403).json({ message: 'You must be a department leader to create department events' });
                }
                if (!req.body.department || req.body.department.toString() !== req.user.department.toString()) {
                    return res.status(403).json({ message: 'You can only create events for your own department' });
                }
            }
            // Verify permissions for organization events
            else if (req.body.category === 'organization') {
                if (!req.user.isOrganizationLeader && !req.user.organization) {
                    return res.status(403).json({ message: 'You must be an organization leader or member to create organization events' });
                }
                if (!req.body.organization || req.body.organization.toString() !== req.user.organization.toString()) {
                    return res.status(403).json({ message: 'You can only create events for your own organization' });
                }
            }
            else {
                return res.status(403).json({ message: 'Student leaders can only create events for their department or organization' });
            }
        }
        else {
            return res.status(403).json({ message: 'You do not have permission to create events' });
        }

        const event = new Event({
            ...req.body,
            organizer: req.user._id,
            status: needsApproval ? 'pending' : 'approved'
        });

        await event.save();

        // Create notifications based on event type and status
        let notificationType = req.body.category;
        let notificationData = { 
            title: event.title, 
            message: event.description, 
            type: notificationType,
            status: event.status
        };

        if (event.status === 'pending') {
            // For department events, notify department faculty
            if (event.category === 'department') {
                await createNotification({
                    ...notificationData,
                    message: `New department event "${event.title}" requires approval`,
                    department: event.department,
                    recipients: ['faculty']
                });
            }
            // For organization events, notify faculty and admins
            else if (event.category === 'organization') {
                await createNotification({
                    ...notificationData,
                    message: `New organization event "${event.title}" requires approval`,
                    organization: event.organization,
                    recipients: ['faculty', 'admin']
                });
            }
            // For school events, notify admins
            else {
                await createNotification({
                    ...notificationData,
                    message: `New school event "${event.title}" requires approval`,
                    recipients: ['admin']
                });
            }
        } else {
            // Notify all users about approved events
            await createNotification(notificationData);
        }

        res.status(201).json(event);
    } catch (error) {
        console.error('Create event error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
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
        const allowedStatuses = ['confirmed', 'not_sure', 'not_attending'];
        if (!allowedStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        // Find the correct participant by userId
        const participant = event.participants.find(p => String(p.user) === String(req.params.userId));
        if (!participant) return res.status(404).json({ message: 'Participant not found' });

        // Only allow students/student_leaders to set their own status, and only if not already set
        if (["student", "student_leader"].includes(req.user.role)) {
            if (String(req.user._id) !== String(req.params.userId)) {
                return res.status(403).json({ error: 'Forbidden: You can only update your own attendance.' });
            }
            if (participant.attendanceStatus) {
                return res.status(400).json({ error: 'Attendance already set' });
            }
        }

        // Faculty/admin/staff can always update
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

// Approve event (admin/faculty only)
router.post('/:id/approve', [
    auth,
    checkRole(['admin', 'faculty']),
    body('rejectionReason').optional().trim()
], async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        if (event.status !== 'pending') {
            return res.status(400).json({ message: 'Event is not pending approval' });
        }

        // Faculty can only approve events from their own department
        if (req.user.role === 'faculty' && event.department && event.department.toString() !== req.user.department.toString()) {
            return res.status(403).json({ message: 'You can only approve events from your own department' });
        }

        event.status = 'approved';
        event.approvalStatus = {
            approvedBy: req.user._id,
            approvedAt: new Date()
        };

        await event.save();
        res.json(event);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Reject event (admin/faculty only)
router.post('/:id/reject', [
    auth,
    checkRole(['admin', 'faculty']),
    body('rejectionReason').trim().notEmpty()
], async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        if (event.status !== 'pending') {
            return res.status(400).json({ message: 'Event is not pending approval' });
        }

        // Faculty can only reject events from their own department
        if (req.user.role === 'faculty' && event.department && event.department.toString() !== req.user.department.toString()) {
            return res.status(403).json({ message: 'You can only reject events from your own department' });
        }

        event.status = 'rejected';
        event.approvalStatus = {
            approvedBy: req.user._id,
            approvedAt: new Date(),
            rejectionReason: req.body.rejectionReason
        };

        await event.save();
        res.json(event);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get events (with role-based filtering)
router.get('/', async (req, res) => {
    try {
        let query = {};
        let user = null;
        // Try to get user from token if present
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            const token = req.headers.authorization.split(' ')[1];
            try {
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
                user = decoded;
            } catch (e) { /* ignore invalid token */ }
        }

        // Filter based on user role or public
        if (!user || user.role === 'student') {
            // Students and public users only see approved events
            query.status = 'approved';
        } else if (user.role === 'student_leader') {
            // Student leaders see:
            // 1. All approved events
            // 2. Their own pending events
            query.$or = [
                { status: 'approved' },
                { 
                    organizer: user._id,
                    status: 'pending'
                }
            ];
        } else if (user.role === 'faculty') {
            // Faculty see:
            // 1. All approved events
            // 2. Pending events from their department (including student leader events)
            // 3. Pending organization events
            query.$or = [
                { status: 'approved' },
                { 
                    status: 'pending',
                    department: user.department
                },
                {
                    status: 'pending',
                    category: 'organization'
                }
            ];
        } else if (user.role === 'admin') {
            // Admins see all events
            // No additional filters needed
        }

        const events = await Event.find(query)
            .populate('organizer', 'username email fullName role department organization')
            .populate('department', 'name logo')
            .populate('organization', 'name logo')
            .sort({ date: 1 });

        res.json(events);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Approve or reject an event
router.put('/:id/status', [
    auth,
    param('id').isMongoId(),
    body('status').isIn(['approved', 'rejected']),
    body('rejectionReason').optional().trim().notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const event = await Event.findById(req.params.id)
            .populate('organizer', 'role department organization')
            .populate('department')
            .populate('organization');

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Check if user has permission to approve/reject this event
        const canApprove = await checkApprovalPermission(req.user, event);
        if (!canApprove) {
            return res.status(403).json({ message: 'You do not have permission to approve/reject this event' });
        }

        event.status = req.body.status;
        if (req.body.status === 'rejected' && req.body.rejectionReason) {
            event.rejectionReason = req.body.rejectionReason;
        }

        await event.save();

        // Create notification for event organizer
        const notificationData = {
            title: `Event ${req.body.status}`,
            message: req.body.status === 'approved' 
                ? `Your event "${event.title}" has been approved`
                : `Your event "${event.title}" has been rejected${req.body.rejectionReason ? ': ' + req.body.rejectionReason : ''}`,
            type: 'event_status',
            recipients: [event.organizer._id]
        };

        await createNotification(notificationData);

        res.json(event);
    } catch (error) {
        console.error('Event status update error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Helper function to check if user can approve/reject an event
async function checkApprovalPermission(user, event) {
    // Admins can approve all events
    if (user.role === 'admin') {
        return true;
    }

    // Faculty can approve:
    // 1. Department events from their own department
    // 2. School events (requires admin approval)
    // 3. Organization events from student leaders
    if (user.role === 'faculty') {
        const isStudentLeaderEvent = event.organizer.role === 'student_leader';
        
        // Can approve department events from their department
        if (event.category === 'department' && 
            event.department && 
            event.department._id.toString() === user.department.toString()) {
            return true;
        }

        // Can approve organization events from student leaders
        if (event.category === 'organization' && isStudentLeaderEvent) {
            return true;
        }

        // Faculty can create school and organization events (with admin approval)
        if (event.category === 'school' || event.category === 'organization') {
            return user.role === 'admin';
        }
    }

    return false;
}

module.exports = router; 