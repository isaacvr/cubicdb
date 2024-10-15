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

  let className3 = '';
  export { className3 as class }
</script>

<svg viewBox="{viewBox}" width="{width}" height="{height}" class="{className3}" aria-label="{ariaLabel}" aria-hidden="{ariaHidden}">{#if desc}<desc>{desc}</desc>{/if}{#if title}<title>{title}</title>{/if}<g fill={ color }><path fill-rule="evenodd" clip-rule="evenodd" d="M11.2152,16.7582c1.3903,-3.8238,2.7720,-7.6240,4.1609,-11.4442c1.9191,0.0304,3.6337,0.6529,5.1235,1.8646c-1.3850,3.8095,-2.7641,7.6031,-4.1535,11.4246C14.7919,17.5725,13.0796,16.9531,11.2152,16.7582z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M15.8802,3.844c0.2122,-0.5773,0.4110,-1.1260,0.6181,-1.6716c0.0236,-0.0622,0.0835,-0.1320,0.1434,-0.1557c0.6505,-0.2581,1.3186,-0.4382,2.0256,-0.4530c1.0056,-0.0210,1.7220,0.4983,2.3064,1.2421c0.2512,0.3198,0.4528,0.6790,0.6713,1.0238c0.0290,0.0456,0.0487,0.1210,0.0319,0.1680c-0.2000,0.5628,-0.4076,1.1228,-0.6198,1.7014C19.4830,4.6559,17.7738,4.0417,15.8802,3.8440z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M12.0706,22.3686c-0.0401,-0.0862,-0.0684,-0.1468,-0.0967,-0.2075c-0.4870,-1.0443,-0.9741,-2.0887,-1.4609,-3.1330c-0.0709,-0.1522,0.0113,-0.6545,0.1362,-0.7602c0.0388,-0.0329,0.1118,-0.0370,0.1686,-0.0352c1.8156,0.0558,3.4374,0.6458,4.8680,1.7657c0.0983,0.0769,0.1120,0.1425,0.0813,0.2670c-0.0826,0.3347,-0.2715,0.5256,-0.5943,0.6672C14.1394,21.3860,13.1229,21.8779,12.0706,22.3686z"/><rect x="3.4606" y="3" width="4.8" height="4.8"/><rect x="3.4606" y="9.72" width="4.8" height="4.8"/><rect x="3.4606" y="16.44" width="4.8" height="4.8"/></g></svg>