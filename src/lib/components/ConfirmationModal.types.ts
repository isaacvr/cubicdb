import type { ButtonType } from "$lib/cubicdbKit/Button.types";

export interface ConfirmationModalModel {
  show: boolean;
  title?: string;
  message: string;
  cancelLabel: string;
  confirmLabel: string;
  confirmType?: ButtonType;
  closeOnClickOutside?: boolean;
  oncancel?: () => void;
  onconfirm?: () => void;
}

export function createConfirmationModalModel(): ConfirmationModalModel {
  return {
    show: false,
    message: "",
    cancelLabel: "",
    confirmLabel: "",
  };
}
