import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Container, Paper, Typography, TextField, Button, CircularProgress } from '@mui/material';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export default function PublicFormPage() {
  const { slug } = useParams<{ slug: string }>();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Dynamic form state
  interface FormDefinition {
    name: string;
    description?: string;
    form_schema: Array<{ id: string; label: string; required: boolean; type: string }>;
    workspace_id: string;
  }
  const [formDef, setFormDef] = useState<FormDefinition | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    // Fetch form definition from backend without auth
    const fetchForm = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/public_forms/p/form/${slug}/`);
        if (!res.ok) throw new Error('Form not found or inactive');
        const data = await res.json();

        // If no dynamic schema is defined yet, provide generic defaults
        if (!data.form_schema || data.form_schema.length === 0) {
          data.form_schema = [
            { id: "title", label: "Subject / Title", required: true, type: "text" },
            { id: "description", label: "Details / Description", required: true, type: "textarea" }
          ];
        }

        setFormDef(data);
      } catch (err) {
        console.error(err);
        toast.error("Could not load form. It may be disabled or the link is invalid.");
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchForm();
  }, [slug]);

  const handleChange = (fieldId: string, value: string) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/public_forms/p/form/${slug}/submit/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to submit');

      setSubmitted(true);
      toast.success("Successfully submitted!");
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during submission.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8fafc' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!formDef) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8fafc' }}>
        <Typography variant="h6" color="text.secondary">Form not found</Typography>
      </Box>
    );
  }

  if (submitted) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8fafc' }}>
        <Paper elevation={0} sx={{ p: 6, borderRadius: 4, textAlign: 'center', maxWidth: 400 }}>
          <TaskAltIcon color="success" sx={{ fontSize: 64, mb: 2 }} />
          <Typography variant="h5" fontWeight={700} gutterBottom>Thank You!</Typography>
          <Typography color="text.secondary">
            Your request has been successfully submitted and a task has been created for the team.
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', py: 8 }}>
      <Container maxWidth="sm">
        <Paper elevation={0} sx={{ p: { xs: 3, sm: 5 }, borderRadius: 4, border: '1px solid #e2e8f0' }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <TaskAltIcon sx={{ fontSize: 40, color: '#3b82f6', mb: 1 }} />
            <Typography variant="h4" fontWeight={800} gutterBottom>
              {formDef.name}
            </Typography>
            {formDef.description && (
              <Typography color="text.secondary" variant="body1">
                {formDef.description}
              </Typography>
            )}
          </Box>

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {(formDef.form_schema as Array<{ id: string, label: string, required: boolean, type: string }>).map((field) => (
              <TextField
                key={field.id}
                label={field.label}
                required={field.required}
                multiline={field.type === 'textarea'}
                rows={field.type === 'textarea' ? 4 : 1}
                value={formData[field.id] || ''}
                onChange={(e) => handleChange(field.id, e.target.value)}
                fullWidth
                variant="outlined"
              />
            ))}

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={submitting}
              sx={{
                mt: 2,
                py: 1.5,
                borderRadius: 2,
                fontWeight: 600,
                textTransform: 'none',
                fontSize: '1.05rem'
              }}
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
