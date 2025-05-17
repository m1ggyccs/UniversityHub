require('dotenv').config();

module.exports = {
    // Server Configuration
    port: process.env.PORT || 3000,
    
    // MongoDB Configuration
    mongoUri: process.env.API_KEY,
    
    // JWT Configuration
    jwtSecret: process.env.JWT_SECRET,
    
    // Security Settings
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10,
    
    // File Upload Settings
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880, // 5MB default
    allowedFileTypes: (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif').split(','),
    
    // Rate Limiting
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes default
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    
    // Environment
    isProduction: process.env.NODE_ENV === 'production'
}; 