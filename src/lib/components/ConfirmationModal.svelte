<script lang="ts">
  import Button from "$lib/cubicdbKit/Button.svelte";
  import Modal from "@components/Modal.svelte";
  import type { ConfirmationModalModel } from "./ConfirmationModal.types";

  interface ConfirmationModalProps {
    modal: ConfirmationModalModel;
  }

  let { modal = $bindable() }: ConfirmationModalProps = $props();

  let confirmed = false;

  function cancel() {
    modal.show = false;
  }

  function confirm() {
    confirmed = true;
    modal.show = false;
    modal.onconfirm?.();
  }

  function handleClose() {
    if (confirmed) {
      confirmed = false;
      return;
    }

    modal.oncancel?.();
  }
</script>

<Modal
  class="shaded-card"
  bind:show={modal.show}
  title={modal.title || ""}
  showCloseButton
  closeOnClickOutside={modal.closeOnClickOutside ?? true}
  onclose={handleClose}
>
  <h1 class="mb-4 text-lg">{modal.message}</h1>
  <div class="flex justify-center gap-2">
    <Button type="secondary" aria-label={modal.cancelLabel} onclick={cancel}>
      {modal.cancelLabel}
    </Button>

    <Button type={modal.confirmType || "danger"} aria-label={modal.confirmLabel} onclick={confirm}>
      {modal.confirmLabel}
    </Button>
  </div>
</Modal>
