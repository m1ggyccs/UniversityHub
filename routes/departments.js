const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Department = require('../models/Department');
const { auth, checkRole } = require('../middleware/auth');

// Get all departments
router.get('/', async (req, res) => {
    try {
        const departments = await Department.find().sort({ name: 1 });
        res.json(departments);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Add department
router.post('/', [
    auth,
    checkRole(['admin', 'teacher']),
    body('name').trim().notEmpty(),
    body('description').optional().trim(),
    body('logo').optional().isString()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const department = new Department(req.body);
        await department.save();
        res.status(201).json(department);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Update department
router.put('/:id', [
    auth,
    checkRole(['admin', 'teacher']),
    body('name').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('logo').optional().isString()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const department = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!department) return res.status(404).json({ message: 'Department not found' });
        res.json(department);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete department
router.delete('/:id', [auth, checkRole(['admin', 'teacher'])], async (req, res) => {
    try {
        const department = await Department.findByIdAndDelete(req.params.id);
        if (!department) return res.status(404).json({ message: 'Department not found' });
        res.json({ message: 'Department deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router; 