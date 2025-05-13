const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Organization = require('../models/Organization');
const { auth, checkRole } = require('../middleware/auth');

// Get all organizations
router.get('/', async (req, res) => {
    try {
        const organizations = await Organization.find().sort({ name: 1 });
        res.json(organizations);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Add organization
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
        const organization = new Organization(req.body);
        await organization.save();
        res.status(201).json(organization);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Update organization
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
        const organization = await Organization.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!organization) return res.status(404).json({ message: 'Organization not found' });
        res.json(organization);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete organization
router.delete('/:id', [auth, checkRole(['admin', 'teacher'])], async (req, res) => {
    try {
        const organization = await Organization.findByIdAndDelete(req.params.id);
        if (!organization) return res.status(404).json({ message: 'Organization not found' });
        res.json({ message: 'Organization deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router; 