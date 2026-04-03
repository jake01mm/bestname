"use client";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

export function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="nav-bar">
      <Link href="/" className="nav-brand">
        <Image src="/logo.svg" alt="BestName" width={28} height={28} />
        BestName
      </Link>
      <div className="nav-links">
        <Link href="/" className={pathname === "/" ? "active" : ""}>
          生成器
        </Link>
        <Link href="/library" className={pathname === "/library" ? "active" : ""}>
          域名库
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="nav-logout"
        >
          退出
        </button>
      </div>
    </nav>
  );
}
