/**
 * Statutory Calculations - India
 * 
 * Correct formulas for PF, ESI, PT calculations per Indian labor laws
 */

// ===================================================================
// PROVIDENT FUND (PF) CALCULATION
// ===================================================================

/**
 * Calculate PF contributions
 * 
 * PF is calculated on Basic + DA (capped at ₹15,000 for statutory)
 * 
 * Breakdown of employer 12%:
 * - 3.67% → Employee Pension Scheme (EPS) for age < 58
 * - 8.33% → EPF Account
 * - 0.50% → EDLI (Employee Deposit Linked Insurance)
 * - 0.50% → Admin charges
 * 
 * @param {number} basic - Monthly basic salary
 * @param {number} da - Monthly DA (Dearness Allowance)
 * @param {object} config - Statutory config from database
 * @param {object} employee - Employee details (age, vpf rate)
 * @returns {object} PF breakdown
 */
const calculatePF = (basic, da = 0, config, employee = {}) => {
    if (!config.pf_enabled) {
        return {
            pfEmployee: 0,
            pfEmployer: 0,
            epsContribution: 0,
            vpfEmployee: 0,
            adminCharges: 0,
            edliCharges: 0,
            pfApplicable: false
        };
    }

    const pfWageCeiling = config.pf_wage_ceiling || 15000;
    const employeeRate = config.pf_employee_rate || 12;
    const employerRate = config.pf_employer_rate || 12;
    const adminRate = config.pf_admin_charges || 0.50;

    // PF is calculated on Basic + DA
    const pfWages = basic + da;

    // Check if employee is eligible (wages <= ceiling OR opted for full wages)
    const capAtCeiling = !employee.pfOnFullWages;
    const pfBase = capAtCeiling ? Math.min(pfWages, pfWageCeiling) : pfWages;

    // Employee Contribution (12% by default)
    const pfEmployee = Math.round((pfBase * employeeRate) / 100);

    // VPF (Voluntary PF) - additional employee contribution
    const vpfRate = employee.vpfRate || 0;
    const vpfEmployee = Math.round((pfBase * vpfRate) / 100);

    // Employer Contribution breakdown
    // - 8.33% or ₹1250 max → EPS (for employees < 58 years)
    // - Rest → EPF
    const age = employee.age || 30;
    const epsRate = 8.33;
    const maxEps = 1250; // Max EPS on ₹15000

    let epsContribution = 0;
    if (age < 58) {
        epsContribution = Math.min(
            Math.round((pfBase * epsRate) / 100),
            maxEps
        );
    }

    const employerEpf = Math.round((pfBase * employerRate) / 100) - epsContribution;
    const pfEmployer = employerEpf + epsContribution;

    // Admin charges (0.50% on PF wages)
    const adminCharges = Math.round((pfBase * adminRate) / 100);

    // EDLI charges (0.50% on PF wages, max ₹75)
    const edliCharges = Math.min(Math.round((pfBase * 0.50) / 100), 75);

    return {
        pfEmployee,
        pfEmployer,
        epsContribution,
        vpfEmployee,
        adminCharges,
        edliCharges,
        pfBase,
        pfApplicable: true,
        totalEmployerCost: pfEmployer + adminCharges + edliCharges
    };
};

// ===================================================================
// ESI (Employee State Insurance) CALCULATION
// ===================================================================

/**
 * Calculate ESI contributions
 * 
 * ESI applicable if gross salary <= ₹21,000
 * Employee: 0.75%, Employer: 3.25%
 * 
 * @param {number} gross - Monthly gross salary
 * @param {object} config - Statutory config
 * @returns {object} ESI breakdown
 */
