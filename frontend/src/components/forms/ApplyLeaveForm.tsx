import React, { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { leaveService, ApplyLeaveData, LeaveType } from '@/services/employee/leave.service';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Upload, X, FileText } from 'lucide-react';

interface ApplyLeaveFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const validationSchema = Yup.object({
  leave_type_id: Yup.string().required('Leave type is required'),
  start_date: Yup.date().required('Start date is required'),
  end_date: Yup.date()
    .required('End date is required')
    .test('is-after-start', 'End date must be on or after start date', function (value) {
      const { start_date } = this.parent;
      if (!start_date || !value) return true;
      return new Date(value) >= new Date(start_date);
    }),
  reason: Yup.string().required('Reason is required').min(5, 'Reason must be at least 5 characters'),
  is_half_day: Yup.boolean(),
  half_day_session: Yup.string().when('is_half_day', {
    is: true,
    then: (schema) => schema.required('Session is required when half day is selected'),
    otherwise: (schema) => schema.nullable().notRequired(),
  }),
});

export const ApplyLeaveForm: React.FC<ApplyLeaveFormProps> = ({
  open,
  onOpenChange,
}) => {
  const queryClient = useQueryClient();

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Fetch leave types dynamically
  const { data: leaveTypes = [], isLoading: typesLoading } = useQuery<LeaveType[]>({
    queryKey: ['leave-types'],
    queryFn: () => leaveService.getLeaveTypes(),
    enabled: open, // Only fetch when dialog is open
  });

  // Fetch leave balances to show available balance
  const { data: leaveBalances = [] } = useQuery({
    queryKey: ['leave-balances', 'my'],
    queryFn: () => leaveService.getMyBalances(),
    enabled: open,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => leaveService.uploadAttachment(file),
    onSuccess: (data) => {
      setUploadedUrl(data.url);
      setUploadError(null);
    },
    onError: (error: Error) => {
      setUploadError(error.message || 'Failed to upload file');
      setUploadedUrl(null);
    },
  });

  const applyMutation = useMutation({
    mutationFn: (data: ApplyLeaveData) => leaveService.applyLeave(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      queryClient.invalidateQueries({ queryKey: ['leave-balances'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      formik.resetForm();
      setSelectedFile(null);
      setUploadedUrl(null);
      onOpenChange(false);
    },
  });

  const formik = useFormik({
    initialValues: {
      leave_type_id: '',
      start_date: '',
      end_date: '',
      reason: '',
      is_half_day: false,
      half_day_session: '',
    },
    validationSchema,
    onSubmit: (values) => {
      const payload: ApplyLeaveData = {
        leave_type_id: values.leave_type_id,
        start_date: values.start_date,
        end_date: values.end_date,
        reason: values.reason,
        is_half_day: values.is_half_day,
        half_day_session: values.is_half_day ? (values.half_day_session as 'MORNING' | 'AFTERNOON') : null,
        attachment_url: uploadedUrl || undefined,
      };
      applyMutation.mutate(payload);
    },
  });

  // Get the selected leave type details
  const selectedLeaveType = leaveTypes.find(t => t.id === formik.values.leave_type_id);

  // Get the selected leave type's balance
  const selectedTypeBalance = leaveBalances.find(
    (b) => b.leave_type_id === formik.values.leave_type_id
  );

  // Calculate number of days being requested
  const calculateDays = () => {
    if (!formik.values.start_date || !formik.values.end_date) return 0;
    const start = new Date(formik.values.start_date);
    const end = new Date(formik.values.end_date);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return formik.values.is_half_day ? 0.5 : diffDays;
  };

  const requestedDays = calculateDays();

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadError(null);
      uploadMutation.mutate(file);
    }
  };

  // Handle file removal
  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadedUrl(null);
    setUploadError(null);
  };

  const handleClose = () => {
    formik.resetForm();
    applyMutation.reset();
    setSelectedFile(null);
    setUploadedUrl(null);
    setUploadError(null);
    onOpenChange(false);
  };

  // Check if attachment is required but not uploaded
  const isAttachmentMissing = selectedLeaveType?.requires_attachment && !uploadedUrl;

  return (
    <Dialog open={open} onOpenChange={handleClose} title="Request Leave / Remote Work" className="max-w-md">
      <form onSubmit={formik.handleSubmit}>
        <div className="space-y-4">
          {/* Error Message */}
          {applyMutation.error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <p className="text-red-700 dark:text-red-400 text-sm">
                {(applyMutation.error as Error).message || 'Failed to apply for leave'}
              </p>
            </div>
          )}

          {/* Leave Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Leave Type *
            </label>
            {typesLoading ? (
              <div className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500">
                Loading leave types...
              </div>
            ) : leaveTypes.length === 0 ? (
              <div className="w-full px-3 py-2 rounded-md border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 text-sm">
                No leave types available. Please contact HR.
              </div>
            ) : (
              <select
                name="leave_type_id"
                value={formik.values.leave_type_id}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select a leave type</option>
                {leaveTypes.filter(t => t.is_active).map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name} {type.is_paid ? '' : '(Unpaid)'}
                  </option>
                ))}
              </select>
            )}
            {formik.touched.leave_type_id && formik.errors.leave_type_id && (
              <p className="mt-1 text-sm text-red-600">{formik.errors.leave_type_id}</p>
            )}
          </div>

          {/* Balance Info */}
          {selectedTypeBalance && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-700 dark:text-blue-400">Available Balance:</span>
                <span className="font-semibold text-blue-900 dark:text-blue-300">
                  {selectedTypeBalance.available} days
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-blue-600 dark:text-blue-500 mt-1">
                <span>Entitled: {selectedTypeBalance.entitled}</span>
                <span>Used: {selectedTypeBalance.used}</span>
                <span>Pending: {selectedTypeBalance.pending}</span>
              </div>
            </div>
          )}

          {/* Date Range - Single Calendar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Leave Duration *
            </label>
            <DateRangePicker
              startDate={formik.values.start_date}
              endDate={formik.values.end_date}
              onStartDateChange={(date) => formik.setFieldValue('start_date', date)}
              onEndDateChange={(date) => formik.setFieldValue('end_date', date)}
            />
            {((formik.touched.start_date && formik.errors.start_date) ||
              (formik.touched.end_date && formik.errors.end_date)) && (
                <p className="mt-2 text-sm text-red-600">
                  {formik.errors.start_date || formik.errors.end_date}
                </p>
              )}
          </div>

          {/* Days Summary */}
          {requestedDays > 0 && (
            <div className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2">
              <span className="text-gray-600 dark:text-gray-400">Days Requested:</span>
              <span className="font-semibold text-gray-900 dark:text-white">{requestedDays} day(s)</span>
            </div>
          )}

          {/* Half Day & Session */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="is_half_day"
                checked={formik.values.is_half_day}
                onChange={(e) => {
                  formik.setFieldValue('is_half_day', e.target.checked);
                  if (!e.target.checked) formik.setFieldValue('half_day_session', '');
                }}
                disabled={formik.values.start_date !== formik.values.end_date}
                className="rounded border-gray-300 dark:border-gray-700 text-primary focus:ring-primary disabled:opacity-50"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Half Day
                {formik.values.start_date !== formik.values.end_date && (
                  <span className="text-xs text-gray-500 ml-1">(only for single day)</span>
                )}
              </span>
            </label>

            {formik.values.is_half_day && (
              <div className="flex gap-4 pl-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="half_day_session"
                    value="MORNING"
                    checked={formik.values.half_day_session === 'MORNING'}
                    onChange={formik.handleChange}
                    className="text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Morning (First Half)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="half_day_session"
                    value="AFTERNOON"
                    checked={formik.values.half_day_session === 'AFTERNOON'}
                    onChange={formik.handleChange}
                    className="text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Afternoon (Second Half)</span>
                </label>
              </div>
            )}
            {formik.touched.half_day_session && formik.errors.half_day_session && (
              <p className="mt-1 text-sm text-red-600 pl-6">{formik.errors.half_day_session as string}</p>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Reason *
            </label>
            <textarea
              name="reason"
              value={formik.values.reason}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              rows={4}
              className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Please provide a reason for your leave request (minimum 5 characters)..."
            />
            {formik.touched.reason && formik.errors.reason && (
              <p className="mt-1 text-sm text-red-600">{formik.errors.reason}</p>
            )}
          </div>

          {/* Attachment Upload - Show when leave type requires attachment */}
          {selectedLeaveType?.requires_attachment && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Attachment *
              </label>

              {!selectedFile ? (
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="leave-attachment"
                  />
                  <label
                    htmlFor="leave-attachment"
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Upload size={20} className="text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Click to upload (PDF, DOC, JPG, PNG - max 5MB)
                    </span>
                  </label>
                </div>
              ) : (
                <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <FileText size={18} className="text-primary" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
                      {selectedFile.name}
                    </span>
                    {uploadMutation.isPending && (
                      <span className="text-xs text-blue-500">Uploading...</span>
                    )}
                    {uploadedUrl && (
                      <span className="text-xs text-green-500">✓ Uploaded</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  >
                    <X size={16} className="text-gray-500" />
                  </button>
                </div>
              )}

              {uploadError && (
                <p className="mt-1 text-sm text-red-600">{uploadError}</p>
              )}

              {!uploadedUrl && !uploadMutation.isPending && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  This leave type requires an attachment (e.g., medical certificate)
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={applyMutation.isPending}
            disabled={!formik.isValid || !formik.dirty || leaveTypes.length === 0 || isAttachmentMissing || uploadMutation.isPending}
          >
            Apply for Leave
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
