import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Logo from "/discordia-logo.png"
import { ModeToggle } from "@/components/mode-toggle"

export const Navbar = () => {
  return (
    <nav className="p-4 flex w-full justify-between bg-background text-foreground">
        <div className="flex gap-3">
          <img src={Logo} className="w-14 grayscale-100" alt="logo-discordia" />
          <span className="text-2xl font-semibold tracking-tighter py-1">DiscordIA</span>
        </div>
        <div className="flex gap-6">
          <ModeToggle />
          <Avatar>
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>JR</AvatarFallback>
          </Avatar>
        </div>
    </nav>
  )
}
