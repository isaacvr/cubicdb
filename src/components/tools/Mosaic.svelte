<script lang="ts">
  import Modal from "@components/Modal.svelte";
  import Button from "@components/material/Button.svelte";
  import Input from "@components/material/Input.svelte";
  import { pixelate, type RGBAColor } from "@helpers/imageProcessing";
  import { generatePdf } from "@helpers/pdfComposer";
  import type { Language } from "@interfaces";
  import { getLanguage } from "@lang/index";
  import { globalLang } from "@stores/language.service";
  import Cropper from "svelte-easy-crop";
  import DownloadIcon from 'svelte-material-icons/Download.svelte';
  import EyeIcon from 'svelte-material-icons/Eye.svelte';
  import type { Readable } from "svelte/motion";
  import { derived } from "svelte/store";

  let localLang: Readable<Language> = derived(globalLang, ($lang) => {
    return getLanguage( $lang );
  });

  let imgStr = '';
  let imgElement: HTMLImageElement;
  let imgW = 25;
  let imgH = 30;
  let puzzleOrder = 3;
  let cropData = {
    x: 0, y: 0, width: 0, height: 0
  };
  let mosaicResult: { img: string, preview: string, pixels: RGBAColor[][] }[] = [];
  let generatingMosaic = false;
  let showModal = false;
  let modalImg = '';
  const blockWidth = 3;
  const blockHeight = 4;

  function imageHandler(ev: any) {
    let img = ev.detail[0];
    let fr = new FileReader();

    fr.onloadend = (ev1) => {
      if ( ev1.target ) {
        imgStr = ev1.target.result as string;
        imgElement = new Image();
        imgElement.src = imgStr;
      }
    };

    fr.readAsDataURL(img);

  }

  async function generateMosaic() {
    generatingMosaic = true;

    await new Promise(res => setTimeout(res, 10));

    let cnv = document.createElement('canvas');
    let ctx = cnv.getContext('2d');

    let aux = document.createElement('canvas');
    let auxc = aux.getContext('2d', { willReadFrequently: true });

    if ( !ctx || !auxc ) return;

    let W = cropData.width;
    let H = cropData.height;

    let FW = imgW * puzzleOrder;
    let FH = imgH * puzzleOrder;

    let f = Math.ceil( W / FW );

    W = FW * f;
    H = FH * f;

    cnv.width = imgElement.naturalWidth;
    cnv.height = imgElement.naturalHeight;

    ctx?.drawImage(imgElement, 0, 0);

    aux.width = FW;
    aux.height = FH;

    auxc.drawImage(cnv, cropData.x, cropData.y, cropData.width, cropData.height, 0, 0, FW, FH);

    async function ColorToImage(res: RGBAColor[][]) {
      let _tcanvas = document.createElement('canvas');
      let _tctx = _tcanvas.getContext('2d')!;
      let stickerSize = 10;
      
      _tcanvas.width = FW * stickerSize;
      _tcanvas.height = FH * stickerSize;

      _tctx.strokeStyle = `${ Math.max(1, stickerSize / 20) }px solid #969696`;

      for (let i = 0; i < FH; i += 1) {
        for (let j = 0; j < FW; j += 1) {
          let rgb = res[i][j];
          _tctx.fillStyle = `rgb(${rgb.red}, ${rgb.green}, ${rgb.blue})`;
          _tctx.fillRect(j * stickerSize, i * stickerSize, stickerSize, stickerSize);
          _tctx.strokeRect(j * stickerSize, i * stickerSize, stickerSize, stickerSize);
        }
      }

      let preview = _tcanvas.toDataURL('image/jpg');

      let arr: number[] = [];

      for (let y = 0; y < FH; y += 1) {
        for (let x = 0; x < FW; x += 1) {
          let color = res[y][x];
          arr.push(color.red, color.green, color.blue, 255);
        }
      }

      _tcanvas.width = FW;
      _tcanvas.height = FH;

      let colorData = new ImageData(FW, FH);
      
      Uint8ClampedArray.from(arr).forEach((n, p) => colorData.data[p] = n);

      _tctx!.putImageData(colorData, 0, 0);

      return {
        preview,
        img: _tcanvas.toDataURL('image/jpg'),
        pixels: res
      };
    }

    mosaicResult = [
      await (pixelate(aux, auxc, 'CLOSEST_COLOR',   'CMYK',    false, false, 0).then(ColorToImage)),
      await (pixelate(aux, auxc, 'CLOSEST_COLOR',   'DELTA_E', false, false, 0).then(ColorToImage)),
      await (pixelate(aux, auxc, 'CLOSEST_COLOR',   'HSL',     false, false, 0).then(ColorToImage)),
      await (pixelate(aux, auxc, 'CLOSEST_COLOR',   'RGB',     false, false, 0).then(ColorToImage)),
      await (pixelate(aux, auxc, 'CLOSEST_COLOR',   'XYZ',     false, false, 0).then(ColorToImage)),
      await (pixelate(aux, auxc, 'CLOSEST_COLOR',   'XYZ',     false, true,  0).then(ColorToImage)),
      
      await (pixelate(aux, auxc, 'CLOSEST_COLOR',   'CMYK',    true,  false, 0).then(ColorToImage)),
      await (pixelate(aux, auxc, 'CLOSEST_COLOR',   'DELTA_E', true,  false, 0).then(ColorToImage)),
      await (pixelate(aux, auxc, 'CLOSEST_COLOR',   'HSL',     true,  false, 0).then(ColorToImage)),
      await (pixelate(aux, auxc, 'CLOSEST_COLOR',   'RGB',     true,  false, 0).then(ColorToImage)),
      await (pixelate(aux, auxc, 'CLOSEST_COLOR',   'XYZ',     true,  true,  0).then(ColorToImage)),

      await (pixelate(aux, auxc, 'ERROR_DIFFUSION', 'XYZ',     true,  true, 0.5).then(ColorToImage))
    ];

    generatingMosaic = false;
  }

  function downloadPDF(data: typeof mosaicResult[0]) {
    generatePdf(blockWidth, blockHeight, imgW * puzzleOrder, imgH * puzzleOrder, puzzleOrder, data.pixels, data.img);
  }

  function showPreview(data: typeof mosaicResult[0]) {
    modalImg = data.preview;
    showModal = true;
  }
