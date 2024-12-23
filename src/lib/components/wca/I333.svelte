<script lang="ts">
  export let size = "1em";
  export let width = size;
  export let height = size;
  export let color = "currentColor";
  export let viewBox = "0 0 24 24";
  export let ariaLabel = "";
  export let ariaHidden = false;
  export let title = "";
  export let desc = "";

  let className2 = "";
  export { className2 as class };
</script>

<svg {viewBox} {width} {height} class={className2} aria-label={ariaLabel} aria-hidden={ariaHidden}
  >{#if desc}<desc>{desc}</desc>{/if}{#if title}<title>{title}</title>{/if}<g fill={color}
    ><rect x="1.415593248" y="1.415593248" width="5.57074032" height="5.57074032" /><rect
      x="9.2146296"
      y="1.415593248"
      width="5.57074032"
      height="5.57074032"
    /><rect x="17.01366672" y="1.415593248" width="5.57074032" height="5.57074032" /><rect
      x="1.415593248"
      y="9.2146296"
      width="5.57074032"
      height="5.57074032"
    /><rect x="9.2146296" y="9.2146296" width="5.57074032" height="5.57074032" /><rect
      x="17.01366672"
      y="9.2146296"
      width="5.57074032"
      height="5.57074032"
    /><rect x="1.415593248" y="17.01366672" width="5.57074032" height="5.57074032" /><rect
      x="9.2146296"
      y="17.01366672"
      width="5.57074032"
      height="5.57074032"
    /><rect x="17.01366672" y="17.01366672" width="5.57074032" height="5.57074032" /></g
  ></svg
>
