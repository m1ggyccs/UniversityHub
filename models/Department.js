const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    logo: {
        type: String,
        required: false
    }
});

module.exports = mongoose.model('Department', departmentSchema); 