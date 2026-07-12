<script lang="ts">
  interface AvatarProps {
    src?: string;
    alt?: string;
    class?: string;
  }

  let { src = "", alt = "", class: customClass = "" }: AvatarProps = $props();
</script>

<div class="avatar placeholder">
  <div class="w-10 rounded-full overflow-hidden {customClass}">
    <img {src} {alt} />
  </div>
</div>
