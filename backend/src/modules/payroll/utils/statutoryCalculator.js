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
    // Compliance Fix: ESI must be rounded UP to the next higher rupee
    const esiEmployee = Math.ceil((gross * employeeRate) / 100);
    const esiEmployer = Math.ceil((gross * employerRate) / 100);

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
    // month is 1-indexed (1=Jan, 2=Feb)
    if (state === 'Maharashtra' && parseInt(month) === 2 && tax === 200) {
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
// TDS (TAX DEDUCTED AT SOURCE) CALCULATION - FY 2025-26
// ===================================================================

/**
 * Calculate HRA Exemption (Section 10(13A))
 * 
 * @param {number} actualHRA - Annual HRA received
 * @param {number} annualBasic - Annual Basic + DA
 * @param {number} annualRentPaid - Total rent paid in the year
 * @param {boolean} isMetro - Whether living in a metro city (Delhi, Mumbai, Kolkata, Chennai)
 * @returns {number} Exempt HRA amount
 */
const calculateHRAExemption = (actualHRA, annualBasic, annualRentPaid, isMetro = false) => {
    if (annualRentPaid <= 0) return 0;

    const rentMinusTenPercent = Math.max(0, annualRentPaid - (annualBasic * 0.10));
    const fiftyOrFortyPercent = isMetro ? (annualBasic * 0.50) : (annualBasic * 0.40);

    return Math.min(actualHRA, rentMinusTenPercent, fiftyOrFortyPercent);
};

/**
 * Calculate TDS based on Income Tax Slabs
 * Supports New Regime (FY 2025-26) and Old Regime
 * 
 * @param {number} annualGrossIncome - Projected Annual Gross Salary
 * @param {object} declarations - { regime: 'NEW'|'OLD', investments_80c: 0, rent_paid: 0, is_metro: false, actual_hra: 0, ... }
 * @param {number} age - Employee age
 */
const calculateTDS = (annualGrossIncome, declarations = {}, age = 30) => {
    const regime = declarations.regime || 'NEW'; // Default to New Regime
    let taxableIncome = annualGrossIncome;
    let taxAmount = 0;
    let hraExemption = 0;

    // 1. Standard Deduction
    // FY 2025-26: New Regime Std Ded increased to 75,000
    const stdDeduction = regime === 'NEW' ? 75000 : 50000;
    taxableIncome = Math.max(0, taxableIncome - stdDeduction);

    // 2. Exemptions / Deductions (Old Regime Only)
    if (regime === 'OLD') {
        const annualBasic = declarations.annual_basic || 0;
        const actualHRA = declarations.actual_hra || 0;

        hraExemption = calculateHRAExemption(
            actualHRA,
            annualBasic,
            declarations.rent_paid || 0,
            declarations.is_metro || false
        );

        const exempt80C = Math.min(declarations.investments_80c || 0, 150000);
        const exempt80D = Math.min(declarations.investments_80d || 0, 25000);
        const lta = declarations.lta || 0;
        const otherAndProfTax = declarations.other_exemptions || 0;

        const totalDeductions = exempt80C + exempt80D + hraExemption + lta + otherAndProfTax;
        taxableIncome = Math.max(0, taxableIncome - totalDeductions);
    }

    // 3. Tax Calculation (Slabs)
    if (regime === 'NEW') {
        // FY 2025-26 (Assessment Year 2026-27)
        // 0 - 4L: Nil
        // 4L - 8L: 5%
        // 8L - 12L: 10%
        // 12L - 16L: 15%
        // 16L - 20L: 20%
        // 20L - 24L: 25%
        // > 24L: 30%

        let remainingIncome = taxableIncome;

        // 0-4L
        if (remainingIncome > 400000) {
            // 4L-8L (Max 4L * 5% = 20k)
            const slabIncome = Math.min(remainingIncome - 400000, 400000);
            taxAmount += slabIncome * 0.05;
        }

        if (remainingIncome > 800000) {
            // 8L-12L (Max 4L * 10% = 40k)
            const slabIncome = Math.min(remainingIncome - 800000, 400000);
            taxAmount += slabIncome * 0.10;
        }

        if (remainingIncome > 1200000) {
            // 12L-16L (Max 4L * 15% = 60k)
            const slabIncome = Math.min(remainingIncome - 1200000, 400000);
            taxAmount += slabIncome * 0.15;
        }

        if (remainingIncome > 1600000) {
            // 16L-20L (Max 4L * 20% = 80k)
            const slabIncome = Math.min(remainingIncome - 1600000, 400000);
            taxAmount += slabIncome * 0.20;
        }

        if (remainingIncome > 2000000) {
            // 20L-24L (Max 4L * 25% = 100k)
            const slabIncome = Math.min(remainingIncome - 2000000, 400000);
            taxAmount += slabIncome * 0.25;
        }

        if (remainingIncome > 2400000) {
            // > 24L (30%)
            const slabIncome = remainingIncome - 2400000;
            taxAmount += slabIncome * 0.30;
        }

        // Rebate u/s 87A: Tax is 0 if taxable income <= 12 Lakhs
        // Note: The limit is on Taxable Income, not Gross.
        if (taxableIncome <= 1200000) {
            taxAmount = 0;
        }

    } else {
        // OLD REGIME
        let slab1 = 250000;
        if (age >= 60) slab1 = 300000;
        if (age >= 80) slab1 = 500000;

        let remaining = taxableIncome;

        if (remaining > slab1) {
            // 2.5L - 5L: 5%
            const limitSV = 500000 - slab1;
            const taxable = Math.min(remaining - slab1, limitSV);
            taxAmount += taxable * 0.05;
        }

        if (remaining > 500000) {
            // 5L - 10L: 20%
            const taxable = Math.min(remaining - 500000, 500000);
            taxAmount += taxable * 0.20;
        }

        if (remaining > 1000000) {
            // > 10L: 30%
            taxAmount += (remaining - 1000000) * 0.30;
        }

        // Rebate u/s 87A (Old): Tax is 0 if taxable income <= 5 Lakhs
        if (taxableIncome <= 500000) {
            taxAmount = 0;
        }
    }

    // 4. Surcharge
    let surcharge = 0;
    if (taxableIncome > 5000000 && taxableIncome <= 10000000) surcharge = taxAmount * 0.10;
    else if (taxableIncome > 10000000 && taxableIncome <= 20000000) surcharge = taxAmount * 0.15;
    else if (taxableIncome > 20000000) surcharge = taxAmount * 0.25;

    // 5. Health & Education Cess (4%)
    const cess = (taxAmount + surcharge) * 0.04;
    const totalTaxInfo = taxAmount + surcharge + cess;

    return {
        annualGross: annualGrossIncome,
        taxableIncome,
        hraExemption,
        yearlyTax: Math.round(totalTaxInfo),
        monthlyTDS: Math.round(totalTaxInfo / 12),
        regime,
        breakdown: { stdDeduction, taxAmount, surcharge, cess }
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
    calculateTDS,
    calculateAllStatutory,
    DEFAULT_PT_SLABS
};
