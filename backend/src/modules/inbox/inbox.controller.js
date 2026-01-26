const inboxService = require("./inbox.service");

exports.getTasks = async (req, res) => {
    try {
        const tasks = await inboxService.getTasks(req.db, req.query, req.user);
        res.json({ status: "success", tasks });
    } catch (err) {
        res.status(400).json({ status: "error", message: err.message });
    }
};

exports.createTask = async (req, res) => {
    try {
        const task = await inboxService.createTask(req.db, req.body, req.user);
        res.status(201).json({ status: "success", task });
    } catch (err) {
        res.status(400).json({ status: "error", message: err.message });
    }
};

exports.updateTaskStatus = async (req, res) => {
    try {
        const task = await inboxService.updateTaskStatus(req.db, req.params.id, req.body.status, req.user);
        res.json({ status: "success", task });
    } catch (err) {
        res.status(400).json({ status: "error", message: err.message });
    }
};

exports.getActivities = async (req, res) => {
    try {
        const activities = await inboxService.getActivities(req.db, req.params.id, req.user.tenantId);
        res.json({ status: "success", activities });
    } catch (err) {
        res.status(400).json({ status: "error", message: err.message });
    }
};

exports.addActivity = async (req, res) => {
    try {
        const activity = await inboxService.addActivity(req.db, req.params.id, req.body.message, req.user);
        res.status(201).json({ status: "success", activity });
    } catch (err) {
        res.status(400).json({ status: "error", message: err.message });
    }
};

/* -------------------------- NOTIFICATIONS -------------------------- */

exports.getNotifications = async (req, res) => {
    try {
        const result = await inboxService.getNotifications(req.db, req.query, req.user);
        res.json(result);
    } catch (err) {
        res.status(400).json({ status: "error", message: err.message });
    }
};

exports.getUnreadCount = async (req, res) => {
    try {
        const count = await inboxService.getUnreadCount(req.db, req.user);
        res.json({ count });
    } catch (err) {
        res.status(400).json({ status: "error", message: err.message });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        await inboxService.markAsRead(req.db, req.params.id, req.user);
        res.json({ status: "success" });
    } catch (err) {
        res.status(400).json({ status: "error", message: err.message });
    }
};

exports.markAllAsRead = async (req, res) => {
    try {
        await inboxService.markAllAsRead(req.db, req.user);
        res.json({ status: "success" });
    } catch (err) {
        res.status(400).json({ status: "error", message: err.message });
    }
};

exports.deleteNotification = async (req, res) => {
    try {
        await inboxService.deleteNotification(req.db, req.params.id, req.user);
        res.json({ status: "success" });
    } catch (err) {
        res.status(400).json({ status: "error", message: err.message });
    }
};
