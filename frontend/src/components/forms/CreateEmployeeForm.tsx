import React, { useEffect, useMemo } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { usersService, CreateUserData, UpdateEmployeeData, User } from '@/services/users.service';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { departmentService } from '@/services/department.service';
import { designationService } from '@/services/designation.service';
import { AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface CreateEmployeeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asPage?: boolean;
  editEmployee?: User | null; // If provided, form is in edit mode
  onSuccess?: () => void;
}

const createValidationSchema = Yup.object({
  email: Yup.string().email('Invalid email').required('Email is required'),
  first_name: Yup.string()
    .matches(/^[A-Za-z\s\-\.]+$/, 'Enter a valid name (letters only)')
    .required('First name is required'),
  last_name: Yup.string()
    .matches(/^[A-Za-z\s\-\.]+$/, 'Enter a valid name (letters only)')
    .required('Last name is required'),
  role: Yup.string().required('Role is required'),
  phone: Yup.string()
    .matches(/^[0-9+\-()\s\.]*$/, 'Phone number can only contain numbers and basic symbols (+, -, (, ), .)')
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number cannot exceed 20 digits')
    .required('Phone is required'),
  department_id: Yup.string().required('Department is required'),
  designation_id: Yup.string().required('Designation is required'),
  employee_id: Yup.string().required('Employee ID is required'),
  date_of_birth: Yup.date()
    .required('Date of birth is required')
    .max(new Date(), 'Date of birth cannot be in the future')
    .test('age', 'Employee must be at least 18 years old', function (value) {
      if (!value) return true;
      const today = new Date();
      const minBirthDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
      return new Date(value) <= minBirthDate;
    }),
  join_date: Yup.date()
    .required('Join date is required')
    .test('is-after-dob', 'Join date must be at least 18 years after Date of Birth', function (value) {
      const { date_of_birth } = this.parent;
      if (!date_of_birth || !value) return true;
      const dob = new Date(date_of_birth);
      const minJoinDate = new Date(dob.getFullYear() + 18, dob.getMonth(), dob.getDate());
      return new Date(value) >= minJoinDate;
    }),
  gender: Yup.string().required('Gender is required'),
  marital_status: Yup.string().required('Marital status is required'),
  address: Yup.string().required('Address is required'),
  bank_name: Yup.string()
    .matches(/^[A-Za-z\s\-\.&]+$/, 'Bank name must contain only letters')
    .required('Bank name is required'),
  account_name: Yup.string()
    .matches(/^[A-Za-z\s\-\.]+$/, 'Account name must contain only letters')
    .required('Account name is required'),
  account_number: Yup.string()
    .test('digits-only', 'Account number must contain only digits', function (value) {
      if (!value) return true;
      return /^[0-9]*$/.test(value);
    })
    .test('valid-length', 'Account number must be 9-18 digits', function (value) {
      if (!value) return true;
      return value.length >= 9 && value.length <= 18;
    })
    .required('Account number is required'),
  ifsc_code: Yup.string()
    .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC Code format')
    .required('IFSC code is required'),

  tax_id: Yup.string()
    .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN Card format')
    .required('Tax ID is required'),
  annual_salary: Yup.number()
    .positive('Salary must be positive')
    .nullable(),
  emergency_name: Yup.string()
    .matches(/^[A-Za-z\s\-\.]+$/, 'Enter a valid name (letters only)')
    .required('Emergency contact is required'),
  emergency_phone: Yup.string()
    .matches(/^[0-9+]*$/, 'Emergency phone number can only contain numbers')
    .min(10, 'Emergency phone number must be at least 10 digits')
    .max(20, 'Emergency phone number cannot exceed 20 digits')
    .required('Emergency phone is required'),
  emergency_relation: Yup.string().required('Emergency relation is required'),
  ctc: Yup.number()
    .transform((value) => (isNaN(value) ? undefined : value))
    .min(0, 'CTC cannot be negative')
    .required('Annual CTC (LPA) is required'),
});

