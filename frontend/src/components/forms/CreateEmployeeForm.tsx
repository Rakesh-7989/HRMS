import React, { useEffect, useMemo, useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { Select } from '@/components/ui/Select';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { usersService, CreateUserData, UpdateEmployeeData, User } from '@/services/users.service';
import { getShifts } from '@/services/shift.service';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { departmentService } from '@/services/department.service';
import { designationService } from '@/services/designation.service';
import { AlertCircle, Briefcase, Building2, Phone, User as UserIcon, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { showToast } from '@/utils/toast';
import { SuccessModal } from '@/components/ui/SuccessModal';
import { tenantService } from '@/services/tenant.service';
import { useAuth } from '@/contexts/AuthContext';
import { useFormGuard } from '@/hooks/useFormGuard';
import { ValidationAlert } from '@/components/ui/ValidationAlert';
import { FormError } from '@/components/ui/FormError';
import { Input } from '@/components/ui/Input';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { useTimezones } from '@/utils/timezone';
import { permissionsService, TenantRole } from '@/services/permissions.service';
import { useTranslation } from 'react-i18next';

interface CreateEmployeeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asPage?: boolean;
  editEmployee?: User | null; // If provided, form is in edit mode
  onSuccess?: () => void;
}

type TranslateFn = (key: string, opts?: Record<string, unknown>) => string;

const makeCreateSchema = (t: TranslateFn) =>
  Yup.object({
  email: Yup.string().email(t('employees.validation.invalidEmail')).required(t('employees.validation.emailRequired')),
  first_name: Yup.string()
    .matches(/^[A-Za-z\s\-.]+$/, t('employees.validation.nameLettersOnly'))
    .required(t('employees.validation.firstNameRequired')),
  last_name: Yup.string()
    .matches(/^[A-Za-z\s\-.]+$/, t('employees.validation.nameLettersOnly'))
    .required(t('employees.validation.lastNameRequired')),
  role: Yup.string().required(t('employees.validation.roleRequired')),
  phone: Yup.string()
    .matches(/^[0-9+\s.]*$/, t('employees.validation.phoneFormat'))
    .min(5, t('employees.validation.tooShort'))
    .max(25, t('employees.validation.tooLong'))
    .required(t('employees.validation.phoneRequired')),
  department_id: Yup.string().required(t('employees.validation.departmentRequired')),
  designation_id: Yup.string().required(t('employees.validation.designationRequired')),
  employee_id: Yup.string(),
  date_of_birth: Yup.date()
    .required(t('employees.validation.dobRequired'))
    .max(new Date(), t('employees.validation.dobNotFuture'))
    .test('age', t('employees.validation.ageMin18'), function (value) {
      if (!value) return true;
      const today = new Date();
      const minBirthDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
      return new Date(value) <= minBirthDate;
    }),
  join_date: Yup.date()
    .required(t('employees.validation.joinDateRequired'))
    .test('is-after-dob', t('employees.validation.joinAfterDob'), function (value) {
      const { date_of_birth } = this.parent;
      if (!date_of_birth || !value) return true;
      const dob = new Date(date_of_birth);
      const minJoinDate = new Date(dob.getFullYear() + 18, dob.getMonth(), dob.getDate());
      return new Date(value) >= minJoinDate;
    }),
  gender: Yup.string().required(t('employees.validation.genderRequired')),
  marital_status: Yup.string().required(t('employees.validation.maritalStatusRequired')),
  address: Yup.string().required(t('employees.validation.addressRequired')),
  job_location: Yup.string().nullable(),
  bank_name: Yup.string()
    .matches(/^[A-Za-z\s\-.&]+$/, t('employees.validation.bankNameLetters'))
    .required(t('employees.validation.bankNameRequired')),
  account_name: Yup.string()
    .matches(/^[A-Za-z\s\-.]+$/, t('employees.validation.accountNameLetters'))
    .required(t('employees.validation.accountNameRequired')),
  account_number: Yup.string()
    .test('digits-only', t('employees.validation.accountDigits'), function (value) {
      if (!value) return true;
      return /^[0-9]*$/.test(value);
    })
    .test('valid-length', t('employees.validation.accountLength'), function (value) {
      if (!value) return true;
      return value.length >= 9 && value.length <= 18;
    })
    .required(t('employees.validation.accountRequired')),
  ifsc_code: Yup.string()
    .required(t('employees.validation.ifscRequired')),

  tax_id: Yup.string()
    .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, t('employees.validation.panFormat'))
    .required(t('employees.validation.taxIdRequired')),
  aadhar_number: Yup.string()
    .matches(/^[0-9]{12}$/, t('employees.validation.aadharDigits'))
    .required(t('employees.validation.aadharRequired')),
  annual_salary: Yup.number()
    .positive(t('employees.validation.salaryPositive'))
    .nullable(),
  emergency_name: Yup.string()
    .matches(/^[A-Za-z\s\-.]+$/, t('employees.validation.nameLettersOnly'))
    .required(t('employees.validation.emergencyNameRequired')),
  emergency_phone: Yup.string()
    .matches(/^[0-9+\s.]*$/, t('employees.validation.phoneFormat'))
    .min(5, t('employees.validation.tooShort'))
    .max(25, t('employees.validation.tooLong'))
    .notOneOf([Yup.ref('phone'), null], t('employees.validation.emergencyPhoneSame'))
    .required(t('employees.validation.emergencyPhoneRequired')),
  emergency_relation: Yup.string().required(t('employees.validation.emergencyRelationRequired')),
  ctc: Yup.number()
    .transform((value) => (isNaN(value) ? undefined : value))
    .min(0, t('employees.validation.ctcNegative'))
    .required(t('employees.validation.ctcRequired')),
});

