export function mascararEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!name || !domain) return email;
  return name.length <= 2 ? `${name[0]}***@${domain}` :
    `${name[0]}***${name[name.length - 1]}@${domain}`;
}
