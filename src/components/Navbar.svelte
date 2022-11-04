<script>
  import { Link } from 'svelte-routing';

  let parts = [
    { link: '/', name: "Home" },
    { link: '/', name: "Home" },
    { link: '/', name: "Home" },
    { link: '/', name: "Home" },
  ];
  // this.router.events.subscribe((event) => {
  //     if (event instanceof NavigationEnd) {
  //       let parts = decodeURIComponent(event.urlAfterRedirects).split('?')[0].split('/');
  //       // console.log("URL: ", event.urlAfterRedirects);

  //       this.parts.length = 0;

  //       this.parts.push({
  //         name: 'Home',
  //         link: '/'
  //       });

  //       for (let i = 1, maxi = parts.length; i < maxi; i += 1) {
  //         if ( parts[i].trim() === '' ) {
  //           continue;
  //         }
          
  //         if ( parts[i].indexOf('=') > -1 ) {
  //           break;
  //         } else {
  //           this.parts.push({
  //             name: decodeURIComponent(parts[i]),
  //             link: decodeURIComponent(parts.slice(0, i + 1).join('/'))
  //           });
  //         }
  //       }
  //     }
  //   });
</script>

<nav class="w-full px-5 inline-flex mt-10 select-none">
  {#each parts as part}
    <Link class="mr-1 rounded-sm shadow-md uppercase p-2"
    to="{part.link}"> {part.name} </Link>
  {/each}
</nav>