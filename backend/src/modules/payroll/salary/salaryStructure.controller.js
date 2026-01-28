const salaryStructureService = require('./salaryStructure.service');

// =====================================================
// SALARY COMPONENTS
// =====================================================

exports.listComponents = async (req, res) => {
    try {
        const { component_type, is_active } = req.query;
        const filters = {};

        if (component_type) filters.component_type = component_type;
        if (is_active !== undefined) filters.is_active = is_active === 'true';

        const data = await salaryStructureService.listSalaryComponents(req.user.tenantId, filters);
        res.json({ status: 'success', data });
    } catch (err) {
        console.error('List components error:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
};

exports.createComponent = async (req, res) => {
    try {
        const data = await salaryStructureService.createSalaryComponent(req.user.tenantId, req.body);
        res.status(201).json({ status: 'success', data });
    } catch (err) {
        console.error('Create component error:', err);
        if (err.code === '23505') { // Unique constraint violation
            return res.status(400).json({ status: 'error', message: 'Component with this code already exists' });
        }
        res.status(500).json({ status: 'error', message: err.message });
    }
};

exports.updateComponent = async (req, res) => {
    try {
        const data = await salaryStructureService.updateSalaryComponent(
            req.user.tenantId,
            req.params.id,
            req.body
        );
        if (!data) {
            return res.status(404).json({ status: 'error', message: 'Component not found' });
        }
        res.json({ status: 'success', data });
    } catch (err) {
        console.error('Update component error:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
};

exports.deleteComponent = async (req, res) => {
    try {
        const deleted = await salaryStructureService.deleteSalaryComponent(req.user.tenantId, req.params.id);
        if (!deleted) {
            return res.status(404).json({ status: 'error', message: 'Component not found' });
        }
        res.json({ status: 'success', message: 'Component deactivated successfully' });
    } catch (err) {
        console.error('Delete component error:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
};

// =====================================================
// SALARY STRUCTURES
// =====================================================

exports.listStructures = async (req, res) => {
    try {
        const data = await salaryStructureService.listSalaryStructures(req.user.tenantId);
        res.json({ status: 'success', data });
    } catch (err) {
        console.error('List structures error:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
};

exports.getStructure = async (req, res) => {
    try {
        const data = await salaryStructureService.getSalaryStructure(req.user.tenantId, req.params.id);
        if (!data) {
            return res.status(404).json({ status: 'error', message: 'Structure not found' });
        }
        res.json({ status: 'success', data });
    } catch (err) {
        console.error('Get structure error:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
};

exports.createStructure = async (req, res) => {
    try {
        const data = await salaryStructureService.createSalaryStructure(
            req.user.tenantId,
            req.user.id,
            req.body
        );
        res.status(201).json({ status: 'success', data });
    } catch (err) {
        console.error('Create structure error:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
};

exports.updateStructure = async (req, res) => {
    try {
        const data = await salaryStructureService.updateSalaryStructure(
            req.user.tenantId,
            req.params.id,
            req.body
        );
        if (!data) {
            return res.status(404).json({ status: 'error', message: 'Structure not found' });
        }
        res.json({ status: 'success', data });
    } catch (err) {
        console.error('Update structure error:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
};

exports.deleteStructure = async (req, res) => {
    try {
        const deleted = await salaryStructureService.deleteSalaryStructure(req.user.tenantId, req.params.id);
        if (!deleted) {
            return res.status(404).json({ status: 'error', message: 'Structure not found' });
        }
        res.json({ status: 'success', message: 'Structure deleted successfully' });
    } catch (err) {
        console.error('Delete structure error:', err);
        if (err.message.includes('Cannot delete')) {
            return res.status(400).json({ status: 'error', message: err.message });
        }
        res.status(500).json({ status: 'error', message: err.message });
    }
};

// =====================================================
// CTC CALCULATOR
// =====================================================

exports.calculateCTC = async (req, res) => {
    try {
        const { structure_id, annual_ctc } = req.body;

        if (!structure_id || !annual_ctc) {
            return res.status(400).json({
                status: 'error',
                message: 'structure_id and annual_ctc are required'
            });
        }

        const data = await salaryStructureService.calculateCTCBreakdown(
            req.user.tenantId,
            structure_id,
            parseFloat(annual_ctc)
        );

        res.json({ status: 'success', data });
    } catch (err) {
        console.error('Calculate CTC error:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
};

// =====================================================
// EMPLOYEE SALARY
// =====================================================

exports.getEmployeeSalary = async (req, res) => {
    try {
        const { employeeId } = req.params;

        // IDOR check
        if (req.user.employeeId !== employeeId && !['HR', 'ADMIN'].includes(req.user.role)) {
            return res.status(403).json({ status: 'error', message: 'Access denied' });
        }

        const data = await salaryStructureService.getEmployeeSalary(req.user.tenantId, employeeId);
        res.json({ status: 'success', data });
    } catch (err) {
        console.error('Get employee salary error:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
};

exports.assignEmployeeSalary = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { structure_id, annual_ctc, effective_from, revision_reason } = req.body;

        if (!structure_id || !annual_ctc || !effective_from) {
            return res.status(400).json({
                status: 'error',
                message: 'structure_id, annual_ctc, and effective_from are required'
            });
        }

        const data = await salaryStructureService.assignEmployeeSalary(
            req.user.tenantId,
            employeeId,
            {
                structure_id,
                annual_ctc: parseFloat(annual_ctc),
                effective_from,
                revision_reason
            },
            req.user.id
        );

        res.status(201).json({ status: 'success', data, message: 'Salary assigned successfully' });
    } catch (err) {
        console.error('Assign salary error:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
};

exports.getEmployeeSalaryHistory = async (req, res) => {
    try {
        const { employeeId } = req.params;

        // IDOR check
        if (req.user.employeeId !== employeeId && !['HR', 'ADMIN'].includes(req.user.role)) {
            return res.status(403).json({ status: 'error', message: 'Access denied' });
        }

        const data = await salaryStructureService.getEmployeeSalaryHistory(req.user.tenantId, employeeId);
        res.json({ status: 'success', data });
    } catch (err) {
        console.error('Get salary history error:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
};

// =====================================================
// SEED DATA
// =====================================================

exports.seedDefaults = async (req, res) => {
    try {
        await salaryStructureService.seedDefaultComponents(req.user.tenantId);
        await salaryStructureService.seedDefaultReimbursementTypes(req.user.tenantId);
        const structureId = await salaryStructureService.seedDefaultStructure(req.user.tenantId);

        res.json({
            status: 'success',
            message: 'Default salary components, reimbursement types, and structure created',
            data: { structure_id: structureId }
        });
    } catch (err) {
        console.error('Seed defaults error:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
};
