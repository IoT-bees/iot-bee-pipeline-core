export function shouldShowNavigationFeedback(event: MouseEvent, currentUrl: string): boolean {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return false;
  }

  const target = event.target;
  if (!(target instanceof Element)) return false;

  const link = target.closest<HTMLAnchorElement>("a[href]");
  if (!link || link.target || link.hasAttribute("download")) return false;

  const destination = new URL(link.getAttribute("href") ?? link.href, currentUrl);
  const current = new URL(currentUrl);

  return (
    destination.origin === current.origin &&
    destination.pathname + destination.search !== current.pathname + current.search
  );
}
