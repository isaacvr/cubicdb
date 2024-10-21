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

  let className5 = '';
  export { className5 as class }
</script>

<svg viewBox="{viewBox}" width="{width}" height="{height}" class="{className5}" aria-label="{ariaLabel}" aria-hidden="{ariaHidden}">{#if desc}<desc>{desc}</desc>{/if}{#if title}<title>{title}</title>{/if}<g fill={ color }><rect x="3.1415" y="2.472" width="4.8" height="4.8"/><rect x="3.1415" y="9.192" width="4.8" height="4.8"/><rect x="3.1415" y="15.912" width="4.8" height="4.8"/><path d="M19.5040,11.5998C19.7406,7.9202,23.0529,2.4720,16.6848,2.4720c-5.3346,0.0000,-5.6926,4.6172,-5.6926,9.1278c0.0000,4.0785,0.1941,8.9561,5.1132,9.1278C22.9633,20.9670,19.7670,15.6889,19.5040,11.5998z"/></g></svg>