const calculateESI = (gross, config) => {
    if (!config.esi_enabled) {
        return {
            esiEmployee: 0,
            esiEmployer: 0,
            esiApplicable: false
        };
    }

    const esiWageCeiling = config.esi_wage_ceiling || 21000;

    // ESI not applicable if gross > ceiling
    if (gross > esiWageCeiling) {
        return {
            esiEmployee: 0,
            esiEmployer: 0,
            esiApplicable: false,
            reason: 'Gross exceeds ESI wage ceiling'
        };
    }

    const employeeRate = config.esi_employee_rate || 0.75;
    const employerRate = config.esi_employer_rate || 3.25;

    // ESI is calculated on gross wages (all components)
    const esiEmployee = Math.round((gross * employeeRate) / 100);
    const esiEmployer = Math.round((gross * employerRate) / 100);

    return {
        esiEmployee,
        esiEmployer,
        esiApplicable: true,
        esiBase: gross
    };
};

// ===================================================================
// PROFESSIONAL TAX (PT) CALCULATION - STATE WISE
// ===================================================================

/**
 * Default PT slabs by state (India)
 * These are fallback values if no custom slabs are configured
 */
const DEFAULT_PT_SLABS = {
    'Karnataka': [
        { min: 0, max: 15000, tax: 0 },
        { min: 15001, max: null, tax: 200 }
    ],
    'Maharashtra': [
        { min: 0, max: 7500, tax: 0 },
        { min: 7501, max: 10000, tax: 175 },
        { min: 10001, max: null, tax: 200, note: '300 in Feb' }
    ],
    'Tamil Nadu': [
        { min: 0, max: 21000, tax: 0 },
        { min: 21001, max: 30000, tax: 100 },
        { min: 30001, max: 45000, tax: 235 },
        { min: 45001, max: 60000, tax: 510 },
        { min: 60001, max: 75000, tax: 760 },
        { min: 75001, max: null, tax: 1095 }
    ],
    'Telangana': [
        { min: 0, max: 15000, tax: 0 },
        { min: 15001, max: 20000, tax: 150 },
        { min: 20001, max: null, tax: 200 }
    ],
    'Andhra Pradesh': [
        { min: 0, max: 15000, tax: 0 },
        { min: 15001, max: 20000, tax: 150 },
        { min: 20001, max: null, tax: 200 }
    ],
    'Gujarat': [
        { min: 0, max: 5999, tax: 0 },
        { min: 6000, max: 8999, tax: 80 },
        { min: 9000, max: 11999, tax: 150 },
        { min: 12000, max: null, tax: 200 }
    ],
    'West Bengal': [
        { min: 0, max: 10000, tax: 0 },
        { min: 10001, max: 15000, tax: 110 },
        { min: 15001, max: 25000, tax: 130 },
        { min: 25001, max: 40000, tax: 150 },
        { min: 40001, max: null, tax: 200 }
    ],
    'Kerala': [
        { min: 0, max: 11999, tax: 0 },
        { min: 12000, max: 17999, tax: 120 },
        { min: 18000, max: 29999, tax: 180 },
        { min: 30000, max: 44999, tax: 300 },
        { min: 45000, max: 59999, tax: 450 },
        { min: 60000, max: 74999, tax: 600 },
        { min: 75000, max: 99999, tax: 750 },
        { min: 100000, max: 124999, tax: 1000 },
        { min: 125000, max: null, tax: 1250 }
    ],
    'Madhya Pradesh': [
        { min: 0, max: 18750, tax: 0 },
        { min: 18751, max: 25000, tax: 125 },
        { min: 25001, max: 33333, tax: 166 },
        { min: 33334, max: null, tax: 208 }
    ],
    'Delhi': [], // No PT in Delhi
    'Rajasthan': [], // No PT in Rajasthan
};

/**
 * Calculate Professional Tax
 * 
 * @param {number} gross - Monthly gross salary
 * @param {string} state - State name
 * @param {string} gender - MALE/FEMALE/OTHER
 * @param {number} month - Month number (1-12) for Feb special cases
 * @param {Array} customSlabs - Custom PT slabs from database
 * @returns {object} PT calculation result
 */
