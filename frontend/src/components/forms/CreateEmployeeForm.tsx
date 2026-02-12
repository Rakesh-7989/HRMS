import React, { useEffect, useMemo, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { Select } from '@/components/ui/Select';
import { usersService, CreateUserData, UpdateEmployeeData, User } from '@/services/users.service';
import { getShifts } from '@/services/shift.service';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { departmentService } from '@/services/department.service';
import { designationService } from '@/services/designation.service';
import { AlertCircle, Briefcase, Building2, Phone, User as UserIcon, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { tenantService } from '@/services/tenant.service';
import { useAuth } from '@/contexts/AuthContext';
import { useFormGuard } from '@/hooks/useFormGuard';
import { ValidationAlert } from '@/components/ui/ValidationAlert';
import { FormError } from '@/components/ui/FormError';
import { Input } from '@/components/ui/Input';
import { showToast } from '@/utils/toast';

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
  employee_id: Yup.string(),
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
  job_location: Yup.string().nullable(),
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
    .required('IFSC code is required'),

  tax_id: Yup.string()
    .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN Card format')
    .required('Tax ID is required'),
  aadhar_number: Yup.string()
    .matches(/^[0-9]{12}$/, 'Aadhaar number must be exactly 12 digits')
    .required('Aadhaar number is required'),
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
  // ... rest of schema
  // Adding hook for settings
  // note: multi_replace limitation: cannot insert hook easily without full context.
  // I will target the component body start.
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
    .required('IFSC code is required'),

  tax_id: Yup.string()
    .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN Card format')
    .required('Tax ID is required'),

  ctc: Yup.number()
    .transform((value) => (isNaN(value) ? undefined : value))
    .min(0, 'CTC cannot be negative'),
});

