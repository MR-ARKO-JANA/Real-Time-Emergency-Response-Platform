const Joi = require('joi');

// Validation schemas
const schemas = {
    syncUser: Joi.object({
        firebaseUid: Joi.string().required(),
        name: Joi.string().min(2).max(100).required(),
        email: Joi.string().email().required(),
        phone: Joi.string().pattern(/^\d{10,15}$/).required(),
        role: Joi.string().valid(
            'citizen', 'responder', 'admin',
            'medical', 'police', 'fire', 'mechanic', 'volunteer', 'other'
        ).default('citizen'),
        location: Joi.string().optional().allow('', null)
    }),

    updateProfile: Joi.object({
        name: Joi.string().min(2).max(100).optional(),
        phone: Joi.string().pattern(/^\d{10,15}$/).optional(),
        role: Joi.string().valid(
            'citizen', 'responder', 'admin',
            'medical', 'police', 'fire', 'mechanic', 'volunteer', 'other'
        ).optional()
    }),

    triggerSOS: Joi.object({
        crisisTypes: Joi.array().items(
            Joi.string().valid('medical', 'fire', 'security', 'health', 'mechanic', 'other')
        ).min(1).required(),
        location: Joi.object({
            type: Joi.string().valid('Point').default('Point'),
            coordinates: Joi.array().items(Joi.number()).length(2).required()
        }).required(),
        isAnonymous: Joi.boolean().default(false)
    }),

    aiGuidance: Joi.object({
        crisisType: Joi.string().required(),
        description: Joi.string().max(500).optional().allow('')
    }),

    sosId: Joi.object({
        sosId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
    })
};

// Validation middleware factory
const validate = (schemaName) => {
    return (req, res, next) => {
        const schema = schemas[schemaName];
        if (!schema) {
            return res.status(500).json({ error: 'Validation schema not found' });
        }

        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            // Backward compatibility for 'data.msg' on frontend
            const topErrorMessage = error.details[0].message;

            return res.status(400).json({
                error: 'Validation failed',
                msg: topErrorMessage,
                details: errors
            });
        }

        req.body = value;
        next();
    };
};

// Export named validators for convenience
const validateRegister = validate('syncUser');
const validateUpdateProfile = validate('updateProfile');
const validateSOSGuidance = validate('aiGuidance');
const validateTriggerSOS = validate('triggerSOS');
const validateSosId = validate('sosId');

module.exports = {
    validate,
    schemas,
    validateRegister,
    validateUpdateProfile,
    validateSOSGuidance,
    validateTriggerSOS,
    validateSosId
};
