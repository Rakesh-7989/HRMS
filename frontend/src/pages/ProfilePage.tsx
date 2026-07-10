import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/utils/cn';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Input } from '@/components/ui/Input';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { Label } from '@/components/ui/Label';

import { usersService } from '@/services/users.service';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useChat } from '@/contexts/ChatContext';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { User } from '@/types';
import {
  User as UserIcon, Mail, Phone, Building2, Briefcase,
  CreditCard, GraduationCap,
  Edit, Save, X, UserCircle, FileText, Upload, Trash2, Download, Search,
  CheckCircle2, Clock, Minus, Eye, Camera, CameraIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { departmentService } from '@/services/department.service';
import { designationService } from '@/services/designation.service';
import { documentsService } from '@/services/documents.service';
import { toast } from 'react-hot-toast';
import { useConfirm } from '@/contexts/ConfirmContext';
import { resolveImageUrl } from '@/utils/image';
import { showToast } from '@/utils/toast';
import { FormError } from '@/components/ui/FormError';
import { Dialog, DialogFooter } from '@/components/ui/Dialog';
import { useTimezones } from '@/utils/timezone';
import { SearchableSelect } from '@/components/ui/SearchableSelect';


const profileValidationSchema = Yup.object({
  first_name: Yup.string()
    .matches(/^[A-Za-z\s\-\.]+$/, 'Enter a valid name (letters only)')
    .required('First name is required'),
  last_name: Yup.string()
    .matches(/^[A-Za-z\s\-\.]+$/, 'Enter a valid name (letters only)')
    .required('Last name is required'),
  phone: Yup.string()
    .matches(/^[0-9+\s\.]*$/, 'Phone number must contain numbers and dial code')
    .min(5, 'Too short')
    .max(25, 'Too long'),
  emergency_phone: Yup.string()
    .matches(/^[0-9+\s\.]*$/, 'Phone number must contain numbers and dial code')
    .min(5, 'Too short')
    .max(25, 'Too long'),
  email: Yup.string().email('Invalid email'),
  bank_name: Yup.string()
    .matches(/^[A-Za-z\s\-\.&]+$/, 'Bank name must contain only letters'),
  account_name: Yup.string()
    .matches(/^[A-Za-z\s\-\.]+$/, 'Account name must contain only letters'),
  account_number: Yup.string()
    .test('digits-only', 'Account number must contain only digits', function (value) {
      if (!value) return true;
      return /^[0-9]*$/.test(value);
    })
    .test('valid-length', 'Account number must be 9-18 digits', function (value) {
      if (!value) return true;
      return value.length >= 9 && value.length <= 18;
    }),
  // Add other validations as needed
});

export const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { alert: showAlert } = useConfirm();
  const { timezones } = useTimezones();
  const [isEditing, setIsEditing] = useState(false);

  // Sensitive field reveal state
  const [revealedFields, setRevealedFields] = useState<Record<string, string>>({});
  const [revealingField, setRevealingField] = useState<string | null>(null);

  const handleRevealField = useCallback(async (fieldName: string) => {
    if (revealedFields[fieldName]) {
      setRevealedFields(prev => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
      return;
    }
    try {
      setRevealingField(fieldName);
      const result = await usersService.revealOwnSensitiveField(fieldName);
      setRevealedFields(prev => ({ ...prev, [fieldName]: result.value }));
      setTimeout(() => {
        setRevealedFields(prev => {
          const next = { ...prev };
          delete next[fieldName];
          return next;
        });
      }, 10000);
    } catch (err: any) {
      toast.error(err.message || 'Failed to reveal field');
    } finally {
      setRevealingField(null);
    }
  }, [revealedFields]);

  // Fetch Profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => usersService.getMyProfile(),
  });

  // Fetch Lookups (Departments/Designations) - Useful for displaying names even if read-only
  // We can just use the ID if we strictly only have IDs, but usually we want names.
  // The UserProfile object from backend MIGHT NOT have joined department name if using getMyProfile
  // user.service.js getMyProfile DOES join employees but NOT departments/designations tables effectively to get names
  // It returns department_id. 
  // So we need to fetch the lists to map IDs to Names.
  // Note: Standard employees might not have permission to list departments/designations based on backend rules?
  // Let's check permissions. department.service.js getDepartments -> NO ROLE CHECK in SQL but might be checked in usage?
  // Actually department.service.js `getDepartments` uses `WHERE tenant_id`.
  // department.controller.js doesn't enforce role for GET.
  // So ANY logged in user can fetch departments. Good.

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentService.getDepartments(),
  });

  const { data: designations = [] } = useQuery({
    queryKey: ['designations'],
    queryFn: () => designationService.getDesignations(),
  });

  // Resolve Employee UUID (required for Documents, as backend links documents to Employee UUID, not User UUID)
  const { data: usersResponse } = useQuery({
    queryKey: ['users-lookup', profile?.email],
    queryFn: () => usersService.getUsers({ search: profile?.email }),
    enabled: !!profile?.email,
  });
  const usersList: any[] = usersResponse?.data || [];

  const [photoMenuOpen, setPhotoMenuOpen] = React.useState(false);
  const [viewPhotoOpen, setViewPhotoOpen] = React.useState(false);
  const [takePhotoOpen, setTakePhotoOpen] = React.useState(false);
  const photoMenuRef = React.useRef<HTMLDivElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const { user, setUser: setAuthUser } = useAuth();
  const { myStatus } = useChat();

  const removePhotoMutation = useMutation({
    mutationFn: () => usersService.removeProfilePhoto(),
    onSuccess: (_updatedProfile) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      if (user) {
        const updatedUser = { ...user, profile_photo_url: undefined } as User;
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setAuthUser(updatedUser);
      }
      toast.success('Profile photo removed');
      setPhotoMenuOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to remove photo');
    }
  });

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (photoMenuOpen && photoMenuRef.current && !photoMenuRef.current.contains(event.target as Node)) {
        setPhotoMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [photoMenuOpen]);

  const startCamera = async () => {
    try {
      setTakePhotoOpen(true);
      setPhotoMenuOpen(false);
      setTimeout(async () => {
        if (videoRef.current) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      toast.error("Could not access camera");
      setTakePhotoOpen(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setTakePhotoOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], "captured-photo.jpg", { type: "image/jpeg" });
          photoMutation.mutate(file);
          stopCamera();
        }
      }, 'image/jpeg');
    }
  };

  const photoMutation = useMutation({
    mutationFn: (file: File) => usersService.uploadProfilePhoto(file),
    onSuccess: (updatedProfile) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      // Update global auth state
      if (user) {
        // The response from upload might be user object or { status, message, data: user }
        const newPhotoUrl = updatedProfile.profile_photo_url || (updatedProfile as any).profile_photo_url;
        const updatedUser = { ...user, profile_photo_url: newPhotoUrl } as User;
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setAuthUser(updatedUser);
      }
      toast.success('Profile photo updated successfully');
    },
    onError: (error: any) => {
      showAlert({
        title: 'Photo Upload Failed',
        message: error.message || 'Failed to upload photo',
        confirmText: 'OK'
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => usersService.updateMyProfile(data),
    onSuccess: (updatedProfile) => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      // Update global auth state if current user updated their own profile
      if (user && updatedProfile && updatedProfile.id === user.id) {
        const merged = { ...user, ...updatedProfile } as User;
        localStorage.setItem('user', JSON.stringify(merged));
        setAuthUser(merged);
      }
      setIsEditing(false);
      toast.success('Profile updated successfully');
    },
    onError: (error: any) => {
      showAlert({
        title: 'Profile Update Failed',
        message: error.response?.data?.message || error.message || 'Failed to update profile. Please try again.',
        confirmText: 'OK'
      });
    }
  });

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      phone: profile?.phone || '',
      email: profile?.email || '', // Email usually read-only or special process

      // Personal
      date_of_birth: profile?.date_of_birth ? new Date(profile.date_of_birth).toISOString().split('T')[0] : '',
      gender: profile?.gender || '',
      marital_status: profile?.marital_status || '',
      nationality: profile?.nationality || '',
      address: profile?.address || '',

      // Emergency
      emergency_name: profile?.emergency_name || '',
      emergency_phone: profile?.emergency_phone || '',
      emergency_relation: profile?.emergency_relation || '',

      // Financial
      bank_name: profile?.bank_name || '',
      account_name: profile?.account_name || '',
      account_number: profile?.account_number || '',
      ifsc_code: profile?.ifsc_code || '',
      tax_id: profile?.tax_id || '',
      timezone: profile?.timezone || '',
    },
    validationSchema: profileValidationSchema,
    onSubmit: (values) => {
      // Filter out empty strings if needed, or backend handles it
      updateMutation.mutate(values);
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout title={t('profile.title')}>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) return <div>Profile not found</div>;

  const employeeUuid = usersList.find((u: any) => u.id === profile?.id)?.employee_uuid || profile?.id;

  const getDeptName = (id?: string) => departments.find(d => d.id === id)?.name || '-';
  const getDesigName = (id?: string) => designations.find(d => d.id === id)?.name || '-';

  return (
    <DashboardLayout title={t('profile.title')}>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* HEADER CARD */}
        <Card className="p-6 border-none shadow-md bg-white dark:bg-gray-800">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative group">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-4xl font-bold text-white shadow-lg ring-4 ring-white dark:ring-gray-700 overflow-hidden">
                {profile.profile_photo_url ? (
                  <img src={resolveImageUrl(profile.profile_photo_url)} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span>{profile.first_name?.[0]}{profile.last_name?.[0]}</span>
                )}
              </div>
              <div className={cn(
                "absolute bottom-1 right-1 w-6 h-6 rounded-full border-2 border-white dark:border-gray-700 flex items-center justify-center shadow-sm",
                myStatus === 'available' ? 'bg-green-500' :
                  myStatus === 'away' ? 'bg-amber-500' :
                    myStatus === 'dnd' || myStatus === 'busy' ? 'bg-red-500' : 'bg-gray-400'
              )}>
                {myStatus === 'available' && <CheckCircle2 size={12} className="text-white" />}
                {myStatus === 'away' && <Clock size={12} className="text-white" />}
                {myStatus === 'dnd' && <Minus size={12} className="text-white" />}
              </div>

              {/* Photo Overlay / Toggle */}
              <div
                onClick={() => setPhotoMenuOpen(!photoMenuOpen)}
                className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <div className="flex flex-col items-center">
                  <Camera size={20} />
                  <span className="text-[10px] font-bold mt-1">UPDATE</span>
                </div>
              </div>

              {/* Photo Options Menu */}
              {photoMenuOpen && (
                <div
                  ref={photoMenuRef}
                  className="absolute top-0 left-full ml-4 w-52 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 py-2.5 z-50 animate-in fade-in slide-in-from-left-2 duration-200"
                >
                  <button
                    onClick={() => { setViewPhotoOpen(true); setPhotoMenuOpen(false); }}
                    className="w-full px-4 py-3 flex items-center gap-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-sm font-semibold text-gray-700 dark:text-gray-200 transition-all active:scale-[0.98]"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500">
                      <Eye size={18} />
                    </div>
                    {t('profile.viewPhoto')}
                  </button>
                  <button
                    onClick={startCamera}
                    className="w-full px-4 py-3 flex items-center gap-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-sm font-semibold text-gray-700 dark:text-gray-200 transition-all active:scale-[0.98]"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-500">
                      <CameraIcon size={18} />
                    </div>
                    {t('profile.takePhoto')}
                  </button>
                  <label
                    htmlFor="profile-photo-upload"
                    className="w-full px-4 py-3 flex items-center gap-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-sm font-semibold text-gray-700 dark:text-gray-200 transition-all cursor-pointer active:scale-[0.98]"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-500">
                      <Upload size={18} />
                    </div>
                    {t('profile.uploadPhoto')}
                  </label>
                  <div className="my-2 border-t border-gray-100 dark:border-gray-700" />
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to remove your profile photo?')) {
                        removePhotoMutation.mutate();
                      }
                    }}
                    className="w-full px-4 py-3 flex items-center gap-3.5 hover:bg-red-50 dark:hover:bg-red-900/10 text-sm font-semibold text-red-600 dark:text-red-400 transition-all active:scale-[0.98]"
                  >
                    <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500">
                      <Trash2 size={18} />
                    </div>
                    {t('profile.removePhoto')}
                  </button>
                  <input
                    type="file"
                    id="profile-photo-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      photoMutation.mutate(file);
                      setPhotoMenuOpen(false);
                    }}
                  />
                </div>
              )}
            </div>

            <div className="flex-1 text-center md:text-left space-y-2">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {profile.first_name} {profile.last_name}
              </h1>
              <div className="flex flex-wrap justify-center md:justify-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                <span className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                  <Briefcase size={14} /> {getDesigName(profile.designation_id)}
                </span>
                <span className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                  <Building2 size={14} /> {getDeptName(profile.department_id)}
                </span>
                <span className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                  <Mail size={14} /> {profile.email}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              {!isEditing ? (
                <Button type="button" onClick={() => setIsEditing(true)}>
                  <Edit className="mr-2" size={16} /> {t('profile.editProfile')}
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                    <X className="mr-2" size={16} /> {t('common.cancel')}
                  </Button>
                  <Button type="submit" onClick={() => formik.handleSubmit()} isLoading={updateMutation.isPending}>
                    <Save className="mr-2" size={16} /> {t('profile.saveChanges')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* TABS SECTION */}
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="w-full justify-start h-12 bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
            <TabsTrigger value="personal" className="flex-1 h-full data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <UserCircle className="mr-2" size={18} /> {t('common.personal')}
            </TabsTrigger>
            <TabsTrigger value="professional" className="flex-1 h-full data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Briefcase className="mr-2" size={18} /> {t('common.professional')}
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex-1 h-full data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <CreditCard className="mr-2" size={18} /> {t('common.financial')}
            </TabsTrigger>
            <TabsTrigger value="education" className="flex-1 h-full data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <GraduationCap className="mr-2" size={18} /> {t('common.education')}
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex-1 h-full data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <FileText className="mr-2" size={18} /> {t('common.documents')}
            </TabsTrigger>
          </TabsList>

          {/* PERSONAL TAB */}
          <TabsContent value="personal">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <UserIcon className="text-primary" /> {t('profile.personalInfo')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField label={t('profile.firstName')} id="first_name" formik={formik} isEditing={isEditing} required />
                <FormField label={t('profile.lastName')} id="last_name" formik={formik} isEditing={isEditing} required />

                <FormField label={t('profile.dob')} id="date_of_birth" type="date" formik={formik} isEditing={isEditing} />
                <FormField label={t('profile.gender')} id="gender" formik={formik} isEditing={isEditing} type="select" options={['Male', 'Female', 'Other']} />

                <FormField label={t('profile.maritalStatus')} id="marital_status" formik={formik} isEditing={isEditing} type="select" options={['Single', 'Married', 'Divorced', 'Widowed']} />
                <FormField label={t('profile.nationality')} id="nationality" formik={formik} isEditing={isEditing} />

                <FormField label={t('profile.phone')} id="phone" formik={formik} isEditing={isEditing} />
                <div className="md:col-span-2">
                  <FormField label={t('profile.address')} id="address" formik={formik} isEditing={isEditing} type="textarea" />
                </div>
                {isEditing ? (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Preferred Timezone</label>
                    <SearchableSelect
                      name="timezone"
                      value={formik.values.timezone}
                      onChange={(val) => formik.setFieldValue('timezone', val)}
                      placeholder="Search Timezone..."
                      options={timezones.map(tz => ({ label: tz.label, value: tz.value }))}
                    />
                  </div>
                ) : (
                  <DisplayField
                    label="Preferred Timezone"
                    value={timezones.find(tz => tz.value === formik.values.timezone)?.label || formik.values.timezone || undefined}
                  />
                )}
              </div>

              <h4 className="text-lg font-medium mt-8 mb-4 flex items-center gap-2 text-gray-700 dark:text-gray-200">
                <Phone className="text-primary" size={18} /> {t('profile.emergencyContact')}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField label={t('profile.contactName')} id="emergency_name" formik={formik} isEditing={isEditing} />
                <FormField label={t('profile.relation')} id="emergency_relation" formik={formik} isEditing={isEditing} />
                <FormField label={t('profile.phoneNumber')} id="emergency_phone" formik={formik} isEditing={isEditing} />
              </div>
            </Card>
          </TabsContent>

          {/* PROFESSIONAL TAB (Read Only usually) */}
          <TabsContent value="professional">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Briefcase className="text-primary" /> {t('profile.professionalDetails')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DisplayField label={t('profile.employeeId')} value={profile.employee_id} />
                <DisplayField label={t('profile.email')} value={profile.email} />

                <DisplayField label={t('profile.department')} value={getDeptName(profile.department_id)} />
                <DisplayField label={t('profile.designation')} value={getDesigName(profile.designation_id)} />

                <DisplayField label={t('profile.dateOfJoining')} value={profile.join_date ? format(new Date(profile.join_date), 'PPP') : '-'} />
                <DisplayField label={t('profile.employmentType')} value={profile.employment_type} />

                <DisplayField
                  label={t('profile.shift')}
                  value={
                    profile.shift
                      ? `${profile.shift} ${profile.shift_start_time && profile.shift_end_time ? `(${profile.shift_start_time.slice(0, 5)} - ${profile.shift_end_time.slice(0, 5)})` : ''}`
                      : '-'
                  }
                />
                <DisplayField
                  label={t('profile.reportsTo')}
                  value={
                    profile.manager_first_name
                      ? `${profile.manager_first_name} ${profile.manager_last_name || ''}`
                      : (profile.reports_to || 'N/A')
                  }
                />
              </div>

              <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  {t('profile.professionalNote')}
                </p>
              </div>
            </Card>
          </TabsContent>

          {/* FINANCIAL TAB */}
          <TabsContent value="financial">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <CreditCard className="text-primary" /> {t('profile.financialInfo')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField label={t('profile.bankName')} id="bank_name" formik={formik} isEditing={isEditing} />
                <FormField label={t('profile.accountHolderName')} id="account_name" formik={formik} isEditing={isEditing} />

                <SensitiveFormField label={t('profile.accountNumber')} id="account_number" formik={formik} isEditing={isEditing} fieldName="account_number" revealedFields={revealedFields} revealingField={revealingField} onReveal={handleRevealField} />
                <SensitiveFormField label={t('profile.ifscCode')} id="ifsc_code" formik={formik} isEditing={isEditing} fieldName="ifsc_code" revealedFields={revealedFields} revealingField={revealingField} onReveal={handleRevealField} />

                <SensitiveFormField label={t('profile.taxId')} id="tax_id" formik={formik} isEditing={isEditing} fieldName="tax_id" revealedFields={revealedFields} revealingField={revealingField} onReveal={handleRevealField} />
              </div>
            </Card>
          </TabsContent>

          {/* EDUCATION TAB */}
          <TabsContent value="education">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <GraduationCap className="text-primary" /> {t('common.education')}
              </h3>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <GraduationCap size={32} className="text-gray-400" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white">{t('profile.educationDetails')}</h4>
                <p className="text-gray-500 dark:text-muted max-w-sm mt-2">
                  {t('profile.educationModuleUpdate')}
                </p>
                {isEditing && (
                  <div className="w-full max-w-md mt-6 text-left">
                    <Label>{t('profile.additionalNotes')}</Label>
                    <textarea
                      className="w-full mt-2 p-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                      rows={4}
                      placeholder={t('profile.enterEducationDetails')}
                    />
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* DOCUMENTS TAB */}
          {/* Photo Options Modals */}
          <Dialog open={viewPhotoOpen} onOpenChange={setViewPhotoOpen} title={t('profile.viewPhoto')}>
            <div className="flex items-center justify-center p-4">
              <div className="w-full max-w-md aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-2xl">
                {profile.profile_photo_url ? (
                  <img src={resolveImageUrl(profile.profile_photo_url)} alt="Profile Large" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-8xl font-bold text-primary/20">
                    {profile.first_name?.[0]}{profile.last_name?.[0]}
                  </div>
                )}
              </div>
            </div>
          </Dialog>

          <Dialog
            open={takePhotoOpen}
            onOpenChange={(open) => !open && stopCamera()}
            title={t('profile.takePhoto')}
            description={t('profile.alignFace')}
            footer={
              <DialogFooter className="px-6 py-4">
                <Button variant="outline" onClick={stopCamera}>{t('common.cancel')}</Button>
                <Button onClick={capturePhoto} className="gap-2">
                  <Camera size={18} />
                  {t('profile.captureSave')}
                </Button>
              </DialogFooter>
            }
          >
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 pointer-events-none border-[3px] border-dashed border-white/30 rounded-[50%] scale-75" />
              <canvas ref={canvasRef} className="hidden" />
            </div>
          </Dialog>

          {/* DOCUMENTS TAB */}
          <TabsContent value="documents" className="space-y-6">
            <DocumentsTab employeeId={employeeUuid} />
          </TabsContent>

        </Tabs>
      </div>
    </DashboardLayout>
  );
};

// Helper Components

const FormField = ({ label, id, type = 'text', formik, isEditing, required, options }: any) => {
  const isError = formik.touched[id] && formik.errors[id];

  if (!isEditing) {
    return <DisplayField label={label} value={formik.values[id]} />;
  }

  const handleInput = (e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    if (id === 'first_name' || id === 'last_name' || id === 'emergency_name') {
      target.value = target.value.replace(/[^A-Za-z\s\-\.]/g, '');
    } else if (id === 'phone' || id === 'emergency_phone') {
      target.value = target.value.replace(/[^0-9+]/g, '');
    }
  };

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className={isError ? 'text-red-500' : ''}>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      {type === 'select' ? (
        <select
          id={id}
          name={id}
          value={formik.values[id]}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        >
          <option value="">Select {label}</option>
          {options?.map((opt: any) => {
            const label = typeof opt === 'string' ? opt : opt.label;
            const value = typeof opt === 'string' ? opt : opt.value;
            return <option key={value} value={value}>{label}</option>;
          })}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          id={id}
          name={id}
          value={formik.values[id]}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          onInput={handleInput}
          rows={3}
          className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />
      ) : id === 'phone' || id === 'emergency_phone' ? (
        <PhoneInput
          name={id}
          value={formik.values[id]}
          onChange={(val) => formik.setFieldValue(id, val)}
          onBlur={formik.handleBlur}
          error={Boolean(isError)}
          placeholder={`e.g. 9876543210`}
          className="group focus-within:ring-2 focus-within:ring-primary/20 transition-all rounded-xl shadow-sm"
        />
      ) : (
        <Input
          id={id}
          name={id}
          type={type}
          value={formik.values[id]}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          onInput={handleInput}
          error={Boolean(isError)}
        />
      )}
      <FormError message={isError ? formik.errors[id] : undefined} />
    </div>
  );
};

const DisplayField = ({ label, value }: { label: string, value: string | undefined | null }) => (
  <div className="space-y-1">
    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
    <p className="text-base font-medium text-gray-900 dark:text-white">
      {value || <span className="text-gray-400 italic">Not set</span>}
    </p>
  </div>
);

// Sensitive form field with eye-icon reveal in display mode, regular input in edit mode
const SensitiveFormField = ({ label, id, formik, isEditing, fieldName, revealedFields, revealingField, onReveal }: any) => {
  if (isEditing) {
    return <FormField label={label} id={id} formik={formik} isEditing={isEditing} />;
  }

  const maskedValue = formik.values[id];
  const isRevealed = !!revealedFields[fieldName];
  const isLoading = revealingField === fieldName;
  const displayValue = isRevealed ? revealedFields[fieldName] : maskedValue;
  const hasValue = !!maskedValue && maskedValue !== 'Not set';

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <div className="flex items-center gap-2">
        <p className={`text-base font-medium font-mono ${isRevealed ? 'text-primary' : 'text-gray-900 dark:text-white'
          }`}>
          {displayValue || <span className="text-gray-400 italic">Not set</span>}
        </p>
        {hasValue && (
          <button
            onClick={() => onReveal(fieldName)}
            disabled={isLoading}
            className={`p-1 rounded-md transition-all hover:bg-gray-100 dark:hover:bg-gray-700 ${isRevealed ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
              }`}
            title={isRevealed ? 'Hide' : 'Show full value (audit-logged)'}
          >
            {isLoading ? (
              <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-gray-300 border-t-primary rounded-full" />
            ) : isRevealed ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
            )}
          </button>
        )}
      </div>
      {isRevealed && (
        <p className="text-[10px] text-amber-500">Auto-hides in 10s</p>
      )}
    </div>
  );
};

const DocumentsTab = ({ employeeId }: { employeeId: string }) => {
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const { hasPermission } = usePermissions();
  const canManage = hasPermission('employees', 'update');

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['employee-documents', employeeId],
    queryFn: () => documentsService.getDocuments(employeeId),
    enabled: !!employeeId
  });

  const deleteMutation = useMutation({
    mutationFn: (docId: string) => documentsService.deleteDocument(docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-documents', employeeId] });
      showToast.success('Document deleted');
    }
  });

  const uploadMutation = useMutation({
    mutationFn: (data: { file_name: string; file_url: string; file_type: string }) =>
      documentsService.uploadDocument(employeeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-documents', employeeId] });
      showToast.success('Document uploaded successfully');
    },
    onError: (error: any) => {
      console.error('Upload failed:', error);
      const msg = error?.response?.data?.message || 'Failed to upload document';
      showToast.error(msg);
    }
  });

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit to 7MB to be safe with Base64 overhead (Server limit 10MB)
    if (file.size > 7 * 1024 * 1024) {
      showToast.error('File size too large (max 7MB)');
      e.currentTarget.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      uploadMutation.mutate({
        file_name: file.name,
        file_url: base64String,
        file_type: file.type || 'application/octet-stream'
      });
    };
    reader.readAsDataURL(file);
    e.currentTarget.value = '';
  };

  const filteredDocs = documents.filter(doc =>
    doc.file_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Find documents..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-transparent text-gray-900 dark:text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {canManage && (
          <>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />
            <Button onClick={() => fileInputRef.current?.click()} isLoading={uploadMutation.isPending} className="flex items-center gap-2">
              <Upload size={16} />
              Upload New
            </Button>
          </>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Document Name</th>
              <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
              <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Uploaded On</th>
              <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading ? (
              <tr><td colSpan={4} className="py-8 text-center text-gray-400">Loading documents...</td></tr>
            ) : filteredDocs.length === 0 ? (
              <tr><td colSpan={4} className="py-8 text-center text-gray-400">No documents found</td></tr>
            ) : (
              filteredDocs.map(doc => (
                <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg text-primary">
                        <FileText size={18} />
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">{doc.file_name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-xs text-gray-500">{doc.file_type || 'Unknown'}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-xs text-gray-500">{format(new Date(doc.created_at), 'MMM d, yyyy')}</span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400"
                      >
                        <Download size={16} />
                      </a>
                      {canManage && (
                        <button
                          onClick={async () => {
                            const result = await confirm({
                              title: 'Delete Document',
                              message: `Are you sure you want to delete "${doc.file_name}"? This action cannot be undone.`,
                              type: 'destructive',
                              confirmText: 'Delete',
                              cancelText: 'Cancel'
                            });
                            if (result) {
                              deleteMutation.mutate(doc.id);
                            }
                          }}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