const calculatePT = (gross, state, gender = 'MALE', month = null, customSlabs = []) => {
    // If custom slabs are provided, use them
    let slabs = customSlabs.length > 0 ? customSlabs : DEFAULT_PT_SLABS[state];

    if (!slabs || slabs.length === 0) {
        return {
            professionalTax: 0,
            ptApplicable: false,
            reason: 'PT not applicable in this state'
        };
    }

    // Find applicable slab
    let tax = 0;
    for (const slab of slabs) {
        if (gross >= slab.min && (slab.max === null || gross <= slab.max)) {
            tax = slab.monthly_tax || slab.tax;
            break;
        }
    }

    // Special case: Maharashtra charges ₹300 in February
    if (state === 'Maharashtra' && month === 2 && tax === 200) {
        tax = 300;
    }

    // Some states exempt women from PT
    const womenExemptStates = ['Madhya Pradesh'];
    if (gender === 'FEMALE' && womenExemptStates.includes(state)) {
        return {
            professionalTax: 0,
            ptApplicable: false,
            reason: 'Women exempted from PT in this state'
        };
    }

    return {
        professionalTax: tax,
        ptApplicable: tax > 0,
        state,
        grossBase: gross
    };
};

// ===================================================================
// LWF (Labour Welfare Fund) CALCULATION
// ===================================================================

/**
 * Calculate LWF contribution
 * LWF is typically a fixed amount collected half-yearly or annually
 * 
 * @param {object} config - Statutory config
 * @param {number} month - Month number (1-12)
 * @returns {object} LWF breakdown
 */
const calculateLWF = (config, month) => {
    if (!config.lwf_enabled) {
        return {
            lwfEmployee: 0,
            lwfEmployer: 0,
            lwfApplicable: false
        };
    }

    // LWF is typically collected in June and December
    const lwfMonths = [6, 12];

    if (!lwfMonths.includes(month)) {
        return {
            lwfEmployee: 0,
            lwfEmployer: 0,
            lwfApplicable: false,
            reason: 'LWF not applicable this month'
        };
    }

    return {
        lwfEmployee: config.lwf_employee_amount || 0,
        lwfEmployer: config.lwf_employer_amount || 0,
        lwfApplicable: true
    };
};

// ===================================================================
// COMBINED STATUTORY CALCULATION
// ===================================================================

/**
 * Calculate all statutory deductions
 * 
 * @param {object} salary - Salary components {basic, da, hra, gross}
 * @param {object} config - Statutory config from database
 * @param {object} employee - Employee details {age, state, gender, vpfRate}
 * @param {number} month - Current month (1-12)
 * @param {Array} customPTSlabs - Custom PT slabs from database
 * @returns {object} All statutory calculations
 */
const calculateAllStatutory = (salary, config, employee = {}, month = null, customPTSlabs = []) => {
    const pf = calculatePF(salary.basic, salary.da || 0, config, employee);
    const esi = calculateESI(salary.gross, config);
    const pt = calculatePT(salary.gross, employee.state || config.pt_state, employee.gender, month, customPTSlabs);
    const lwf = calculateLWF(config, month);

    const totalEmployeeDeductions = pf.pfEmployee + pf.vpfEmployee + esi.esiEmployee + pt.professionalTax + lwf.lwfEmployee;
    const totalEmployerContributions = pf.pfEmployer + pf.adminCharges + pf.edliCharges + esi.esiEmployer + lwf.lwfEmployer;

    return {
        pf,
        esi,
        pt,
        lwf,
        summary: {
            totalEmployeeDeductions,
            totalEmployerContributions,
            ctcImpact: totalEmployerContributions
        }
    };
};

module.exports = {
    calculatePF,
    calculateESI,
    calculatePT,
    calculateLWF,
    calculateAllStatutory,
    DEFAULT_PT_SLABS
};
