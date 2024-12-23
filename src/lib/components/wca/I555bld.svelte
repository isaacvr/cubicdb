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

  let className9 = "";
  export { className9 as class };
</script>

<svg {viewBox} {width} {height} class={className9} aria-label={ariaLabel} aria-hidden={ariaHidden}
  >{#if desc}<desc>{desc}</desc>{/if}{#if title}<title>{title}</title>{/if}<g fill={color}
    ><path
      d="M 3.597656 10.550781 L 6.535156 10.550781 L 6.535156 13.488281 L 3.597656 13.488281 Z M 3.597656 10.550781 "
    /><path
      d="M 3.613281 14.664062 L 6.550781 14.664062 L 6.550781 17.601562 L 3.613281 17.601562 Z M 3.613281 14.664062 "
    /><path
      d="M 3.621094 18.773438 L 6.554688 18.773438 L 6.554688 21.710938 L 3.621094 21.710938 Z M 3.621094 18.773438 "
    /><path
      d="M 3.59375 6.4375 L 6.53125 6.4375 L 6.53125 9.375 L 3.59375 9.375 Z M 3.59375 6.4375 "
    /><path
      d="M 3.589844 2.328125 L 6.527344 2.328125 L 6.527344 5.265625 L 3.589844 5.265625 Z M 3.589844 2.328125 "
    /><path
      d="M 19.835938 11.996094 C 20.074219 8.316406 23.382812 2.867188 17.015625 2.867188 C 11.683594 2.867188 11.324219 7.484375 11.324219 11.996094 C 11.324219 16.074219 11.519531 20.953125 16.4375 21.125 C 23.296875 21.363281 20.097656 16.085938 19.835938 11.996094 Z M 19.835938 11.996094 "
    /></g
  ></svg
>