</script>

<div class="bg-backgroundLv1 w-[min(90%,50rem)] mx-auto mt-8 p-4 rounded-md shadow-md">
  <div class="flex flex-wrap justify-center gap-4 text-center">
    <div>
      { $localLang.TOOLS.widthInCubes } <Input bind:value={imgW} inpClass="text-center" type="number" min={1} max={100}/>
    </div>
    <div>
      { $localLang.TOOLS.heightInCubes } <Input bind:value={imgH} inpClass="text-center" type="number" min={1} max={100}/>
    </div>
    <div>
      { $localLang.TOOLS.cubeOrder } ({puzzleOrder}x{puzzleOrder}) <Input bind:value={ puzzleOrder } inpClass="text-center" type="number" min={1} max={7}/>
    </div>
  </div>
</div>

<div class="bg-backgroundLv1 w-[min(90%,50rem)] mx-auto mt-8 rounded-md shadow-md p-4 grid place-items-center">
  {#if imgStr}
    <div class="relative h-[20rem] w-full">
      <Cropper image={imgStr} zoom={1} aspect={ imgW / imgH } on:cropcomplete={e => cropData = e.detail.pixels}/>
    </div>
  {/if}

  <div class="flex flex-wrap gap-2">
    <Button class="bg-purple-700 text-gray-300 mt-8" file="image"
      on:files={ imageHandler }>{ $localLang.TOOLS.selectImage }</Button>

    {#if imgStr}
      <Button class="bg-green-700 text-gray-300 mt-8"
        loading={ generatingMosaic }
        on:click={ generateMosaic }
      > { $localLang.TOOLS.generate } </Button>
    {/if}
  </div>

  <ul class="mosaic-result">
    {#each mosaicResult as res}
      <li class="grid place-items-center w-full relative">
        <img class="w-full" src={ res.img } alt="">
        <div class="absolute w-full h-full inset-0 flex items-center justify-center gap-2">
          <Button class="text-current hover:bg-purple-700" on:click={ () => downloadPDF(res) }>
            <DownloadIcon size="2rem"/>
          </Button>
          <Button class="text-current hover:bg-purple-700" on:click={ () => showPreview(res) }>
            <EyeIcon size="2rem"/>
          </Button>
        </div>
      </li>
    {/each}
  </ul>
</div>

<Modal class="!overflow-auto" bind:show={ showModal } on:close={() => showModal = false}>
  <div class="mosaic-result in-modal">
    <img src={ modalImg } alt="">
  </div>
</Modal>

<style>
  .mosaic-result {
    display: grid;
    gap: 1rem;
    margin-top: 1rem;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    width: 100%;
  }

  .mosaic-result.in-modal {
    margin: 0;
    padding: 0;
  }

  .mosaic-result img {
    width: 100%;
    image-rendering: pixelated;
    image-rendering: -moz-crisp-edges;
    image-rendering: crisp-edges;
  }

  li .absolute {
    background-color: #0000;
    color: transparent;
    transition: background-color 200ms, color 100ms;
    visibility: hidden;
  }
  
  li:hover .absolute {
    background-color: #000a;
    color: white;
    visibility: visible;
  }
</style>