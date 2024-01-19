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

  let className4 = '';
  export { className4 as class }
</script>

<svg viewBox="{viewBox}" width="{width}" height="{height}" class="{className4}" aria-label="{ariaLabel}" aria-hidden="{ariaHidden}">{#if desc}<desc>{desc}</desc>{/if}{#if title}<title>{title}</title>{/if}<g fill={ color }><rect x="1.56311" y="5.139" transform="matrix(0.7071 -0.7071 0.7071 0.7071 -3.5737 3.5705)" width="1.92" height="1.92"/><rect x="3.46387" y="3.2383" transform="matrix(0.7071 -0.7071 0.7071 0.7071 -1.6729 4.3578)" width="1.92" height="1.92"/><rect x="5.36452" y="1.3376" transform="matrix(0.7071 -0.7071 0.7071 0.7071 0.2278 5.1452)" width="1.92" height="1.92"/><rect x="3.47064" y="7.0329" transform="matrix(0.7071 -0.7071 0.7071 0.7071 -4.3541 5.474)" width="1.92" height="1.92"/><rect x="5.37134" y="5.1323" transform="matrix(0.7071 -0.7071 0.7071 0.7071 -2.4534 6.2612)" width="1.92" height="1.92"/><rect x="7.27204" y="3.2315" transform="matrix(0.7071 -0.7071 0.7071 0.7071 -0.5527 7.0486)" width="1.92" height="1.92"/><rect x="5.37475" y="8.9302" transform="matrix(0.7071 -0.7071 0.7071 0.7071 -5.1381 7.3763)" width="1.92" height="1.92"/><rect x="7.27545" y="7.0295" transform="matrix(0.7071 -0.7071 0.7071 0.7071 -3.2373 8.1632)" width="1.92" height="1.92"/><rect x="9.17616" y="5.1288" transform="matrix(0.7071 -0.7071 0.7071 0.7071 -1.3367 8.9505)" width="1.92" height="1.92"/><rect x="1.55798" y="16.3702" transform="matrix(0.7071 -0.7071 0.7071 0.7071 -11.517 6.8566)" width="1.92" height="1.92"/><rect x="3.45868" y="14.4695" transform="matrix(0.7071 -0.7071 0.7071 0.7071 -9.6162 7.6439)" width="1.92" height="1.92"/><rect x="5.35939" y="12.5688" transform="matrix(0.7071 -0.7071 0.7071 0.7071 -7.7155 8.4312)" width="1.92" height="1.92"/><rect x="3.46545" y="18.2641" transform="matrix(0.7071 -0.7071 0.7071 0.7071 -12.2973 8.7599)" width="1.92" height="1.92"/><rect x="5.36620" y="16.3634" transform="matrix(0.7071 -0.7071 0.7071 0.7071 -10.3963 9.5466)" width="1.92" height="1.92"/><rect x="7.26691" y="14.4627" transform="matrix(0.7071 -0.7071 0.7071 0.7071 -8.4958 10.3342)" width="1.92" height="1.92"/><rect x="5.36961" y="20.1614" transform="matrix(0.7071 -0.7071 0.7071 0.7071 -13.0812 10.662)" width="1.92" height="1.92"/><rect x="7.27032" y="18.2606" transform="matrix(0.7071 -0.7071 0.7071 0.7071 -11.1803 11.449)" width="1.92" height="1.92"/><rect x="9.17097" y="16.36" transform="matrix(0.7071 -0.7071 0.7071 0.7071 -9.2797 12.2363)" width="1.92" height="1.92"/><path d="M21.2817,11.9961c0.2366,-3.6796,3.5489,-9.1278,-2.8191,-9.1278c-5.3347,0.0000,-5.6926,4.6172,-5.6926,9.1278c0.0000,4.0785,0.1941,8.9561,5.1132,9.1278C24.7410,21.3632,21.5447,16.0851,21.2817,11.9961z"/></g></svg>