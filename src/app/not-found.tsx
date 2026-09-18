import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-svh max-w-[1440px] flex-col items-start justify-center px-5 md:px-8">
      <div className="label">404</div>
      <h1 className="display mt-3 text-[clamp(40px,6vw,80px)]">NO SIGNAL HERE.</h1>
      <Link href="/" className="btn btn-ghost mt-8">
        <span>BACK TO THE CORE</span>
      </Link>
    </div>
  );
}
