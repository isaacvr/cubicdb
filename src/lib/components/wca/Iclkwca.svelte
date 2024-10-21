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

  let classNamed = '';
  export { classNamed as class }
</script>

<svg viewBox="{viewBox}" width="{width}" height="{height}" class="{classNamed}" aria-label="{ariaLabel}" aria-hidden="{ariaHidden}">{#if desc}<desc>{desc}</desc>{/if}{#if title}<title>{title}</title>{/if}<g fill={ color }><path d="M 12 1.921875 C 6.433594 1.921875 1.921875 6.433594 1.921875 12 C 1.921875 17.566406 6.433594 22.078125 12 22.078125 C 17.566406 22.078125 22.078125 17.566406 22.078125 12 C 22.078125 6.433594 17.566406 1.921875 12 1.921875 Z M 12 2.835938 L 14.433594 11.351562 L 14.429688 11.351562 C 14.492188 11.570312 14.527344 11.800781 14.527344 12.039062 C 14.527344 13.441406 13.394531 14.578125 12 14.578125 C 10.605469 14.578125 9.472656 13.441406 9.472656 12.039062 C 9.472656 11.800781 9.507812 11.570312 9.570312 11.351562 L 9.566406 11.351562 Z M 12 5.996094 L 10.398438 11.59375 L 10.402344 11.59375 C 10.359375 11.738281 10.339844 11.890625 10.339844 12.046875 C 10.339844 12.96875 11.082031 13.714844 12 13.714844 C 12.917969 13.714844 13.660156 12.96875 13.660156 12.046875 C 13.660156 11.890625 13.640625 11.738281 13.597656 11.59375 L 13.601562 11.59375 Z M 12 5.996094 "/></g></svg>