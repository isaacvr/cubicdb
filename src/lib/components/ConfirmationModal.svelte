<script lang="ts">
  import Button from "$lib/cubicdbKit/Button.svelte";
  import Modal from "@components/Modal.svelte";

  interface ConfirmationModalProps {
    show?: boolean;
    title?: string;
    message: string;
    cancelLabel: string;
    confirmLabel: string;
    confirmType?: "danger" | "primary" | "secondary" | "success" | "warning";
    closeOnClickOutside?: boolean;
    oncancel?: () => void;
    onconfirm?: () => void;
  }

  let {
    show = $bindable(false),
    title = "",
    message,
    cancelLabel,
    confirmLabel,
    confirmType = "danger",
    closeOnClickOutside = true,
    oncancel = () => {},
    onconfirm = () => {},
  }: ConfirmationModalProps = $props();

  let confirmed = false;

  function cancel() {
    show = false;
  }

  function confirm() {
    confirmed = true;
    show = false;
    onconfirm();
  }

  function handleClose() {
    if (confirmed) {
      confirmed = false;
      return;
    }

    oncancel();
  }
</script>

<Modal
  class="shaded-card"
  bind:show
  {title}
  showCloseButton
  {closeOnClickOutside}
  onclose={handleClose}
>
  <h1 class="mb-4 text-lg">{message}</h1>
  <div class="flex justify-center gap-2">
    <Button type="secondary" aria-label={cancelLabel} onclick={cancel}>
      {cancelLabel}
    </Button>

    <Button type={confirmType} aria-label={confirmLabel} onclick={confirm}>
      {confirmLabel}
    </Button>
  </div>
</Modal>
