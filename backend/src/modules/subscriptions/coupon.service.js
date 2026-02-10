const db = require('../../middleware/db');
const crypto = require('crypto');

class CouponService {

    /**
     * Create a new coupon
     * Default max_redemptions = 1 (Single Use)
     */
    async createCoupon(data) {
        const {
            code,
            discount_type, // 'PERCENT' or 'FIXED'
            discount_value,
            max_redemptions = 1, // Default to single use
            expires_at,
            is_active = true
        } = data;

        // Check if code exists
        const existing = await db.query('SELECT id FROM coupons WHERE code = $1', [code]);
        if (existing.rowCount > 0) throw new Error('Coupon code already exists');

        const result = await db.query(`
            INSERT INTO coupons 
            (code, discount_type, discount_value, max_redemptions, expires_at, is_active, times_redeemed)
            VALUES ($1, $2, $3, $4, $5, $6, 0)
            RETURNING *
        `, [code.toUpperCase(), discount_type, discount_value, max_redemptions, expires_at, is_active]);

        return result.rows[0];
    }

    /**
     * Get all coupons (for Admin)
     */
    async getCoupons() {
        const result = await db.query('SELECT * FROM coupons ORDER BY created_at DESC');
        return result.rows;
    }

    /**
     * Get coupon by code (Internal)
     */
    async getCouponByCode(code) {
        const result = await db.query('SELECT * FROM coupons WHERE code = $1', [code.toUpperCase()]);
        return result.rows[0];
    }

    /**
     * Validate Coupon
     * Returns coupon object if valid, throws error if invalid
     */
    async validateCoupon(code) {
        const coupon = await this.getCouponByCode(code);

        if (!coupon) throw new Error('Invalid coupon code');
        if (!coupon.is_active) throw new Error('Coupon is inactive');

        if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
            throw new Error('Coupon has expired');
        }

        if (coupon.max_redemptions !== null && coupon.times_redeemed >= coupon.max_redemptions) {
            throw new Error('Coupon usage limit exceeded');
        }

        return coupon;
    }

    /**
     * Calculate discount amount
     */
    calculateDiscount(coupon, amount) {
        if (coupon.discount_type === 'PERCENT') {
            return (amount * coupon.discount_value) / 100;
        } else if (coupon.discount_type === 'FIXED') {
            return Math.min(amount, coupon.discount_value);
        }
        return 0;
    }

    /**
     * Increment usage count
     */
    async incrementUsage(couponId) {
        await db.query(`
            UPDATE coupons 
            SET times_redeemed = times_redeemed + 1,
                updated_at = NOW()
            WHERE id = $1
        `, [couponId]);
    }

    /**
     * Generate Shareable Link
     */
    generateShareLink(code) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return `${frontendUrl}/pricing?coupon=${code}`;
    }

    async deleteCoupon(id) {
        await db.query('DELETE FROM coupons WHERE id = $1', [id]);
    }

    async updateCoupon(id, data) {
        const { is_active } = data;
        const result = await db.query(`
            UPDATE coupons SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *
         `, [is_active, id]);
        return result.rows[0];
    }
}

module.exports = new CouponService();
