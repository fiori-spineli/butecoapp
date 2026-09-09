import Image from "next/image";

export function LogoButeco({
  className = "size-12",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={`relative ${className} shrink-0`}>
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