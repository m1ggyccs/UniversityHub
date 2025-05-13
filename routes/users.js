const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth, checkRole } = require('../middleware/auth');

// Get all users (admin only)
router.get('/', [auth, checkRole(['admin'])], async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user by ID
router.get('/:id', auth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Update user profile
router.put('/profile', [
    auth,
    body('fullName').optional().trim().notEmpty(),
    body('department').optional().trim().notEmpty(),
    body('email').optional().isEmail().normalizeEmail()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const updates = {};
        if (req.body.fullName) updates.fullName = req.body.fullName;
        if (req.body.department) updates.department = req.body.department;
        if (req.body.email) updates.email = req.body.email;

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updates },
            { new: true }
        ).select('-password');

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Change password
router.put('/change-password', [
    auth,
    body('currentPassword').exists(),
    body('newPassword').isLength({ min: 6 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const user = await User.findById(req.user._id);
        const isMatch = await user.comparePassword(req.body.currentPassword);
        
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        user.password = req.body.newPassword;
        await user.save();

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Update user role (admin only)
router.put('/:id/role', [
    auth,
    checkRole(['admin']),
    body('role').isIn(['student', 'teacher', 'admin'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { role: req.body.role },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete user (admin only)
router.delete('/:id', [auth, checkRole(['admin'])], async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Assign student leader (admin only)
router.post('/:id/assign-leader', [
    auth,
    checkRole(['admin']),
    body('type').isIn(['department', 'organization']).withMessage('Type must be either department or organization')
], async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role !== 'student') {
            return res.status(400).json({ message: 'Can only assign student leaders from students' });
        }

        // Update user role and leadership status
        user.role = 'student_leader';
        if (req.body.type === 'department') {
            user.isDepartmentLeader = true;
        } else {
            user.isOrganizationLeader = true;
        }

        await user.save();
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Remove student leader (admin only)
router.post('/:id/remove-leader', [
    auth,
    checkRole(['admin']),
    body('type').isIn(['department', 'organization']).withMessage('Type must be either department or organization')
], async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role !== 'student_leader') {
            return res.status(400).json({ message: 'User is not a student leader' });
        }

        // Update leadership status
        if (req.body.type === 'department') {
            user.isDepartmentLeader = false;
        } else {
            user.isOrganizationLeader = false;
        }

        // If user is no longer a leader in any capacity, revert to student role
        if (!user.isDepartmentLeader && !user.isOrganizationLeader) {
            user.role = 'student';
        }

        await user.save();
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all student leaders
router.get('/leaders', auth, async (req, res) => {
    try {
        const leaders = await User.find({
            role: 'student_leader',
            $or: [
                { isDepartmentLeader: true },
                { isOrganizationLeader: true }
            ]
        }).select('-password')
        .populate('department', 'name')
        .populate('organization', 'name');

        res.json(leaders);
    } catch (error) {
        console.error('Error in /api/users/leaders:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  res.json(user);
});

// Update profile (username, email, profilePic)
router.put('/me', auth, async (req, res) => {
  const { username, email, profilePic } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { username, email, profilePic },
    { new: true, runValidators: true }
  ).select('-password');
  res.json(user);
});

// Change password
router.put('/me/password', auth, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const match = await user.comparePassword(oldPassword);
  if (!match) return res.status(400).json({ error: 'Old password incorrect' });
  user.password = newPassword;
  await user.save();
  res.json({ message: 'Password updated' });
});

// Update user (admin only)
router.put('/:id', [
    auth,
    checkRole(['admin']),
    body('username').optional().trim().notEmpty(),
    body('fullName').optional().trim().notEmpty(),
    body('email').optional().isEmail().normalizeEmail(),
    body('role').optional().isIn(['admin', 'faculty', 'student_leader', 'student']),
    body('department').optional().isMongoId().withMessage('Invalid department ID'),
    body('organization').optional().isMongoId().withMessage('Invalid organization ID')
], async (req, res) => {
    try {
        console.log('Update user request:', {
            userId: req.params.id,
            body: req.body
        });

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('Validation errors:', errors.array());
            return res.status(400).json({ 
                message: 'Invalid input', 
                errors: errors.array() 
            });
        }

        // Check if user exists first
        const existingUser = await User.findById(req.params.id);
        if (!existingUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Build update object with only defined fields
        const updates = {};
        const allowedUpdates = ['username', 'fullName', 'email', 'role', 'department', 'organization'];
        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined && req.body[field] !== '') {
                updates[field] = req.body[field];
            }
        });

        console.log('Applying updates:', updates);

        // Handle empty strings for optional fields
        if (updates.department === '') delete updates.department;
        if (updates.organization === '') delete updates.organization;

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            { 
                new: true, 
                runValidators: true,
                context: 'query'
            }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        console.log('Updated user:', user);
        res.json(user);
    } catch (error) {
        console.error('Update user error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ 
                message: 'Username or email already exists',
                error: error.message 
            });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ 
                message: 'Validation error',
                error: error.message 
            });
        }
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message 
        });
    }
});

module.exports = router; 