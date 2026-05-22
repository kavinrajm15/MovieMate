import Swal from 'sweetalert2';

export const confirmAction = ({
  title = 'Are you sure?',
  text = '',
  confirmText = 'Yes, proceed',
  cancelText = 'Cancel',
  icon = 'warning'
} = {}) => {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";

  return Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    background: isDark ? '#1a1a1a' : '#ffffff',
    color: isDark ? '#ffffff' : '#1e293b',
    iconColor: '#E50914',
    buttonsStyling: false,
    customClass: {
      popup: 'rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-6 font-sans',
      title: 'text-xl font-bold text-slate-800 dark:text-zinc-100',
      htmlContainer: 'text-sm text-slate-500 dark:text-zinc-400 mt-2',
      actions: 'flex gap-3 justify-center mt-6 w-full',
      confirmButton: 'px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm rounded-lg transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500',
      cancelButton: 'px-5 py-2.5 bg-slate-500 hover:bg-slate-600 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white font-semibold text-sm rounded-lg transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400'
    }
  }).then((result) => !!result.isConfirmed);
};
