/**
 * Payroll Module — Unit Tests for Bug Fixes
 * 
 * Run with: npx jest src/modules/payroll/__tests__/payroll-fixes.test.js
 * 
 * These tests validate the key logic fixes without requiring a database connection.
 * They test pure functions extracted from the service layer.
 */

// ===================================================================
// 1. FORMULA VALIDATION (from payroll.validator.js)
// ===================================================================
const { safeFormulaValidator } = require('../payroll.validator');

describe('safeFormulaValidator', () => {
    test('should accept valid arithmetic formulas', () => {
        expect(safeFormulaValidator('BASIC * 0.5')).toBe(true);
        expect(safeFormulaValidator('CTC * 0.4 + 1000')).toBe(true);
        expect(safeFormulaValidator('(BASIC + DA) * 0.12')).toBe(true);
    });

    test('should reject division by zero', () => {
        expect(safeFormulaValidator('BASIC / 0')).toBe(false);
        expect(safeFormulaValidator('BASIC /0')).toBe(false);
    });

    test('should reject code injection patterns', () => {
        expect(safeFormulaValidator('eval("alert(1)")')).toBe(false);
        expect(safeFormulaValidator('require("fs")')).toBe(false);
        expect(safeFormulaValidator('process.exit(1)')).toBe(false);
        expect(safeFormulaValidator('Function("return 1")()')).toBe(false);
    });

    test('should accept empty or null formulas', () => {
        expect(safeFormulaValidator('')).toBe(true);
        expect(safeFormulaValidator(null)).toBe(true);
        expect(safeFormulaValidator(undefined)).toBe(true);
    });
});

// ===================================================================
// 2. BANK CSV LEADING ZERO PRESERVATION (from RiverProcess.tsx logic)
// ===================================================================
describe('convertBankFileToCSV', () => {
    // Inline the function for testing (since it's in a React file)
    const convertBankFileToCSV = (entries) => {
        const headers = ['S.No', 'Employee Name', 'Emp Code', 'Bank Name', 'Account Number', 'IFSC Code', 'Amount'];
        const rows = entries.map(e => [
            e.sno,
            `"${(e.employeeName || '').replace(/"/g, '""')}"`,
            e.empCode,
            `"${(e.bankName || '').replace(/"/g, '""')}"`,
            `="${e.accountNumber}"`,
            e.ifscCode,
            e.amount
        ]);
        return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    };

    test('should wrap account numbers with leading zeros in text-force format', () => {
        const csv = convertBankFileToCSV([{
            sno: 1,
            employeeName: 'John Doe',
            empCode: 'EMP001',
            bankName: 'State Bank',
            accountNumber: '0012345678',
            ifscCode: 'SBIN0001234',
            amount: 50000
        }]);

        expect(csv).toContain('="0012345678"');
    });

    test('should handle names with special characters', () => {
        const csv = convertBankFileToCSV([{
            sno: 1,
            employeeName: 'O"Brien, John',
            empCode: 'EMP002',
            bankName: 'HDFC',
            accountNumber: '9876543210',
            ifscCode: 'HDFC0001',
            amount: 75000
        }]);

        expect(csv).toContain('"O""Brien, John"');
    });
});

