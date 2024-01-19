<script lang="ts">
  export let size = "1em";
  export let width = size;
  export let height = size;
  export let color = "currentColor";
  export let viewBox = "0 0 24 24";
  export let ariaLabel = '';
  export let ariaHidden = false;
  export let title = '';
  export let desc = '';

  let classNameg = '';
  export { classNameg as class }
</script>

<svg viewBox="{viewBox}" width="{width}" height="{height}" class="{classNameg}" aria-label="{ariaLabel}" aria-hidden="{ariaHidden}">{#if desc}<desc>{desc}</desc>{/if}{#if title}<title>{title}</title>{/if}<g fill={ color }><path d="M 12 2.195312 L 21.804688 12 L 12 21.804688 L 2.195312 12 Z M 12 2.195312 "/><path d="M 2.0625 2.089844 L 11.0625 2.089844 L 2.0625 11.089844 Z M 2.0625 2.089844 "/><path d="M 2.0625 21.910156 L 2.0625 12.910156 L 11.0625 21.910156 Z M 2.0625 21.910156 "/><path d="M 21.9375 21.910156 L 12.9375 21.910156 L 21.9375 12.910156 Z M 21.9375 21.910156 "/><path d="M 21.9375 2.089844 L 21.9375 11.089844 L 12.9375 2.089844 Z M 21.9375 2.089844 "/></g></svg>
