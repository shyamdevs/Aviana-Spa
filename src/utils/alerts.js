import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

const base = {
  confirmButtonColor: '#201e1a',
  cancelButtonColor: '#b08d57',
};

export function showSuccess(title, text = '') {
  return Swal.fire({
    ...base,
    icon: 'success',
    title,
    text,
    confirmButtonText: 'OK',
  });
}

export function showError(title, text = '') {
  return Swal.fire({
    ...base,
    icon: 'error',
    title,
    text,
    confirmButtonText: 'OK',
  });
}

export function showInfo(title, text = '') {
  return Swal.fire({
    ...base,
    icon: 'info',
    title,
    text,
    confirmButtonText: 'OK',
  });
}

export function showToast(title, icon = 'info') {
  return Swal.fire({
    ...base,
    toast: true,
    position: 'top-end',
    icon,
    title,
    showConfirmButton: false,
    timer: 3200,
    timerProgressBar: true,
  });
}

export function confirmAction({ title, text, confirmText = 'Yes, continue', cancelText = 'Cancel', icon = 'warning' }) {
  return Swal.fire({
    ...base,
    icon,
    title,
    text,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    reverseButtons: true,
  });
}
