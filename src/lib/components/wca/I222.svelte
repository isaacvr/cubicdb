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

  let className1 = '';
  export { className1 as class }
</script>

<svg viewBox="{viewBox}" width="{width}" height="{height}" class="{className1}" aria-label="{ariaLabel}" aria-hidden="{ariaHidden}">{#if desc}<desc>{desc}</desc>{/if}{#if title}<title>{title}</title>{/if}<g fill={ color }><rect x="2.24745758" y="2.24745758" width="8.33539248" height="8.33539248"/><rect x="13.4171500" y="2.24745758" width="8.33539248" height="8.33539248"/><rect x="2.24745758" y="13.4171500" width="8.33539248" height="8.33539248"/><rect x="13.4171500" y="13.4171500" width="8.33539248" height="8.33539248"/></g></svg>