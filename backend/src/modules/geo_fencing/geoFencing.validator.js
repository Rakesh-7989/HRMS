const { z } = require("zod");

exports.updateSettingsSchema = z.object({
    body: z.object({
        is_enabled: z.boolean().optional(),
        allow_clock_without_location: z.boolean().optional(),
        location_timeout_seconds: z.number().int().min(5).max(120).optional(),
        require_high_accuracy: z.boolean().optional()
    })
});

exports.createLocationSchema = z.object({
    body: z.object({
        name: z.string().max(255),
        description: z.string().max(500).nullish(),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        radius_meters: z.number().int().min(10).max(10000).default(100),
        is_active: z.boolean().default(true)
    })
});

exports.updateLocationSchema = z.object({
    params: z.object({
        id: z.string().uuid()
    }),
    body: z.object({
        name: z.string().max(255).optional(),
        description: z.string().max(500).nullish(),
        latitude: z.number().min(-90).max(90).optional(),
        longitude: z.number().min(-180).max(180).optional(),
        radius_meters: z.number().int().min(10).max(10000).optional(),
        is_active: z.boolean().optional()
    })
});

exports.validateLocationSchema = z.object({
    body: z.object({
        latitude: z.number().min(-90).max(90).nullish(),
        longitude: z.number().min(-180).max(180).nullish()
    })
});
