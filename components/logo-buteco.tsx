import Image from "next/image";

export function LogoButeco({
  className = "w-40 md:w-56 h-14 md:h-20",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={`relative ${className} shrink-0 transition-all`}>
      {/* Versão para o tema Claro */}
      <Image
        src="/buteco_logo_clear.png"
        alt="ButecoApp"
        fill
        priority={priority}
        className="object-contain dark:hidden"
      />
      {/* Versão para o tema Noturno */}
      <Image
        src="/buteco_logo.png"
        alt="ButecoApp"
        fill
        priority={priority}
        className="object-contain hidden dark:block"
      />
    </div>
  );
}