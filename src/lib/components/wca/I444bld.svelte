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

  let className7 = '';
  export { className7 as class }
</script>

<svg viewBox="{viewBox}" width="{width}" height="{height}" class="{className7}" aria-label="{ariaLabel}" aria-hidden="{ariaHidden}">{#if desc}<desc>{desc}</desc>{/if}{#if title}<title>{title}</title>{/if}<g fill={ color }><path d="M 3.5 7.695312 L 7.089844 7.695312 L 7.089844 11.28125 L 3.5 11.28125 Z M 3.5 7.695312 "/><path d="M 3.519531 12.71875 L 7.109375 12.71875 L 7.109375 16.304688 L 3.519531 16.304688 Z M 3.519531 12.71875 "/><path d="M 3.527344 17.742188 L 7.117188 17.742188 L 7.117188 21.328125 L 3.527344 21.328125 Z M 3.527344 17.742188 "/><path d="M 3.496094 2.671875 L 7.085938 2.671875 L 7.085938 6.257812 L 3.496094 6.257812 Z M 3.496094 2.671875 "/><path d="M 19.90625 11.996094 C 20.144531 8.316406 23.457031 2.867188 17.089844 2.867188 C 11.753906 2.867188 11.394531 7.484375 11.394531 11.996094 C 11.394531 16.074219 11.589844 20.953125 16.507812 21.125 C 23.367188 21.363281 20.171875 16.085938 19.90625 11.996094 Z M 19.90625 11.996094 "/></g></svg>