import React, { useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { designationService, CreateDesignationData, Designation } from '@/services/designation.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';

interface CreateDesignationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editDesignation?: Designation | null; // Optional: if provided, form is in edit mode
}

const validationSchema = Yup.object({
  name: Yup.string().required('Designation name is required'),
  description: Yup.string(),
});

export const CreateDesignationForm: React.FC<CreateDesignationFormProps> = ({
  open,
  onOpenChange,
  editDesignation = null,
}) => {
  const queryClient = useQueryClient();
  const isEditMode = !!editDesignation;

  const createMutation = useMutation({
    mutationFn: (data: CreateDesignationData) => designationService.createDesignation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designations'] });
      formik.resetForm();
      onOpenChange(false);
      toast.success('Designation created successfully');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create designation');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; payload: CreateDesignationData }) =>
      designationService.updateDesignation(data.id, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designations'] });
      formik.resetForm();
      onOpenChange(false);
      toast.success('Designation updated successfully');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update designation');
    }
  });

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: editDesignation?.name || '',
      description: editDesignation?.description || '',
    },
    validationSchema,
    onSubmit: (values) => {
      if (isEditMode && editDesignation) {
        updateMutation.mutate({ id: editDesignation.id, payload: values });
      } else {
        createMutation.mutate(values);
      }
    },
  });

  // Reset error/form state on close/open if needed
  useEffect(() => {
    if (!open) formik.resetForm();
  }, [open]);

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditMode ? "Edit Designation" : "Create Designation"}
      className="max-w-md"
    >
      <form onSubmit={formik.handleSubmit} className="space-y-4 pt-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Designation Name *
          </label>
          <input
            type="text"
            name="name"
            value={formik.values.name}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="e.g. Senior Software Engineer"
          />
          {formik.touched.name && formik.errors.name && (
            <p className="mt-1 text-sm text-red-600">{formik.errors.name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            name="description"
            value={formik.values.description}
            onChange={formik.handleChange}
            rows={3}
            className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
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