const makeEditSchema = (t: TranslateFn) =>
  Yup.object({
  employee_id: Yup.string(),
  role: Yup.string(),
  first_name: Yup.string()
    .matches(/^[A-Za-z\s\-.]+$/, t('employees.validation.nameLettersOnly'))
    .required(t('employees.validation.firstNameRequired')),
  last_name: Yup.string()
    .matches(/^[A-Za-z\s\-.]+$/, t('employees.validation.nameLettersOnly'))
    .required(t('employees.validation.lastNameRequired')),
  date_of_birth: Yup.date()
    .required(t('employees.validation.dobRequired'))
    .max(new Date(), t('employees.validation.dobNotFuture'))
    .test('age', t('employees.validation.ageMin18'), function (value) {
      if (!value) return true;
      const today = new Date();
      const minBirthDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
      return new Date(value) <= minBirthDate;
    }),
  join_date: Yup.date()
    .required(t('employees.validation.joinDateRequired'))
    .test('is-after-dob', t('employees.validation.joinAfterDob'), function (value) {
      const { date_of_birth } = this.parent;
      if (!date_of_birth || !value) return true;
      const dob = new Date(date_of_birth);
      const minJoinDate = new Date(dob.getFullYear() + 18, dob.getMonth(), dob.getDate());
      return new Date(value) >= minJoinDate;
    }),
  phone: Yup.string()
    .matches(/^[0-9+\s.]*$/, t('employees.validation.phoneFormat'))
    .min(5, t('employees.validation.tooShort'))
    .max(25, t('employees.validation.tooLong'))
    .required(t('employees.validation.phoneRequired')),
  gender: Yup.string().required(t('employees.validation.genderRequired')),
  marital_status: Yup.string().required(t('employees.validation.maritalStatusRequired')),
  address: Yup.string().required(t('employees.validation.addressRequired')),
  bank_name: Yup.string()
    .matches(/^[A-Za-z\s\-.&]+$/, t('employees.validation.bankNameLetters'))
    .required(t('employees.validation.bankNameRequired')),
  account_name: Yup.string()
    .matches(/^[A-Za-z\s\-.]+$/, t('employees.validation.accountNameLetters'))
    .required(t('employees.validation.accountNameRequired')),
  account_number: Yup.string()
    .test('digits-only', t('employees.validation.accountDigits'), function (value) {
      if (!value) return true;
      return /^[0-9]*$/.test(value);
    })
    .test('valid-length', t('employees.validation.accountLength'), function (value) {
      if (!value) return true;
      return value.length >= 9 && value.length <= 18;
    })
    .required(t('employees.validation.accountRequired')),
  ifsc_code: Yup.string()
    .required(t('employees.validation.ifscRequired')),

  tax_id: Yup.string()
    .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, t('employees.validation.panFormat'))
    .required(t('employees.validation.taxIdRequired')),
  emergency_name: Yup.string()
    .matches(/^[A-Za-z\s\-.]+$/, t('employees.validation.nameLettersOnly'))
    .required(t('employees.validation.emergencyNameRequired')),
  emergency_phone: Yup.string()
    .matches(/^[0-9+\s.]*$/, t('employees.validation.phoneFormat'))
    .min(5, t('employees.validation.tooShort'))
    .max(25, t('employees.validation.tooLong'))
    .notOneOf([Yup.ref('phone'), null], t('employees.validation.emergencyPhoneSame'))
    .required(t('employees.validation.emergencyPhoneRequired')),
  emergency_relation: Yup.string().required(t('employees.validation.emergencyRelationRequired')),

  ctc: Yup.number()
    .transform((value) => (isNaN(value) ? undefined : value))
    .min(0, t('employees.validation.ctcNegative')),
});

