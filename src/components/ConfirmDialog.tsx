import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography,
} from '@mui/material';

interface ConfirmDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    confirmColor?: 'error' | 'primary' | 'warning';
    loading?: boolean;
}

/**
 * Reusable confirmation dialog.
 * Replaces 3+ inline implementations throughout the codebase.
 */
const ConfirmDialog = ({
    open,
    onClose,
    onConfirm,
    title = 'Confirm',
    message = 'Are you sure?',
    confirmLabel = 'Delete',
    cancelLabel = 'Cancel',
    confirmColor = 'error',
    loading = false,
}: ConfirmDialogProps) => (
    <Dialog
        open={open}
        onClose={onClose}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
    >
        <DialogTitle sx={{ fontWeight: 700 }}>{title}</DialogTitle>
        <DialogContent>
            <Typography variant="body2" color="text.secondary">
                {message}
            </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose} disabled={loading} sx={{ borderRadius: 2 }}>
                {cancelLabel}
            </Button>
            <Button
                variant="contained"
                color={confirmColor}
                onClick={onConfirm}
                disabled={loading}
                sx={{ borderRadius: 2 }}
            >
                {confirmLabel}
            </Button>
        </DialogActions>
    </Dialog>
);

export default ConfirmDialog;