export const CreateEmployeeForm = ({
  open,
  onOpenChange,
  asPage = false,
  editEmployee = null,
  onSuccess,
}: CreateEmployeeFormProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isEditMode = !!editEmployee;

  const [error, setError] = React.useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdEmployeeName, setCreatedEmployeeName] = useState('');
  const [prefixInput, setPrefixInput] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

  // Step configuration
  const STEPS = [
    { id: 1, title: 'Basic Info', icon: UserIcon, description: 'Personal details' },
    { id: 2, title: 'Employment', icon: Briefcase, description: 'Job information' },
    { id: 3, title: 'Financial', icon: Building2, description: 'Bank & salary' },
    { id: 4, title: 'Emergency', icon: Phone, description: 'Emergency contact' },
  ];





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

  // Fetch shifts
  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => getShifts(),
  });

  // Fetch employee ID settings
  const { data: idSettings } = useQuery({
    queryKey: ['employee-id-settings'],
    queryFn: () => tenantService.getEmployeeIdSettings(),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateUserData) => usersService.createUser(data),
    onSuccess: () => {
      // Invalidate both employees and new-joiners so lists refetch and show the newly created employee
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['new-joiners'] });
      queryClient.invalidateQueries({ queryKey: ['employee-id-settings'] });
      const employeeName = `${formik.values.first_name} ${formik.values.last_name}`;
      formik.resetForm();
      onOpenChange(false);
      setCreatedEmployeeName(employeeName);
      toast.success('Employee created successfully!');
      setShowSuccessModal(true);
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

      showToast.error(err.message);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: UpdateEmployeeData) => usersService.updateEmployee(editEmployee!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee', editEmployee?.id] });
      onOpenChange(false);
      setCreatedEmployeeName(`${formik.values.first_name} ${formik.values.last_name}`);
      toast.success('Employee profile updated!');
      setShowSuccessModal(true);
    },
    onError: (err: Error) => {
      setError(err.message);
      if (err.message.toLowerCase().includes('employee id')) {
        formik.setFieldError('employee_id', err.message);
        formik.setFieldTouched('employee_id', true, false);
      }
      showToast.error(err.message);
    },
  });

  const handleSetPrefix = async () => {
    try {
      if (!prefixInput || prefixInput.length < 2) return;
      await tenantService.setEmployeeIdPrefix(prefixInput);
      setPrefixInput('');
      toast.success('Employee ID prefix configured successfully');
      queryClient.invalidateQueries({ queryKey: ['employee-id-settings'] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const toggleModeMutation = useMutation({
    mutationFn: (usePrefix: boolean) => tenantService.toggleEmployeeIdMode(usePrefix),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['employee-id-settings'] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
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
      shift: editEmployee?.shift || '',
      shift_id: editEmployee?.shift_id || '',
      address: editEmployee?.address || '',
      bank_name: editEmployee?.bank_name || '',
      branch_name: editEmployee?.branch_name || '',
      account_name: editEmployee?.account_name || '',
      account_number: editEmployee?.account_number || '',
      ifsc_code: editEmployee?.ifsc_code || '',
      job_location: editEmployee?.job_location || '',
      tax_id: editEmployee?.tax_id || '',
      uan: editEmployee?.uan || '',
      pf_account: editEmployee?.pf_account || '',
      esi_number: editEmployee?.esi_number || '',
      aadhar_number: editEmployee?.aadhar_number || '',
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
          showToast.error('Please fix all validation errors before submitting');
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

  // --- Navigation Guard ---
  const blocker = useFormGuard(formik.dirty);




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

  // Auto-fetch Bank Details from IFSC
  useEffect(() => {
    const fetchBankDetails = async () => {
      const ifsc = formik.values.ifsc_code;
      if (ifsc && ifsc.length === 11) {
        try {
          const response = await fetch(`https://ifsc.razorpay.com/${ifsc}`);
          if (response.ok) {
            const data = await response.json();
            formik.setFieldValue('bank_name', data.BANK);
            formik.setFieldValue('branch_name', data.BRANCH);
            toast.success(`Bank details fetched: ${data.BANK}`);
          }
        } catch (err) {
          // Silent fail or optional toast
          console.error("Failed to fetch bank details", err);
        }
      }
    };

    const timeoutId = setTimeout(() => {
      fetchBankDetails();
    }, 500); // Debounce slightly to avoid rapid calls while typing last char

    return () => clearTimeout(timeoutId);
  }, [formik.values.ifsc_code]);

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
    } else if (name === 'phone' || name === 'emergency_phone' || name === 'account_number' || name === 'uan' || name === 'aadhar_number') {
      target.value = target.value.replace(/[^0-9]/g, '');
    } else if (name === 'ifsc_code' || name === 'tax_id') {
      target.value = target.value.toUpperCase();
    }
  };

  const handleNext = async () => {
    let fieldsToValidate: string[] = [];
    switch (currentStep) {
      case 1:
        fieldsToValidate = ['email', 'first_name', 'last_name', 'phone', 'date_of_birth', 'gender', 'marital_status', 'address', 'nationality'];
        break;
      case 2:
        fieldsToValidate = ['role', 'employee_id', 'department_id', 'designation_id', 'join_date'];
        break;
      case 3:
        fieldsToValidate = ['bank_name', 'account_name', 'account_number', 'ifsc_code', 'tax_id', 'ctc'];
        break;
      case 4:
        fieldsToValidate = ['emergency_name', 'emergency_phone', 'emergency_relation'];
        break;
    }

    const touched = fieldsToValidate.reduce((acc, field) => ({ ...acc, [field]: true }), {});
    await formik.setTouched({ ...formik.touched, ...touched });

    const errors = await formik.validateForm();
    // Check if any of the current step fields have errors
    const stepErrors = fieldsToValidate.filter(field => errors[field as keyof typeof errors]);

    if (stepErrors.length === 0) {
      setSlideDirection('right');
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentStep(prev => Math.min(prev + 1, 4));
        setIsTransitioning(false);
      }, 250);
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      toast.error(`Please fix ${stepErrors.length} error(s) before proceeding`);
    }
  };

  const formFields = (
    <div className="flex flex-col h-full space-y-3">
      {/* Progress Indicator */}
      <div className="mb-2 px-4">
        <div className="flex items-center justify-between relative">
          {/* Connecting Line - Background */}
          <div className="absolute left-[5%] right-[5%] top-5 h-[3px] bg-gray-200 dark:bg-gray-700 rounded-full" style={{ zIndex: 0 }} />

          {/* Connecting Line - Animated Progress */}
          <div
            className="absolute left-[5%] top-5 h-[3px] rounded-full"
            style={{
              zIndex: 1,
              width: `${((currentStep - 1) / 3) * 90}%`,
              background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa)',
              transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 0 8px rgba(99, 102, 241, 0.4)',
            }}
          />

          {STEPS.map((step) => {
            const StepIcon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;

            return (
              <div key={step.id} className="flex flex-col items-center" style={{ zIndex: 2 }}>
                {/* Step Circle */}
                <div className="relative">
                  {/* Pulse ring for active step */}
                  {isActive && (
                    <div className="absolute inset-0 w-10 h-10 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
                  )}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${isActive
                      ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30 scale-110'
                      : isCompleted
                        ? 'bg-gradient-to-br from-indigo-500 to-violet-600 border-transparent text-white shadow-md'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400'
                      }`}
                    style={{
                      transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    {isCompleted ? <Check className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                  </div>
                </div>
                <div className="flex flex-col items-center mt-2">
                  <span
                    className={`text-xs font-bold whitespace-nowrap ${isActive
                      ? 'text-primary'
                      : isCompleted
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-400 dark:text-gray-500'
                      }`}
                    style={{
                      transition: 'color 0.4s ease',
                    }}
                  >
                    {step.title}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* API Error Alert */}
      <ValidationAlert message={error} type="error" className="mb-4" />

      {/* Validation Errors Summary (Only for current step) */}
      {validationErrors && validationErrors.length > 0 && (
        <ValidationAlert
          type="warning"
          className="mb-4"
          message={
            <div className="flex-1">
              <p className="text-sm font-medium mb-2">
                Please fix the following validation errors:
              </p>
              <ul className="list-disc list-inside text-xs space-y-1">
                {validationErrors.slice(0, 5).map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
                {validationErrors.length > 5 && (
                  <li className="font-medium">...and {validationErrors.length - 5} more errors</li>
                )}
              </ul>
            </div>
          }
        />
      )}

      {/* Step 1: Basic Information */}
      <div
        className={currentStep === 1 ? 'block flex-1 overflow-y-auto px-5 py-2' : 'hidden'}
        style={{
          animation: currentStep === 1 && !isTransitioning ? `stepSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards` : undefined,
          opacity: isTransitioning && currentStep === 1 ? 0 : 1,
          transform: isTransitioning && currentStep === 1 ? `translateX(${slideDirection === 'right' ? '-30px' : '30px'})` : undefined,
          transition: isTransitioning ? 'opacity 0.25s ease, transform 0.25s ease' : undefined,
        }}
      >
        <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3 mb-5 flex items-center gap-3">
          <UserIcon className="w-4 h-4 text-primary" /> Basic Information
        </h3>



        {!isEditMode && (
          <div className="mb-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
              Email *
            </label>
            <Input
              type="email"
              name="email"
              value={formik.values.email}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm"
              error={formik.touched.email && Boolean(formik.errors.email)}
              placeholder="employee@company.com"
            />
            <FormError message={formik.touched.email ? formik.errors.email : undefined} />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
              First Name *
            </label>
            <Input
              type="text"
              name="first_name"
              value={formik.values.first_name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              onInput={handleInput}
              placeholder="John"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm"
              error={formik.touched.first_name && Boolean(formik.errors.first_name)}
            />
            <FormError message={formik.touched.first_name ? formik.errors.first_name : undefined} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
              Last Name *
            </label>
            <Input
              type="text"
              name="last_name"
              value={formik.values.last_name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              onInput={handleInput}
              placeholder="Doe"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm"
              error={formik.touched.last_name && Boolean(formik.errors.last_name)}
            />
            <FormError message={formik.touched.last_name ? formik.errors.last_name : undefined} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
              Phone *
            </label>
            <Input
              type="tel"
              name="phone"
              value={formik.values.phone}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              onInput={handleInput}
              error={formik.touched.phone && Boolean(formik.errors.phone)}
              placeholder="+91 9876543210"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm"
            />
            <FormError message={formik.touched.phone ? formik.errors.phone : undefined} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
              Date of Birth
            </label>
            <DatePicker
              value={formik.values.date_of_birth}
              onChange={(date) => formik.setFieldValue('date_of_birth', date)}
              placeholder="e.g. 1995-05-20"
              maxDate={maxDob}
            />
            {formik.touched.date_of_birth && formik.errors.date_of_birth && (
              <p className="mt-1 text-sm text-red-600">{formik.errors.date_of_birth as string}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
              Gender *
            </label>
            <Select
              name="gender"
              value={formik.values.gender}
              onChange={formik.handleChange}
              placeholder="Select Gender"
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </Select>
            {formik.touched.gender && formik.errors.gender && (
              <p className="mt-1 text-sm text-red-600">{formik.errors.gender}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
              Marital Status *
            </label>
            <Select
              name="marital_status"
              value={formik.values.marital_status}
              onChange={formik.handleChange}
              placeholder="Select Status"
            >
              <option value="SINGLE">Single</option>
              <option value="MARRIED">Married</option>
              <option value="DIVORCED">Divorced</option>
              <option value="WIDOWED">Widowed</option>
            </Select>
            {formik.touched.marital_status && formik.errors.marital_status && (
              <p className="mt-1 text-sm text-red-600">{formik.errors.marital_status}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
              Nationality
            </label>
            <input
              type="text"
              name="nationality"
              value={formik.values.nationality}
              onChange={formik.handleChange}
              placeholder="Indian"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
            Address *
          </label>
          <textarea
            name="address"
            value={formik.values.address}
            onChange={formik.handleChange}
            rows={1}
            placeholder="123 Main Street, City, State, PIN"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm"
          />
          <FormError message={formik.touched.address ? formik.errors.address : undefined} />
        </div>
      </div>

      {/* Step 2: Employment Details */}
      <div
        className={currentStep === 2 ? 'block flex-1 overflow-y-auto px-5 py-2' : 'hidden'}
        style={{
          animation: currentStep === 2 && !isTransitioning ? `stepSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards` : undefined,
          opacity: isTransitioning && currentStep === 2 ? 0 : 1,
          transform: isTransitioning && currentStep === 2 ? `translateX(${slideDirection === 'right' ? '-30px' : '30px'})` : undefined,
          transition: isTransitioning ? 'opacity 0.25s ease, transform 0.25s ease' : undefined,
        }}
      >
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-1.5 mb-2 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-primary" /> Employment Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {!isEditMode && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                  Role *
                </label>
                <Select
                  name="role"
                  value={formik.values.role}
                  onChange={formik.handleChange}
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="MANAGER">Manager</option>
                  <option value="HR">HR</option>
                  <option value="ADMIN">Admin</option>
                </Select>
              </div>
            )}

            <div>
              {isEditMode ? (
                /* Edit mode: simple editable employee ID field */
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                    Employee ID *
                  </label>
                  <input
                    type="text"
                    name="employee_id"
                    value={formik.values.employee_id}
                    onChange={formik.handleChange}
                    placeholder="Employee ID"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm"
                  />
                  {formik.touched.employee_id && formik.errors.employee_id && (
                    <p className="mt-1 text-sm text-red-600">{formik.errors.employee_id}</p>
                  )}
                </div>
              ) : (
                /* Create mode: toggle between auto-prefix and manual */
                <div>
                  {/* Label row with inline toggle */}
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      Employee ID {!(idSettings?.usePrefix ?? true) && <span className="text-red-500">*</span>}
                      {(idSettings?.usePrefix ?? true) && idSettings?.isConfigured && (
                        <span className="text-xs font-normal text-gray-500 ml-1">(Auto)</span>
                      )}
                    </label>
                    {['ADMIN', 'HR', 'SUPER_ADMIN'].includes(user?.role || '') && (
                      <button
                        type="button"
                        role="switch"
                        title={`${(idSettings?.usePrefix ?? true) ? 'Switch to manual entry' : 'Switch to auto-generate'}`}
                        aria-checked={idSettings?.usePrefix ?? true}
                        onClick={() => toggleModeMutation.mutate(!(idSettings?.usePrefix ?? true))}
                        disabled={toggleModeMutation.isPending}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 flex-shrink-0 ${(idSettings?.usePrefix ?? true)
                          ? 'bg-primary'
                          : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${(idSettings?.usePrefix ?? true) ? 'translate-x-[18px]' : 'translate-x-[3px]'
                            }`}
                        />
                      </button>
                    )}
                  </div>

                  {/* Input area */}
                  {(idSettings?.usePrefix ?? true) ? (
                    idSettings && !idSettings.isConfigured ? (
                      /* Prefix not yet set - show setup */
                      ['ADMIN', 'HR', 'SUPER_ADMIN'].includes(user?.role || '') ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={prefixInput}
                            onChange={(e) => setPrefixInput(e.target.value.toUpperCase())}
                            placeholder="e.g. EMP"
                            maxLength={5}
                            className="w-full px-4 py-2.5 rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all duration-200 shadow-sm"
                          />
                          <Button
                            type="button"
                            onClick={handleSetPrefix}
                            disabled={!prefixInput || prefixInput.length < 2}
                            className="bg-amber-600 hover:bg-amber-700 text-white whitespace-nowrap text-xs px-3 py-2.5"
                          >
                            Save
                          </Button>
                        </div>
                      ) : (
                        <div className="p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400">
                          Prefix not configured. Contact admin.
                        </div>
                      )
                    ) : (
                      /* Prefix configured - show auto-generated preview */
                      <input
                        type="text"
                        value={idSettings?.nextId || 'Auto-generated'}
                        disabled
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white opacity-70 cursor-not-allowed shadow-sm"
                      />
                    )
                  ) : (
                    /* Manual mode */
                    <>
                      <input
                        type="text"
                        name="employee_id"
                        value={formik.values.employee_id}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        placeholder="Enter employee ID (e.g., EMP001)"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm"
                      />
                      {formik.touched.employee_id && formik.errors.employee_id && (
                        <p className="mt-1 text-sm text-red-600">{formik.errors.employee_id}</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {isEditMode && <div></div>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                Department *
              </label>
              <Select
                name="department_id"
                value={formik.values.department_id}
                onChange={formik.handleChange}
                placeholder="Select Department"
              >
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </Select>
              {formik.touched.department_id && formik.errors.department_id && (
                <p className="mt-1 text-sm text-red-600">{formik.errors.department_id}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                Designation *
              </label>
              <Select
                name="designation_id"
                value={formik.values.designation_id}
                onChange={formik.handleChange}
                placeholder="Select Designation"
              >
                {designations.map((des) => (
                  <option key={des.id} value={des.id}>
                    {des.name}
                  </option>
                ))}
              </Select>
              {formik.touched.designation_id && formik.errors.designation_id && (
                <p className="mt-1 text-sm text-red-600">{formik.errors.designation_id}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                Reports To (Manager)
              </label>
              <Select
                name="reports_to"
                value={formik.values.reports_to}
                onChange={formik.handleChange}
                placeholder="No Manager"
              >
                {managers.filter(m => m.id !== editEmployee?.id).map((mgr) => (
                  <option key={mgr.id} value={mgr.employee_uuid || mgr.id}>
                    {mgr.first_name} {mgr.last_name} ({mgr.role})
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                Employment Type
              </label>
              <Select
                name="employment_type"
                value={formik.values.employment_type}
                onChange={formik.handleChange}
              >
                <option value="FULL_TIME">Full-time</option>
                <option value="PART_TIME">Part-time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERN">Intern</option>
                <option value="TEMP">Temporary</option>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                Shift
              </label>
              <Select
                name="shift_id"
                value={formik.values.shift_id}
                onChange={(e) => {
                  formik.handleChange(e);
                  // Also set the shift name for legacy support if needed
                  const selectedShift = shifts.find((s: any) => s.id === e.target.value);
                  if (selectedShift) {
                    formik.setFieldValue('shift', selectedShift.name);
                  }
                }}
                placeholder="Select Shift"
              >
                {shifts.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.start_time.substring(0, 5)} - {s.end_time.substring(0, 5)})
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                Work Location
              </label>
              <input
                type="text"
                name="job_location"
                value={formik.values.job_location}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder="e.g. New York, Remote"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm"
              />
              {formik.touched.job_location && formik.errors.job_location && (
                <p className="mt-1 text-sm text-red-600">{formik.errors.job_location}</p>
              )}
            </div>
          </div>
        </div>

      </div>


      {/* Step 3: Financial Details */}
      <div
        className={currentStep === 3 ? 'block flex-1 overflow-y-auto px-5 py-2' : 'hidden'}
        style={{
          animation: currentStep === 3 && !isTransitioning ? `stepSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards` : undefined,
          opacity: isTransitioning && currentStep === 3 ? 0 : 1,
          transform: isTransitioning && currentStep === 3 ? `translateX(${slideDirection === 'right' ? '-30px' : '30px'})` : undefined,
          transition: isTransitioning ? 'opacity 0.25s ease, transform 0.25s ease' : undefined,
        }}
      >
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-1.5 mb-2 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" /> Financial Details
          </h3>

          {/* Row 1: Aadhaar Number | PAN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                Aadhaar Number *
              </label>
              <input
                type="text"
                name="aadhar_number"
                value={formik.values.aadhar_number}
                onChange={formik.handleChange}
                onInput={handleInput}
                maxLength={12}
                placeholder="123456789012"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm"
              />
              {formik.touched.aadhar_number && formik.errors.aadhar_number && (
                <p className="mt-1 text-sm text-red-600">{formik.errors.aadhar_number}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                Tax ID (PAN) *
              </label>
              <input
                type="text"
                name="tax_id"
                value={formik.values.tax_id}
                onChange={formik.handleChange}
                onInput={handleInput}
                maxLength={10}
                placeholder="ABCDE1234F"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm uppercase"
              />
              {formik.touched.tax_id && formik.errors.tax_id && (
                <p className="mt-1 text-sm text-red-600">{formik.errors.tax_id}</p>
              )}
            </div>
          </div>

          {/* Row 2: IFSC Code | Bank Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                IFSC Code *
              </label>
              <input
                type="text"
                name="ifsc_code"
                value={formik.values.ifsc_code}
                onChange={formik.handleChange}
                onInput={handleInput}
                maxLength={11}
                placeholder="HDFC0001234"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm uppercase"
              />
              {formik.touched.ifsc_code && formik.errors.ifsc_code && (
                <p className="mt-1 text-sm text-red-600">{formik.errors.ifsc_code}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                Bank Name *
              </label>
              <input
                type="text"
                name="bank_name"
                value={formik.values.bank_name}
                onChange={formik.handleChange}
                placeholder="e.g. State Bank of India"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm"
              />
              {formik.values.branch_name && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Branch: <span className="font-medium text-gray-700 dark:text-gray-300">{formik.values.branch_name}</span>
                </p>
              )}
              {formik.touched.bank_name && formik.errors.bank_name && (
                <p className="mt-1 text-sm text-red-600">{formik.errors.bank_name}</p>
              )}
            </div>
          </div>

          {/* Row 3: Account Name | Account Number */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                Account Name *
              </label>
              <input
                type="text"
                name="account_name"
                value={formik.values.account_name}
                onChange={formik.handleChange}
                placeholder="e.g. John Doe"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm"
              />
              {formik.touched.account_name && formik.errors.account_name && (
                <p className="mt-1 text-sm text-red-600">{formik.errors.account_name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                Account Number *
              </label>
              <input
                type="text"
                name="account_number"
                value={formik.values.account_number}
                onChange={formik.handleChange}
                onInput={handleInput}
                placeholder="1234567890123456"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm"
              />
              {formik.touched.account_number && formik.errors.account_number && (
                <p className="mt-1 text-sm text-red-600">{formik.errors.account_number}</p>
              )}
            </div>
          </div>

          {/* Row 4: UAN | PF A/C Number */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                UAN
              </label>
              <input
                type="text"
                name="uan"
                value={formik.values.uan}
                onChange={formik.handleChange}
                onInput={handleInput}
                placeholder="12-digit UAN"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm"
              />
              {formik.touched.uan && formik.errors.uan && (
                <p className="mt-1 text-sm text-red-600">{formik.errors.uan}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                PF A/C Number
              </label>
              <input
                type="text"
                name="pf_account"
                value={formik.values.pf_account}
                onChange={formik.handleChange}
                placeholder="MH/BOM/12345/000/1234567"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm"
              />
            </div>
          </div>

          {/* Row 5: ESI Number */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                ESI Number
              </label>
              <input
                type="text"
                name="esi_number"
                value={formik.values.esi_number}
                onChange={formik.handleChange}
                placeholder="31-00-123456-000-0001"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm"
              />
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
              Annual CTC (INR) *
            </label>
            <Input
              type="number"
              name="ctc"
              value={formik.values.ctc}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              placeholder="e.g., 600000"
              error={formik.touched.ctc && Boolean(formik.errors.ctc)}
            />
            <FormError message={formik.touched.ctc ? (formik.errors.ctc as string) : undefined} />
          </div>
        </div>
      </div>

      {/* Step 4: Emergency Contact */}
      <div
        className={currentStep === 4 ? 'block flex-1 overflow-y-auto px-5 py-2' : 'hidden'}
        style={{
          animation: currentStep === 4 && !isTransitioning ? `stepSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards` : undefined,
          opacity: isTransitioning && currentStep === 4 ? 0 : 1,
          transform: isTransitioning && currentStep === 4 ? `translateX(${slideDirection === 'right' ? '-30px' : '30px'})` : undefined,
          transition: isTransitioning ? 'opacity 0.25s ease, transform 0.25s ease' : undefined,
        }}
      >
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-1.5 mb-2 flex items-center gap-2">
            <Phone className="w-4 h-4 text-primary" /> Emergency Contact
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                Contact Name *
              </label>
              <input
                type="text"
                name="emergency_name"
                value={formik.values.emergency_name}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                onInput={handleInput}
                placeholder="e.g. Jane Doe"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm"
              />
              {formik.touched.emergency_name && formik.errors.emergency_name && (
                <p className="mt-1 text-sm text-red-600">{formik.errors.emergency_name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                Contact Phone *
              </label>
              <input
                type="tel"
                name="emergency_phone"
                value={formik.values.emergency_phone}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                onInput={handleInput}
                placeholder="+91 9876543210"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm"
              />
              {formik.touched.emergency_phone && formik.errors.emergency_phone && (
                <p className="mt-1 text-sm text-red-600">{formik.errors.emergency_phone}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                Relationship *
              </label>
              <Select
                name="emergency_relation"
                value={formik.values.emergency_relation}
                onChange={formik.handleChange}
                placeholder="Select Relation"
              >
                <option value="SPOUSE">Spouse</option>
                <option value="PARENT">Parent</option>
                <option value="SIBLING">Sibling</option>
                <option value="CHILD">Child</option>
                <option value="FRIEND">Friend</option>
                <option value="OTHER">Other</option>
              </Select>
              {formik.touched.emergency_relation && formik.errors.emergency_relation && (
                <p className="mt-1 text-sm text-red-600">{formik.errors.emergency_relation}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-6 pb-2 mt-8 border-t border-gray-100 dark:border-gray-800">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setSlideDirection('left');
            setIsTransitioning(true);
            setTimeout(() => {
              setCurrentStep(prev => Math.max(prev - 1, 1));
              setIsTransitioning(false);
            }, 250);
          }}
          disabled={currentStep === 1}
          className={`${currentStep === 1 ? 'invisible' : ''} h-11 px-6 text-base border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white transition-colors`}
        >
          <ChevronLeft className="w-4 h-4 mr-2" /> Previous
        </Button>

        {currentStep < 4 ? (
          <Button type="button" onClick={handleNext} className="h-11 px-8 text-base bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5">
            Next <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            type="submit"
            isLoading={isLoading}
            disabled={isLoading}
            className="h-11 px-8 text-base bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white shadow-lg shadow-green-500/25 transition-all hover:-translate-y-0.5"
          >
            {isEditMode ? 'Update Employee' : 'Create Employee'} <Check className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );

  const unsavedChangesDialog = (
    <Dialog open={blocker?.state === 'blocked'} onOpenChange={(open) => { if (!open) blocker?.reset?.(); }}>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4 text-amber-600">
          <AlertCircle className="w-6 h-6" />
          <h3 className="text-lg font-semibold">Unsaved Changes</h3>
        </div>

        <p className="text-gray-600 dark:text-gray-300 mb-6">
          You have unsaved changes in the form. Are you sure you want to leave? All progress will be lost.
        </p>

        <div className="flex gap-2 w-full">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => blocker?.reset?.()}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={() => {
              blocker?.proceed?.();
            }}
          >
            Discard Changes
          </Button>
        </div>
      </div>
    </Dialog>
  );


  return (
    <>
      {asPage ? (
        <form onSubmit={formik.handleSubmit} className="flex flex-col h-full">
          {formFields}
        </form>
      ) : (
        <Dialog
          open={open}
          onOpenChange={onOpenChange}
          title={isEditMode ? 'Edit Employee' : 'Add New Employee'}
          className="max-w-3xl max-h-[90vh] overflow-y-auto"
        >
          <form onSubmit={formik.handleSubmit}>
            {formFields}
          </form>
        </Dialog>
      )}

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          onSuccess?.();
        }}
        type="success"
        title={isEditMode ? 'Employee Updated!' : 'Welcome Aboard!'}
        message={isEditMode
          ? `${createdEmployeeName}'s profile has been updated successfully.`
          : `${createdEmployeeName} has been added to the team. Login credentials have been sent to their email.`
        }
        buttonText="Continue"
        onButtonClick={() => {
          setShowSuccessModal(false);
          onSuccess?.();
        }}
      />
      {unsavedChangesDialog}
    </>
  );
};
export default CreateEmployeeForm;