export const CreateEmployeeForm: React.FC<CreateEmployeeFormProps> = ({
  open,
  onOpenChange,
  asPage = false,
  editEmployee = null,
  onSuccess,
}: CreateEmployeeFormProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { timezones } = useTimezones();
  const isEditMode = !!editEmployee;
  const { t } = useTranslation();

  const validationSchema = useMemo(
    () => (isEditMode ? makeEditSchema(t) : makeCreateSchema(t)),
    [isEditMode, t]
  );

  const [error, setError] = React.useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdEmployeeName, setCreatedEmployeeName] = useState('');
  const [prefixInput, setPrefixInput] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');

  // Step configuration
  const STEPS = [
    { id: 1, title: t('employees.form.stepBasicInfo'), icon: UserIcon, description: t('employees.form.stepBasicInfoDesc') },
    { id: 2, title: t('employees.form.stepEmployment'), icon: Briefcase, description: t('employees.form.stepEmploymentDesc') },
    { id: 3, title: t('employees.form.stepFinancial'), icon: Building2, description: t('employees.form.stepFinancialDesc') },
    { id: 4, title: t('employees.form.stepEmergency'), icon: Phone, description: t('employees.form.stepEmergencyDesc') },
  ];

  // Real-time uniqueness check on blur
  const [uniqueErrors, setUniqueErrors] = useState<Record<string, string | null>>({});
  const checkUnique = async (fieldName: string, value: string) => {
    if (!value || !value.trim()) {
      setUniqueErrors(prev => ({ ...prev, [fieldName]: null }));
      return;
    }
    try {
      const result = await usersService.checkFieldUniqueness(
        fieldName, value.trim(), isEditMode ? editEmployee?.id : undefined
      );
      if (result.exists) {
        const label = result.label || fieldName.replace(/_/g, ' ');
        const msg = t('employees.form.fieldAssigned', { label, value: value.trim() });
        setUniqueErrors(prev => ({ ...prev, [fieldName]: msg }));
        formik.setFieldError(fieldName, msg);
      } else {
        setUniqueErrors(prev => ({ ...prev, [fieldName]: null }));
      }
    } catch {
      // Silently fail — submission will still catch duplicates
    }
  };




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

  // Fetch tenant roles (system + custom)
  const { data: tenantRoles = [] } = useQuery<TenantRole[]>({
    queryKey: ['tenant-roles'],
    queryFn: () => permissionsService.getTenantRoles(),
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
      setCreatedEmployeeName(employeeName);
      showToast.success(t('employees.form.createdSuccess'));
      setShowSuccessModal(true);
    },
    onError: (err: Error) => {
      setError(err.message);

      // Map specific server errors to Formik fields and mark as touched to show under the input
      // if (err.message.toLowerCase().includes('employee id')) {
      //   formik.setFieldError('employee_id', err.message);
      //   formik.setFieldTouched('employee_id', true, false);
      // }
      // if (err.message.toLowerCase().includes('email')) {
      //   formik.setFieldError('email', err.message);
      //   formik.setFieldTouched('email', true, false);
      // }

      // showToast.error(err.message);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: UpdateEmployeeData) => usersService.updateEmployee(editEmployee!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee', editEmployee?.id] });
      formik.resetForm(); // Clear dirty state
      setCreatedEmployeeName(`${formik.values.first_name} ${formik.values.last_name}`);
      showToast.success(t('employees.form.updatedSuccess'));
      setShowSuccessModal(true);
    },
    onError: (err: Error) => {
      setError(err.message);
      // if (err.message.toLowerCase().includes('employee id')) {
      //   formik.setFieldError('employee_id', err.message);
      //   formik.setFieldTouched('employee_id', true, false);
      // }
      // showToast.error(err.message);
    },
  });

  const handleSetPrefix = async () => {
    try {
      if (!prefixInput || prefixInput.length < 2) return;
      await tenantService.setEmployeeIdPrefix(prefixInput);
      setPrefixInput('');
      showToast.success(t('employees.form.prefixConfigured'));
      queryClient.invalidateQueries({ queryKey: ['employee-id-settings'] });
    } catch (err: unknown) {
      showToast.error((err as { message?: string }).message || 'Failed');
    }
  };

  const toggleModeMutation = useMutation({
    mutationFn: (usePrefix: boolean) => tenantService.toggleEmployeeIdMode(usePrefix),
    onSuccess: (data) => {
      showToast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['employee-id-settings'] });
    },
    onError: (err: Error) => {
      showToast.error(err.message);
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
      employee_id: editEmployee?.employee_id || (!isEditMode ? (idSettings?.nextId || '') : ''),
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
      timezone: editEmployee?.timezone || '',
    },
    validationSchema: validationSchema,
    validateOnChange: true,
    validateOnBlur: true,
    onSubmit: async (values, { setSubmitting }) => {
      setError(null);

      // Extra validation check before submission
      try {
        const schema = validationSchema;
        await schema.validate(values, { abortEarly: false });
      } catch (validationError: unknown) {
        const ve = validationError as { inner?: Array<{ message: string }> };
        if (ve.inner && ve.inner.length > 0) {
          const errorMessages = ve.inner.map((err: { message: string }) => err.message).join(', ');
          setError(t('employees.form.fixErrors', { msg: errorMessages }));
          showToast.error(t('employees.form.fixAllErrors'));
          setSubmitting(false);
          return;
        }
      }

      if (isEditMode) {
        // Remove email from update payload (can't change this)
        const updateData = { ...values } as Partial<CreateUserData>;
        delete updateData.email;
        // Role is now editable for admins
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
  }, [open, formik]);

  // Clear generic error when user starts correcting any field
  useEffect(() => {
    if (error) setError(null);
  }, [error, formik.values]);

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
            showToast.success(t('employees.form.bankFetched', { bank: data.BANK }));
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
  }, [formik.values.ifsc_code, formik, t]);

  // Initialize employee ID from settings in Create Mode
  useEffect(() => {
    if (!isEditMode && idSettings?.nextId && !formik.values.employee_id && (idSettings?.usePrefix ?? true)) {
      formik.setFieldValue('employee_id', idSettings.nextId);
    }
  }, [idSettings?.nextId, isEditMode, formik.values.employee_id, idSettings?.usePrefix, formik]);

  // Helper to check if form has validation errors
  const hasValidationErrors = Object.keys(formik.errors).length > 0 && formik.submitCount > 0;

  // Helper to get all current validation errors for display
  const getValidationErrorSummary = () => {
    if (!hasValidationErrors) return null;
    const errors = Object.entries(formik.errors)
      .filter(([, value]) => value)
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
      target.value = target.value.replace(/[^A-Za-z\s\-.]/g, '');
    } else if (name === 'phone' || name === 'emergency_phone' || name === 'account_number' || name === 'uan' || name === 'aadhar_number') {
      target.value = target.value.replace(/[^0-9]/g, '');
    } else if (name === 'ifsc_code' || name === 'tax_id') {
      target.value = target.value.toUpperCase();
    }
  };

  const handleNext = async () => {
    // If there is any unique error currently displaying, block
    const hasUniqueError = Object.values(uniqueErrors).some(err => err !== null);
    if (hasUniqueError) {
      showToast.error(t('employees.form.resolveDuplicateErrors'));
      return;
    }

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
      showToast.error(t('employees.form.fixErrorsCount', { count: stepErrors.length }));
    }
  };

  const formFields = (
    <div className="flex flex-col space-y-3 pb-2">
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
                    <div className="absolute -inset-1 rounded-full bg-brand-500/20 animate-pulse ring-4 ring-primary/10" />
                  )}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${isActive
                      ? 'bg-brand-500 border-brand-500 text-white shadow-elev-4 shadow-brand-500/30 scale-110'
                      : isCompleted
                        ? 'bg-gradient-to-br from-brand-500 to-brand-600 border-transparent text-white shadow-elev-3'
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
                      ? 'text-brand-500'
                      : isCompleted
                        ? 'text-brand-600 dark:text-brand-400'
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
                {t('employees.form.validationErrorsHeader')}
              </p>
              <ul className="list-disc list-inside text-xs space-y-1">
                {validationErrors.slice(0, 5).map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
                {validationErrors.length > 5 && (
                  <li className="font-medium">{t('employees.form.moreErrors', { count: validationErrors.length - 5 })}</li>
                )}
              </ul>
            </div>
          }
        />
      )}

      {/* Step 1: Basic Information */}
      <div
        className={currentStep === 1 ? 'block flex-1 overflow-y-auto px-8 py-6 custom-scrollbar' : 'hidden'}
        style={{
          animation: currentStep === 1 && !isTransitioning ? `stepSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards` : undefined,
          opacity: isTransitioning && currentStep === 1 ? 0 : 1,
          transform: isTransitioning && currentStep === 1 ? `translateX(${slideDirection === 'right' ? '-30px' : '30px'})` : undefined,
          transition: isTransitioning ? 'opacity 0.25s ease, transform 0.25s ease' : undefined,
        }}
      >
        <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-3 mb-5 flex items-center gap-3">
            <UserIcon className="w-4 h-4 text-brand-500" /> {t('employees.form.basicInformation')}
        </h3>



        {!isEditMode && (
          <div className="mb-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
              {t('employees.form.email')}
            </label>
            <Input
              type="email"
              name="email"
              value={formik.values.email}
              onChange={formik.handleChange}
              onBlur={(e) => {
                formik.handleBlur(e);
                checkUnique('email', e.target.value);
              }}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 shadow-elev-1"
              error={(formik.touched.email && Boolean(formik.errors.email)) || Boolean(uniqueErrors.email)}
              placeholder={t('employees.form.phEmail')}
            />
            <FormError message={uniqueErrors.email || (formik.touched.email ? formik.errors.email : undefined)} />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
              {t('employees.form.firstName')}
            </label>
            <Input
              type="text"
              name="first_name"
              value={formik.values.first_name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              onInput={handleInput}
              placeholder={t('employees.form.phFirstName')}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 shadow-elev-1"
              error={formik.touched.first_name && Boolean(formik.errors.first_name)}
            />
            <FormError message={formik.touched.first_name ? formik.errors.first_name : undefined} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
              {t('employees.form.lastName')}
            </label>
            <Input
              type="text"
              name="last_name"
              value={formik.values.last_name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              onInput={handleInput}
              placeholder={t('employees.form.phLastName')}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 shadow-elev-1"
              error={formik.touched.last_name && Boolean(formik.errors.last_name)}
            />
            <FormError message={formik.touched.last_name ? formik.errors.last_name : undefined} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
              {t('employees.form.phone')}
            </label>
            <PhoneInput
              name="phone"
              value={formik.values.phone}
              onChange={(val) => formik.setFieldValue('phone', val)}
              onBlur={(e) => {
                formik.handleBlur(e);
                checkUnique('phone', formik.values.phone);
              }}
              error={(formik.touched.phone && Boolean(formik.errors.phone)) || Boolean(uniqueErrors.phone)}
              placeholder={t('employees.form.phPhone')}
              className="group focus-within:ring-2 focus-within:ring-brand-500/20 transition-all rounded-xl"
            />
            <FormError message={uniqueErrors.phone || (formik.touched.phone ? formik.errors.phone : undefined)} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
              {t('employees.form.dateOfBirth')}
            </label>
            <DatePicker
              value={formik.values.date_of_birth}
              onChange={(date) => formik.setFieldValue('date_of_birth', date)}
              placeholder={t('employees.form.phDob')}
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
              {t('employees.form.gender')}
            </label>
            <Select
              name="gender"
              value={formik.values.gender}
              onChange={formik.handleChange}
              placeholder={t('employees.form.phSelectGender')}
            >
              <option value="MALE">{t('employees.form.genderMale')}</option>
              <option value="FEMALE">{t('employees.form.genderFemale')}</option>
              <option value="OTHER">{t('employees.form.genderOther')}</option>
            </Select>
            {formik.touched.gender && formik.errors.gender && (
              <p className="mt-1 text-sm text-red-600">{formik.errors.gender}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
              {t('employees.form.maritalStatus')}
            </label>
            <Select
              name="marital_status"
              value={formik.values.marital_status}
              onChange={formik.handleChange}
              placeholder={t('employees.form.phSelectStatus')}
            >
              <option value="SINGLE">{t('employees.form.maritalSingle')}</option>
              <option value="MARRIED">{t('employees.form.maritalMarried')}</option>
              <option value="DIVORCED">{t('employees.form.maritalDivorced')}</option>
              <option value="WIDOWED">{t('employees.form.maritalWidowed')}</option>
            </Select>
            {formik.touched.marital_status && formik.errors.marital_status && (
              <p className="mt-1 text-sm text-red-600">{formik.errors.marital_status}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
              {t('employees.form.nationality')}
            </label>
            <input
              type="text"
              name="nationality"
              value={formik.values.nationality}
              onChange={formik.handleChange}
              placeholder={t('employees.form.phNationality')}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 shadow-elev-1"
            />
          </div>
        </div>

        <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
              {t('employees.form.address')}
            </label>
          <textarea
            name="address"
            value={formik.values.address}
            onChange={formik.handleChange}
            rows={1}
            placeholder={t('employees.form.phAddress')}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 shadow-elev-1"
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
            <Briefcase className="w-4 h-4 text-brand-500" /> {t('employees.form.employmentDetails')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
              {t('employees.form.role')}
            </label>
              <Select
                name="role"
                value={formik.values.role}
                onChange={formik.handleChange}
                disabled={!['ADMIN', 'SUPER_ADMIN', 'HR'].includes(user?.role || '')}
              >
                {tenantRoles.length > 0 ? (
                  tenantRoles.map((r) => {
                    // Only ADMIN/SUPER_ADMIN can assign the ADMIN role
                    if (r.role === 'ADMIN' && !['ADMIN', 'SUPER_ADMIN'].includes(user?.role || '')) return null;
                    return (
                      <option key={r.role} value={r.role}>
                        {r.role.replace(/_/g, ' ')}
                      </option>
                    );
                  })
                ) : (
                  /* Fallback if roles haven't loaded yet */
                  <>
                    <option value="EMPLOYEE">{t('employees.form.roleEmployee')}</option>
                    <option value="MANAGER">{t('employees.form.roleManager')}</option>
                    <option value="HR">{t('employees.form.roleHr')}</option>
                    {['ADMIN', 'SUPER_ADMIN'].includes(user?.role || '') && (
                      <option value="ADMIN">{t('employees.form.roleAdmin')}</option>
                    )}
                  </>
                )}
              </Select>
            </div>

            <div>
              {isEditMode ? (
                /* Edit mode: simple editable employee ID field */
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                    {t('employees.form.employeeId')}
                  </label>
                  <input
                    type="text"
                    name="employee_id"
                    value={formik.values.employee_id}
                    onChange={formik.handleChange}
                    placeholder={t('employees.form.phEmployeeId')}
                    disabled={!['ADMIN', 'SUPER_ADMIN'].includes(user?.role || '')}
                    className={`w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 shadow-elev-1 ${!['ADMIN', 'SUPER_ADMIN'].includes(user?.role || '') ? 'opacity-60 cursor-not-allowed' : ''}`}
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
                      {t('employees.form.employeeId')} {!(idSettings?.usePrefix ?? true) && <span className="text-red-500">*</span>}
                      {(idSettings?.usePrefix ?? true) && idSettings?.isConfigured && (
                        <span className="text-xs font-normal text-gray-500 ml-1">{t('employees.form.autoTag')}</span>
                      )}
                    </label>
                    {['ADMIN', 'HR', 'SUPER_ADMIN'].includes(user?.role || '') && (
                       <Button variant="ghost" 
                        type="button"
                        role="switch"
                        title={(idSettings?.usePrefix ?? true) ? t('employees.form.switchManual') : t('employees.form.switchAuto')}
                        aria-checked={idSettings?.usePrefix ?? true}
                        onClick={() => toggleModeMutation.mutate(!(idSettings?.usePrefix ?? true))}
                        disabled={toggleModeMutation.isPending}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 flex-shrink-0 ${(idSettings?.usePrefix ?? true)
                          ? 'bg-brand-500'
                          : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-elev-1 transform transition-transform duration-200 ${(idSettings?.usePrefix ?? true) ? 'translate-x-[18px]' : 'translate-x-[3px]'
                            }`}
                        />
                      </Button>
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
                            placeholder={t('employees.form.phPrefix')}
                            maxLength={5}
                            className="w-full px-4 py-2.5 rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all duration-200 shadow-elev-1"
                          />
                          <Button
                            type="button"
                            onClick={handleSetPrefix}
                            disabled={!prefixInput || prefixInput.length < 2}
                            className="bg-amber-600 hover:bg-amber-700 text-white whitespace-nowrap text-xs px-3 py-2.5"
                          >
                            {t('employees.form.save')}
                          </Button>
                        </div>
                      ) : (
                        <div className="p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400">
                          {t('employees.form.prefixNotConfigured')}
                        </div>
                      )
                    ) : (
                      /* Prefix configured - show auto-generated preview but allow edit */
                      <input
                        type="text"
                        name="employee_id"
                        value={formik.values.employee_id || idSettings?.nextId || ''}
                        onChange={formik.handleChange}
                        onBlur={formik.handleBlur}
                        placeholder={idSettings?.nextId || t('employees.form.autoGenerated')}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 shadow-elev-1"
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
                        placeholder={t('employees.form.phEmployeeIdManual')}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 shadow-elev-1"
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
              {t('employees.form.department')}
            </label>
              <Select
                name="department_id"
                value={formik.values.department_id}
                onChange={formik.handleChange}
                placeholder={t('employees.form.phSelectDepartment')}
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
              {t('employees.form.designation')}
            </label>
              <Select
                name="designation_id"
                value={formik.values.designation_id}
                onChange={formik.handleChange}
                placeholder={t('employees.form.phSelectDesignation')}
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
              {t('employees.form.reportsTo')}
            </label>
              <Select
                name="reports_to"
                value={formik.values.reports_to}
                onChange={formik.handleChange}
                placeholder={t('employees.form.phNoManager')}
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
              {t('employees.form.joinDate')}
            </label>
              <DatePicker
                value={formik.values.join_date}
                onChange={(date) => formik.setFieldValue('join_date', date)}
                placeholder={t('employees.form.phJoinDate')}
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
              {t('employees.form.employmentType')}
            </label>
              <Select
                name="employment_type"
                value={formik.values.employment_type}
                onChange={formik.handleChange}
              >
                  <option value="FULL_TIME">{t('employees.form.empFullTime')}</option>
                  <option value="PART_TIME">{t('employees.form.empPartTime')}</option>
                  <option value="CONTRACT">{t('employees.form.empContract')}</option>
                  <option value="INTERN">{t('employees.form.empIntern')}</option>
                  <option value="TEMP">{t('employees.form.empTemporary')}</option>
              </Select>
            </div>

            <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
              {t('employees.form.shift')}
            </label>
              <Select
                name="shift_id"
                value={formik.values.shift_id}
                onChange={(e) => {
                  formik.handleChange(e);
                  // Also set the shift name for legacy support if needed
                  const selectedShift = shifts.find((s: { id: string; name: string }) => s.id === e.target.value);
                  if (selectedShift) {
                    formik.setFieldValue('shift', selectedShift.name);
                  }
                }}
                placeholder={t('employees.form.phSelectShift')}
              >
                {shifts.map((s: { id: string; name: string; start_time: string; end_time: string }) => (
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
                {t('employees.form.workLocation')}
              </label>
              <input
                type="text"
                name="job_location"
                value={formik.values.job_location}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                placeholder={t('employees.form.phWorkLocation')}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 shadow-elev-1"
              />
              {formik.touched.job_location && formik.errors.job_location && (
                <p className="mt-1 text-sm text-red-600">{formik.errors.job_location}</p>
              )}
            </div>

            <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                {t('employees.form.preferredTimezone')}
              </label>
              <SearchableSelect
                name="timezone"
                value={formik.values.timezone}
                onChange={(value) => formik.setFieldValue('timezone', value)}
                placeholder={t('employees.form.phTimezone')}
                options={timezones.map((tz: { label: string; value: string }) => ({ label: tz.label, value: tz.value }))}
              />
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
            <Building2 className="w-4 h-4 text-brand-500" /> {t('employees.form.financialDetails')}
          </h3>

          {/* Row 1: Aadhaar Number | PAN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                {t('employees.form.aadhaarNumber')}
              </label>
              <input
                type="text"
                name="aadhar_number"
                value={formik.values.aadhar_number}
                onChange={formik.handleChange}
                onBlur={(e) => {
                  formik.handleBlur(e);
                  checkUnique('aadhar_number', e.target.value);
                }}
                onInput={handleInput}
                maxLength={12}
                placeholder={t('employees.form.phAadhaar')}
                className={`w-full px-4 py-2.5 rounded-xl border bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all duration-200 shadow-elev-1 ${((formik.touched.aadhar_number && formik.errors.aadhar_number) || uniqueErrors.aadhar_number) ? 'border-red-500 focus:border-red-500' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 focus:border-brand-500'}`}
              />
              <FormError message={uniqueErrors.aadhar_number || (formik.touched.aadhar_number ? (formik.errors.aadhar_number as string) : undefined)} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                {t('employees.form.taxId')}
              </label>
              <input
                type="text"
                name="tax_id"
                value={formik.values.tax_id}
                onChange={formik.handleChange}
                onBlur={(e) => {
                  formik.handleBlur(e);
                  checkUnique('tax_id', e.target.value);
                }}
                onInput={handleInput}
                maxLength={10}
                placeholder={t('employees.form.phTaxId')}
                className={`w-full px-4 py-2.5 rounded-xl border bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all duration-200 uppercase shadow-elev-1 ${((formik.touched.tax_id && formik.errors.tax_id) || uniqueErrors.tax_id) ? 'border-red-500 focus:border-red-500' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 focus:border-brand-500'}`}
              />
              <FormError message={uniqueErrors.tax_id || (formik.touched.tax_id ? (formik.errors.tax_id as string) : undefined)} />
            </div>
          </div>

          {/* Row 2: IFSC Code | Bank Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                {t('employees.form.ifscCode')}
              </label>
              <input
                type="text"
                name="ifsc_code"
                value={formik.values.ifsc_code}
                onChange={formik.handleChange}
                onInput={handleInput}
                maxLength={11}
                placeholder={t('employees.form.phIfsc')}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 shadow-elev-1 uppercase"
              />
              {formik.touched.ifsc_code && formik.errors.ifsc_code && (
                <p className="mt-1 text-sm text-red-600">{formik.errors.ifsc_code}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                {t('employees.form.bankName')}
              </label>
              <input
                type="text"
                name="bank_name"
                value={formik.values.bank_name}
                onChange={formik.handleChange}
                placeholder={t('employees.form.phBankName')}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 shadow-elev-1"
              />
              {formik.values.branch_name && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t('employees.form.branch')}: <span className="font-medium text-gray-700 dark:text-gray-300">{formik.values.branch_name}</span>
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
                {t('employees.form.accountName')}
              </label>
              <input
                type="text"
                name="account_name"
                value={formik.values.account_name}
                onChange={formik.handleChange}
                placeholder={t('employees.form.phAccountName')}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 shadow-elev-1"
              />
              {formik.touched.account_name && formik.errors.account_name && (
                <p className="mt-1 text-sm text-red-600">{formik.errors.account_name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                {t('employees.form.accountNumber')}
              </label>
              <input
                type="text"
                name="account_number"
                value={formik.values.account_number}
                onChange={formik.handleChange}
                onBlur={(e) => {
                  formik.handleBlur(e);
                  checkUnique('account_number', e.target.value);
                }}
                onInput={handleInput}
                placeholder={t('employees.form.phAccountNumber')}
                className={`w-full px-4 py-2.5 rounded-xl border bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all duration-200 shadow-elev-1 ${((formik.touched.account_number && formik.errors.account_number) || uniqueErrors.account_number) ? 'border-red-500 focus:border-red-500' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 focus:border-brand-500'}`}
              />
              <FormError message={uniqueErrors.account_number || (formik.touched.account_number ? (formik.errors.account_number as string) : undefined)} />
            </div>
          </div>

          {/* Row 4: UAN | PF A/C Number */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                {t('employees.form.uan')}
              </label>
              <input
                type="text"
                name="uan"
                value={formik.values.uan}
                onChange={formik.handleChange}
                onBlur={(e) => {
                  formik.handleBlur(e);
                  checkUnique('uan', e.target.value);
                }}
                onInput={handleInput}
                placeholder={t('employees.form.phUan')}
                className={`w-full px-4 py-2.5 rounded-xl border bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all duration-200 shadow-elev-1 ${((formik.touched.uan && formik.errors.uan) || uniqueErrors.uan) ? 'border-red-500 focus:border-red-500' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 focus:border-brand-500'}`}
              />
              <FormError message={uniqueErrors.uan || (formik.touched.uan ? (formik.errors.uan as string) : undefined)} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                {t('employees.form.pfAccount')}
              </label>
              <input
                type="text"
                name="pf_account"
                value={formik.values.pf_account}
                onChange={formik.handleChange}
                onBlur={(e) => {
                  formik.handleBlur(e);
                  checkUnique('pf_account', e.target.value);
                }}
                placeholder={t('employees.form.phPfAccount')}
                className={`w-full px-4 py-2.5 rounded-xl border bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all duration-200 uppercase shadow-elev-1 ${((formik.touched.pf_account && formik.errors.pf_account) || uniqueErrors.pf_account) ? 'border-red-500 focus:border-red-500' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 focus:border-brand-500'}`}
              />
              <FormError message={uniqueErrors.pf_account || (formik.touched.pf_account ? (formik.errors.pf_account as string) : undefined)} />
            </div>
          </div>

          {/* Row 5: ESI Number */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                {t('employees.form.esiNumber')}
              </label>
              <input
                type="text"
                name="esi_number"
                value={formik.values.esi_number}
                onChange={formik.handleChange}
                placeholder={t('employees.form.phEsiNumber')}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 shadow-elev-1"
              />
            </div>
          </div>

          <div className="mt-6">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                {t('employees.form.annualCtc')}
              </label>
            <Input
              type="number"
              name="ctc"
              value={formik.values.ctc}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              placeholder={t('employees.form.phCtc')}
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
            <Phone className="w-4 h-4 text-brand-500" /> {t('employees.form.emergencyContact')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                {t('employees.form.contactName')}
              </label>
              <input
                type="text"
                name="emergency_name"
                value={formik.values.emergency_name}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                onInput={handleInput}
                placeholder={t('employees.form.phContactName')}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 shadow-elev-1"
              />
              {formik.touched.emergency_name && formik.errors.emergency_name && (
                <p className="mt-1 text-sm text-red-600">{formik.errors.emergency_name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                {t('employees.form.contactPhone')}
              </label>
              <PhoneInput
                name="emergency_phone"
                value={formik.values.emergency_phone}
                onChange={(val) => formik.setFieldValue('emergency_phone', val)}
                onBlur={formik.handleBlur}
                error={formik.touched.emergency_phone && Boolean(formik.errors.emergency_phone)}
                placeholder={t('employees.form.phPhone')}
                className="group focus-within:ring-2 focus-within:ring-brand-500/20 transition-all rounded-xl"
              />
              {formik.touched.emergency_phone && formik.errors.emergency_phone && (
                <p className="mt-1 text-sm text-red-600">{formik.errors.emergency_phone}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5">
                {t('employees.form.relationship')}
              </label>
              <Select
                name="emergency_relation"
                value={formik.values.emergency_relation}
                onChange={formik.handleChange}
                placeholder={t('employees.form.phSelectRelation')}
              >
                  <option value="SPOUSE">{t('employees.form.relSpouse')}</option>
                  <option value="PARENT">{t('employees.form.relParent')}</option>
                  <option value="SIBLING">{t('employees.form.relSibling')}</option>
                  <option value="CHILD">{t('employees.form.relChild')}</option>
                  <option value="FRIEND">{t('employees.form.relFriend')}</option>
                  <option value="OTHER">{t('employees.form.relOther')}</option>
              </Select>
              {formik.touched.emergency_relation && formik.errors.emergency_relation && (
                <p className="mt-1 text-sm text-red-600">{formik.errors.emergency_relation}</p>
              )}
            </div>
          </div>
        </div>
      </div>


    </div>
  );

  const unsavedChangesDialog = (
    <Dialog open={blocker?.state === 'blocked'} onOpenChange={(open) => { if (!open) blocker?.reset?.(); }}>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4 text-amber-600">
          <AlertCircle className="w-6 h-6" />
          <h3 className="text-lg font-semibold">{t('employees.form.unsavedChangesTitle')}</h3>
        </div>

          <p className="text-gray-600 dark:text-gray-300 mb-6">
          {t('employees.form.unsavedChangesMsg')}
        </p>

        <div className="flex gap-2 w-full">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => blocker?.reset?.()}
          >
            {t('employees.form.cancel')}
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={() => {
              blocker?.proceed?.();
            }}
          >
            {t('employees.form.discardChanges')}
          </Button>
        </div>
      </div>
    </Dialog>
  );


  const footerContent = (
    <div className="flex items-center justify-between p-6">
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
        <ChevronLeft className="w-4 h-4 mr-2" /> {t('employees.form.previous')}
      </Button>

      {currentStep < 4 ? (
        <Button
          type="button"
          onClick={handleNext}
          className="h-11 px-8 text-base bg-brand-500 hover:bg-brand-500/90 text-white shadow-elev-4 shadow-brand-500/25 transition-all hover:-translate-y-0.5"
        >
          {t('employees.form.next')} <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      ) : (
        <Button
          type="button"
          onClick={() => formik.handleSubmit()}
          isLoading={isLoading}
          disabled={isLoading}
          className="h-11 px-8 text-base bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white shadow-elev-4 shadow-green-500/25 transition-all hover:-translate-y-0.5"
        >
          {isEditMode ? t('employees.form.updateEmployee') : t('employees.form.createEmployee')} <Check className="w-4 h-4 ml-2" />
        </Button>
      )}
    </div>
  );

  return (
    <>
      {asPage ? (
        <form onSubmit={formik.handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {formFields}
          </div>
          <div className="flex-shrink-0 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 z-10">
            {footerContent}
          </div>
        </form>
      ) : (
        <Dialog
          open={open}
          onOpenChange={onOpenChange}
          title={isEditMode ? t('employees.editEmployee') : t('employees.addEmployee')}
          className="max-w-3xl"
          footer={footerContent}
        >
          <form onSubmit={formik.handleSubmit} id="create-employee-form">
            {formFields}
          </form>
        </Dialog>
      )}

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          onOpenChange(false);
          onSuccess?.();
        }}
        type="success"
        title={isEditMode ? t('employees.form.employeeUpdated') : t('employees.form.welcomeAboard')}
        message={isEditMode
          ? t('employees.form.updatedMsg', { name: createdEmployeeName })
          : t('employees.form.addedMsg', { name: createdEmployeeName })
        }
        buttonText={t('employees.form.continue')}
        onButtonClick={() => {
          setShowSuccessModal(false);
          onOpenChange(false);
          onSuccess?.();
        }}
      />
      {unsavedChangesDialog}
    </>
  );
};
export default CreateEmployeeForm;
