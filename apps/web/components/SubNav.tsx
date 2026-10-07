import Link from "next/link";

/** A section's sub-menu, in the style of the tabs (§7.2): the current page's link is marked. */
export function SubNav({
  label,
  links,
  current,
  className = "",
}: {
  label: string;
  links: readonly { href: string; name: string }[];
  current: string | undefined;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={`flex gap-3 ${className}`}>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="tab"
          aria-current={link.href === current ? "page" : undefined}
        >
          {link.name}
        </Link>
      ))}
    </nav>
  );
}
