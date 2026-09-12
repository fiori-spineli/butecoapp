import Image from "next/image";

export function LogoButeco({
  className = "w-48 md:w-64 lg:w-72 h-16 md:h-24 lg:h-28",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={`relative ${className} shrink-0 transition-all`}>
      {/* Versão para o tema Claro */}
      <Image
        src="/buteco_logo_clear.webp"
        alt="ButecoApp"
        fill
        priority={priority}
        className="object-contain dark:hidden"
      />
      {/* Versão para o tema Noturno */}
      <Image
        src="/buteco_logo.webp"
        alt="ButecoApp"
        fill
        priority={priority}
        className="object-contain hidden dark:block"
      />
    </div>
  );
}