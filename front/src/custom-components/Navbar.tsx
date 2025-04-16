import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Logo from "/discordia-logo.png"

export const Navbar = () => {
  return (
    <nav className="w-full absolute top-0 left-0 flex align-middle justify-between">
        <img src={Logo} className="w-16 grayscale-100" alt="logo-discordia" />
        <Avatar className="w-12 h-12">
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>J</AvatarFallback>
        </Avatar>
    </nav>
  )
}
