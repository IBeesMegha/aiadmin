import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Field, createValidationSchema } from '@/lib/types';
import { FormField } from './FormField';

interface DynamicFormProps {
  fields: Field[];
  defaultValues?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => void;
  submitLabel?: string;
  collectionName?: string;
  entryId?: string;
  serverError?: { field: string; message: string } | null;
  onFormMethodsReady?: (methods: any) => void;
}

export const DynamicForm: React.FC<DynamicFormProps> = ({
  fields,
  defaultValues,
  onSubmit,
  submitLabel = 'Save',
  collectionName,
  entryId,
  serverError,
  onFormMethodsReady,
}) => {
  const schema = createValidationSchema(fields);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
    getValues,
    control,
    setError,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues || {},
  });

  // Expose form methods to parent component
  useEffect(() => {
    if (onFormMethodsReady) {
      onFormMethodsReady({ setValue, getValues, watch, reset, setError });
    }
  }, [onFormMethodsReady, setValue, getValues, watch, reset, setError]);

  // Set server error when it changes
  useEffect(() => {
    if (serverError) {
      setError(serverError.field, {
        type: 'server',
        message: serverError.message,
      });
    }
  }, [serverError, setError]);

  // Log all form values before submit
  const onSubmitWrapper = async (data: Record<string, any>) => {
    // Get all current form values including those set via setValue
    const allValues = getValues();
    console.log('[DynamicForm] Form data from handleSubmit:', data);
    console.log('[DynamicForm] All form values from getValues:', allValues);
    console.log('[DynamicForm] Form fields:', fields.map(f => ({ name: f.name, type: f.type })));
    
    // Log specifically media fields
    const mediaFields = fields.filter(f => f.type === 'media');
    mediaFields.forEach(field => {
      console.log(`[DynamicForm] Media field "${field.name}" in data:`, data[field.name]);
      console.log(`[DynamicForm] Media field "${field.name}" in allValues:`, allValues[field.name]);
    });
    
    // Merge allValues with data to ensure setValue values are included
    const mergedData = { ...allValues, ...data };
    console.log('[DynamicForm] Merged data:', mergedData);
    
    // Call onSubmit and let parent handle the response
    await onSubmit(mergedData);
  };

  // Reset form when defaultValues change (for edit forms)
  useEffect(() => {
    if (defaultValues && Object.keys(defaultValues).length > 0) {
      console.log('[DynamicForm] Resetting form with default values:', defaultValues);
      reset(defaultValues);
    }
  }, [defaultValues, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmitWrapper)} className="space-y-6">
      {fields.map((field) => (
        <FormField
          key={field.name}
          field={field}
          register={register}
          error={errors[field.name]}
          setValue={setValue}
          watch={watch}
          control={control}
        />
      ))}

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
};