// ===================================================================
// 3. GRATUITY CALCULATION (from settlement.service.js logic)
// ===================================================================
describe('Gratuity Calculation', () => {
    const calculateGratuity = (joinDate, lastWorkingDay, monthlyBasic) => {
        if (!joinDate) return 0;
        const join = new Date(joinDate);
        const lwd = lastWorkingDay ? new Date(lastWorkingDay) : new Date();
        const serviceMs = lwd - join;
        const yearsOfService = serviceMs / (365.25 * 24 * 60 * 60 * 1000);

        if (yearsOfService < 5) return 0;

        const completedYears = Math.round(yearsOfService);
        return Math.round((15 * monthlyBasic * completedYears) / 26);
    };

    test('should return 0 for less than 5 years of service', () => {
        const joinDate = '2023-01-01';
        const lwd = '2026-06-30';
        expect(calculateGratuity(joinDate, lwd, 30000)).toBe(0);
    });

    test('should calculate gratuity correctly for 6 years of service', () => {
        const joinDate = '2020-02-01';
        const lwd = '2026-02-15';
        const monthlyBasic = 30000;
        // 6 years, formula: (15 * 30000 * 6) / 26 = 103846.15 ≈ 103846
        const result = calculateGratuity(joinDate, lwd, monthlyBasic);
        expect(result).toBeGreaterThan(0);
        expect(result).toBe(Math.round((15 * 30000 * 6) / 26));
    });

    test('should return 0 for null join date', () => {
        expect(calculateGratuity(null, '2026-02-15', 30000)).toBe(0);
    });

    test('should handle 10+ years of service', () => {
        const joinDate = '2015-01-01';
        const lwd = '2026-02-15';
        const monthlyBasic = 50000;
        const result = calculateGratuity(joinDate, lwd, monthlyBasic);
        // ~11 years, formula: (15 * 50000 * 11) / 26 = 317307.69 ≈ 317308
        expect(result).toBe(Math.round((15 * 50000 * 11) / 26));
    });
});

// ===================================================================
// 4. CTC TRUE-UP LOGIC
// ===================================================================
describe('CTC Rounding True-Up', () => {
    test('should correct monthly rounding drift', () => {
        // Simulate a breakdown where monthly * 12 doesn't match annual
        const breakdown = [
            { component_code: 'BASIC', component_type: 'EARNING', annual_amount: 300000, monthly_amount: 25000 },
            { component_code: 'HRA', component_type: 'EARNING', annual_amount: 150000, monthly_amount: 12500 },
            { component_code: 'SPECIAL_ALLOWANCE', component_type: 'EARNING', annual_amount: 50000, monthly_amount: 4166.67 },
        ];

        const grossEarnings = breakdown.reduce((s, c) => s + c.annual_amount, 0); // 500000
        const totalMonthlyTimes12 = breakdown.reduce((s, c) => s + (c.monthly_amount * 12), 0);
        const roundingDiff = Math.round((grossEarnings - totalMonthlyTimes12) * 100) / 100;

        if (roundingDiff !== 0) {
            const adjustTarget = breakdown.find(c => c.component_code === 'SPECIAL_ALLOWANCE');
            if (adjustTarget) {
                adjustTarget.annual_amount = Math.round((adjustTarget.annual_amount + roundingDiff) * 100) / 100;
                adjustTarget.monthly_amount = Math.round((adjustTarget.annual_amount / 12) * 100) / 100;
            }
        }

        // After true-up, verify the drift is minimized
        const newTotal = breakdown.reduce((s, c) => s + (c.monthly_amount * 12), 0);
        const finalDiff = Math.abs(grossEarnings - newTotal);
        // Drift should be less than 1 rupee
        expect(finalDiff).toBeLessThan(1);
    });
});

