import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { departmentService, CreateDepartmentData, Department } from '@/services/department.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { showToast } from '@/utils/toast';
import { Input } from '@/components/ui/Input';
import { FormError } from '@/components/ui/FormError';

interface CreateDepartmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editDepartment?: Department | null; // Optional: if provided, form is in edit mode
}

const validationSchema = Yup.object({
  name: Yup.string().required('Department name is required'),
  description: Yup.string(),
});

export const CreateDepartmentForm: React.FC<CreateDepartmentFormProps> = ({
  open,
  onOpenChange,
  editDepartment = null,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isEditMode = !!editDepartment;

  const createMutation = useMutation({
    mutationFn: (data: CreateDepartmentData) => departmentService.createDepartment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      formik.resetForm();
      onOpenChange(false);
      showToast.success(t('organization.departmentCreated'));
    },
    onError: (err: unknown) => {
      showToast.error((err as { message?: string }).message || 'Failed');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; payload: CreateDepartmentData }) =>
      departmentService.updateDepartment(data.id, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      formik.resetForm();
      onOpenChange(false);
      showToast.success(t('organization.departmentUpdated'));
    },
    onError: (err: unknown) => {
      showToast.error((err as { message?: string }).message || 'Failed');
    }
  });

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: editDepartment?.name || '',
      description: editDepartment?.description || '',
    },
    validationSchema,
    onSubmit: (values) => {
      if (isEditMode && editDepartment) {
        updateMutation.mutate({ id: editDepartment.id, payload: values });
      } else {
        createMutation.mutate(values);
      }
    },
  });

  // Reset error/form state on close/open if needed
  useEffect(() => {
    if (!open) formik.resetForm();
  }, [open, formik]);

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditMode ? "Edit Department" : "Create Department"}
      className="max-w-md"
    >
      <form onSubmit={formik.handleSubmit} className="space-y-4 pt-2">
        <div>
          <label htmlFor="dept-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Department Name *
          </label>
          <Input
            id="dept-name"
            type="text"
            name="name"
            value={formik.values.name}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            placeholder="e.g. Engineering"
            error={formik.touched.name && Boolean(formik.errors.name)}
          />
          <FormError message={formik.touched.name ? formik.errors.name : undefined} />
        </div>

        <div>
          <label htmlFor="dept-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            id="dept-description"
            name="description"
            value={formik.values.description}
            onChange={formik.handleChange}
            rows={3}
            className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            placeholder="Optional description..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {isEditMode ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
