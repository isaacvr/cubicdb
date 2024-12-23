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

  let classNameh = "";
  export { classNameh as class };
</script>

<svg {viewBox} {width} {height} class={classNameh} aria-label={ariaLabel} aria-hidden={ariaHidden}
  >{#if desc}<desc>{desc}</desc>{/if}{#if title}<title>{title}</title>{/if}<g fill={color}
    ><path
      d="M 12.003906 13.425781 L 14.050781 21.601562 L 9.960938 21.601562 Z M 12.003906 13.425781 "
    /><path d="M 13.429688 12 L 21.597656 9.960938 L 21.597656 14.042969 Z M 13.429688 12 " /><path
      d="M 12.003906 10.574219 L 9.960938 2.410156 L 14.046875 2.410156 Z M 12.003906 10.574219 "
    /><path d="M 10.578125 12 L 2.398438 14.042969 L 2.398438 9.957031 Z M 10.578125 12 " /><path
      d="M 13.0625 10.933594 L 15.347656 2.398438 L 21.597656 2.398438 L 21.597656 8.667969 L 13.0625 10.953125 "
    /><path
      d="M 10.9375 10.945312 L 2.398438 8.65625 L 2.398438 2.410156 L 8.667969 2.410156 L 10.957031 10.945312 "
    /><path
      d="M 13.0625 13.066406 L 15.347656 21.601562 L 21.597656 21.601562 L 21.597656 15.332031 L 13.0625 13.046875 "
    /><path
      d="M 10.9375 13.058594 L 2.398438 15.34375 L 2.398438 21.589844 L 8.667969 21.589844 L 10.957031 13.058594 "
    /></g
  ></svg
>
