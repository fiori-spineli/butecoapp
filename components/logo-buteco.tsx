import Image from "next/image";

export function LogoButeco({
  className = "w-32 sm:w-36 h-10 sm:h-11",
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={`relative ${className} shrink-0 flex items-center`}>
      <Image
        src="/buteco_logo_clear.webp"
        alt="ButecoApp"
        width={140}
        height={44}
        loading="eager"
        unoptimized
        className="h-full w-auto object-contain dark:hidden"
      />
      <Image
        src="/buteco_logo.webp"
        alt="ButecoApp"
        width={140}
        height={44}
        loading="eager"
        unoptimized
        className="h-full w-auto object-contain hidden dark:block"
      />
    </div>
  );
}