// Edit mode has less strict validation
const editValidationSchema = Yup.object({
  first_name: Yup.string()
    .matches(/^[A-Za-z\s\-\.]+$/, 'Enter a valid name (letters only)')
    .required('First name is required'),
  last_name: Yup.string()
    .matches(/^[A-Za-z\s\-\.]+$/, 'Enter a valid name (letters only)')
    .required('Last name is required'),
  date_of_birth: Yup.date()
    .required('Date of birth is required')
    .max(new Date(), 'Date of birth cannot be in the future')
    .test('age', 'Employee must be at least 18 years old', function (value) {
      if (!value) return true;
      const today = new Date();
      const minBirthDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
      return new Date(value) <= minBirthDate;
    }),
  join_date: Yup.date()
    .required('Join date is required')
    .test('is-after-dob', 'Join date must be at least 18 years after Date of Birth', function (value) {
      const { date_of_birth } = this.parent;
      if (!date_of_birth || !value) return true;
      const dob = new Date(date_of_birth);
      const minJoinDate = new Date(dob.getFullYear() + 18, dob.getMonth(), dob.getDate());
      return new Date(value) >= minJoinDate;
    }),
  phone: Yup.string()
    .matches(/^[0-9+\-()\s\.]*$/, 'Phone number can only contain numbers and basic symbols (+, -, (, ), .)')
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number cannot exceed 20 digits')
    .required('Phone is required'),
  gender: Yup.string().required('Gender is required'),
  marital_status: Yup.string().required('Marital status is required'),
  address: Yup.string().required('Address is required'),
  bank_name: Yup.string()
    .matches(/^[A-Za-z\s\-\.&]+$/, 'Bank name must contain only letters')
    .required('Bank name is required'),
  account_name: Yup.string()
    .matches(/^[A-Za-z\s\-\.]+$/, 'Account name must contain only letters')
    .required('Account name is required'),
  account_number: Yup.string()
    .test('digits-only', 'Account number must contain only digits', function (value) {
      if (!value) return true;
      return /^[0-9]*$/.test(value);
    })
    .test('valid-length', 'Account number must be 9-18 digits', function (value) {
      if (!value) return true;
      return value.length >= 9 && value.length <= 18;
    })
    .required('Account number is required'),
  ifsc_code: Yup.string()
    .matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC Code format')
    .required('IFSC code is required'),

  tax_id: Yup.string()
    .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN Card format')
    .required('Tax ID is required'),

  ctc: Yup.number()
    .transform((value) => (isNaN(value) ? undefined : value))
    .min(0, 'CTC cannot be negative'),
});

