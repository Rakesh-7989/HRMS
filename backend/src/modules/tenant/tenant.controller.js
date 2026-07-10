const tenantService = require("./tenant.service");

exports.checkAvailability = async (req, res) => {
  try {
    const { subdomain, email } = req.query;
    console.log(`[AVAILABILITY_CHECK_REQUEST] Subdomain: ${subdomain}, Email: ${email}`);
    
    if (subdomain) {
      const result = await tenantService.checkDomainAvailability(subdomain);
      return res.json(result);
    }
    
    if (email) {
      const result = await tenantService.checkEmailAvailability(email);
      return res.json(result);
    }

    res.status(400).json({ status: "error", message: "Missing check parameters" });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

exports.registerTenant = async (req, res) => {
  try {
    const isVerified = await tenantService.checkEmailVerified(req.body.email);
    if (!isVerified) {
      return res.status(400).json({ status: "error", message: "Email not verified. Please verify OTP first." });
    }
    
    console.log(`[DEBUG_REG] Payload Received for ${req.body.email}:`, req.body);

    const result = await tenantService.registerTenant(req.body, req);

    res.status(201).json({
      status: "success",
      message: result.paymentRequired ? "Registration successful! Redirecting to payment..." : "Tenant registered. Temporary password sent to admin email.",
      data: {
        tenantId: result.tenant.id,
        adminUserId: result.adminUser.id,
        adminEmail: result.adminUser.email,
        paymentRequired: result.paymentRequired,
        paymentData: result.paymentData
      }
    });
  } catch (err) {
    res.status(400).json({
      status: "error",
      message: err.message || "Failed to register tenant"
    });
  }
};

exports.sendOtp = async (req, res) => {
  try {
    const { email, domain, phone } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const result = await tenantService.sendVerificationOtp(email, domain, phone);
    res.json({ status: "success", message: result.message });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, code } = req.body;
    const result = await tenantService.verifyOtp(email, code);

    if (!result.verified) {
      return res.status(400).json({
        status: "error",
        message: "Invalid or expired OTP code"
      });
    }

    res.json({
      status: "success",
      verified: true
    });
  } catch (err) {
    res.status(400).json({ status: "error", message: err.message });
  }
};

exports.getEmployeeIdSettings = async (req, res) => {
  try {
    const settings = await tenantService.getEmployeeIdSettings(req.user.tenantId);
    res.json({ status: "success", data: settings });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.setEmployeeIdPrefix = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ message: "Unauthorized" });
    }
    const result = await tenantService.setEmployeeIdPrefix(req.user.tenantId, req.body.prefix);
    res.json({ status: "success", data: result });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.toggleEmployeeIdMode = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ message: "Unauthorized" });
    }
    const result = await tenantService.toggleEmployeeIdMode(req.user.tenantId, req.body.usePrefix);
    res.json({ status: "success", data: result });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
