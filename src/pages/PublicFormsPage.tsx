import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, TextField, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Select, MenuItem, FormControl, InputLabel, Switch, FormControlLabel, Chip, Tooltip, Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LinkIcon from '@mui/icons-material/Link';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

interface FormField {
  id: string;
  label: string;
  type: string;
  required: boolean;
}

interface PublicForm {
  id: string;
  name: string;
  description: string;
  slug: string;
  target_status: string;
  default_priority: string;
  form_schema: FormField[];
  is_active: boolean;
  project: string;
}

export default function PublicFormsPage() {
  const { currentWorkspace, projects } = useWorkspace();
  const [forms, setForms] = useState<PublicForm[]>([]);
  const [loading, setLoading] = useState(false);

  // Dialog state
  const [open, setOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<Partial<PublicForm> | null>(null);

  useEffect(() => {
    fetchForms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspace?.id]);

  const fetchForms = async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/public_forms/templates/?workspace_id=${currentWorkspace.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setForms(data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load forms');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (form?: PublicForm) => {
    if (form) {
      setEditingForm(form);
    } else {
      setEditingForm({
        name: '',
        description: '',
        slug: Math.random().toString(36).substring(2, 8),
        target_status: 'todo',
        default_priority: 'medium',
        is_active: true,
        project: projects[0]?.id || '',
        form_schema: [
          { id: 'title', label: 'Title / Subject', type: 'text', required: true },
          { id: 'description', label: 'Description', type: 'textarea', required: true }
        ]
      });
    }
    setOpen(true);
  };

  const handleSave = async () => {
    if (!editingForm?.name || !editingForm?.project) {
      toast.error("Name and Project are required.");
      return;
    }

    try {
      const isEdit = !!editingForm.id;
      const url = isEdit
        ? `${API_BASE_URL}/public_forms/templates/${editingForm.id}/`
        : `${API_BASE_URL}/public_forms/templates/`;

      const payload = {
        ...editingForm,
        workspace: currentWorkspace?.id
      };

      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to save form');

      toast.success(`Form ${isEdit ? 'updated' : 'created'} successfully!`);
      setOpen(false);
      fetchForms();
    } catch (e) {
      console.error(e);
      toast.error('Failed to save form');
    }
  };

  const addField = () => {
    if (!editingForm) return;
    setEditingForm({
      ...editingForm,
      form_schema: [
        ...(editingForm.form_schema || []),
        { id: `field_${Date.now()}`, label: 'New Field', type: 'text', required: false }
      ]
    });
  };

  const updateField = (index: number, key: keyof FormField, value: string | boolean) => {
    if (!editingForm || !editingForm.form_schema) return;
    const newSchema = [...editingForm.form_schema];
    newSchema[index] = { ...newSchema[index], [key]: value };
    setEditingForm({ ...editingForm, form_schema: newSchema });
  };

  const removeField = (index: number) => {
    if (!editingForm || !editingForm.form_schema) return;
    const newSchema = editingForm.form_schema.filter((_, i) => i !== index);
    setEditingForm({ ...editingForm, form_schema: newSchema });
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/f/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this form?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/public_forms/templates/${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        toast.success("Form deleted");
        fetchForms();
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete form");
    }
  };

  return (
    <Box sx={{ p: 4, pt: 10 }}>
      {/* Added pt: 10 to clear header in main layout */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Public Forms</Typography>
          <Typography color="text.secondary">Create external forms to gather requests without requiring login.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
          Create Form
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f8fafc' }}>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Project</TableCell>
              <TableCell>Target Status</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {forms.map((form) => {
              const proj = projects.find(p => p.id === form.project);
              return (
                <TableRow key={form.id}>
                  <TableCell>
                    <Typography fontWeight={600}>{form.name}</Typography>
                    <Typography variant="caption" color="text.secondary">/f/{form.slug}</Typography>
                  </TableCell>
                  <TableCell>{proj?.name || 'Unknown'}</TableCell>
                  <TableCell>{form.target_status}</TableCell>
                  <TableCell>
                    <Chip size="small" label={form.is_active ? 'Active' : 'Inactive'} color={form.is_active ? 'success' : 'default'} />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Copy Public Link">
                      <IconButton onClick={() => copyLink(form.slug)} color="primary"><LinkIcon /></IconButton>
                    </Tooltip>
                    <IconButton onClick={() => handleOpenDialog(form)}><EditIcon /></IconButton>
                    <IconButton onClick={() => handleDelete(form.id)} color="error"><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
            {forms.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>No forms created yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Form Builder Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingForm?.id ? 'Edit Form' : 'Create Form'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, py: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Form Name"
                fullWidth
                required
                value={editingForm?.name || ''}
                onChange={(e) => setEditingForm({ ...editingForm, name: e.target.value })}
              />
              <TextField
                label="Short Slug / URL Path"
                fullWidth
                required
                value={editingForm?.slug || ''}
                onChange={(e) => setEditingForm({ ...editingForm, slug: e.target.value })}
                helperText={`Will be hosted at /f/${editingForm?.slug}`}
              />
            </Box>

            <TextField
              label="Description (publicly visible)"
              fullWidth
              multiline rows={2}
              value={editingForm?.description || ''}
              onChange={(e) => setEditingForm({ ...editingForm, description: e.target.value })}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth required>
                <InputLabel>Target Project</InputLabel>
                <Select
                  value={editingForm?.project || ''}
                  label="Target Project"
                  onChange={(e) => setEditingForm({ ...editingForm, project: typeof e.target.value === 'string' ? e.target.value : '' })}
                >
                  {projects.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                </Select>
              </FormControl>

              <TextField
                label="Target Status / Default Column"
                fullWidth
                value={editingForm?.target_status || ''}
                onChange={(e) => setEditingForm({ ...editingForm, target_status: e.target.value })}
              />
            </Box>

            <FormControlLabel
              control={<Switch checked={editingForm?.is_active ?? true} onChange={(e) => setEditingForm({ ...editingForm, is_active: e.target.checked })} />}
              label="Form is Active"
            />

            <Divider sx={{ my: 1 }} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight={600}>Form Fields</Typography>
              <Button size="small" onClick={addField} startIcon={<AddIcon />}>Add Field</Button>
            </Box>

            {editingForm?.form_schema?.map((field, idx) => (
              <Paper key={idx} variant="outlined" sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                  label="Label"
                  fullWidth
                  size="small"
                  value={field.label}
                  onChange={(e) => updateField(idx, 'label', e.target.value)}
                />
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Type</InputLabel>
                  <Select value={field.type} label="Type" onChange={(e) => updateField(idx, 'type', e.target.value as string)}>
                    <MenuItem value="text">Short Text</MenuItem>
                    <MenuItem value="textarea">Paragraph</MenuItem>
                  </Select>
                </FormControl>
                <FormControlLabel
                  control={<Switch size="small" checked={field.required} onChange={(e) => updateField(idx, 'required', e.target.checked)} />}
                  label="Required"
                  sx={{ whiteSpace: 'nowrap' }}
                />
                <IconButton color="error" onClick={() => removeField(idx)}><DeleteIcon /></IconButton>
              </Paper>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>Save Form</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
