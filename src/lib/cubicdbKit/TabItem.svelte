<script lang="ts">
  import { getContext, onDestroy, type Snippet } from "svelte";

  interface TabItemProps {
    title: string;
    open?: boolean;
    activeClasses?: string;
    children?: Snippet;
  }

  const tabs = getContext<{
    register: (item: { id: string; title: string; content: Snippet; activeClasses?: string; open?: boolean }) => void;
    unregister: (id: string) => void;
  }>("cubicdb-tabs");

  let { title, open = false, activeClasses = "", children }: TabItemProps = $props();
  const id = `tab-${Math.random().toString(36).slice(2)}`;

  tabs?.register({
    id,
    title,
    content: children as Snippet,
    activeClasses,
    open,
  });

  onDestroy(() => {
    tabs?.unregister(id);
  });
</script>