export const CreateEmployeeForm: React.FC<CreateEmployeeFormProps> = ({
  open,
  onOpenChange,
  asPage = false,
  editEmployee = null,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const isEditMode = !!editEmployee;

  const [error, setError] = React.useState<string | null>(null);



  // Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentService.getDepartments(),
  });

  // Fetch designations
  const { data: designations = [] } = useQuery({
    queryKey: ['designations'],
    queryFn: () => designationService.getDesignations(),
  });

  // Fetch potential managers
  const { data: managers = [] } = useQuery({
    queryKey: ['managers'],
    queryFn: () => usersService.getManagers(),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateUserData) => usersService.createUser(data),
    onSuccess: () => {
      // Invalidate both employees and new-joiners so lists refetch and show the newly created employee
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['new-joiners'] });
      formik.resetForm();
      onOpenChange(false);
      toast('Employee created successfully', { icon: '✅' });
      onSuccess?.();
    },
    onError: (err: Error) => {
      setError(err.message);

      // Map specific server errors to Formik fields and mark as touched to show under the input
      if (err.message.toLowerCase().includes('employee id')) {
        formik.setFieldError('employee_id', err.message);
        formik.setFieldTouched('employee_id', true, false);
      }
      if (err.message.toLowerCase().includes('email')) {
        formik.setFieldError('email', err.message);
        formik.setFieldTouched('email', true, false);
      }

      toast(err.message, { icon: '⚠️' });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: UpdateEmployeeData) => usersService.updateEmployee(editEmployee!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee', editEmployee?.id] });
      onOpenChange(false);
      toast('Employee updated successfully', { icon: '✅' });
      onSuccess?.();
    },
    onError: (err: Error) => {
      setError(err.message);
      if (err.message.toLowerCase().includes('employee id')) {
        formik.setFieldError('employee_id', err.message);
        formik.setFieldTouched('employee_id', true, false);
      }
      toast(err.message, { icon: '⚠️' });
    },
  });

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      email: editEmployee?.email || '',
      first_name: editEmployee?.first_name || '',
      last_name: editEmployee?.last_name || '',
      role: editEmployee?.role || 'EMPLOYEE',
      phone: editEmployee?.phone || '',
      date_of_birth: editEmployee?.date_of_birth?.split('T')[0] || '',
      gender: editEmployee?.gender || '',
      marital_status: editEmployee?.marital_status || '',
      nationality: editEmployee?.nationality || '',
      department_id: editEmployee?.department_id || '',
      designation_id: editEmployee?.designation_id || '',
      reports_to: editEmployee?.reports_to || editEmployee?.manager?.id || editEmployee?.manager_id || '',
      employee_id: editEmployee?.employee_id || '',
      join_date: editEmployee?.join_date?.split('T')[0] || '',
      employment_type: editEmployee?.employment_type || 'FULL_TIME',
      shift: editEmployee?.shift || 'REGULAR',
      address: editEmployee?.address || '',
      bank_name: editEmployee?.bank_name || '',
      account_name: editEmployee?.account_name || '',
      account_number: editEmployee?.account_number || '',
      ifsc_code: editEmployee?.ifsc_code || '',
      tax_id: editEmployee?.tax_id || '',
      uan: editEmployee?.uan || '',
      pf_account: editEmployee?.pf_account || '',
      esi_number: editEmployee?.esi_number || '',
      emergency_name: editEmployee?.emergency_name || '',
      emergency_phone: editEmployee?.emergency_phone || '',
      emergency_relation: editEmployee?.emergency_relation || '',
      ctc: editEmployee?.ctc || '',
    },
    validationSchema: isEditMode ? editValidationSchema : createValidationSchema,
    validateOnChange: true,
    validateOnBlur: true,
    onSubmit: async (values, { setSubmitting }) => {
      setError(null);

      // Extra validation check before submission
      try {
        const schema = isEditMode ? editValidationSchema : createValidationSchema;
        await schema.validate(values, { abortEarly: false });
      } catch (validationError: any) {
        // Collect all validation errors
        if (validationError.inner && validationError.inner.length > 0) {
          const errorMessages = validationError.inner.map((err: any) => err.message).join(', ');
          setError(`Please fix the following errors: ${errorMessages}`);
          toast.error('Please fix all validation errors before submitting');
          setSubmitting(false);
          return;
        }
      }

      if (isEditMode) {
        // Remove email and role from update payload (can't change these)
        const updateData = { ...values } as Partial<CreateUserData>;
        delete updateData.email;
        delete updateData.role;
        updateMutation.mutate(updateData as UpdateEmployeeData);
      } else {
        createMutation.mutate(values as CreateUserData);
      }
    },
  });

  const maxDob = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d;
  }, []);

  const minJoinDate = useMemo(() => {
    if (!formik.values.date_of_birth) return undefined;
    const d = new Date(formik.values.date_of_birth);
    d.setFullYear(d.getFullYear() + 18);
    return d;
  }, [formik.values.date_of_birth]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setError(null);
      formik.resetForm();
    }
  }, [open]);

  // Clear generic error when user starts correcting any field
  useEffect(() => {
    if (error) setError(null);
  }, [formik.values]);

  // Helper to check if form has validation errors
  const hasValidationErrors = Object.keys(formik.errors).length > 0 && formik.submitCount > 0;

  // Helper to get all current validation errors for display
  const getValidationErrorSummary = () => {
    if (!hasValidationErrors) return null;
    const errors = Object.entries(formik.errors)
      .filter(([_, value]) => value)
      .map(([key, value]) => {
        // Make field names more readable
        const fieldName = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        return `${fieldName}: ${value}`;
      });
    return errors;
  };

  const validationErrors = getValidationErrorSummary();

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const handleInput = (e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    const name = target.name;

    if (name === 'first_name' || name === 'last_name' || name === 'emergency_name') {
      target.value = target.value.replace(/[^A-Za-z\s\-\.]/g, '');
    } else if (name === 'phone' || name === 'emergency_phone') {
      target.value = target.value.replace(/[^0-9+]/g, '');
    }
  };

  const formFields = (
    <div className="space-y-6">
      {/* API Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Validation Errors Summary */}
      {validationErrors && validationErrors.length > 0 && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-2">
                Please fix the following validation errors:
              </p>
              <ul className="list-disc list-inside text-xs text-amber-600 dark:text-amber-500 space-y-1">
                {validationErrors.slice(0, 5).map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
                {validationErrors.length > 5 && (
                  <li className="font-medium">...and {validationErrors.length - 5} more errors</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
          Basic Information
        </h3>

        {!isEditMode && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email *
            </label>
            <input
              type="email"
              name="email"
              value={formik.values.email}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="employee@company.com"
            />
            {formik.touched.email && formik.errors.email && (
              <p className="mt-1 text-sm text-red-600">{formik.errors.email}</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              First Name *
            </label>
            <input
              type="text"
              name="first_name"
              value={formik.values.first_name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              onInput={handleInput}
              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {formik.touched.first_name && formik.errors.first_name && (
              <p className="mt-1 text-sm text-red-600">{formik.errors.first_name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Last Name *
            </label>
            <input
              type="text"
              name="last_name"
              value={formik.values.last_name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              onInput={handleInput}
              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {formik.touched.last_name && formik.errors.last_name && (
              <p className="mt-1 text-sm text-red-600">{formik.errors.last_name}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Phone *
            </label>
            <input
              type="tel"
              name="phone"
              value={formik.values.phone}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              onInput={handleInput}
              placeholder="+91 9876543210"
              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {formik.touched.phone && formik.errors.phone && (
              <p className="mt-1 text-sm text-red-600">{formik.errors.phone}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date of Birth
            </label>
            <DatePicker
              value={formik.values.date_of_birth}
              onChange={(date) => formik.setFieldValue('date_of_birth', date)}
              placeholder="Select date of birth"
              maxDate={maxDob}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Gender *
            </label>
            <select
              name="gender"
              value={formik.values.gender}
              onChange={formik.handleChange}
              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
            {formik.touched.gender && formik.errors.gender && (
              <p className="mt-1 text-sm text-red-600">{formik.errors.gender}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Marital Status *
            </label>
            <select
              name="marital_status"
              value={formik.values.marital_status}
              onChange={formik.handleChange}
              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select</option>
              <option value="SINGLE">Single</option>
              <option value="MARRIED">Married</option>
              <option value="DIVORCED">Divorced</option>
              <option value="WIDOWED">Widowed</option>
            </select>
            {formik.touched.marital_status && formik.errors.marital_status && (
              <p className="mt-1 text-sm text-red-600">{formik.errors.marital_status}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nationality
            </label>
            <input
              type="text"
              name="nationality"
              value={formik.values.nationality}
              onChange={formik.handleChange}
              placeholder="e.g., Indian"
              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Address *
          </label>
          <textarea
            name="address"
            value={formik.values.address}
            onChange={formik.handleChange}
            rows={2}
            className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {formik.touched.address && formik.errors.address && (
            <p className="mt-1 text-sm text-red-600">{formik.errors.address}</p>
          )}
        </div>
      </div>

      {/* Employment Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
          Employment Details
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {!isEditMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role *
              </label>
              <select
                name="role"
                value={formik.values.role}
                onChange={formik.handleChange}
                className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="EMPLOYEE">Employee</option>
                <option value="MANAGER">Manager</option>
                <option value="HR">HR</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Employee ID *
            </label>
            <input
              type="text"
              name="employee_id"
              value={formik.values.employee_id}
              onChange={formik.handleChange}
              placeholder="e.g., EMP001"
              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {formik.touched.employee_id && formik.errors.employee_id && (
              <p className="mt-1 text-sm text-red-600">{formik.errors.employee_id}</p>
            )}
          </div>

          {isEditMode && <div></div>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Department *
            </label>
            <select
              name="department_id"
              value={formik.values.department_id}
              onChange={formik.handleChange}
              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            {formik.touched.department_id && formik.errors.department_id && (
              <p className="mt-1 text-sm text-red-600">{formik.errors.department_id}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Designation *
            </label>
            <select
              name="designation_id"
              value={formik.values.designation_id}
              onChange={formik.handleChange}
              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select Designation</option>
              {designations.map((des) => (
                <option key={des.id} value={des.id}>
                  {des.name}
                </option>
              ))}
            </select>
            {formik.touched.designation_id && formik.errors.designation_id && (
              <p className="mt-1 text-sm text-red-600">{formik.errors.designation_id}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Reports To (Manager)
            </label>
            <select
              name="reports_to"
              value={formik.values.reports_to}
              onChange={formik.handleChange}
              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">No Manager</option>
              {managers.filter(m => m.id !== editEmployee?.id).map((mgr) => (
                <option key={mgr.id} value={mgr.employee_uuid || mgr.id}>
                  {mgr.first_name} {mgr.last_name} ({mgr.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Join Date *
            </label>
            <DatePicker
              value={formik.values.join_date}
              onChange={(date) => formik.setFieldValue('join_date', date)}
              placeholder="Select join date"
              minDate={minJoinDate}
            />
            {formik.touched.join_date && formik.errors.join_date && (
              <p className="mt-1 text-sm text-red-600">{formik.errors.join_date}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Employment Type
            </label>
            <select
              name="employment_type"
              value={formik.values.employment_type}
              onChange={formik.handleChange}
              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="FULL_TIME">Full-time</option>
              <option value="PART_TIME">Part-time</option>
              <option value="CONTRACT">Contract</option>
              <option value="INTERN">Intern</option>
              <option value="TEMP">Temporary</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Shift
            </label>
            <select
              name="shift"
              value={formik.values.shift}
              onChange={formik.handleChange}
              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="REGULAR">Regular (9-6)</option>
              <option value="MORNING">Morning</option>
              <option value="EVENING">Evening</option>
              <option value="NIGHT">Night</option>
              <option value="FLEXIBLE">Flexible</option>
            </select>
          </div>
        </div>
      </div>

      {/* Financial Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
          Financial Details
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Bank Name *
            </label>
            <input
              type="text"
              name="bank_name"
              value={formik.values.bank_name}
              onChange={formik.handleChange}
              placeholder="e.g., HDFC Bank"
              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {formik.touched.bank_name && formik.errors.bank_name && (
              <p className="mt-1 text-sm text-red-600">{formik.errors.bank_name}</p>
            )}
          </div>

        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Account Name *
            </label>
            <input
              type="text"
              name="account_name"
              value={formik.values.account_name}
              onChange={formik.handleChange}
              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {formik.touched.account_name && formik.errors.account_name && (
              <p className="mt-1 text-sm text-red-600">{formik.errors.account_name}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Account Number *
            </label>
            <input
              type="text"
              name="account_number"
              value={formik.values.account_number}
              onChange={formik.handleChange}
              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {formik.touched.account_number && formik.errors.account_number && (
              <p className="mt-1 text-sm text-red-600">{formik.errors.account_number}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              IFSC Code *
            </label>
            <input
              type="text"
              name="ifsc_code"
              value={formik.values.ifsc_code}
              onChange={formik.handleChange}
              placeholder="e.g., HDFC0001234"
              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {formik.touched.ifsc_code && formik.errors.ifsc_code && (
              <p className="mt-1 text-sm text-red-600">{formik.errors.ifsc_code}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tax ID (PAN) *
            </label>
            <input
              type="text"
              name="tax_id"
              value={formik.values.tax_id}
              onChange={formik.handleChange}
              placeholder="e.g., ABCDE1234F"
              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {formik.touched.tax_id && formik.errors.tax_id && (
              <p className="mt-1 text-sm text-red-600">{formik.errors.tax_id}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              UAN
            </label>
            <input
              type="text"
              name="uan"
              value={formik.values.uan}
              onChange={formik.handleChange}
              placeholder="12-digit UAN"
              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              PF A/C Number
            </label>
            <input
              type="text"
              name="pf_account"
              value={formik.values.pf_account}
              onChange={formik.handleChange}
              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              ESI Number
            </label>
            <input
              type="text"
              name="esi_number"
              value={formik.values.esi_number}
              onChange={formik.handleChange}
              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Annual CTC (INR) *
          </label>
          <input
            type="number"
            name="ctc"
            value={formik.values.ctc}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="e.g. 600000"
            className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="mt-1 text-xs text-gray-500">Enter the total annual package amount.</p>
          {formik.touched.ctc && formik.errors.ctc && (
            <p className="mt-1 text-sm text-red-600">{(formik.errors as any).ctc}</p>
          )}
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
          Emergency Contact
        </h3>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Contact Name *
            </label>
            <input
              type="text"
              name="emergency_name"
              value={formik.values.emergency_name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              onInput={handleInput}
              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {formik.touched.emergency_name && formik.errors.emergency_name && (
              <p className="mt-1 text-sm text-red-600">{formik.errors.emergency_name}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Contact Phone *
            </label>
            <input
              type="tel"
              name="emergency_phone"
              value={formik.values.emergency_phone}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              onInput={handleInput}
              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {formik.touched.emergency_phone && formik.errors.emergency_phone && (
              <p className="mt-1 text-sm text-red-600">{formik.errors.emergency_phone}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Relationship *
            </label>
            <select
              name="emergency_relation"
              value={formik.values.emergency_relation}
              onChange={formik.handleChange}
              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select</option>
              <option value="SPOUSE">Spouse</option>
              <option value="PARENT">Parent</option>
              <option value="SIBLING">Sibling</option>
              <option value="CHILD">Child</option>
              <option value="FRIEND">Friend</option>
              <option value="OTHER">Other</option>
            </select>
            {formik.touched.emergency_relation && formik.errors.emergency_relation && (
              <p className="mt-1 text-sm text-red-600">{formik.errors.emergency_relation}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (asPage) {
    return (
      <form onSubmit={formik.handleSubmit} className="space-y-4">
        {formFields}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500">
            {hasValidationErrors && (
              <span className="text-amber-600 dark:text-amber-400">
                ⚠ Fix validation errors before submitting
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => window.history.back()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isLoading}
              disabled={isLoading}
            >
              {isEditMode ? 'Update Employee' : 'Create Employee'}
            </Button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditMode ? 'Edit Employee' : 'Add New Employee'}
      className="max-w-3xl max-h-[90vh] overflow-y-auto"
    >
      <form onSubmit={formik.handleSubmit}>
        {formFields}
        <div className="flex items-center justify-between gap-3 pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500">
            {hasValidationErrors && (
              <span className="text-amber-600 dark:text-amber-400">
                ⚠ Fix validation errors before submitting
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isLoading}
              disabled={isLoading}
            >
              {isEditMode ? 'Update Employee' : 'Create Employee'}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
};

export default CreateEmployeeForm;
