import { Dialog } from '@headlessui/react';
import { X } from 'lucide-react';

export default function BaseModal({ isOpen, onClose, title, children, size = 'md' }) {
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl'
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" onClick={onClose} />

      {/* Modal Panel */}
      <div className="fixed inset-0 flex items-center justify-center px-4 py-8">
        <Dialog.Panel
          onClick={(e) => e.stopPropagation()}
          className={`bg-white rounded-xl shadow-lg ${sizeClasses[size]} w-full max-h-[70vh] flex flex-col relative`}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Title */}
          {title && (
            <div className="flex-shrink-0 p-6 pb-0">
              <Dialog.Title className="text-xl font-semibold text-gray-900 pr-8">{title}</Dialog.Title>
            </div>
          )}

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6">
            {children}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
