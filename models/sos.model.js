const mongoose = require('mongoose');

const SosSchema = new mongoose.Schema({
    broadcaster: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    crisisType: {
        type: String,
        enum: ['medical', 'fire', 'security', 'other'],
        required: true
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            required: true // [longitude, latitude]
        }
    },
    isAnonymous: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['active', 'resolved', 'flagged'],
        default: 'active'
    },
    responders: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        status: {
            type: String,
            enum: ['pending', 'en_route', 'arrived'],
            default: 'en_route'
        },
        eta: String // e.g., '3 min'
    }],
    notifiedCount: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Required for fast geospatial radius queries
SosSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('SOS', SosSchema);
