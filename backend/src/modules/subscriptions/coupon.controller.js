const couponService = require('./coupon.service');

class CouponController {

    // Admin only
    async createCoupon(req, res) {
        try {
            const coupon = await couponService.createCoupon(req.body);
            const shareLink = couponService.generateShareLink(coupon.code);
            res.status(201).json({ success: true, data: { ...coupon, shareLink } });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    // Admin only
    async getCoupons(req, res) {
        try {
            const coupons = await couponService.getCoupons();
            res.status(200).json({ success: true, data: coupons });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Public or Protected (anyone can check if a code is valid)
    async validateCoupon(req, res) {
        try {
            const { code } = req.body;
            if (!code) return res.status(400).json({ success: false, message: 'Code is required' });

            const coupon = await couponService.validateCoupon(code);
            res.status(200).json({ success: true, data: coupon });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}

module.exports = new CouponController();
