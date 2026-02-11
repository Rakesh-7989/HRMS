const service = require("./designation.service");

exports.createDesignation = async (req, res, next) => {
  try {
    const result = await service.createDesignation(
      req.db,
      req.user.tenantId,
      req.body,
      req.user
    );

    res.status(201).json({ status: "success", result });
  } catch (err) {
    next(err);
  }
};

exports.getDesignations = async (req, res, next) => {
  try {
    const { limit, offset, search } = req.query;

    const list = await service.getDesignations(req.db, req.user.tenantId, {
      limit: parseInt(limit || "50"),
      offset: parseInt(offset || "0"),
      search
    });

    res.json({ status: "success", list });
  } catch (err) {
    next(err);
  }
};

exports.getDesignationById = async (req, res, next) => {
  try {
    const designation = await service.getDesignationById(
      req.db,
      req.params.id,
      req.user.tenantId
    );

    if (!designation) {
      return res.status(404).json({ status: "error", message: "Designation not found" });
    }

    res.json({ status: "success", designation });
  } catch (err) {
    next(err);
  }
};

exports.updateDesignation = async (req, res, next) => {
  try {
    const updated = await service.updateDesignation(
      req.db,
      req.params.id,
      req.user.tenantId,
      req.body,
      req.user
    );

    res.json({ status: "success", updated });
  } catch (err) {
    next(err);
  }
};

exports.deleteDesignation = async (req, res, next) => {
  try {
    await service.deleteDesignation(
      req.db,
      req.params.id,
      req.user.tenantId
    );

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
