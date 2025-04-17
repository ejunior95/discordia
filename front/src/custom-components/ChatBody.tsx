import { Button } from "@/components/ui/button"
import { SendHorizontal } from "lucide-react"
export const ChatBody = () => {
    return(
        <section className="flex-col h-full items-center-safe justify-center w-220">
                <p className="text-4xl font-semibold tracking-tighter text-center">Boa noite, Junior.</p>
                <p className="text-4xl font-semibold tracking-tighter text-center"> Faça sua pergunta e veja as IAs disputarem pelo seu voto!</p>
                <div className="w-220 h-36 bg-secondary rounded-2xl mt-8 p-2 relative">
                    <textarea 
                        name="textareaQuestion" 
                        id="text-question" 
                        rows={3}
                        placeholder="O que você quer saber?" 
                        className="px-2 w-full outline-0 text-lg text-foreground resize-none" 
                    />
                    <Button variant="default" size="icon" className="cursor-pointer absolute right-2 bottom-2">
                        <SendHorizontal className="h-[1.2rem] w-[1.2rem]" />
                    </Button>
                </div>
        </section>
    )
}
