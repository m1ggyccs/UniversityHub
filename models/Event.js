const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    time: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    building: {
        type: String,
        trim: true
    },
    room: {
        type: String,
        trim: true
    },
    coordinates: {
        lat: { type: Number },
        lng: { type: Number }
    },
    organizer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: ['school', 'department', 'organization']
    },
    maxParticipants: {
        type: Number,
        required: true
    },
    currentParticipants: {
        type: Number,
        default: 0
    },
    participants: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        attendanceStatus: {
            type: String,
            enum: ['confirmed', 'not_sure', 'not_attending'],
            default: 'not_sure'
        }
    }],
    status: {
        type: String,
        enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
        default: 'upcoming'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    customRegistrationLink: {
        type: String,
        trim: true
    },
    department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: false
    },
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: false
    },
    pubmat: {
        type: String,
        required: false
    }
});

// Add index for better query performance
eventSchema.index({ date: 1, status: 1 });

module.exports = mongoose.model('Event', eventSchema); 