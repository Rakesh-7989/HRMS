import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

import { usersService } from '@/services/users.service';
import { useAuth } from '@/contexts/AuthContext';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  User, Mail, Phone, Building2, Briefcase,
  CreditCard, GraduationCap,
  Edit, Save, X, UserCircle, FileText, Upload, Trash2, Download, Search
} from 'lucide-react';
import { format } from 'date-fns';
import { departmentService } from '@/services/department.service';
import { designationService } from '@/services/designation.service';
import { documentsService } from '@/services/documents.service';
import { toast } from 'react-hot-toast';
import { useConfirm } from '@/contexts/ConfirmContext';
import { showToast } from '@/utils/toast';
import { FormError } from '@/components/ui/FormError';

const profileValidationSchema = Yup.object({
  first_name: Yup.string()
    .matches(/^[A-Za-z\s\-\.]+$/, 'Enter a valid name (letters only)')
    .required('First name is required'),
  last_name: Yup.string()
    .matches(/^[A-Za-z\s\-\.]+$/, 'Enter a valid name (letters only)')
    .required('Last name is required'),
  phone: Yup.string()
    .matches(/^[0-9+\-()\s\.]*$/, 'Phone number can only contain numbers and basic symbols (+, -, (, ), .)')
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number cannot exceed 20 digits'),
  emergency_phone: Yup.string()
    .matches(/^[0-9+]*$/, 'Emergency phone number can only contain numbers')
    .min(10, 'Emergency phone number must be at least 10 digits')
    .max(20, 'Emergency phone number cannot exceed 20 digits'),
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
  const queryClient = useQueryClient();
  const { alert: showAlert } = useConfirm();
  const [isEditing, setIsEditing] = useState(false);

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
  const { data: usersList = [] } = useQuery({
    queryKey: ['users-lookup', profile?.email],
    queryFn: () => usersService.getUsers({ search: profile?.email }),
    enabled: !!profile?.email,
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => usersService.updateMyProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
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
    },
    validationSchema: profileValidationSchema,
    onSubmit: (values) => {
      // Filter out empty strings if needed, or backend handles it
      updateMutation.mutate(values);
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout title="My Profile">
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
    <DashboardLayout title="My Profile">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* HEADER CARD */}
        <Card className="p-6 border-none shadow-md bg-white dark:bg-gray-800">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-4xl font-bold text-white shadow-lg ring-4 ring-white dark:ring-gray-700">
                {profile.first_name?.[0]}{profile.last_name?.[0]}
              </div>
              <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 border-2 border-white rounded-full"></div>
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
                <Button onClick={() => setIsEditing(true)}>
                  <Edit className="mr-2" size={16} /> Edit Profile
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    <X className="mr-2" size={16} /> Cancel
                  </Button>
                  <Button onClick={() => formik.handleSubmit()} isLoading={updateMutation.isPending}>
                    <Save className="mr-2" size={16} /> Save Changes
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
              <UserCircle className="mr-2" size={18} /> Personal
            </TabsTrigger>
            <TabsTrigger value="professional" className="flex-1 h-full data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <Briefcase className="mr-2" size={18} /> Professional
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex-1 h-full data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <CreditCard className="mr-2" size={18} /> Financial
            </TabsTrigger>
            <TabsTrigger value="education" className="flex-1 h-full data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <GraduationCap className="mr-2" size={18} /> Education
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex-1 h-full data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
              <FileText className="mr-2" size={18} /> Documents
            </TabsTrigger>
          </TabsList>

          {/* PERSONAL TAB */}
          <TabsContent value="personal">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <User className="text-primary" /> Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField label="First Name" id="first_name" formik={formik} isEditing={isEditing} required />
                <FormField label="Last Name" id="last_name" formik={formik} isEditing={isEditing} required />

                <FormField label="Date of Birth" id="date_of_birth" type="date" formik={formik} isEditing={isEditing} />
                <FormField label="Gender" id="gender" formik={formik} isEditing={isEditing} type="select" options={['Male', 'Female', 'Other']} />

                <FormField label="Marital Status" id="marital_status" formik={formik} isEditing={isEditing} type="select" options={['Single', 'Married', 'Divorced', 'Widowed']} />
                <FormField label="Nationality" id="nationality" formik={formik} isEditing={isEditing} />

                <FormField label="Phone" id="phone" formik={formik} isEditing={isEditing} />
                <div className="md:col-span-2">
                  <FormField label="Address" id="address" formik={formik} isEditing={isEditing} type="textarea" />
                </div>
              </div>

              <h4 className="text-lg font-medium mt-8 mb-4 flex items-center gap-2 text-gray-700 dark:text-gray-200">
                <Phone className="text-primary" size={18} /> Emergency Contact
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField label="Contact Name" id="emergency_name" formik={formik} isEditing={isEditing} />
                <FormField label="Relation" id="emergency_relation" formik={formik} isEditing={isEditing} />
                <FormField label="Phone Number" id="emergency_phone" formik={formik} isEditing={isEditing} />
              </div>
            </Card>
          </TabsContent>

          {/* PROFESSIONAL TAB (Read Only usually) */}
          <TabsContent value="professional">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Briefcase className="text-primary" /> Professional Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DisplayField label="Employee ID" value={profile.employee_id} />
                <DisplayField label="Email" value={profile.email} />

                <DisplayField label="Department" value={getDeptName(profile.department_id)} />
                <DisplayField label="Designation" value={getDesigName(profile.designation_id)} />

                <DisplayField label="Date of Joining" value={profile.join_date ? format(new Date(profile.join_date), 'PPP') : '-'} />
                <DisplayField label="Employment Type" value={profile.employment_type} />

                <DisplayField label="Shift" value={profile.shift} />
                <DisplayField label="Reports To" value={profile.reports_to || 'N/A'} />
              </div>

              <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Note: Professional details are managed by HR. Please contact HR for any discrepancies.
                </p>
              </div>
            </Card>
          </TabsContent>

          {/* FINANCIAL TAB */}
          <TabsContent value="financial">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <CreditCard className="text-primary" /> Financial Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField label="Bank Name" id="bank_name" formik={formik} isEditing={isEditing} />
                <FormField label="Account Holder Name" id="account_name" formik={formik} isEditing={isEditing} />

                <FormField label="Account Number" id="account_number" formik={formik} isEditing={isEditing} />
                <FormField label="IFSC Code" id="ifsc_code" formik={formik} isEditing={isEditing} />

                <FormField label="Tax ID (PAN/SSN)" id="tax_id" formik={formik} isEditing={isEditing} />
              </div>
            </Card>
          </TabsContent>

          {/* EDUCATION TAB */}
          <TabsContent value="education">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <GraduationCap className="text-primary" /> Education
              </h3>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <GraduationCap size={32} className="text-gray-400" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white">Educational Details</h4>
                <p className="text-gray-500 dark:text-muted max-w-sm mt-2">
                  This module is currently being updated to support creating and tracking educational qualifications.
                </p>
                {isEditing && (
                  <div className="w-full max-w-md mt-6 text-left">
                    <Label>Additional Notes (Optional)</Label>
                    <textarea
                      className="w-full mt-2 p-3 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                      rows={4}
                      placeholder="Enter any degree or certification details here..."
                    />
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* DOCUMENTS TAB */}
          {/* DOCUMENTS TAB */}
          <TabsContent value="documents">
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
          {options?.map((opt: string) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
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

const DocumentsTab = ({ employeeId }: { employeeId: string }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const canManage = user?.role === 'ADMIN' || user?.role === 'HR';

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