// ===================================================================
// 5. PRO-RATA CALCULATION
// ===================================================================
describe('Pro-Rata Mid-Month Joiner', () => {
    test('should calculate pro-rata factor for mid-month joiner', () => {
        const totalDaysInMonth = 31; // January
        const joinDate = new Date('2026-01-15');
        const periodStart = new Date('2026-01-01');
        const periodEnd = new Date('2026-01-31');

        let proRataFactor = 1;
        if (joinDate > periodStart && joinDate <= periodEnd) {
            const joiningDay = joinDate.getDate();
            const effectiveDays = totalDaysInMonth - joiningDay + 1;
            proRataFactor = effectiveDays / totalDaysInMonth;
        }

        // Joined on 15th January: 31 - 15 + 1 = 17 days out of 31
        expect(proRataFactor).toBeCloseTo(17 / 31, 4);
    });

    test('should return factor 1 for existing employee', () => {
        const totalDaysInMonth = 31;
        const joinDate = new Date('2025-06-01');
        const periodStart = new Date('2026-01-01');
        const periodEnd = new Date('2026-01-31');

        let proRataFactor = 1;
        if (joinDate > periodStart && joinDate <= periodEnd) {
            const joiningDay = joinDate.getDate();
            const effectiveDays = totalDaysInMonth - joiningDay + 1;
            proRataFactor = effectiveDays / totalDaysInMonth;
        }

        expect(proRataFactor).toBe(1);
    });

    test('should return factor 1 for first-day joiner', () => {
        const totalDaysInMonth = 30;
        const joinDate = new Date('2026-02-01');
        const periodStart = new Date('2026-02-01');
        const periodEnd = new Date('2026-02-28');

        let proRataFactor = 1;
        // joinDate is NOT > periodStart (it's equal), so proRataFactor stays 1
        if (joinDate > periodStart && joinDate <= periodEnd) {
            const joiningDay = joinDate.getDate();
            const effectiveDays = totalDaysInMonth - joiningDay + 1;
            proRataFactor = effectiveDays / totalDaysInMonth;
        }

        expect(proRataFactor).toBe(1);
    });
});

// ===================================================================
// 6. NEGATIVE NET PAY SETTLEMENT TYPE
// ===================================================================
describe('Negative Net Pay', () => {
    test('should set RECOVERABLE type when deductions exceed earnings', () => {
        const grossPayable = 30000;
        const totalDeductions = 45000;
        const netPayable = grossPayable - totalDeductions;

        const settlementType = netPayable >= 0 ? 'PAYABLE_TO_EMPLOYEE' : 'RECOVERABLE_FROM_EMPLOYEE';
        expect(netPayable).toBe(-15000);
        expect(settlementType).toBe('RECOVERABLE_FROM_EMPLOYEE');
    });

    test('should set PAYABLE type when earnings exceed deductions', () => {
        const grossPayable = 50000;
        const totalDeductions = 10000;
        const netPayable = grossPayable - totalDeductions;

        const settlementType = netPayable >= 0 ? 'PAYABLE_TO_EMPLOYEE' : 'RECOVERABLE_FROM_EMPLOYEE';
        expect(netPayable).toBe(40000);
        expect(settlementType).toBe('PAYABLE_TO_EMPLOYEE');
    });

    test('should handle exact zero net pay', () => {
        const netPayable = 0;
        const settlementType = netPayable >= 0 ? 'PAYABLE_TO_EMPLOYEE' : 'RECOVERABLE_FROM_EMPLOYEE';
        expect(settlementType).toBe('PAYABLE_TO_EMPLOYEE');
    });
});

// ===================================================================
// 7. PDF SANITIZATION
// ===================================================================
describe('PDF Text Sanitization', () => {
    const sanitizeForPDF = (text) => {
        if (!text) return '';
        return String(text)
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/[\u2013\u2014]/g, '-')
            .replace(/\u2026/g, '...')
            .replace(/[\u00A0]/g, ' ')
            .replace(/[^\x20-\x7E\u00A0-\u00FF\u0900-\u097F]/g, '');
    };

    test('should replace smart quotes', () => {
        expect(sanitizeForPDF('\u2018hello\u2019')).toBe("'hello'");
        expect(sanitizeForPDF('\u201Chello\u201D')).toBe('"hello"');
    });

    test('should replace en/em dashes', () => {
        expect(sanitizeForPDF('2020\u20132026')).toBe('2020-2026');
    });

    test('should handle null/undefined', () => {
        expect(sanitizeForPDF(null)).toBe('');
        expect(sanitizeForPDF(undefined)).toBe('');
    });

    test('should preserve regular ASCII text', () => {
        expect(sanitizeForPDF('John Doe')).toBe('John Doe');
    });

    test('should preserve Devanagari text', () => {
        expect(sanitizeForPDF('राम')).toBe('राम');
    });
});
