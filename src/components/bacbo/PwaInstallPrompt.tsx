import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Share, PlusSquare, Smartphone, X } from "lucide-react";
import { usePwa } from "@/hooks/use-pwa";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function PwaInstallCard() {
  const { canInstall, isStandalone, isIOS, installApp, hasNativePrompt } = usePwa();
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (isStandalone || !canInstall || dismissed) {
    return null;
  }

  const handleInstallClick = () => {
    if (hasNativePrompt) {
      void installApp();
    } else if (isIOS) {
      setShowIosGuide(true);
    }
  };

  return (
    <>
      <div className="liquid-glass relative overflow-hidden rounded-[1.5rem] p-4 sm:p-5">
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="absolute right-3.5 top-3.5 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-accent/40"
          aria-label="Fechar banner"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3.5 pr-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-tie/30 bg-tie/10 text-tie">
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-display text-sm font-bold tracking-tight text-foreground sm:text-base">
              Instale o App na sua tela
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Acesse o Bac Bo Live em tela cheia com resposta rápida e sem a barra do navegador.
            </p>
          </div>
        </div>

        <div className="mt-3.5 flex justify-end">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleInstallClick}
            className="inline-flex items-center gap-2 rounded-full bg-tie px-4 py-2 text-xs font-bold text-background shadow-lg transition-transform hover:opacity-95"
          >
            <Download className="h-3.5 w-3.5" />
            Instalar Aplicativo
          </motion.button>
        </div>
      </div>

      <IosInstructionsDialog open={showIosGuide} onOpenChange={setShowIosGuide} />
    </>
  );
}

export function PwaInstallRow() {
  const { canInstall, isStandalone, isIOS, installApp, hasNativePrompt } = usePwa();
  const [showIosGuide, setShowIosGuide] = useState(false);

  if (isStandalone) {
    return (
      <div className="flex items-center gap-3 px-4 py-3.5">
        <Smartphone className="h-4 w-4 text-success" />
        <span className="text-sm font-medium">Aplicativo instalado</span>
        <span className="ml-auto rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-[0.6875rem] font-bold text-success uppercase">
          Ativo
        </span>
      </div>
    );
  }

  if (!canInstall) return null;

  const handleClick = () => {
    if (hasNativePrompt) {
      void installApp();
    } else if (isIOS) {
      setShowIosGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent/40"
      >
        <Smartphone className="h-4 w-4 text-tie" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Instalar na Tela de Início</p>
          <p className="text-xs text-muted-foreground">Usar como aplicativo móvel (PWA)</p>
        </div>
        <Download className="h-4 w-4 text-tie" />
      </button>

      <IosInstructionsDialog open={showIosGuide} onOpenChange={setShowIosGuide} />
    </>
  );
}

function IosInstructionsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="liquid-glass border-border max-w-sm rounded-[1.75rem] p-6 text-foreground">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-bold">
            Como instalar no iPhone/iPad
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Siga os 2 passos rápidos no Safari:
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-3.5 text-sm">
          <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/50 p-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-tie/10 text-tie font-bold text-xs">
              1
            </div>
            <p className="text-xs text-muted-foreground leading-snug">
              Toque no botão <strong className="text-foreground">Compartilhar</strong> (
              <Share className="inline h-3.5 w-3.5 mx-0.5 text-tie" />) na barra inferior do Safari.
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/50 p-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-tie/10 text-tie font-bold text-xs">
              2
            </div>
            <p className="text-xs text-muted-foreground leading-snug">
              Role a lista para baixo e toque em{" "}
              <strong className="text-foreground">Adicionar à Tela de Início</strong> (
              <PlusSquare className="inline h-3.5 w-3.5 mx-0.5 text-tie" />
              ).
            </p>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="w-full rounded-full bg-tie py-2.5 text-xs font-bold text-background shadow-md"
          >
            Entendi
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
