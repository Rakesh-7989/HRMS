const db = require('../src/config/db');
const salaryStructureService = require('../src/modules/payroll/salary/salaryStructure.service');

const refreshAssignments = async () => {
    const client = await db.connect();
    try {
        console.log('Starting salary assignment refresh...');

        // Get all active assignments
        const assignments = await client.query(
            `SELECT esa.id, esa.employee_id, esa.structure_id, esa.annual_ctc, esa.tenant_id 
             FROM employee_salary_assignments esa
             WHERE esa.is_current = TRUE`
        );

        console.log(`Found ${assignments.rowCount} active assignments.`);

        for (const assign of assignments.rows) {
            console.log(`Processing assignment ${assign.id} for employee (ID: ${assign.employee_id})...`);

            try {
                // Calculate breakdown
                const breakdown = await salaryStructureService.calculateCTCBreakdown(
                    assign.tenant_id,
                    assign.structure_id,
                    assign.annual_ctc
                );

                // Update values
                await client.query('BEGIN');

                // Delete old
                await client.query(
                    `DELETE FROM employee_salary_component_values WHERE assignment_id = $1`,
                    [assign.id]
                );

                // Insert new
                for (const comp of breakdown.breakdown) {
                    await client.query(
                        `INSERT INTO employee_salary_component_values 
                         (tenant_id, assignment_id, component_id, monthly_amount, annual_amount)
                         VALUES ($1, $2, $3, $4, $5)`,
                        [assign.tenant_id, assign.id, comp.component_id, comp.monthly_amount, comp.annual_amount]
                    );
                }

                await client.query('COMMIT');
                console.log(`Updated assignment ${assign.id}.`);
            } catch (err) {
                await client.query('ROLLBACK');
                console.error(`Error updating assignment ${assign.id}:`, err.message);
            }
        }

        console.log('Refresh completed.');
    } catch (error) {
        console.error('Script failed:', error);
    } finally {
        client.release();
        process.exit();
    }
};

refreshAssignments();
