<script lang="ts">
  import type { QrOptions } from '../core/types.js';
  import { getQrMatrix } from '../core/encoder.js';
  import { matrixToSvg } from '../core/svg.js';

  interface Props extends QrOptions {
    data: string;
    /** Accessible label for screen readers */
    label?: string;
  }

  let { data, label, ...options }: Props = $props();

  const svg = $derived(matrixToSvg(getQrMatrix(data, options), options));
</script>

<div
  class="asini-qr"
  role="img"
  aria-label={label ?? `QR code for: ${data}`}
>
  {@html svg}
</div>

<style>
  .asini-qr {
    display: inline-block;
    line-height: 0;
  }
  .asini-qr :global(svg) {
    display: block;
  }
</style>
